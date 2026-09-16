import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from '@crewlethq/tokens';
import {
  LAYER_GAP,
  LAYER_REPOSITION_EVENT,
  outsideBounds,
  placePopup,
  useLayerContainer,
  usePopupLayer,
  viewportBounds,
  type PlacementRect,
} from '../Layer/index.js';
import { cx } from '../utils/cx.js';

export type TooltipPlacement = 'top' | 'bottom';

export interface TooltipProps {
  /** One short line. A tooltip is not a place to put a list or a paragraph. */
  content: ReactNode;
  /** The preferred side. It flips when there is not room and there is more room the other way. */
  placement?: TooltipPlacement | undefined;
  /** Nothing opens: for a trigger whose tip is only worth showing sometimes. */
  disabled?: boolean | undefined;
  /** Milliseconds a pointer rests on the trigger before the panel appears. Focus never waits. */
  openDelay?: number | undefined;
  /**
   * Milliseconds the panel survives the pointer leaving, which is what makes it
   * HOVERABLE: the pointer has to cross the gap between the trigger and the
   * panel, and a panel that closed the instant the pointer left the trigger
   * could never be reached.
   */
  closeDelay?: number | undefined;
  className?: string | undefined;
  /** Exactly one element: the control the tip belongs to. */
  children: ReactElement;
}

/** A motion token as a number of milliseconds, for a delay JavaScript has to count. */
function ms(value: string): number {
  return Number.parseFloat(value);
}

/**
 * Hands an element to the trigger's OWN ref as well as to this component's.
 *
 * The trigger is cloned with a ref of this component's making, and a ref the
 * caller had already put on it would otherwise be dropped in silence: a Menu
 * trigger that has to be focused again when its menu closes, a list's Move
 * button a parent scrolls to, a measured control, all of them simply stop
 * being handed their element the day somebody wraps them in a tip.
 *
 * A cleanup is always returned, so the ref a caller wrote in either supported
 * shape is released the way React would have released it: the callback form
 * that returns its own teardown gets that teardown called, and one that does
 * not is called with null, exactly as React does for a ref it owns.
 */
function attach(ref: Ref<HTMLElement> | undefined, el: HTMLElement | null): () => void {
  if (typeof ref === 'function') {
    const release = ref(el);
    return typeof release === 'function' ? release : () => void ref(null);
  }
  if (!ref) return () => {};
  const box = ref as RefObject<HTMLElement | null>;
  box.current = el;
  return () => {
    box.current = null;
  };
}

/*
 * The two delays, and why they are these values.
 *
 * OPENING waits `slow` (300ms). A tooltip that appears the moment a pointer
 * touches a control flashes a panel at every control the pointer crosses on
 * its way somewhere else, which is the single most common complaint about
 * them. It is the longest duration the motion scale carries, and it is the
 * pause that reads as "resting on" rather than "passing over".
 *
 * CLOSING waits `base` (150ms), and it is not decoration either: it is the
 * grace period the pointer needs to cross the gap from the trigger onto the
 * panel. WCAG 2.2 requires that content shown on hover be hoverable, and a
 * panel that vanished on `pointerleave` fails that outright.
 */
const OPEN_DELAY = ms(motion.duration.slow);
const CLOSE_DELAY = ms(motion.duration.base);

/**
 * Tooltip: one short line about the control under the pointer.
 *
 * IT IS NEVER THE ONLY CARRIER OF ANYTHING A READER NEEDS. A tooltip is not
 * reachable by touch, it is not read by a screen reader until the control it
 * belongs to is focused, and it is gone the moment the pointer moves. Anything
 * a reader must have is on the page. This is a hint about a control that
 * already has a name.
 *
 * IT IS ONE LINE. A list of paths, a table of values or a paragraph belongs in
 * a `Popover` with `role="dialog"` or in a `Disclosure`, both of which a reader
 * can keep open and scroll.
 *
 * THE THREE RULES OF WCAG 2.2's 1.4.13, and this component exists because all
 * three are easy to miss:
 *
 * - DISMISSABLE. Escape closes it without moving focus, through the layer
 *   stack, so it closes before the dialog it sits in.
 * - HOVERABLE. The pointer may travel from the trigger onto the panel without
 *   the panel closing, which is what `closeDelay` buys.
 * - PERSISTENT. It stays until the pointer and focus have both left or Escape
 *   is pressed. NOTHING HIDES IT ON A TIMER: a reader who needs longer than
 *   somebody else's idea of long enough is exactly the reader this is for.
 *
 * It is linked by `aria-describedby` rather than `aria-labelledby`: the
 * control has a name already, and replacing it with the hint is how a Close
 * button came to be announced as "Closing is unavailable until this finishes".
 */
export function Tooltip({
  content,
  placement = 'top',
  disabled = false,
  openDelay = OPEN_DELAY,
  closeDelay = CLOSE_DELAY,
  className,
  children,
}: TooltipProps) {
  const id = useId();
  const panelId = `${id}-tooltip`;
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Hover and focus are counted separately: a control focused by the keyboard
  // and then passed over by the pointer must not close when the pointer leaves.
  const over = useRef({ pointer: false, focus: false });
  const [place, setPlace] = useState<{ left: number; top: number; side: 'above' | 'below' } | null>(null);
  const container = useLayerContainer();

  const clear = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const show = useCallback(
    (delay: number) => {
      clear();
      if (disabled) return;
      if (delay <= 0) {
        setOpen(true);
        return;
      }
      timer.current = setTimeout(() => setOpen(true), delay);
    },
    [clear, disabled],
  );

  const hide = useCallback(
    (delay: number) => {
      clear();
      const leave = () => {
        if (over.current.pointer || over.current.focus) return;
        setOpen(false);
      };
      if (delay <= 0) {
        leave();
        return;
      }
      timer.current = setTimeout(leave, delay);
    },
    [clear],
  );

  // Escape, and a press anywhere else, close it at once: a reader dismissing a
  // panel has already decided, and a delay there is just a panel that ignores
  // them.
  const layer = usePopupLayer({ open, onDismiss: () => { over.current = { pointer: false, focus: false }; clear(); setOpen(false); } });

  useEffect(() => clear, [clear]);
  useEffect(() => {
    if (disabled) {
      clear();
      setOpen(false);
    }
  }, [disabled, clear]);

  const position = useCallback(() => {
    const at = anchor.current;
    const box = panel.current;
    if (!at || !box || !container) return;
    const inHost = container !== document.body;
    const host = inHost ? container.getBoundingClientRect() : viewportBounds();
    const rect = at.getBoundingClientRect();
    const own = box.getBoundingClientRect();
    /*
     * CENTRED on the trigger, which `placePopup` does not do for itself: it
     * aligns a panel to its anchor's start, which is right for a menu hanging
     * off a button and wrong for a label about one. Handing it an anchor whose
     * start is already the centred position keeps the clamping, the flip and
     * the bounds in one place rather than reimplementing them here.
     */
    const local: PlacementRect = {
      x: rect.x + rect.width / 2 - own.width / 2 - (inHost ? host.x : 0),
      y: rect.y - (inHost ? host.y : 0),
      width: rect.width,
      height: rect.height,
    };
    const whole: PlacementRect = { x: 0, y: 0, width: host.width, height: host.height };
    const bounds: PlacementRect = {
      x: LAYER_GAP,
      y: LAYER_GAP,
      width: host.width - 2 * LAYER_GAP,
      height: host.height - 2 * LAYER_GAP,
    };
    if (outsideBounds({ ...local, x: rect.x - (inHost ? host.x : 0) }, whole)) {
      setOpen(false);
      return;
    }
    const spot = placePopup(local, { width: own.width, height: own.height }, bounds, LAYER_GAP, placement === 'top' ? 'above' : 'below');
    setPlace((was) =>
      was && was.left === spot.left && was.top === spot.top && was.side === spot.side ? was : spot,
    );
  }, [container, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onLayout = () => position();
    container?.addEventListener(LAYER_REPOSITION_EVENT, onLayout);
    window.addEventListener('resize', onLayout);
    // Capture, so a scroll in any ancestor is heard and not only the window's.
    window.addEventListener('scroll', onLayout, true);
    return () => {
      container?.removeEventListener(LAYER_REPOSITION_EVENT, onLayout);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, container, position]);

  useEffect(() => {
    if (!open) setPlace(null);
  }, [open]);

  const child = children as ReactElement<Record<string, unknown>>;
  const describedBy = child.props['aria-describedby'] as string | undefined;
  const ownRef = child.props['ref'] as Ref<HTMLElement> | undefined;
  const trigger = cloneElement(child, {
    ref: (el: HTMLElement | null) => {
      anchor.current = el;
      layer.insideRef(el);
      const release = attach(ownRef, el);
      return () => {
        anchor.current = null;
        layer.insideRef(null);
        release();
      };
    },
    'aria-describedby': open ? cx(describedBy, panelId) : describedBy,
    onPointerEnter: (event: PointerEvent) => {
      over.current.pointer = true;
      show(openDelay);
      (child.props['onPointerEnter'] as ((e: PointerEvent) => void) | undefined)?.(event);
    },
    onPointerLeave: (event: PointerEvent) => {
      over.current.pointer = false;
      hide(closeDelay);
      (child.props['onPointerLeave'] as ((e: PointerEvent) => void) | undefined)?.(event);
    },
    // Focus opens with NO delay: a keyboard reader who reached this control
    // asked for it, and there is no pointer passing over anything.
    onFocus: (event: FocusEvent) => {
      over.current.focus = true;
      show(0);
      (child.props['onFocus'] as ((e: FocusEvent) => void) | undefined)?.(event);
    },
    onBlur: (event: FocusEvent) => {
      over.current.focus = false;
      hide(0);
      (child.props['onBlur'] as ((e: FocusEvent) => void) | undefined)?.(event);
    },
  } as Record<string, unknown>);

  const style: CSSProperties = place
    ? { left: place.left, top: place.top, zIndex: layer.zIndex }
    : // Laid out but not painted: the panel has to have a size before it can be
      // placed, and a panel drawn at the layer's corner for one frame is a flash.
      { visibility: 'hidden', zIndex: layer.zIndex };

  const panelNode = open ? (
    <div
      ref={(el) => {
        panel.current = el;
        layer.panelRef(el);
      }}
      id={panelId}
      role="tooltip"
      className={cx(
        'crewlet-tooltip',
        `crewlet-tooltip--${place?.side ?? (placement === 'top' ? 'above' : 'below')}`,
        container !== null && container !== document.body ? 'crewlet-tooltip--in-host' : 'crewlet-tooltip--fixed',
        className,
      )}
      style={style}
      onPointerEnter={() => {
        over.current.pointer = true;
        clear();
      }}
      onPointerLeave={() => {
        over.current.pointer = false;
        hide(closeDelay);
      }}
    >
      {content}
    </div>
  ) : null;

  return (
    <>
      {trigger}
      {panelNode && container ? createPortal(panelNode, container) : null}
    </>
  );
}
