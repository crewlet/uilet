/**
 * A keyboard shortcut that belongs to the PAGE.
 *
 * WHY IT IS NOT A `keydown` LISTENER. Four rules separate a shortcut that
 * works from one that fires in the wrong place, and every one of them was a
 * defect somewhere before it was a rule here:
 *
 * - NOT A PRESS SOMETHING ELSE HAS ALREADY HANDLED. A surface that closes on
 *   its own chord calls `preventDefault`, and a second handler acting on the
 *   same press undoes what the first one did.
 * - NOT A PRESS AN INPUT METHOD IS COMPOSING. Somebody typing Japanese,
 *   Chinese or Korean builds each word in a composition, whose Enter, Escape
 *   and arrows still reach the page as key presses. See `isComposing`.
 * - NOT WHILE A MODAL HOLDS THE KEYBOARD. `aria-modal` says the page behind a
 *   dialog cannot be reached, and a page shortcut that fires through it breaks
 *   that in the most expensive way available: search opened over a dialog can
 *   navigate, the navigation unmounts the dialog, and a write whose outcome
 *   nobody has seen goes with it.
 * - NOT A BARE KEY WHILE SOMEBODY IS TYPING. A slash is a search shortcut on
 *   an empty page and a character in a filter box. The set of what counts as
 *   typing includes `select`, which the dashboard this is ported from left
 *   out: a slash pressed on a focused native select opened search instead of
 *   jumping to the option the reader was spelling.
 */

import { useEffect, useRef } from 'react';
import { isComposing, isModalLayerOpen } from '../Layer/index.js';

/**
 * A press with modifiers. `mod` is the platform's command key: Command on an
 * Apple keyboard, Control everywhere else, so one binding is right on both.
 */
export interface ShortcutChord {
  /** The key as the browser reports it, compared without case for a letter. */
  key: string;
  mod?: boolean | undefined;
  shift?: boolean | undefined;
  alt?: boolean | undefined;
}

/** A bare key (`'/'`, `'?'`) or a chord. */
export type ShortcutKey = string | ShortcutChord;

/**
 * What a bare key must not be pressed into.
 *
 * The roles are here because a custom control is no less a field than an
 * `input`: a combobox built from a div takes the letters a reader types, and
 * the page must not read them as its own.
 */
const TYPING_ROLES = new Set(['combobox', 'listbox', 'textbox', 'searchbox', 'spinbutton']);

/** Whether the element holding focus is taking the reader's typing. */
function isTyping(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true;
  /*
   * BOTH, because neither alone is enough. `isContentEditable` is inherited,
   * so it is the only one that answers for a child of an editable region; the
   * attribute is the only one jsdom answers at all, and a suite that could not
   * exercise this line would be a rule nothing holds.
   */
  if (element.isContentEditable || element.closest('[contenteditable=""],[contenteditable="true"]') !== null) {
    return true;
  }
  const role = element.getAttribute('role');
  return role !== null && TYPING_ROLES.has(role);
}

function sameKey(pressed: string, wanted: string): boolean {
  // Case-insensitively, because Shift and Caps Lock change the character a
  // letter key reports while the shortcut it belongs to is the same one.
  return pressed.toLowerCase() === wanted.toLowerCase();
}

/**
 * Whether this press is one of these shortcuts.
 *
 * Exported because a surface sometimes has to answer the same question about
 * a press it is handed rather than about one it subscribed to: a command
 * palette closes on the chord that opened it, and two spellings of "is this
 * that chord" is how the two come to disagree.
 */
export function matchesShortcut(event: KeyboardEvent, keys: readonly ShortcutKey[]): boolean {
  const chord = event.ctrlKey || event.metaKey;
  for (const entry of keys) {
    if (typeof entry === 'string') {
      // A BARE key is bare: with Control, Command or Alt it belongs to the
      // browser or the platform, and is not this shortcut at all.
      if (!chord && !event.altKey && sameKey(event.key, entry) && !isTyping(document.activeElement)) return true;
      continue;
    }
    if (!sameKey(event.key, entry.key)) continue;
    // EXACTLY these modifiers. Otherwise Shift+Control+Z, which is redo
    // everywhere, would also be read as the undo it shares a letter with.
    if (chord !== Boolean(entry.mod)) continue;
    if (event.shiftKey !== Boolean(entry.shift)) continue;
    if (event.altKey !== Boolean(entry.alt)) continue;
    return true;
  }
  return false;
}

export interface ShortcutOptions {
  /** The presses that fire it. */
  keys: readonly ShortcutKey[];
  /** What to do. The press is already claimed with `preventDefault` by then. */
  onKey: (event: KeyboardEvent) => void;
  /**
   * `page` is a shortcut the page owns, silent while a modal is open.
   *
   * `any` is for a shortcut owned by a surface that is itself up, because a
   * surface cannot use `page`: it IS the modal that would silence it. It is
   * NOT a way out of the modal rule, and the caller owes the other half of
   * it: pass `enabled: isTopmost` from that surface's own `useModalLayer`, so
   * the chord belongs to whichever surface holds the keyboard. Bound without
   * it, a palette's own chord closes the palette from beneath a dialog raised
   * over it, and focus lands behind that dialog's veil.
   */
  scope?: 'page' | 'any' | undefined;
  /** False to unbind it, for a shortcut that belongs to a state. */
  enabled?: boolean | undefined;
}

/** Binds `keys` for as long as the component is mounted and `enabled`. */
export function useShortcut({ keys, onKey, scope = 'page', enabled = true }: ShortcutOptions): void {
  /*
   * The binding read through a ref, written during render: `keys` is almost
   * always a fresh array and `onKey` a fresh closure, so an effect that
   * depended on either would unsubscribe and resubscribe on every render of
   * every page that uses one.
   */
  const latest = useRef({ keys, onKey });
  latest.current = { keys, onKey };

  useEffect(() => {
    if (!enabled) return;
    function handle(event: KeyboardEvent): void {
      if (event.defaultPrevented || isComposing(event)) return;
      if (scope === 'page' && isModalLayerOpen()) return;
      if (!matchesShortcut(event, latest.current.keys)) return;
      // Claimed before it is acted on: the shortcut has taken the press, and
      // nothing beneath it, the browser's own binding included, may take it
      // as well.
      event.preventDefault();
      latest.current.onKey(event);
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, scope]);
}
