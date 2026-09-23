/**
 * The frame every Lucide glyph is drawn in.
 *
 * A glyph is an SVG, never a font ligature. A ligature renders the WORD it
 * names until a stylesheet has fetched a font from a third-party host, renders
 * that word for good on a closed network, and is read aloud as that word by a
 * screen reader that does not know it is looking at an icon. The drawings ship
 * in the package instead; see glyphs/README.md.
 *
 * A glyph is a STROKE on the 24 unit grid, with round caps and round joins,
 * which is how the approved design draws every one of them. The frame owns
 * all of that and the generated components in src/generated/glyphs carry only
 * their geometry, so a glyph costs one function and its own elements where a
 * bundler keeps it, and nothing at all where it does not, and no glyph can be
 * drawn at a weight the others are not.
 */

import type { ReactNode, SVGProps } from 'react';

/** The size steps, in px. The type scale's own steps, not a new scale. */
export const GLYPH_SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;

export type GlyphSizeStep = keyof typeof GLYPH_SIZES;
export type GlyphSize = GlyphSizeStep | number | (string & {});

/**
 * The stroke every glyph draws at, in units of the 24 grid: the approved
 * design's `.ico` rule, 1.75 where Lucide's own files say 2. It scales with
 * the glyph, as the design's does, so a 16 px glyph draws a 1.17 px line and a
 * 24 px one a 1.75 px line.
 *
 * `--crewlet-glyph-stroke` on any ancestor moves it for everything beneath,
 * and it is the one way to: a surface whose glyphs sit at a size where the
 * line thins past legibility sets the variable once, rather than every glyph
 * taking a prop that the next glyph added to the surface forgets.
 */
export const GLYPH_STROKE = 1.75;
const STROKE = `var(--crewlet-glyph-stroke, ${GLYPH_STROKE})`;

/**
 * A glyph's props: its size, its name for assistive technology, and every SVG
 * attribute a caller legitimately sets on an icon (a class, a style, a colour,
 * a handler, an aria- or data- attribute).
 *
 * WHAT THE FRAME OWNS IS NOT HERE: the viewBox, the fill, the stroke width and
 * the caps and joins. Each of those changes the drawing rather than where or
 * how big it is, and each has one right answer for every glyph. `fill` in
 * particular paints the inside of a stroke drawing, which turns every glyph
 * with an open line into a blob. The filled state is `filled`, which only a
 * FILLABLE glyph takes; the weight is `--crewlet-glyph-stroke`.
 */
export interface GlyphProps
  extends Omit<
    SVGProps<SVGSVGElement>,
    'title' | 'children' | 'viewBox' | 'fill' | 'strokeWidth' | 'strokeLinecap' | 'strokeLinejoin'
  > {
  /** A step, a number of px, or any CSS length. Defaults to `1em`. */
  size?: GlyphSize;
  /**
   * Names the glyph for assistive technology. Without one the glyph is
   * decoration, which is what it almost always is: the meaning is carried by
   * the label beside it.
   */
  title?: string;
}

/** The props of a glyph listed in `FILLABLE`, and of no other. */
export interface FillableGlyphProps extends GlyphProps {
  /**
   * Paints the drawing's inside in the text colour, for a state the outline
   * and the solid mark tell apart: a kept item's star. The stroke stays, so
   * the two states are one silhouette at one size.
   */
  filled?: boolean;
}

/**
 * The CSS length a size prop means, `1em` when it says nothing.
 *
 * Shared with VendorMark, which sits on the same steps because it sits beside
 * glyphs, and PUBLISHED for the same reason: a drawing that is not a Glyph at
 * all (the Crewlet figure, a vendor's own SVG) is sized by a consumer who is
 * choosing between it and a glyph, and a second reading of what `sm` is worth
 * is how one of them stops matching the other.
 */
export function cssLength(size: GlyphSize | undefined): string {
  if (size === undefined) return '1em';
  if (typeof size === 'number') return `${size}px`;
  if (size in GLYPH_SIZES) return `${GLYPH_SIZES[size as GlyphSizeStep]}px`;
  return size;
}

/**
 * The frame itself. Not exported from the package: a glyph is one of the
 * generated components, each of which hands this its own geometry and says
 * whether its drawing may be filled.
 */
export function Glyph({
  size,
  title,
  filled = false,
  fillable,
  className,
  style,
  children,
  ...rest
}: FillableGlyphProps & { fillable: boolean; children: ReactNode }) {
  const dimension = cssLength(size);
  /*
   * A titled glyph is named and exposed; an untitled one is hidden and cannot
   * take focus. Never both: aria-hidden wins over role="img", so a glyph that
   * kept its aria-hidden while gaining a title would look named and stay
   * silent.
   */
  const semantics: SVGProps<SVGSVGElement> = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true, focusable: false };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dimension}
      height={dimension}
      stroke="currentColor"
      {...semantics}
      className={className === undefined ? 'crewlet-glyph' : `crewlet-glyph ${className}`}
      {...rest}
      /*
       * AFTER the caller's attributes, so the frame is the frame even for a
       * caller the types do not reach.
       *
       * The weight is written twice, on purpose. The STYLE carries the
       * variable, because a presentation attribute is not where every engine
       * resolves var(), and a style beats an attribute. The ATTRIBUTE carries
       * the plain number for a page that refuses the style: markup rendered
       * on a server under a strict style-src loses every style attribute, and
       * a glyph with neither would draw at the SVG default of 1, three sevenths
       * lighter than the design.
       */
      viewBox="0 0 24 24"
      fill={fillable && filled ? 'currentColor' : 'none'}
      strokeWidth={GLYPH_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ ...style, strokeWidth: STROKE }}
    >
      {children}
    </svg>
  );
}
