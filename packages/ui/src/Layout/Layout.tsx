/**
 * The four layout primitives every screen is assembled from.
 *
 * WHY THEY EXIST. A product that has no Stack writes `display: flex` in a
 * hundred places, and each one spends its own gap: the dashboard this set
 * comes from carried 87 inline `style` props, 56 of them holding a literal (a
 * gap of 2, a max width of 380, a left pad of depth times 12). Every one of
 * those is a value nobody can find again and nothing can hold to a scale.
 *
 * So a gap is a STEP on the spacing scale rather than a number, which is what
 * makes a density setting reach it: every step is `calc(Npx * var(--density))`
 * in the token layer, so a compact reader gets a compact page without a single
 * component knowing that density exists.
 *
 * WHAT THEY ARE NOT. They are not a style prop, and they are not a grid
 * system. There is no `padding`, no `margin` and no colour here, because a
 * component that takes those stops being a layout and starts being a second
 * way to write CSS, with none of the review a stylesheet gets.
 */

import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/**
 * A step on the spacing scale, never a number of pixels.
 *
 * The union is what stops `gap={7.5}` and `gap={300}`: a value off the scale
 * is the whole defect these primitives exist to remove.
 */
export type SpacingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Cross-axis placement, in the words a reader of the markup can check. */
export type LayoutAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

/** Main-axis placement. */
export type LayoutJustify = 'start' | 'center' | 'end' | 'between' | 'around';

/**
 * What both flex primitives take.
 *
 * Exported under both names, as every other component in the package exports
 * the props it takes: a screen that wraps a Stack in a component of its own
 * has to be able to name what it is passing on.
 */
export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** The gap between children, as a spacing step. */
  gap?: SpacingStep | undefined;
  align?: LayoutAlign | undefined;
  justify?: LayoutJustify | undefined;
  /** Lets the children wrap onto another line. */
  wrap?: boolean | undefined;
  /** The element to draw. A div by default; a `ul`, a `header`, a `form`. */
  as?: ElementType | undefined;
  children?: ReactNode;
}

/** An Inline takes the same props; only the axis and the default align differ. */
export type InlineProps = StackProps;

/**
 * The gap as a CLASS on the scale, never an inline length.
 *
 * A class rather than a style property for two reasons. The value stays a
 * token reference the browser resolves, so a theme or a density that redefines
 * the step reaches a Stack that was rendered before the change, where a pixel
 * count computed in JavaScript would be frozen into the markup. And a
 * component that writes no inline style is one a strict Content-Security-Policy
 * can serve without a style-src exception.
 */
function gapClass(gap: SpacingStep | undefined): string | false {
  return gap !== undefined && `crewlet-layout--gap-${gap}`;
}

function flexClasses(
  base: string,
  { gap, align, justify, wrap }: Pick<StackProps, 'gap' | 'align' | 'justify' | 'wrap'>,
  className: string | undefined,
): string {
  return cx(
    base,
    gapClass(gap),
    align && `crewlet-layout--align-${align}`,
    justify && `crewlet-layout--justify-${justify}`,
    wrap && 'crewlet-layout--wrap',
    className,
  );
}

/**
 * A vertical run of children with one gap between them.
 *
 * `min-width: 0` is part of the primitive rather than something each caller
 * remembers: a flex child's minimum size is its content, so one long token in
 * one row pushes the whole column wider than its parent and the page grows a
 * horizontal scrollbar nobody asked for.
 */
export function Stack({ gap, align, justify, wrap, as: Tag = 'div', className, children, ...rest }: StackProps) {
  return (
    <Tag {...rest} className={flexClasses('crewlet-stack', { gap, align, justify, wrap }, className)}>
      {children}
    </Tag>
  );
}

/**
 * A horizontal run of children, centred on the cross axis.
 *
 * Centred by default because that is what a row of controls, chips and labels
 * wants; a row whose items are different heights and must line up at the top
 * passes `align="start"`.
 */
export function Inline({
  gap,
  align = 'center',
  justify,
  wrap,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <Tag {...rest} className={flexClasses('crewlet-inline', { gap, align, justify, wrap }, className)}>
      {children}
    </Tag>
  );
}

export type SpacerProps = HTMLAttributes<HTMLSpanElement>;

/**
 * The flexible space that pushes what follows it to the far end of a row.
 *
 * DECORATION, so it is hidden from assistive technology: it holds no content,
 * and an empty element in the accessibility tree is one more thing to walk
 * past. A row that wants its trailing group pushed over uses this rather than
 * `margin-left: auto` on a child, because the child then carries a rule about
 * where it happens to sit in one particular row.
 */
export function Spacer({ className, ...rest }: SpacerProps) {
  return <span {...rest} aria-hidden className={cx('crewlet-spacer', className)} />;
}

/**
 * The smallest column a card may be drawn at, as a named step.
 *
 * Three steps, taken from the three the dashboard measured its own cards at:
 * `sm` for a stat tile, `md` for a card with a sentence in it, `lg` for one
 * holding a table or a chart.
 */
export type AutoGridMin = 'sm' | 'md' | 'lg';

export interface AutoGridProps extends HTMLAttributes<HTMLDivElement> {
  /** The narrowest a track may be before the row drops a column. */
  min?: AutoGridMin | undefined;
  gap?: SpacingStep | undefined;
  children?: ReactNode;
}

/**
 * Cards laid out at a minimum readable width, wrapping without a breakpoint.
 *
 * `auto-fill` with `minmax(min(step, 100%), 1fr)` is the whole of it. The
 * inner `min()` is what stops the track being wider than the grid itself on a
 * narrow screen, which is how a card grid gives a phone a horizontal
 * scrollbar; `auto-fill` rather than `auto-fit` is what keeps a row that is
 * short of a full set of cards drawing cards at the width the full row would
 * give them, instead of stretching them over the collapsed tracks.
 */
export function AutoGrid({ min = 'md', gap = 4, className, children, ...rest }: AutoGridProps) {
  return (
    <div {...rest} className={cx('crewlet-auto-grid', `crewlet-auto-grid--${min}`, gapClass(gap), className)}>
      {children}
    </div>
  );
}
