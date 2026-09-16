/**
 * A row of controls that is ONE stop in the page's tab order.
 *
 * WHY. `role="toolbar"` is a promise about the keyboard: a reader Tabs to the
 * toolbar once, walks it with the arrows, and Tabs out of it to the next thing
 * on the page. The organization builder declared the role and kept every
 * control a separate tab stop, so reaching the content under a twelve-control
 * toolbar cost twelve presses, and the promise the role makes was false.
 *
 * WHAT A COMPOSITE CHILD KEEPS. A segmented group, a tab list or a listbox
 * inside the toolbar is ONE stop, and the arrows walk its own options first:
 * only at its last option does ArrowRight carry on to the next control, and
 * only at its first does ArrowLeft go back. That is what lets a reader walk
 * the whole row without ever being stranded inside a group, and it is why the
 * stops are computed from the DOM rather than from the children React was
 * handed: the group manages its own `tabindex`, and the two would disagree.
 *
 * WHAT A FIELD KEEPS. A text field takes the arrows, Home and End for its own
 * caret, always, and there is no boundary at which it gives them back. A
 * toolbar holding one is usually a filter bar rather than a toolbar, which is
 * what `mode="group"` is for: every control keeps its own tab stop and nothing
 * takes the arrows.
 */

import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { isComposing } from '../Layer/index.js';
import { cx } from '../utils/cx.js';

/** The roles whose own children the widget itself navigates. */
const COMPOSITE = [
  '[role="radiogroup"]',
  '[role="tablist"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="tree"]',
  '[role="grid"]',
  '[role="toolbar"]',
].join(',');

/** A caret's own keys: a field never gives these back. */
const FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]),textarea,select';

/**
 * What can take focus here, whether or not Tab would stop at it.
 *
 * NOT the Layer module's `focusables`, and the difference is the whole of the
 * roving model: that one answers what TAB reaches, which after the first pass
 * is one control, because this component has just set every other stop to
 * `tabindex="-1"`. A composite child does the same to its own options. So the
 * stops are computed from what can be FOCUSED, and the tab order is the
 * answer rather than the input.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',');

function candidates(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) =>
      !(element as HTMLButtonElement).disabled &&
      !element.closest('[hidden],[inert]') &&
      // Rendered, where the browser can say so: a control the narrow layout
      // has hidden is not a stop the arrows may land on.
      (typeof element.checkVisibility !== 'function' || element.checkVisibility()),
  );
}

interface Stop {
  /** What focus lands on when the stop is reached. */
  focus: HTMLElement;
  /** Every element whose `tabindex` this stop owns. */
  owned: HTMLElement[];
}

/**
 * The toolbar's stops, in document order, with a composite widget counted once.
 *
 * Which element inside a composite is its stop is the composite's own answer:
 * the one it left at `tabindex="0"`, else the one it marks as chosen, else its
 * first. Overwriting that would move a radio group's roving position every
 * time the toolbar re-rendered.
 */
function toolbarStops(root: HTMLElement): Stop[] {
  const stops: Stop[] = [];
  const seen = new Set<Element>();
  for (const element of candidates(root)) {
    const owner = element.closest(COMPOSITE);
    if (!owner || owner === root) {
      stops.push({ focus: element, owned: [element] });
      continue;
    }
    if (seen.has(owner)) continue;
    seen.add(owner);
    const inside = candidates(owner);
    const chosen =
      inside.find((el) => el.getAttribute('tabindex') === '0') ??
      inside.find((el) => el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true') ??
      inside[0] ??
      element;
    stops.push({ focus: chosen, owned: inside.length > 0 ? inside : [element] });
  }
  return stops;
}

function stopHolding(stops: Stop[], active: Element | null): number {
  if (!active) return -1;
  return stops.findIndex((stop) => stop.owned.some((el) => el === active || el.contains(active)));
}

export type ToolbarMode = 'toolbar' | 'group';

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Names the row. REQUIRED: a toolbar is announced by its name, and a page
   * with a filter bar and a builder toolbar needs to say which is which.
   */
  label: string;
  /**
   * `toolbar` is one tab stop with arrow keys. `group` is a labelled row where
   * every control keeps its own tab stop, which is what a filter bar holding a
   * text field wants.
   */
  mode?: ToolbarMode | undefined;
  /** Sticks under the top of the scroller, so filters stay reachable in a long list. */
  sticky?: boolean | undefined;
  children?: ReactNode;
}

export function Toolbar({ label, mode = 'toolbar', sticky = false, className, children, ...rest }: ToolbarProps) {
  const root = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const roving = mode === 'toolbar';

  /*
   * The tab order applied after every render rather than in the markup: the
   * children are a caller's own elements, and several of them (a segmented
   * group, a menu button) manage `tabindex` themselves. Writing it here, last,
   * is what keeps ONE of them at zero.
   */
  useEffect(() => {
    const element = root.current;
    if (!element || !roving) return;
    const stops = toolbarStops(element);
    if (stops.length === 0) return;
    const active = Math.min(at, stops.length - 1);
    stops.forEach((stop, index) => {
      for (const owned of stop.owned) owned.tabIndex = index === active && owned === stop.focus ? 0 : -1;
    });
  });

  // Focus moved by a pointer or by a child's own keys: the stop that holds it
  // is the stop the arrows carry on from.
  const onFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const element = root.current;
      if (!element || !roving) return;
      const index = stopHolding(toolbarStops(element), event.target);
      if (index >= 0) setAt(index);
    },
    [roving],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const element = root.current;
      if (!element || !roving || event.defaultPrevented || isComposing(event)) return;
      const key = event.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
      const target = event.target as HTMLElement;
      // A caret's keys, and an explicit opt-out for a child that has its own
      // horizontal meaning for them.
      if (target.matches(FIELD) || target.closest('[data-toolbar-keys="own"]')) return;

      const stops = toolbarStops(element);
      if (stops.length === 0) return;
      const here = stopHolding(stops, target);
      if (here < 0) return;

      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const inside = stops[here]?.owned ?? [];
        const position = inside.indexOf(target);
        // Still inside a composite: the widget's own keys move within it, and
        // the toolbar takes over only at its edge.
        if (inside.length > 1 && position >= 0) {
          if (key === 'ArrowRight' && position < inside.length - 1) return;
          if (key === 'ArrowLeft' && position > 0) return;
        }
      }

      const last = stops.length - 1;
      const next =
        key === 'Home'
          ? 0
          : key === 'End'
            ? last
            : key === 'ArrowRight'
              ? (here + 1) % stops.length
              : (here - 1 + stops.length) % stops.length;
      const stop = stops[next];
      if (!stop) return;
      event.preventDefault();
      setAt(next);
      stop.focus.focus();
    },
    [roving],
  );

  return (
    <div
      {...rest}
      ref={root}
      className={cx('crewlet-toolbar', sticky && 'crewlet-toolbar--sticky', className)}
      role={roving ? 'toolbar' : 'group'}
      aria-label={label}
      aria-orientation={roving ? 'horizontal' : undefined}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
    >
      {children}
    </div>
  );
}

export interface ToolbarSlotProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * The controls that fold away on a narrow screen. They are drawn above the
 * shell breakpoint and gone below it, where `Toolbar.Overflow` takes over.
 */
export function ToolbarWide({ className, children, ...rest }: ToolbarSlotProps) {
  return (
    <div {...rest} className={cx('crewlet-toolbar__wide', className)}>
      {children}
    </div>
  );
}

/**
 * What stands in for them: a Menu holding the same actions, drawn only below
 * the breakpoint. Two elements rather than one that measures itself, because a
 * row whose contents change as it is measured is a row that can oscillate, and
 * the only width that decides anything here is the one the stylesheet already
 * switches the shell at.
 */
export function ToolbarOverflow({ className, children, ...rest }: ToolbarSlotProps) {
  return (
    <div {...rest} className={cx('crewlet-toolbar__overflow', className)}>
      {children}
    </div>
  );
}

Toolbar.Wide = ToolbarWide;
Toolbar.Overflow = ToolbarOverflow;
