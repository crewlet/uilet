import React, { useEffect, useRef, useState, type ReactElement, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export type PopoverAlign = 'start' | 'end';
export type PopoverSide = 'top' | 'bottom';
export type PopoverWidth = 'auto' | 'match';

export interface PopoverProps {
  trigger: (open: boolean, toggle: () => void) => ReactElement;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: PopoverAlign;
  side?: PopoverSide;
  width?: PopoverWidth;
  className?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Popover renders an anchored floating panel below (or above)
// a trigger element, for filter and sort menus in a toolbar and
// any other surface that needs a contextual dropdown.
//
// API:
//   <Popover
//     trigger={(open, toggle) => <button onClick={toggle}>...</button>}
//     align="start" | "end"     placement of the panel relative to
//                                the trigger ("start" left-aligns,
//                                "end" right-aligns)
//     side="bottom" | "top"      auto-flips when there is no room
//                                below; default "bottom"
//     width="auto" | "match"     "match" sizes the panel to the
//                                trigger width (used by Select);
//                                default "auto" lets content size
//   >
//     {(close) => <ContentReceivesCloseFn />}
//   </Popover>
//
// Implementation choices:
//   - Portaled to <body> so the panel is not clipped by any
//     ancestor with overflow:hidden (cards, tables).
//   - Position recomputed on open and on window resize / scroll
//     so the panel stays anchored to a moving trigger.
//   - Outside-click and Escape close.
//   - Focus trap is intentionally not implemented; the menu items
//     inside take focus naturally and Escape returns focus to
//     the trigger.
export function Popover({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  width = 'auto',
  className = '',
  defaultOpen = false,
  onOpenChange,
}: PopoverProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Notify the parent when open state flips, for example so a
  // caller that opens a popover once on mount can clear its flag.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; side: PopoverSide }>(
    { top: 0, left: 0, width: 0, side },
  );
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);
  const toggle = () => setOpen((o) => !o);

  // Reposition: read trigger rect, decide side (flip up if no
  // room down), compute left/right based on align + width mode.
  const reposition = () => {
    const trig = triggerRef.current;
    if (!trig) return;
    const rect = trig.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 200;
    const viewportH = window.innerHeight;

    let chosenSide = side;
    if (side === 'bottom' && rect.bottom + panelHeight + 12 > viewportH) {
      chosenSide = 'top';
    }

    const top = chosenSide === 'bottom'
      ? rect.bottom + window.scrollY + 6
      : rect.top + window.scrollY - panelHeight - 6;

    const left = align === 'end'
      ? rect.right + window.scrollX
      : rect.left + window.scrollX;

    setCoords({ top, left, width: rect.width, side: chosenSide });
  };

  useEffect(() => {
    if (!open) return undefined;

    reposition();

    const onClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      if (target && triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onLayout = () => reposition();

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
    // reposition is recreated each render but its identity does not affect behaviour;
    // closing-only deps keep listeners scoped to the open state.
  }, [open, align, side]);

  const triggerEl = trigger(open, toggle);
  const triggerWithRef = React.cloneElement(triggerEl, {
    ref: triggerRef,
    'aria-expanded': open,
    'aria-haspopup': 'menu',
  } as Record<string, unknown>);

  const panelStyle: CSSProperties = {
    top: coords.top,
    [align === 'end' ? 'right' : 'left']:
      align === 'end'
        ? (typeof document !== 'undefined' ? document.documentElement.clientWidth - coords.left : 0)
        : coords.left,
  };
  if (width === 'match') panelStyle.width = coords.width;

  return (
    <>
      {triggerWithRef}
      {open && createPortal(
        <div
          ref={panelRef}
          className={`crewlet-popover crewlet-popover--${coords.side} ${className}`}
          style={panelStyle}
          role="menu"
          tabIndex={-1}
          /*
           * Block mousedown from bubbling to document. The panel is
           * portaled to <body>, so when one Popover hosts another
           * (e.g. a DateTimePicker calendar inside a TimeWindowPicker),
           * a click on the inner popover would otherwise reach the
           * outer popover's document-level outside-click handler and
           * close it. The outer Popover's own outside-click logic
           * still fires for genuinely-outside clicks because those
           * never bubble through this panel.
           */
          onMouseDown={(e) => e.stopPropagation()}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>,
        document.body,
      )}
    </>
  );
}
