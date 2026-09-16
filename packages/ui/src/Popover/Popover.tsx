import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  LAYER_GAP,
  LAYER_REPOSITION_EVENT,
  focusables,
  outsideBounds,
  placePopup,
  useLayerContainer,
  usePopupLayer,
  viewportBounds,
  type DismissReason,
  type PlacementRect,
} from '../Layer/index.js';
import { cx } from '../utils/cx.js';

export type PopoverAlign = 'start' | 'end';
export type PopoverSide = 'top' | 'bottom';
export type PopoverWidth = 'auto' | 'match';
/**
 * What the panel IS. `dialog` is the default because a panel holding a form, a
 * date grid or a filter editor is a dialog; `menu` and `listbox` are for a
 * panel whose children carry the matching item roles; `none` is for a panel
 * whose own children already declare the structure.
 */
export type PopoverRole = 'dialog' | 'menu' | 'listbox' | 'none';

interface PopoverBaseProps {
  trigger: (open: boolean, toggle: () => void) => ReactElement;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Which edge of the anchor the panel lines up with. */
  align?: PopoverAlign | undefined;
  /** The preferred side. It flips when there is not room and there is more room the other way. */
  side?: PopoverSide | undefined;
  /** `match` sizes the panel to the anchor, which is what a Select wants. */
  width?: PopoverWidth | undefined;
  className?: string | undefined;
  /** Controlled. Leave it out for a panel that owns its own open state. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /**
   * Reports a change, and ONLY a change: it is never called on mount, which
   * the effect this replaced did on every render, so a caller that cleared a
   * flag when the panel opened cleared it immediately and forever.
   */
  onOpenChange?: ((open: boolean, reason: PopoverReason) => void) | undefined;
}

/**
 * A DIALOG MUST BE NAMED, and the type is what says so.
 *
 * A dialog is announced by its name and by nothing else: with none, a screen
 * reader says "dialog" and the reader is left to guess what opened. The
 * default role is `dialog`, so an optional `label` meant the default was an
 * unnamed one, which is what two pickers in this package shipped the day the
 * default changed. The other roles take their meaning from the items inside
 * them and a name is a courtesy, so it stays optional there.
 *
 * Zero values are meaningful or the type refuses them: this is the second.
 */
export type PopoverProps = PopoverBaseProps &
  (
    | {
        role?: 'dialog' | undefined;
        /** Names the panel, and is what a screen reader announces when it opens. */
        label: string;
      }
    | {
        role: 'menu' | 'listbox' | 'none';
        /** Names the panel. Optional here: the items inside carry the meaning. */
        label?: string | undefined;
      }
  );

/** Why the panel opened or closed. */
export type PopoverReason = DismissReason | 'trigger' | 'content' | 'anchor-gone';

/**
 * An anchored floating panel: a filter editor, a sort menu, a date grid, a
 * select's list.
 *
 * WHAT CHANGED, AND WHY. It used to add its own `keydown` and `mousedown`
 * listeners to the document, so a panel inside a Modal closed the Modal with
 * it on one Escape, and a panel hosting another panel needed a
 * `stopPropagation` on `mousedown` to stop the outer one closing. Both are
 * gone: it is a popup on the shared layer stack, which dismisses the TOPMOST
 * surface and nothing beneath it.
 *
 * It also used to force `role="menu"` on every panel, which told a screen
 * reader that a filter form was a menu of commands and that its inputs were
 * menu items, and to portal to `document.body`, where a fullscreen container
 * does not paint it at all.
 *
 * THE RULES IT KEEPS NOW.
 *
 * - PLACED BY ARITHMETIC, inside the bounds of the layer it renders into:
 *   below the anchor and aligned to its start by default, flipped when there
 *   is not room, and slid back inside an edge it opened near.
 * - HIDDEN UNTIL PLACED. A panel drawn at the layer's corner for one frame is
 *   a flash, and a browser refuses focus to a hidden element, so focus moves
 *   in only once it has somewhere to be.
 * - IT FOLLOWS ITS ANCHOR through a pan, a scroll and a resize, and CLOSES
 *   when the anchor is carried out of the bounds: a panel for something nobody
 *   can see is a panel for nothing.
 * - WHAT HAPPENS IN THE PANEL STAYS IN THE PANEL. A portal carries React
 *   events up the COMPONENT tree rather than the document one, so without this
 *   the Enter that presses a button inside would also reach the row the panel
 *   was opened from. Escape and Tab still travel, because the layer stack acts
 *   on them at the document, and so does a chord with Control, Command or Alt,
 *   which is an application shortcut rather than a key of the panel's.
 */
export function Popover({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  width = 'auto',
  role = 'dialog',
  label,
  className,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
}: PopoverProps) {
  const id = useId();
  const panelId = `${id}-popover`;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const anchor = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<{
    left: number;
    top: number;
    side: 'above' | 'below';
    width: number | undefined;
  } | null>(null);
  const container = useLayerContainer();

  // Read through refs so the listeners below are registered once per opening
  // rather than once per render of whatever holds this.
  const isControlled = useRef(controlled !== undefined);
  const report = useRef(onOpenChange);
  isControlled.current = controlled !== undefined;
  report.current = onOpenChange;

  const setOpen = useCallback((next: boolean, reason: PopoverReason) => {
    if (!isControlled.current) setUncontrolled(next);
    report.current?.(next, reason);
  }, []);

  const close = useCallback(
    (reason: PopoverReason) => {
      // Focus goes back where the panel was opened from when a KEY closed it,
      // and stays where the pointer put it otherwise: pulling focus back after
      // a press somewhere else would take it off whatever was just pressed.
      if (reason === 'escape' || reason === 'tab') anchor.current?.focus();
      setOpen(false, reason);
    },
    [setOpen],
  );

  const layer = usePopupLayer({ open, onDismiss: close });

  const position = useCallback(() => {
    const at = anchor.current;
    const box = panel.current;
    if (!at || !box || !container) return;
    const inHost = container !== document.body;
    const host = inHost ? container.getBoundingClientRect() : viewportBounds();
    const rect = at.getBoundingClientRect();
    const own = box.getBoundingClientRect();
    const panelWidth = width === 'match' ? rect.width : own.width;
    const local: PlacementRect = {
      x: (align === 'end' ? rect.right - panelWidth : rect.left) - (inHost ? host.x : 0),
      y: rect.top - (inHost ? host.y : 0),
      width: rect.width,
      height: rect.height,
    };
    /*
     * TWO RECTANGLES, and the difference matters. The surface is PLACED inside
     * a box inset by the gap, so it never touches an edge; whether the anchor
     * is still on screen is asked of the WHOLE box, because an anchor sitting
     * in the gap itself is at the edge of the layer, not off it.
     */
    const whole: PlacementRect = { x: 0, y: 0, width: host.width, height: host.height };
    const bounds: PlacementRect = {
      x: LAYER_GAP,
      y: LAYER_GAP,
      width: host.width - 2 * LAYER_GAP,
      height: host.height - 2 * LAYER_GAP,
    };
    if (outsideBounds(local, whole)) {
      close('anchor-gone');
      return;
    }
    const spot = placePopup(
      local,
      { width: panelWidth, height: own.height },
      bounds,
      LAYER_GAP,
      side === 'top' ? 'above' : 'below',
    );
    setPlace((was) =>
      was && was.left === spot.left && was.top === spot.top && was.side === spot.side && was.width === panelWidth
        ? was
        : { left: spot.left, top: spot.top, side: spot.side, width: width === 'match' ? panelWidth : undefined },
    );
  }, [align, close, container, side, width]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onLayout = () => position();
    container?.addEventListener(LAYER_REPOSITION_EVENT, onLayout);
    window.addEventListener('resize', onLayout);
    // Capture, so a scroll inside any ancestor is heard, not only the window's.
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

  // A dialog takes focus; a menu or a listbox is driven from the control that
  // opened it, so pulling focus in would take the keys away from it.
  const placed = open && place !== null;
  useEffect(() => {
    if (!placed || role !== 'dialog') return;
    const box = panel.current;
    if (box && !box.contains(document.activeElement)) (focusables(box)[0] ?? box).focus();
  }, [placed, role]);

  const toggle = useCallback(() => {
    if (open) close('trigger');
    else setOpen(true, 'trigger');
  }, [close, open, setOpen]);

  const triggerEl = trigger(open, toggle);
  const haspopup = role === 'none' ? undefined : role;
  const anchored = cloneElement(triggerEl, {
    ref: (el: HTMLElement | null) => {
      anchor.current = el;
      layer.insideRef(el);
    },
    'aria-expanded': open,
    'aria-haspopup': (triggerEl.props as Record<string, unknown>)['aria-haspopup'] ?? haspopup,
    'aria-controls': open ? panelId : undefined,
  } as Record<string, unknown>);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' && event.key !== 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.stopPropagation();
    }
  }

  const style: CSSProperties = place
    ? { left: place.left, top: place.top, width: place.width }
    : // Not `display: none`: the panel has to be laid out for its own size to
      // be measurable, and a browser refuses focus to a hidden element, which
      // is what stops focus arriving at a corner.
      { visibility: 'hidden' };

  const panelNode = open ? (
    <div
      ref={(el) => {
        panel.current = el;
        layer.panelRef(el);
      }}
      id={panelId}
      className={cx(
        'crewlet-popover',
        `crewlet-popover--${place?.side ?? (side === 'top' ? 'above' : 'below')}`,
        container !== null && container !== document.body ? 'crewlet-popover--in-host' : 'crewlet-popover--fixed',
        className,
      )}
      style={{ ...style, zIndex: layer.zIndex }}
      role={role === 'none' ? undefined : role}
      aria-label={role === 'none' ? undefined : label}
      aria-modal={role === 'dialog' ? false : undefined}
      tabIndex={role === 'dialog' ? -1 : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {typeof children === 'function' ? children(() => close('content')) : children}
    </div>
  ) : null;

  return (
    <>
      {anchored}
      {panelNode && container ? createPortal(panelNode, container) : null}
    </>
  );
}
