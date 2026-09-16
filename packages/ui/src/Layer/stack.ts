/**
 * The layer stack: which open surface a key press or a press outside belongs to.
 *
 * WHY IT EXISTS. Every overlay in this package used to put its own Escape
 * listener on the document, so one press closed a Select, the Modal around it
 * and the page's own dialog together; a backdrop press closed two layers at
 * once; and nothing trapped Tab, so a keyboard reader walked straight out of a
 * dialog into the page behind its veil. Two shells getting those rules right
 * separately is how the two come to disagree.
 *
 * THE RULES IT KEEPS.
 *
 * - ONE STACK holding modals (a dialog, a sheet) and popups (a menu, a
 *   listbox). Only the TOPMOST entry handles Escape and a press outside, so an
 *   open menu inside a dialog closes first, then the dialog.
 * - ORDER IS OPENING ORDER, taken when the surface renders open rather than
 *   when its effect runs: React runs a child's effects before its parent's, so
 *   a dialog mounted inside a sheet in the same commit would otherwise
 *   register first and end up beneath the sheet it sits on.
 * - A MODAL TRAPS TAB. Focus cycles inside the topmost modal, and Tab from
 *   anywhere outside it comes back in. There is no exception for a modal the
 *   stack does not know: a hand-rolled one raised over a sheet would have its
 *   Tab pulled back into the sheet and its Escape taken by the sheet beneath
 *   it, which is why every overlay in this package is on the stack.
 * - FOCUS GOES IN ON OPEN, unless something inside already took it (a field
 *   with `autoFocus`), and GOES BACK ON CLOSE to whatever held it when the
 *   modal first rendered. That is captured during RENDER on purpose: by the
 *   time an effect runs, `autoFocus` has already moved focus into the modal,
 *   and a capture taken then would restore focus to an element that no longer
 *   exists. When that element has gone because it sat in a modal that closed
 *   as this one opened, focus goes where that modal would have sent it; when
 *   it has gone from a modal that is still open, to that modal's panel, never
 *   behind its veil (`returnChain`). A modal that closes BENEATH another
 *   surface still open above it returns nothing: focus is in that surface.
 * - A VEIL CLOSES ONLY ITS OWN MODAL, and only when the press lands on the
 *   veil itself. The decision is taken on `pointerdown`, before any surface
 *   closes, so the press that dismisses a menu is never also read as a press
 *   on the veil beneath it. The CLOSE waits for that press's `click`: a veil
 *   removed on `pointerdown` is gone before a tap's compatibility mouse events
 *   are hit-tested, so the click a finger ends with would land on whatever the
 *   veil was covering, such as a Delete button behind a dialog.
 * - A CONTROL THAT CONSUMES ESCAPE KEEPS IT. A completion list that closes on
 *   Escape calls `preventDefault` or stops propagation, and the stack leaves
 *   that press alone. So does an input method mid-composition (`isComposing`):
 *   its Escape abandons a word, and its Tab is its own.
 * - A SURFACE'S Z-INDEX IS ITS DEPTH IN THE STACK, inside a band of its own
 *   (`--z-index-layer-base` to `--z-index-layer-max`), never a counter that
 *   only grows. The token scale leaves two free steps above a modal (popover,
 *   then toast), so a counter would put the second dialog of a session at the
 *   popover level, the third at the toast level, and everything after that
 *   permanently above the toast. A toast reports what a write inside a dialog
 *   did; it has to paint above it.
 *
 * WHAT IT DOES NOT OWN: markup, copy, and whether closing is allowed right
 * now. A modal mid-write passes `dismissable: false`.
 *
 * ONE STACK PER DOCUMENT, EVEN WITH TWO COPIES OF THE PACKAGE. It lives under
 * `Symbol.for('crewlet.layer-stack')` on `globalThis`, because a consumer that
 * ends up with two versions of @crewlethq/ui installed would otherwise get two
 * module-level arrays, and a dialog on one of them would not know about a menu
 * on the other: Escape would close both, and Tab would leave.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { zIndex } from '@crewlethq/tokens';

export type LayerKind = 'modal' | 'popup';

/** Why a surface is being dismissed. */
export type DismissReason = 'escape' | 'outside' | 'tab';

interface Entry {
  kind: LayerKind;
  order: number;
  /** The surface itself: a modal's panel, a popup's list. */
  panel: () => HTMLElement | null;
  /** Where a modal hands focus back on close, first choice first. */
  returnTo: readonly Element[];
  /** A modal's veil, whose own presses close it. */
  veil: () => HTMLElement | null;
  /** Elements a press inside does not count as outside, such as a menu's trigger. */
  inside: () => (HTMLElement | null)[];
  dismiss: (reason: DismissReason) => void;
  dismissable: () => boolean;
}

interface Shared {
  entries: Entry[];
  opened: number;
  /** The modal whose veil the current press began on, closed by that press's click. */
  armed: Entry | null;
  listeners: Set<() => void>;
  /** Bumped on every push and pop, so a subscriber re-reads the stack. */
  version: number;
  /** How many surfaces are holding the body's scroll, and what to give back. */
  locks: number;
  restore: string | null;
}

const KEY = Symbol.for('crewlet.layer-stack');

function sharedStack(): Shared {
  const host = globalThis as unknown as Record<symbol, Shared | undefined>;
  const existing = host[KEY];
  if (existing) return existing;
  const fresh: Shared = {
    entries: [],
    opened: 0,
    armed: null,
    listeners: new Set(),
    version: 0,
    locks: 0,
    restore: null,
  };
  host[KEY] = fresh;
  return fresh;
}

const shared = sharedStack();

function changed(): void {
  shared.version += 1;
  for (const listener of [...shared.listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  shared.listeners.add(listener);
  return () => shared.listeners.delete(listener);
}

function top(kind?: LayerKind): Entry | undefined {
  let found: Entry | undefined;
  for (const entry of shared.entries) {
    if (kind && entry.kind !== kind) continue;
    if (!found || entry.order > found.order) found = entry;
  }
  return found;
}

/** The band a surface's z-index is drawn from, read from the token source. */
const BAND = { base: Number(zIndex.layerBase), max: Number(zIndex.layerMax) };

/** How many open surfaces sit below `order`, which is what its z-index is. */
function depthOf(order: number): number {
  let below = 0;
  for (const entry of shared.entries) if (entry.order < order) below += 1;
  return below;
}

function zIndexOf(order: number): number {
  if (order === 0) return BAND.base;
  return Math.min(BAND.base + depthOf(order), BAND.max);
}

/** The key code a browser reports for a press its input method consumed. */
const IME_PROCESS_KEY = 229;

/**
 * Whether this press belongs to an input method's composition rather than to
 * the page.
 *
 * Somebody typing Japanese, Chinese or Korean builds each word in a
 * composition: the arrows walk the candidates, Enter accepts one and Escape
 * abandons it. Those presses still reach the page as `keydown`, so a list that
 * read that Enter as "take the highlighted option", or a modal that read that
 * Escape as "close", acted on a key the reader pressed for the input method.
 *
 * Browsers flag such a press with `isComposing`. Safari delivers the Enter
 * that ENDS a composition after it has already cleared that flag, marked only
 * by the legacy key code 229, so both are read. One definition, because a
 * primitive checking only the flag would act on that Enter in Safari while the
 * others did not.
 */
export function isComposing(event: { isComposing?: boolean; keyCode?: number; nativeEvent?: unknown }): boolean {
  const native = (('nativeEvent' in event && event.nativeEvent) || event) as {
    isComposing?: boolean;
    keyCode?: number;
  };
  return Boolean(native.isComposing) || native.keyCode === IME_PROCESS_KEY;
}

/**
 * What a keyboard user can Tab to inside `root`, in document order.
 *
 * Exported because a surface choosing where focus starts needs the same answer
 * the trap uses; two selectors would disagree about a disabled button.
 */
export function focusables(root: Element): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    "input:not([disabled]):not([type='hidden'])",
    'select:not([disabled])',
    'textarea:not([disabled])',
    "[contenteditable='true']",
    '[tabindex]',
  ].join(',');
  return [...root.querySelectorAll<HTMLElement>(selector)].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !(el as HTMLButtonElement).disabled &&
      !el.closest('[hidden],[inert]') &&
      // RENDERED, where the browser can say so. A control under `display:
      // none` is skipped by Tab, and a trap that counted it as the last stop
      // would let focus walk past the real last one and out.
      (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
  );
}

function onKeyDown(event: KeyboardEvent): void {
  if (isComposing(event)) return;
  if (event.key === 'Escape') {
    if (event.defaultPrevented) return;
    const entry = top();
    if (!entry) return;
    // Handled whether or not it closes: a modal that refuses to close right
    // now still owns the key, and nothing beneath it may take it instead.
    event.preventDefault();
    if (entry.dismissable()) entry.dismiss('escape');
    return;
  }
  if (event.key !== 'Tab') return;
  const modal = top('modal');
  const panel = modal?.panel();
  if (!modal || !panel) return;
  // A popup above the modal that still holds focus decides Tab for itself. One
  // that has just handed focus back (a menu closes on Tab and returns focus to
  // its trigger before this listener runs) is still registered until React
  // re-renders, and must not let that Tab walk out of the modal.
  const popup = top('popup');
  const active = document.activeElement;
  if (popup && popup.order > modal.order && active && popup.panel()?.contains(active)) return;
  const inside = focusables(panel);
  if (inside.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }
  const first = inside[0]!;
  const last = inside[inside.length - 1]!;
  if (!(active instanceof Node) || !panel.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  // BY DOCUMENT POSITION, not by identity with the first or last stop. Focus
  // can rest inside on something Tab never stops at (the panel itself, a
  // roving item with tabindex -1), and from one of those past the last stop
  // the browser's own Tab would leave the modal.
  const after = (el: HTMLElement) =>
    (active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  if (event.shiftKey && !inside.some((el) => el !== active && !after(el))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && !inside.some((el) => el !== active && after(el))) {
    event.preventDefault();
    first.focus();
  }
}

function onPointerDown(event: PointerEvent): void {
  shared.armed = null;
  const entry = top();
  if (!entry || !(event.target instanceof Node)) return;
  const target = event.target;
  if (entry.kind === 'modal') {
    if (target === entry.veil()) shared.armed = entry;
    return;
  }
  const inside = [entry.panel(), ...entry.inside()];
  if (inside.some((el) => el?.contains(target))) return;
  if (entry.dismissable()) entry.dismiss('outside');
}

function onClick(event: MouseEvent): void {
  const entry = shared.armed;
  shared.armed = null;
  // Still the topmost, and still its veil that was pressed: a surface opened
  // between the press and its click owns the press now.
  if (!entry || entry !== top() || event.target !== entry.veil()) return;
  if (entry.dismissable()) entry.dismiss('outside');
}

function register(entry: Entry): () => void {
  if (shared.entries.length === 0) {
    document.addEventListener('keydown', onKeyDown);
    // CAPTURE, so the decision is made before any handler on the page reacts
    // to the press and before a surface that closes because of it unmounts.
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick, true);
  }
  shared.entries.push(entry);
  changed();
  return () => {
    const at = shared.entries.indexOf(entry);
    if (at >= 0) shared.entries.splice(at, 1);
    if (shared.armed === entry) shared.armed = null;
    if (shared.entries.length === 0) {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
    }
    changed();
  };
}

/**
 * The opening order of a surface that is open now, taken during render.
 *
 * A ref written during render, which React otherwise discourages: a render
 * that is thrown away only spends a number, and the order among the renders
 * that commit is still the order the surfaces opened in.
 */
function useOpeningOrder(open: boolean): number {
  const ref = useRef(0);
  if (open && ref.current === 0) ref.current = ++shared.opened;
  if (!open) ref.current = 0;
  return ref.current;
}

/**
 * Where a modal opening now hands focus back when it closes, first choice
 * first, read during its first render.
 *
 * The opener alone is not enough when it lives inside another modal. A control
 * in one modal often closes that modal and opens the next in one gesture, so
 * by the time the new modal closes its opener has been unmounted and focus
 * restored to a detached element lands on the page body. The chain carries on
 * from there: the host modal's panel, so focus never goes behind a veil that
 * is still up, and then wherever the host itself would have returned focus.
 */
function returnChain(opener: Element | null): Element[] {
  if (!opener) return [];
  let host: Entry | undefined;
  for (const entry of shared.entries) {
    if (entry.kind !== 'modal' || !entry.panel()?.contains(opener)) continue;
    if (!host || entry.order > host.order) host = entry;
  }
  const panel = host?.panel();
  return host && panel ? [opener, panel, ...host.returnTo] : [opener];
}

/**
 * Whether a modal is open, which makes everything behind it inert.
 *
 * For a shortcut that belongs to the page rather than to any surface, such as
 * a shell's search. `aria-modal` tells a screen reader that nothing behind the
 * dialog can be reached, and a page shortcut that fires through it breaks that
 * in the most expensive way: search opened over a dialog navigates, and the
 * navigation unmounts the dialog, a write still in flight included. A popup
 * does not count: it is not modal, and the page's keys still reach past a
 * menu.
 */
export function isModalLayerOpen(): boolean {
  return top('modal') !== undefined;
}

/** How the stack reports itself to a component that has to re-render with it. */
function useLayerPosition(order: number): { zIndex: number; isTopmost: boolean } {
  useSyncExternalStore(
    subscribe,
    () => shared.version,
    () => 0,
  );
  return {
    zIndex: zIndexOf(order),
    isTopmost: order !== 0 && top()?.order === order,
  };
}

export interface ModalLayerOptions {
  onClose: () => void;
  /** False while a request is in flight: Escape and the veil stop closing. */
  dismissable?: boolean | undefined;
  /**
   * Where focus starts when nothing inside has taken it, if not the first
   * control. A sheet's first control is its Close button, and an editor that
   * opens with focus on Close has made closing the first thing it asks.
   */
  initialFocus?: (() => HTMLElement | null) | undefined;
}

export interface ModalLayer {
  /** The dialog element: focus goes into it and Tab stays in it. */
  panelRef: (el: HTMLElement | null) => void;
  /** The veil behind it: a press on the veil itself closes the modal. */
  veilRef: (el: HTMLElement | null) => void;
  /** This surface's place in the band, to put on the veil. */
  zIndex: number;
  /** Whether this surface is the one a key press would reach now. */
  isTopmost: boolean;
}

/** A modal surface: a dialog or a sheet. Mount it only while it is open. */
export function useModalLayer({ onClose, dismissable = true, initialFocus }: ModalLayerOptions): ModalLayer {
  const panel = useRef<HTMLElement | null>(null);
  const veil = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  const canClose = useRef(dismissable);
  const start = useRef(initialFocus);
  close.current = onClose;
  canClose.current = dismissable;
  start.current = initialFocus;
  const order = useOpeningOrder(true);
  // WHERE FOCUS CAME FROM, read during the first render. See the module doc
  // for why an effect is too late.
  const [back] = useState<readonly Element[]>(() =>
    typeof document === 'undefined' ? [] : returnChain(document.activeElement),
  );
  const position = useLayerPosition(order);

  useLayoutEffect(
    () =>
      register({
        kind: 'modal',
        order,
        panel: () => panel.current,
        returnTo: back,
        veil: () => veil.current,
        inside: () => [],
        dismiss: () => close.current(),
        dismissable: () => canClose.current,
      }),
    [order, back],
  );

  /*
   * A PASSIVE effect, and that is load bearing on the way OUT. React runs a
   * deleted subtree's layout cleanups during the mutation phase, before it
   * applies the updates elsewhere in the same commit, so a layout cleanup here
   * would hand focus back to an opener that the confirmed action is about to
   * remove or disable one step later, and focus would fall to the page body
   * behind the veil. After the commit, the chain below sees the page as it
   * actually ended up.
   */
  useEffect(() => {
    const root = panel.current;
    if (root && !root.contains(document.activeElement)) {
      // The surface's chosen start, else the first control, else the panel
      // itself, so a screen reader announces the label rather than carrying on
      // behind the veil.
      (start.current?.() ?? focusables(root)[0] ?? root).focus();
    }
    return () => {
      // NEVER FROM BENEATH ANOTHER SURFACE. A modal can close while one that
      // opened after it is still up (a route change or a shortcut closes it,
      // not its own Escape). Focus is inside that surface, which this one has
      // already left the stack for by now, and handing focus back here would
      // move it behind a veil that is still up.
      const holder = document.activeElement;
      if (holder && shared.entries.some((entry) => entry.panel()?.contains(holder))) return;
      // THE FIRST THAT TAKES IT, not the first still on the page. Being
      // connected does not make an element focusable: an opener can be
      // disabled by the action its modal confirmed, and a host panel can
      // outlive its modal. `focus()` on either does nothing, and stopping
      // there left focus on the body.
      for (const el of back) {
        if (!(el instanceof HTMLElement) || !el.isConnected || el === document.body) continue;
        el.focus();
        if (document.activeElement === el) return;
      }
    };
  }, [back]);

  const panelRef = useCallback((el: HTMLElement | null) => {
    panel.current = el;
  }, []);
  const veilRef = useCallback((el: HTMLElement | null) => {
    veil.current = el;
  }, []);
  return { panelRef, veilRef, ...position };
}

export interface PopupLayerOptions {
  open: boolean;
  /** Called on Escape and on a press outside the popup and its `inside` elements. */
  onDismiss: (reason: DismissReason) => void;
}

export interface PopupLayer {
  /** The popup surface. */
  panelRef: (el: HTMLElement | null) => void;
  /** An element a press on does not dismiss, such as the button that toggles it. */
  insideRef: (el: HTMLElement | null) => void;
  zIndex: number;
  isTopmost: boolean;
}

/**
 * A non-modal popup on the same stack: a menu, a listbox. It traps nothing,
 * and it closes before anything beneath it.
 */
export function usePopupLayer({ open, onDismiss }: PopupLayerOptions): PopupLayer {
  const panel = useRef<HTMLElement | null>(null);
  const inside = useRef<HTMLElement | null>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const order = useOpeningOrder(open);
  const position = useLayerPosition(order);

  useLayoutEffect(() => {
    if (!open) return;
    return register({
      kind: 'popup',
      order,
      panel: () => panel.current,
      // A popup hands focus back itself (a menu to its trigger), and nothing
      // is ever opened from inside one: an action gives focus back first.
      returnTo: [],
      veil: () => null,
      inside: () => [inside.current],
      dismiss: (reason) => dismiss.current(reason),
      dismissable: () => true,
    });
  }, [open, order]);

  const panelRef = useCallback((el: HTMLElement | null) => {
    panel.current = el;
  }, []);
  const insideRef = useCallback((el: HTMLElement | null) => {
    inside.current = el;
  }, []);
  return { panelRef, insideRef, ...position };
}

/**
 * Holding the document's scroll while a surface is up, counted.
 *
 * REF COUNTED, because two modals can be open at once and each writes
 * `document.body.style.overflow` on the way in and gives it back on the way
 * out. Written as two independent effects, the inner one's cleanup restores
 * the scroll while the outer modal is still up, and the page behind a dialog
 * starts scrolling under it. The FIRST lock records what to give back, so a
 * host page that had its own overflow keeps it.
 */
export function useBodyScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active || typeof document === 'undefined') return;
    if (shared.locks === 0) {
      shared.restore = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    shared.locks += 1;
    return () => {
      shared.locks -= 1;
      if (shared.locks === 0) {
        document.body.style.overflow = shared.restore ?? '';
        shared.restore = null;
      }
    };
  }, [active]);
}

/** How many surfaces are on the stack. Exported for the package's own suites. */
export function layerCount(): number {
  return shared.entries.length;
}
