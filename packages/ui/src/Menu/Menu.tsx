/**
 * A menu button following the WAI-ARIA menu button pattern: a trigger that
 * opens a short list of actions or one choice, on the shared layer stack.
 */

import {
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
import { CheckGlyph, EllipsisVerticalGlyph } from '@crewlethq/icons/glyphs';
import {
  LAYER_GAP,
  LAYER_REPOSITION_EVENT,
  anchorGone,
  placePopup,
  useLayerContainer,
  visibleBounds,
  usePopupLayer,
  viewportBounds,
  type PlacementRect,
  type PopupEntrance,
} from '../Layer/index.js';
import { Button, type ButtonVariant } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { returnFocus } from '../utils/focusModality.js';
import { useComposedRef } from '../utils/composedRef.js';

export interface MenuItem {
  kind?: 'item';
  key: string;
  label: string;
  /** A glyph component, drawn before the label. */
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean | undefined;
  /** A destructive action: drawn in the critical ink. */
  danger?: boolean | undefined;
  /** A shortcut or a short note, shown at the end of the row. */
  hint?: ReactNode;
  /** A second line under the label, for an action whose name is not enough. */
  description?: ReactNode;
  /**
   * Makes the item one answer of a single choice: a `menuitemradio` that is
   * the current value when true. Left out, the item is an action.
   */
  checked?: boolean | undefined;
}

export interface MenuSeparator {
  kind: 'separator';
  key: string;
}

export type MenuEntry = MenuItem | MenuSeparator;

/** Every item the arrows walk: actions and the answers of a choice alike. */
const ITEM_SELECTOR = "[role='menuitem'],[role='menuitemradio']";

/** A menu's entries as it draws them: an action, a separator, or a run of answers. */
type Run =
  | { kind: 'action'; item: MenuItem }
  | { kind: 'separator'; key: string }
  | { kind: 'answers'; key: string; items: MenuItem[] };

/** Gathers each run of consecutive answers (items given `checked`) into one group. */
export function runs(entries: readonly MenuEntry[]): Run[] {
  const out: Run[] = [];
  for (const entry of entries) {
    if (entry.kind === 'separator') {
      out.push({ kind: 'separator', key: entry.key });
      continue;
    }
    const last = out[out.length - 1];
    if (entry.checked === undefined) out.push({ kind: 'action', item: entry });
    else if (last?.kind === 'answers') last.items.push(entry);
    else out.push({ kind: 'answers', key: `${entry.key}:answers`, items: [entry] });
  }
  return out;
}

/** What a caller's own trigger spreads on its element (`renderTrigger`). */
export interface MenuTriggerProps {
  ref: (el: HTMLElement | null) => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  tabIndex: number | undefined;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface MenuProps {
  /**
   * The trigger's accessible name, such as "Actions for Software Engineer".
   * It names a text trigger too, so keep the trigger's visible words in it.
   */
  label: string;
  items: readonly MenuEntry[];
  /** The trigger's glyph, when it has no visible text. */
  icon?: ReactNode;
  /** Visible trigger text; without it the trigger is an icon button named by `label`. */
  trigger?: ReactNode;
  /**
   * A glyph after the trigger's text, such as the chevron of a picker. Drawn
   * as the button's trailing icon, a gap away from the words; a glyph written
   * into `trigger` instead sits flush against them. Read only with `trigger`.
   */
  trailingIcon?: ReactNode;
  triggerVariant?: ButtonVariant | undefined;
  /**
   * The trigger is the value it changes: flush, in the surrounding text's
   * size and ink, and named by the value it shows followed by `label`
   * ("In progress, Status of ENG-1"). The menu itself is named by `label`.
   */
  valueTrigger?: boolean | undefined;
  /** -1 for a pointer-only trigger whose actions the keyboard reaches another way. */
  triggerTabIndex?: number | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Which edge of the trigger the menu lines up with. */
  align?: 'start' | 'end' | undefined;
  /**
   * How wide the panel is: its longest row (`content`, the default), or its
   * longest row but never narrower than its trigger (`trigger`), for a
   * trigger that spans a column.
   */
  width?: 'content' | 'trigger' | undefined;
  /**
   * The caller's own trigger, in place of the menu's button: an element given
   * these props. `label` still names the menu; the trigger names itself.
   */
  renderTrigger?: ((props: MenuTriggerProps) => ReactNode) | undefined;
  /** Facts above the items: what the actions are about. Never an item. */
  header?: ReactNode;
  /**
   * The kit Tooltip on the menu's own trigger, on hover and keyboard focus,
   * stepping aside while the menu is open. It repeats or shortens the trigger's
   * name, which a screen reader already hears, so it is shown and not read.
   */
  tooltip?: ReactNode;
  /** How the panel arrives: `rise` (the default), or `instant`, drawn the frame it is placed. */
  entrance?: PopupEntrance | undefined;
  /**
   * Focus stays on the menu and the keys move an `aria-activedescendant`
   * highlight, opening with nothing highlighted. Off by default: each item
   * takes focus in turn.
   */
  activeDescendant?: boolean | undefined;
  className?: string | undefined;
}

export function Menu({
  label,
  items,
  icon,
  trigger,
  trailingIcon,
  triggerVariant = 'ghost',
  valueTrigger = false,
  triggerTabIndex,
  open: controlled,
  onOpenChange,
  align = 'start',
  width = 'content',
  renderTrigger,
  header,
  tooltip,
  entrance = 'rise',
  activeDescendant = false,
  className,
}: MenuProps) {
  const id = useId();
  const menuId = `${id}-menu`;
  const headerId = `${id}-header`;
  const itemId = (index: number) => `${id}-item-${index}`;
  // The highlighted item in the active-descendant mode; -1 is none.
  const [active, setActive] = useState(-1);
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const triggerRef = useRef<HTMLElement | null>(null);
  // The panel is the box that is placed and scrolls; the menu is the list of
  // items inside it, which is all a screen reader is told is the menu.
  const panel = useRef<HTMLDivElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const startAt = useRef<'first' | 'last' | 'none'>('first');
  const [place, setPlace] = useState<{ left: number; top: number; floor: number | undefined; room: number } | null>(null);
  const container = useLayerContainer();

  // Read through refs so every callback below is stable: the layer's listeners
  // are registered once per opening, not once per parent render.
  const isControlled = useRef(controlled !== undefined);
  const report = useRef(onOpenChange);
  const descendant = useRef(activeDescendant);
  isControlled.current = controlled !== undefined;
  report.current = onOpenChange;
  descendant.current = activeDescendant;

  const setOpen = useCallback((next: boolean) => {
    if (!isControlled.current) setUncontrolled(next);
    report.current?.(next);
  }, []);

  const giveFocusBack = useCallback(() => {
    const back = opener.current;
    const target = back && back.isConnected && back !== document.body ? back : triggerRef.current;
    returnFocus(target);
  }, []);

  const close = useCallback(
    (restore: boolean) => {
      if (restore) giveFocusBack();
      setOpen(false);
    },
    [giveFocusBack, setOpen],
  );

  const popup = usePopupLayer({
    open,
    onDismiss: (reason) => close(reason !== 'outside'),
  });
  // STABLE across renders (`useComposedRef`), so a caller's trigger is not
  // released and handed back on every render of the menu.
  const sharedRef = useComposedRef<HTMLElement>(triggerRef, popup.insideRef);

  const entries = () => (menu.current ? [...menu.current.querySelectorAll<HTMLElement>(ITEM_SELECTOR)] : []);

  // ON OPEN: remember what held focus.
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    // Not when focus is already inside: an effect that runs twice (React's
    // strict mode does, on mount) would otherwise remember a menu item.
    if (!(active instanceof Node && panel.current?.contains(active))) {
      opener.current = active instanceof HTMLElement ? active : null;
    }
  }, [open]);

  const position = useCallback(() => {
    const at = triggerRef.current;
    const box = panel.current;
    if (!at || !box || !container) return;
    const inHost = container !== document.body;
    const host = inHost ? container.getBoundingClientRect() : viewportBounds();
    const rect = at.getBoundingClientRect();
    const bounds: PlacementRect = visibleBounds(host, inHost);
    // AS TALL AS THE ROOM BESIDE ITS ANCHOR, set before it is measured: a fixed
    // 360px cut a long menu in half on a phone with half the screen free.
    const anchorY = rect.top - (inHost ? host.y : 0);
    const room = Math.max(
      bounds.y + bounds.height - (anchorY + rect.height + LAYER_GAP),
      anchorY - LAYER_GAP - bounds.y,
      0,
    );
    box.style.setProperty('--crewlet-menu-room', `${room}px`);
    const measured = box.getBoundingClientRect();
    // NO NARROWER THAN THE TRIGGER: placed by the width it is about to be
    // drawn at, not the one it was measured at before that floor was set.
    const floor = width === 'trigger' ? rect.width : undefined;
    const own = { width: Math.max(measured.width, floor ?? 0), height: measured.height };
    const local: PlacementRect = {
      x: (align === 'end' ? rect.right - own.width : rect.left) - (inHost ? host.x : 0),
      y: rect.top - (inHost ? host.y : 0),
      width: rect.width,
      height: rect.height,
    };
    /*
     * The surface is PLACED inside the part of its layer the window shows,
     * inset by the gap, so near the window's foot it opens upward; whether the
     * anchor is still on screen is asked of the anchor itself ([anchorGone]).
     */
    // Panned out of view: a menu for a card nobody can see is a menu for
    // nothing, so it closes rather than floating detached at the edge.
    if (anchorGone(rect, host, inHost)) {
      close(true);
      return;
    }
    const spot = placePopup(local, { width: own.width, height: own.height }, bounds, LAYER_GAP);
    setPlace((was) =>
      was && was.left === spot.left && was.top === spot.top && was.floor === floor && was.room === room
        ? was
        : { left: spot.left, top: spot.top, floor, room },
    );
  }, [align, close, container, width]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onLayout = () => position();
    container?.addEventListener(LAYER_REPOSITION_EVENT, onLayout);
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);

    // Also re-place when the panel itself resizes (content, a font loading),
    // which the listeners above miss. Feature-checked: jsdom and older
    // embedded browsers have no ResizeObserver.
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(onLayout) : null;
    if (panel.current) resize?.observe(panel.current);
    return () => {
      container?.removeEventListener(LAYER_REPOSITION_EVENT, onLayout);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
      resize?.disconnect();
    };
  }, [open, container, position]);

  useEffect(() => {
    if (!open) setPlace(null);
  }, [open]);

  // THEN MOVE FOCUS IN, once the menu has somewhere to be.
  const placed = open && place !== null;
  useLayoutEffect(() => {
    if (!placed) return;
    const all = entries();
    if (descendant.current) {
      menu.current?.focus();
      setActive(startAt.current === 'none' || all.length === 0 ? -1 : startAt.current === 'last' ? all.length - 1 : 0);
    } else {
      (startAt.current === 'last' ? all[all.length - 1] : all[0])?.focus();
    }
    startAt.current = 'first';
  }, [placed]);

  useEffect(() => {
    if (!open) setActive(-1);
  }, [open]);

  // The highlighted row is kept in view as the keys move it.
  useEffect(() => {
    if (!activeDescendant || active < 0) return;
    entries()[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [active, activeDescendant]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      startAt.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The menu's keys stop here: a portal bubbles React events to the opener.
    // Escape, Tab and modifier chords still reach the layer stack.
    if (event.key !== 'Escape' && event.key !== 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.stopPropagation();
    }
    const all = entries();
    const at = activeDescendant ? active : all.indexOf(document.activeElement as HTMLElement);
    const go = (index: number) => {
      const next = (index + all.length) % all.length;
      if (activeDescendant) setActive(next);
      else all[next]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        go(at < 0 ? 0 : at + 1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        go(at < 0 ? all.length - 1 : at - 1);
        return;
      case 'Enter':
      case ' ':
        // Focus is on the menu, not a row, so the row is run from here.
        if (!activeDescendant) return;
        event.preventDefault();
        if (at >= 0) all[at]?.click();
        return;
      case 'Home':
        event.preventDefault();
        go(0);
        return;
      case 'End':
        event.preventDefault();
        go(all.length - 1);
        return;
      case 'Tab':
        // Not prevented: focus goes back to the opener first, and the Tab then
        // carries on from there to the next control.
        close(true);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
          const letter = event.key.toLocaleLowerCase();
          for (let step = 1; step <= all.length; step++) {
            const candidate = all[(at + step) % all.length]!;
            if ((candidate.textContent ?? '').trim().toLocaleLowerCase().startsWith(letter)) {
              event.preventDefault();
              go(all.indexOf(candidate));
              return;
            }
          }
        }
    }
  }

  function activate(item: MenuItem) {
    if (item.disabled) return;
    // Focus returns to the opener before the action runs, so a dialog the
    // action opens captures the trigger rather than an unmounting item.
    close(true);
    item.onSelect();
  }

  /** Whether a row has a second line; the row's class and its content both ask this. */
  const described = (entry: MenuItem) =>
    entry.description !== undefined &&
    entry.description !== null &&
    entry.description !== false &&
    entry.description !== '';

  // Every item's place among the items the keys walk, for its id and its highlight.
  const order = new Map(
    items.filter((entry): entry is MenuItem => entry.kind !== 'separator').map((entry, index) => [entry.key, index]),
  );

  const item = (entry: MenuItem) => (
    <button
      key={entry.key}
      type="button"
      role={entry.checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={entry.checked}
      tabIndex={-1}
      id={activeDescendant ? itemId(order.get(entry.key)!) : undefined}
      // The pointer moves the highlight and never takes focus off the menu.
      onPointerMove={activeDescendant ? () => setActive(order.get(entry.key)!) : undefined}
      onMouseDown={activeDescendant ? (event) => event.preventDefault() : undefined}
      className={cx(
        activeDescendant && order.get(entry.key) === active && 'is-active',
        'crewlet-menu__item',
        // Only a row with a second line gets the taller padding.
        described(entry) ? 'crewlet-menu__item--described' : undefined,
        entry.danger && 'is-danger',
        entry.disabled && 'is-disabled',
      )}
      aria-disabled={entry.disabled || undefined}
      onClick={() => activate(entry)}
    >
      {entry.checked !== undefined && (
        <span className="crewlet-menu__check" aria-hidden>
          {entry.checked && <CheckGlyph size="sm" />}
        </span>
      )}
      {entry.icon && <span className="crewlet-menu__icon">{entry.icon}</span>}
      <span className="crewlet-menu__text">
        <span className="crewlet-menu__label">{entry.label}</span>
        {described(entry) ? <span className="crewlet-menu__description">{entry.description}</span> : null}
      </span>
      {entry.hint && <span className="crewlet-menu__hint">{entry.hint}</span>}
    </button>
  );

  const list = open ? (
    // Not a control: its keys bubble from the list, and its presses stop
    // here so one on the header is not a press outside that closes the menu.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cx(
        'crewlet-menu',
        container !== null && container !== document.body ? 'crewlet-menu--in-host' : null,
        entrance === 'instant' && 'crewlet-menu--instant',
        activeDescendant && 'crewlet-menu--descendant',
        className,
      )}
      ref={(el) => {
        panel.current = el;
        popup.panelRef(el);
      }}
      // The floor is a custom property the stylesheet reads, so the content
      // width, its ceiling and the floor are stated together (Menu.css).
      style={
        place
          ? ({
              left: place.left,
              top: place.top,
              zIndex: popup.zIndex,
              '--crewlet-menu-room': `${place.room}px`,
              ...(place.floor === undefined ? null : { '--crewlet-menu-floor': `${place.floor}px` }),
            } as CSSProperties)
          : { visibility: 'hidden' }
      }
      onKeyDown={onMenuKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {header ? (
        // Outside the menu element, which may own only items, groups and
        // separators; it still describes the menu (`aria-describedby`).
        <div id={headerId} className="crewlet-menu__header">
          {header}
        </div>
      ) : null}
      <div
        className="crewlet-menu__list"
        id={menuId}
        role="menu"
        aria-label={label}
        aria-describedby={header ? headerId : undefined}
        aria-activedescendant={activeDescendant && active >= 0 ? itemId(active) : undefined}
        // Focusable programmatically, never by Tab: focus rests on an item, and
        // this is where it lands if a menu is ever opened with no items in it.
        tabIndex={-1}
        ref={menu}
      >
        {runs(items).map((run) =>
          run.kind === 'separator' ? (
            <div key={run.key} role="separator" className="crewlet-menu__separator" />
          ) : run.kind === 'answers' ? (
            <div key={run.key} role="group" className="crewlet-menu__group">
              {run.items.map(item)}
            </div>
          ) : (
            item(run.item)
          ),
        )}
      </div>
    </div>
  ) : null;

  const shared: MenuTriggerProps = {
    ref: sharedRef,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    tabIndex: triggerTabIndex,
    onClick: () => {
      if (open) {
        close(true);
      } else {
        startAt.current = activeDescendant ? 'none' : 'first';
        setOpen(true);
      }
    },
    onKeyDown: onTriggerKeyDown,
  };

  // The tip steps aside while the menu is open. An icon trigger always has one: its label, unless `tooltip` says more.
  const tipped = tooltip !== undefined && tooltip !== null;
  const withTip = (element: ReactElement, tip: ReactNode = tooltip) =>
    tip !== undefined && tip !== null ? (
      <Tooltip content={tip} describes={false} disabled={open}>
        {element}
      </Tooltip>
    ) : (
      element
    );

  return (
    <span className="crewlet-menu-anchor">
      {renderTrigger
        ? renderTrigger(shared)
        : trigger === undefined
          ? withTip(
              <IconButton {...shared} label={label} icon={icon ?? <EllipsisVerticalGlyph />} size="sm" title="" tooltip={false} />,
              tipped ? tooltip : label,
            )
          : withTip(
              <Button
                {...shared}
                // A value trigger is named by what it shows, then by `label`
                // ("In progress, Status of ENG-1"); other text triggers by `label`.
                aria-label={valueTrigger ? undefined : label}
                variant={triggerVariant}
                size="small"
                flush={valueTrigger}
                className={valueTrigger ? 'crewlet-menu__value-trigger' : undefined}
                leadingIcon={icon}
                trailingIcon={trailingIcon}
              >
                {trigger}
                {valueTrigger ? <VisuallyHidden>{`, ${label}`}</VisuallyHidden> : null}
              </Button>,
            )}
      {list && container ? createPortal(list, container) : null}
    </span>
  );
}
