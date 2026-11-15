/**
 * The trail in a top bar. Its last crumb is the page's `h1`, unlinked and
 * focusable by script only. The trail is a hidden-scrollbar scrollport, a tab
 * stop only while it overflows, so a keyboard can scroll a deep ancestry.
 */

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { KeyChip } from '../KeyChip/index.js';
import { Text } from '../Text/index.js';
import { cx } from '../utils/cx.js';

export interface BreadcrumbCrumb {
  /** The crumb's words, and what a screen reader calls it. */
  label: string;
  /**
   * Where the crumb leads. Left out on the last crumb, which is the page
   * itself, and on an ancestor with no page of its own.
   */
  href?: string | undefined;
  /** A glyph before the label: the workspace's mark on the first crumb. Decorative. */
  icon?: ReactNode;
  /**
   * A project's key, drawn as a `KeyChip` before a NAMED label, the way every
   * row and rail draws a project. Only where the label is a name: a crumb
   * still showing the raw key would say it twice.
   */
  keyChip?: string | undefined;
  /** A badge before the label: a seat's avatar on its own crumb. Decorative. */
  badge?: ReactNode;
  /** Draws the label in the mono face: an identifier still waiting for its name. */
  mono?: boolean | undefined;
}

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  crumbs: readonly BreadcrumbCrumb[];
  /**
   * A control drawn as the last crumb's words inside the heading, such as a
   * switcher's button. The last crumb is still what the trail is measured by.
   */
  current?: ReactNode;
  /** Names the navigation landmark. */
  label?: string | undefined;
}

export function Breadcrumb({ crumbs, current, label = 'Breadcrumb', className, style, ...rest }: BreadcrumbProps) {
  const trail = useRef<HTMLElement>(null);
  // What the trail holds, as one value: a new array with the same crumbs is
  // the same trail, and is not a reason to measure again.
  const signature = crumbs
    .map((crumb) => [crumb.label, crumb.keyChip ?? '', crumb.mono ? 'm' : '', crumb.href ? 'l' : ''].join('\u0000'))
    .join('\u0001');
  const overflows = useOverflows(trail, signature);
  const floor = useFloor(trail, signature);
  return (
    <nav
      {...rest}
      ref={trail}
      className={cx('crewlet-breadcrumb', className)}
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollport is a stop while it overflows, see above
      tabIndex={overflows ? 0 : undefined}
      style={floor > 0 ? ({ ...style, '--crewlet-breadcrumb-floor': `${floor}px` } as CSSProperties) : style}
    >
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        const words = (
          <>
            {crumb.icon !== undefined ? (
              <span className="crewlet-breadcrumb__icon" aria-hidden="true">
                {crumb.icon}
              </span>
            ) : null}
            {/* The space reaches the crumb's name ("FAIR Product and
                Engineering") and nothing else: between two flex items it is
                not drawn. */}
            {crumb.keyChip ? (
              <>
                <KeyChip className="crewlet-breadcrumb__key">{crumb.keyChip}</KeyChip>{' '}
              </>
            ) : null}
            {crumb.badge !== undefined ? (
              <span className="crewlet-breadcrumb__badge" aria-hidden="true">
                {crumb.badge}
              </span>
            ) : null}
            {/* THE LABEL IS ITS OWN BOX. Text straight inside a flex container is
                an anonymous flex item that `text-overflow` never reaches, so the
                heading was cut mid-word at the bar's edge with no ellipsis. */}
            <Text variant="inherit" truncate className="crewlet-breadcrumb__text">
              {crumb.label}
            </Text>
          </>
        );
        const face = crumb.mono ? 'is-mono' : undefined;
        return (
          // KEYED BY DEPTH, not by words: the crumb at a depth is the same place
          // in the trail whatever it is called, so a heading whose subject is
          // switched keeps its element, and the control in it keeps focus.
          <span key={i} className="crewlet-breadcrumb__part">
            {i > 0 ? <ChevronRightGlyph size="xs" className="crewlet-breadcrumb__separator" aria-hidden="true" /> : null}
            {last ? (
              <h1
                className={cx('crewlet-breadcrumb__here', current !== undefined && 'crewlet-breadcrumb__here--control', face)}
                aria-current="page"
                tabIndex={-1}
              >
                {current !== undefined ? current : words}
              </h1>
            ) : crumb.href ? (
              <a className={cx('crewlet-breadcrumb__crumb', face)} href={crumb.href}>
                {words}
              </a>
            ) : (
              // AN ANCESTOR WITH NO PAGE OF ITS OWN, or one the reader is
              // already on ("Worklet" on Worklet's landing): its words in the
              // ancestors' quiet ink, with nothing to press.
              <span className={cx('crewlet-breadcrumb__crumb', face)}>{words}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** How many characters an ancestor keeps before it gives way. */
const KEEP_CHARACTERS = 20;

/**
 * The trail's floor (`--crewlet-breadcrumb-floor`): every ancestor at what it
 * keeps and the last crumb's stub, capped at the room beside what leads the
 * bar. Measured off whole words, never the cut boxes, so it is stable.
 */
function useFloor(el: RefObject<HTMLElement | null>, content: string): number {
  const [floor, setFloor] = useState(0);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const bar = node.parentElement;
    const measure = () => {
      const parts = [...node.querySelectorAll<HTMLElement>(':scope > .crewlet-breadcrumb__part')];
      const lastPart = parts[parts.length - 1];
      const last = lastPart?.querySelector(':scope > .crewlet-breadcrumb__here');
      if (!lastPart || !last) return setFloor(0);
      const start = node.getBoundingClientRect().left - node.scrollLeft;
      const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
      let wanted = parts[0]!.getBoundingClientRect().left - start;
      for (const part of parts.slice(0, -1)) {
        part.style.setProperty('--crewlet-breadcrumb-keep', `${Math.ceil(keptWidth(part))}px`);
        wanted += (parseFloat(getComputedStyle(part).minWidth) || 0) + gap;
      }
      wanted += last.getBoundingClientRect().left - lastPart.getBoundingClientRect().left;
      wanted += parseFloat(getComputedStyle(last).minWidth) || 0;
      wanted = Math.max(0, Math.ceil(wanted));
      setFloor(bar ? Math.min(wanted, roomBeside(bar, node)) : wanted);
    };
    measure();
    // Feature-checked as every observer in this package is: jsdom and older
    // embedded browsers have none, and an unguarded construction throws.
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(measure);
    for (const part of node.querySelectorAll('.crewlet-breadcrumb__part')) watch.observe(part);
    if (bar) watch.observe(bar);
    return () => watch.disconnect();
  }, [el, content]);
  return floor;
}

/**
 * How wide an ancestor's part is while it keeps `KEEP_CHARACTERS`: the part
 * as drawn, less its label as drawn, plus what the label keeps.
 */
function keptWidth(part: HTMLElement): number {
  const label = part.querySelector<HTMLElement>('.crewlet-breadcrumb__text');
  const drawn = part.getBoundingClientRect().width;
  // A label out of the flow (a phone's crumb that is its glyph, its words
  // kept for a screen reader alone) takes no width to keep.
  if (!label || getComputedStyle(label).position === 'absolute') return drawn;
  return drawn - label.getBoundingClientRect().width + labelKeeps(label);
}

/**
 * The width of a label's first `KEEP_CHARACTERS`, measured over its text
 * (laid out whole however it is clipped). Without ranges (jsdom), all of it.
 */
function labelKeeps(label: HTMLElement): number {
  const text = label.firstChild;
  if (!text || text.nodeType !== Node.TEXT_NODE || typeof document.createRange !== 'function') return label.scrollWidth;
  const range = document.createRange();
  if (typeof range.getBoundingClientRect !== 'function') return label.scrollWidth;
  range.setStart(text, 0);
  range.setEnd(text, Math.min((text.textContent ?? '').length, KEEP_CHARACTERS));
  return range.getBoundingClientRect().width;
}

/**
 * How wide `item` can be on its bar's first line: the bar's content box less
 * everything drawn before it and the gap after each. A bar not laid out yet
 * has no room to report, and caps nothing.
 */
function roomBeside(bar: HTMLElement, item: HTMLElement): number {
  const style = getComputedStyle(bar);
  const content = bar.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
  if (content <= 0) return Infinity;
  const gap = parseFloat(style.columnGap) || 0;
  let before = 0;
  for (let sib = item.previousElementSibling; sib; sib = sib.previousElementSibling) {
    const width = sib.getBoundingClientRect().width;
    if (width > 0) before += width + gap;
  }
  return Math.max(0, Math.floor(content - before));
}

/**
 * Whether `el` is wider inside than it is drawn. Measured again on resize and
 * when `content` changes, since a trail can grow without resizing its box.
 */
function useOverflows(el: RefObject<HTMLElement | null>, content: string): boolean {
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollWidth > node.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(measure);
    watch.observe(node);
    return () => watch.disconnect();
  }, [el, content]);
  return overflows;
}
