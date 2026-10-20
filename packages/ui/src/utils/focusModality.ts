import { useLayoutEffect } from 'react';

/**
 * HOW THE READER LAST MOVED: by keyboard or by pointer, written on the root
 * element as `data-crewlet-focus="keyboard" | "pointer"` so a stylesheet can
 * tell the two apart where the platform cannot.
 *
 * WHY IT EXISTS. A text field matches `:focus-visible` on a pointer press as
 * well as on a tab: the platform treats every caret as an indicator worth
 * showing. That leaves a field two choices and both are wrong. Ringed for the
 * keyboard (2px in the focus colour, the area WCAG 2.2's focus appearance asks
 * for), a click into a title or a search box drew a heavy band round the one
 * thing a reader was already looking at, and on a page of fields that band was
 * the loudest thing on it. Ringed for the pointer (one quiet pixel), a reader
 * tabbing through a form was given half the indicator they need. So a field
 * draws the keyboard's ring by default and narrows it only where this
 * attribute says the caret was put there by a pointer.
 *
 * THE DEFAULT IS THE KEYBOARD'S. A document that never tracks the modality
 * keeps the full ring everywhere, which is the accessible failure mode: a
 * missing call costs some calm, never a reader's indicator.
 *
 * WHAT COUNTS AS THE KEYBOARD: Tab from anywhere, and any key pressed while
 * focus is NOT in a text-entry control (Enter on a link, the arrows in a
 * radio group, Escape out of a menu), because those keys move focus. Typing
 * inside a field does not, or the ring would widen under every character a
 * reader typed into a field they clicked. A modifier on its own is neither.
 *
 * One listener set per document however many fields mount, counted, and taken
 * down when the last one unmounts.
 */
export type FocusModality = 'keyboard' | 'pointer';

export const FOCUS_MODALITY_ATTRIBUTE = 'data-crewlet-focus';

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn']);

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'time', 'week']);

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type);
  // `isContentEditable` where the platform has it, and the attribute where it
  // does not (jsdom never implements it), so an editor's body counts too.
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

interface Tracker {
  count: number;
  release: () => void;
}

const trackers = new WeakMap<Document, Tracker>();

/**
 * Start tracking the modality on `doc`, and return the release. Safe to call
 * any number of times: the listeners are installed once per document. An
 * application may call it at boot, so the very first key a reader presses
 * (Enter on the link that opened a page with a field already focused) is seen
 * before any field has mounted.
 */
export function trackFocusModality(doc: Document = document): () => void {
  let tracker = trackers.get(doc);
  if (!tracker) {
    const root = doc.documentElement;
    const set = (modality: FocusModality) => {
      if (root.getAttribute(FOCUS_MODALITY_ATTRIBUTE) !== modality) root.setAttribute(FOCUS_MODALITY_ATTRIBUTE, modality);
    };
    const onKey = (event: KeyboardEvent) => {
      if (MODIFIERS.has(event.key) || event.metaKey || event.ctrlKey) return;
      if (event.key === 'Tab' || !isTextEntry(event.target)) set('keyboard');
    };
    const onPointer = () => set('pointer');
    if (!root.hasAttribute(FOCUS_MODALITY_ATTRIBUTE)) set('pointer');
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('pointerdown', onPointer, true);
    const created: Tracker = {
      count: 0,
      release: () => {
        doc.removeEventListener('keydown', onKey, true);
        doc.removeEventListener('pointerdown', onPointer, true);
        root.removeAttribute(FOCUS_MODALITY_ATTRIBUTE);
        trackers.delete(doc);
      },
    };
    trackers.set(doc, created);
    tracker = created;
  }
  const held = tracker;
  held.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held.count -= 1;
    if (held.count === 0) held.release();
  };
}

/** Track the modality for as long as the calling component is mounted. */
export function useFocusModality(): void {
  useLayoutEffect(() => trackFocusModality(), []);
}
