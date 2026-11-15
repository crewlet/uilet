/**
 * The trail in a top bar: where the reader is, and the way back out.
 *
 * THE LAST CRUMB IS THE PAGE'S HEADING. The bar is the page's banner and sits
 * outside `main`, and the name of the place the reader is at is what a reader
 * navigating by heading lands on first, so the last crumb is the `h1` and every
 * screen's own headings start at level 2 under it. It carries no link: a trail
 * whose final crumb links to the page it is on teaches a reader that the
 * control does nothing.
 *
 * THE HEADING IS WHERE A PAGE SENDS FOCUS when the control holding it goes
 * away (a removed card, a closed view). It is a reading position, not a
 * control: focusable by script only (`tabIndex={-1}`), never a tab stop, and
 * drawn with no ring.
 *
 * A PAGE WHOSE SUBJECT CAN BE SWITCHED draws its control as that heading's
 * words (`current`): a switcher's button names the project the page is about
 * and opens the list of the others, so the reader changes the subject where
 * the subject is named rather than in a second control beside it.
 *
 * THE TRAIL IS A SCROLLPORT, AND WHILE IT OVERFLOWS IT IS A TAB STOP. It
 * scrolls sideways past its floor rather than clipping the ancestry as a box,
 * and its scrollbar is not drawn, because on a bar this short it would sit on
 * the baseline the trail is written on. A pointer can drag a hidden scrollport
 * and a trackpad can swipe it, but a keyboard reaches a scroll container's
 * arrow keys only once it can be focused, and a deep trail overflows on its
 * ancestor spans, which are not links and take no focus of their own. A trail
 * that fits has nowhere for the arrows to go, so the stop is there only while
 * `scrollWidth` exceeds `clientWidth`.
 *
 * ITS FLOOR IS THE WAY BACK OUT (`--crewlet-breadcrumb-floor`): every ancestor
 * at a readable minimum of its words (its first twenty characters, all of
 * them where it has fewer) and the last crumb at its stub, measured. The bar
 * around it breaks a line when that floor cannot sit beside its controls, so
 * a trail that cannot show its ancestry takes a line of its own, and it
 * scrolls only when its ancestry alone is wider than the whole bar.
 *
 * Ported from the engine dashboard's `app/header/PageHeader.tsx`.
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
   * A control drawn as the last crumb's words, inside the page's heading: a
   * switcher's button where the page's subject is one of several the reader
   * can move between. The control carries its own words; the last crumb is
   * still what the trail is measured by.
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

/**
 * How much of an ancestor's words it keeps before it gives way: its first
 * twenty characters, or all of them where it has fewer. A space's name and a
 * parent page's title read from that much ("Product Management", "ADR 1: Add
 * GPU-awar..."); at a 2ch stub a busy bar cut them to "D..." and "Product
 * Man...", or to nothing where the crumb leads with a glyph.
 */
const KEEP_CHARACTERS = 20;

/**
 * The narrowest the trail can be and still show the way back out: where the
 * trail's first part starts, every ancestor at what it keeps of its words (its
 * `min-width`, `--crewlet-breadcrumb-keep`, measured here), the last part's
 * separator, and the stub the last crumb keeps; or 0 before anything is laid
 * out.
 *
 * NEVER MORE THAN THE ROOM BESIDE WHAT LEADS THE BAR. Below the shell
 * breakpoint the drawer toggle opens the bar's first line, and a floor wider
 * than what the toggle leaves pushed the trail under it: a line holding the
 * toggle alone, then the trail, then the controls. Capped at that room, a trail
 * whose ancestry is wider still scrolls beside the toggle.
 *
 * STABLE UNDER ITS OWN EFFECT. Nothing it reads depends on how wide the trail
 * is drawn: an ancestor's words are measured whole, off their own text rather
 * than off the box that cuts them, and the rest of a part (its separator, its
 * glyph) never gives way. Read off the live layout instead, the floor measured
 * ancestors a busy bar had already cut to stubs, so it allowed exactly the cut
 * it saw and the bar never broke a line. Measured again whenever a crumb or
 * the bar changes size: a screen publishing its object's name, a font
 * finishing loading, the window.
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
 * How wide an ancestor's part is while it keeps `KEEP_CHARACTERS` of its
 * words: the part as drawn, less its label as drawn, plus what the label
 * keeps. Only the label gives way inside a part, so the rest (the separator,
 * a glyph, a key chip) is the part's width less the label's, however cut.
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
 * The width of a label's first `KEEP_CHARACTERS`, or of all of it where it is
 * shorter: measured over its text, which is laid out whole on its line however
 * narrow the box that clips it. A layout with no ranges (jsdom) reads the
 * label's whole width instead.
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
 * Whether `el` is wider inside than it is drawn: a scrollport with somewhere
 * to scroll. Measured after layout, and again whenever the box is resized or
 * `content` changes, because a trail grows when a screen publishes a name for
 * its object, which resizes nothing.
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
