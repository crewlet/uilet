/**
 * The browser's fullscreen, for one element.
 *
 * WHAT IT IS FOR. A canvas, a chart or a diagram is the one thing on a screen
 * that genuinely wants the whole window, and it is drawn from ONE element's
 * subtree: a fullscreen element renders only what is inside it, so the surface
 * that goes fullscreen has to be the one holding its own toolbar, its dialogs
 * and its overlays. That is also why an overlay portals into the nearest
 * `LayerHost` rather than into the body (see the Layer module): portalled to
 * the body it would be outside the fullscreen element and simply not painted.
 *
 * NOT DRAWN WHERE THE API IS MISSING. iPhone Safari offers no element
 * fullscreen at all, and a control that is drawn and then fails is worse than
 * one that was never there, so `supported` is what a caller renders on.
 *
 * `supported` ASKS THE DOCUMENT, NOT THE ELEMENT. The engine's version read
 * the element's own `requestFullscreen` in an effect, which answers false for
 * as long as the ref is empty: a control inside a panel that mounts later was
 * never drawn at all, on browsers that support it perfectly well.
 */

import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface Fullscreen {
  /** Whether this browser offers element fullscreen. A control that draws on it. */
  supported: boolean;
  /** Whether THIS element is the one the document is showing fullscreen. */
  active: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
}

function fullscreenSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.fullscreenEnabled === true &&
    typeof Element.prototype.requestFullscreen === 'function'
  );
}

/** Drives fullscreen for `ref`, and reports whether it is the element showing. */
export function useFullscreen(ref: RefObject<HTMLElement | null>): Fullscreen {
  // Once per session: a browser does not gain or lose the API while a page is
  // open, and the permission it also depends on is reported per attempt.
  const [supported] = useState(fullscreenSupported);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const read = () => setActive(document.fullscreenElement === ref.current);
    // Read once on mount as well: an element can already be fullscreen when
    // this mounts, because a fullscreen surface re-renders its own subtree.
    read();
    document.addEventListener('fullscreenchange', read);
    return () => document.removeEventListener('fullscreenchange', read);
  }, [supported, ref]);

  const enter = useCallback(() => {
    const element = ref.current;
    if (!element || !supported || document.fullscreenElement === element) return;
    // A REFUSAL IS NOT A CRASH. The request needs a user gesture and a
    // permission policy that allows it, and an unhandled rejection in a click
    // handler is how a denied request becomes a console error nobody can act
    // on. The control simply stays as it was.
    void element.requestFullscreen().catch(() => {});
  }, [ref, supported]);

  const exit = useCallback(() => {
    // Only ours. Leaving somebody else's fullscreen would be a surface acting
    // outside itself.
    if (typeof document === 'undefined' || document.fullscreenElement !== ref.current) return;
    if (typeof document.exitFullscreen !== 'function') return;
    void document.exitFullscreen().catch(() => {});
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement === ref.current) exit();
    else enter();
  }, [enter, exit, ref]);

  return { supported, active, enter, exit, toggle };
}
