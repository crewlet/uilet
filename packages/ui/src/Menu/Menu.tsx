/**
 * A menu button: a trigger that opens a short list of actions.
 *
 * WHY IT EXISTS. A row in a table, a card on a chart or a node in a tree has
 * more actions than it has room for buttons, and a row of icons nobody can
 * name is not an interface. The WAI-ARIA menu button pattern is the one a
 * screen reader and a keyboard already know, and it has enough rules that a
 * second hand-written copy misses some of them: the one this replaces put
 * `role="menu"` on two nested elements, moved focus nowhere on open, had no
 * arrows, used native `disabled` items a keyboard reader never met, ran an
 * action before returning focus, did not close on Tab, and let its keys reach
 * the row beneath it.
 *
 * THE RULES IT KEEPS.
 *
 * - OPENING PUTS FOCUS ON THE FIRST ITEM (ArrowUp on the trigger: the last).
 *   Arrows move and wrap, Home and End jump, a letter moves to the next item
 *   starting with it, Enter or Space activates.
 * - IT IS A POPUP ON THE SHARED LAYER STACK: Escape closes the menu before
 *   anything beneath it, and a press outside closes it without also counting
 *   as a press on a veil.
 * - FOCUS GOES BACK TO WHAT OPENED IT on Escape, on Tab (which then carries on
 *   to the next control, as the pattern says) and BEFORE AN ACTION RUNS. The
 *   last is what lets an action open a dialog that returns focus to the right
 *   place: the dialog captures its opener when it first renders, and by then
 *   focus is back on the trigger rather than on an item about to unmount. What
 *   opened it is whatever held focus when it opened, so a menu opened from a
 *   tree item with the Menu key returns to the tree item, not to the
 *   pointer-only button that anchors it.
 * - A DISABLED ITEM STAYS FOCUSABLE and says so (`aria-disabled`), so a
 *   keyboard user learns the action exists and is unavailable rather than
 *   meeting a list that silently skips it.
 * - IT IS PLACED BY ARITHMETIC inside the layer it renders into, follows its
 *   trigger through a pan or a scroll, and closes when the trigger leaves the
 *   bounds. Focus moves in only once it has been placed: until then it is
 *   drawn hidden, so it never flashes at a corner, and a browser refuses focus
 *   to a hidden element anyway.
 * - WHAT HAPPENS IN THE MENU STAYS IN THE MENU. A key, a press or a click
 *   inside it does not reach the element it was opened from. A portal carries
 *   React events up the component tree, not the document, so without this the
 *   Enter that activates "Delete" would also reach the card's own Enter, and
 *   ArrowDown would move the tree's focus as well as the menu's. Escape and
 *   Tab still travel, because the layer stack acts on them at the document,
 *   and so does a chord with Control, Command or Alt.
 * - A CHOICE IS A RADIO ITEM. An item given `checked` is a `menuitemradio`
 *   that says whether it is the current value and draws a check where the
 *   others draw nothing, so a menu that picks one value reads as a choice with
 *   an answer rather than a list of actions that all look alike. Every answer
 *   of such a choice should say `checked`, true or false, so the check column
 *   lines up. The answers that stand together are nested in one `group`, as
 *   the pattern asks of radio items sharing a menu with actions, so a screen
 *   reader counts "2 of 3" among the answers rather than among every item.
 * - IT CAN BE OPENED FROM OUTSIDE (`open`, `onOpenChange`), because a tree item
 *   that holds focus opens its card's menu from the keyboard while the trigger
 *   itself is out of the tab order (`triggerTabIndex={-1}`).
 *
 * Ported from the engine dashboard's `ui/Menu.tsx`, with its suite.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckGlyph, MoreVertGlyph } from '@crewlethq/icons/glyphs';
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
import { Button, type ButtonVariant } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

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

export interface MenuProps {
  /** The trigger's accessible name, such as "Actions for Software Engineer". */
  label: string;
  items: readonly MenuEntry[];
  /** The trigger's glyph, when it has no visible text. */
  icon?: ReactNode;
  /** Visible trigger text; without it the trigger is an icon button named by `label`. */
  trigger?: ReactNode;
  triggerVariant?: ButtonVariant | undefined;
  /** -1 for a pointer-only trigger whose actions the keyboard reaches another way. */
  triggerTabIndex?: number | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Which edge of the trigger the menu lines up with. */
  align?: 'start' | 'end' | undefined;
  className?: string | undefined;
}

export function Menu({
  label,
  items,
  icon,
  trigger,
  triggerVariant = 'tertiary',
  triggerTabIndex,
  open: controlled,
  onOpenChange,
  align = 'start',
  className,
}: MenuProps) {
  const id = useId();
  const menuId = `${id}-menu`;
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const startAt = useRef<'first' | 'last'>('first');
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const container = useLayerContainer();

  // Read through refs so every callback below is stable: the layer's listeners
  // are registered once per opening, not once per parent render.
  const isControlled = useRef(controlled !== undefined);
  const report = useRef(onOpenChange);
  isControlled.current = controlled !== undefined;
  report.current = onOpenChange;

  const setOpen = useCallback((next: boolean) => {
    if (!isControlled.current) setUncontrolled(next);
    report.current?.(next);
  }, []);

  const giveFocusBack = useCallback(() => {
    const back = opener.current;
    const target = back && back.isConnected && back !== document.body ? back : triggerRef.current;
    target?.focus();
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

  const entries = () => (menu.current ? [...menu.current.querySelectorAll<HTMLElement>(ITEM_SELECTOR)] : []);

  // ON OPEN: remember what held focus.
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    // Not when focus is already inside: an effect that runs twice (React's
    // strict mode does, on mount) would otherwise remember a menu item.
    if (!(active instanceof Node && menu.current?.contains(active))) {
      opener.current = active instanceof HTMLElement ? active : null;
    }
  }, [open]);

  const position = useCallback(() => {
    const at = triggerRef.current;
    const box = menu.current;
    if (!at || !box || !container) return;
    const inHost = container !== document.body;
    const host = inHost ? container.getBoundingClientRect() : viewportBounds();
    const rect = at.getBoundingClientRect();
    const own = box.getBoundingClientRect();
    const local: PlacementRect = {
      x: (align === 'end' ? rect.right - own.width : rect.left) - (inHost ? host.x : 0),
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
    // Panned out of view: a menu for a card nobody can see is a menu for
    // nothing, so it closes rather than floating detached at the edge.
    if (outsideBounds(local, whole)) {
      close(true);
      return;
    }
    const spot = placePopup(local, { width: own.width, height: own.height }, bounds, LAYER_GAP);
    setPlace((was) => (was && was.left === spot.left && was.top === spot.top ? was : { left: spot.left, top: spot.top }));
  }, [align, close, container]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onLayout = () => position();
    container?.addEventListener(LAYER_REPOSITION_EVENT, onLayout);
    window.addEventListener('resize', onLayout);
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

  // THEN MOVE FOCUS IN, once the menu has somewhere to be.
  const placed = open && place !== null;
  useLayoutEffect(() => {
    if (!placed) return;
    const all = entries();
    (startAt.current === 'last' ? all[all.length - 1] : all[0])?.focus();
    startAt.current = 'first';
  }, [placed]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      startAt.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The menu's own keys go no further: see the module doc.
    if (event.key !== 'Escape' && event.key !== 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.stopPropagation();
    }
    const all = entries();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const go = (index: number) => all[(index + all.length) % all.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        go(at + 1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        go(at - 1);
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
              candidate.focus();
              return;
            }
          }
        }
    }
  }

  function activate(item: MenuItem) {
    if (item.disabled) return;
    close(true);
    item.onSelect();
  }

  /**
   * ONE ANSWER to "does this row carry a second line", read by both the class
   * that makes the row taller and the element that fills it. Asked twice, the
   * two disagreed on every value React draws nothing for but `&&` keeps: a
   * description of 0 rendered a bare zero in a row drawn for one line.
   */
  const described = (entry: MenuItem) =>
    entry.description !== undefined &&
    entry.description !== null &&
    entry.description !== false &&
    entry.description !== '';

  const item = (entry: MenuItem) => (
    <button
      key={entry.key}
      type="button"
      role={entry.checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={entry.checked}
      tabIndex={-1}
      className={cx(
        'crewlet-menu__item',
        // A row with a second line is taller than a row of verbs, and says
        // so: the row height alone would hold both lines in the space meant
        // for one, and giving every row the taller padding turns six verbs
        // into a scroller.
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
    <div
      className={cx('crewlet-menu', container !== null && container !== document.body ? 'crewlet-menu--in-host' : null, className)}
      id={menuId}
      role="menu"
      aria-label={label}
      // Focusable programmatically, never by Tab: focus rests on an item, and
      // this is where it lands if a menu is ever opened with no items in it.
      tabIndex={-1}
      ref={(el) => {
        menu.current = el;
        popup.panelRef(el);
      }}
      style={place ? { left: place.left, top: place.top, zIndex: popup.zIndex } : { visibility: 'hidden' }}
      onKeyDown={onMenuKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
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
  ) : null;

  const shared = {
    ref: (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      popup.insideRef(el);
    },
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    tabIndex: triggerTabIndex,
    onClick: () => {
      if (open) {
        close(true);
      } else {
        startAt.current = 'first';
        setOpen(true);
      }
    },
    onKeyDown: onTriggerKeyDown,
  };

  return (
    <span className="crewlet-menu-anchor">
      {trigger === undefined ? (
        <IconButton {...shared} label={label} icon={icon ?? <MoreVertGlyph />} size="sm" />
      ) : (
        <Button {...shared} variant={triggerVariant} size="small" leadingIcon={icon}>
          {trigger}
        </Button>
      )}
      {list && container ? createPortal(list, container) : null}
    </span>
  );
}
