/**
 * The frame every Material Symbols glyph is drawn in.
 *
 * A glyph is an SVG, never a font ligature. A ligature renders the WORD
 * `keyboard_arrow_down` until a stylesheet has fetched a font from a
 * third-party host, renders that word for good on a closed network, and is
 * read aloud as that word by a screen reader that does not know it is looking
 * at an icon. The drawings ship in the package instead; see symbols/README.md.
 *
 * The generated components in src/generated/glyphs carry two path strings and
 * nothing else, so a glyph costs one function and its own drawing where a
 * bundler keeps it, and nothing at all where it does not.
 */

import type { SVGProps } from 'react';

/** The size steps, in px. The type scale's own steps, not a new scale. */
export const GLYPH_SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;

export type GlyphSizeStep = keyof typeof GLYPH_SIZES;
export type GlyphSize = GlyphSizeStep | number | (string & {});

/**
 * Which drawing to use. The optical size axis is a different drawing rather
 * than a scaled one: the 20 px `close` is a 51-unit stroke on the 960 grid and
 * the 24 px one is 56, so the wrong drawing reads as the wrong weight beside
 * anything drawing the right one.
 */
export type GlyphOpticalSize = 20 | 24;

/** The same glyph at both vendored optical sizes. */
export interface GlyphDrawing {
  20: string;
  24: string;
}

export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, 'title'> {
  /** A step, a number of px, or any CSS length. Defaults to `1em`. */
  size?: GlyphSize;
  /**
   * Names the glyph for assistive technology. Without one the glyph is
   * decoration, which is what it almost always is: the meaning is carried by
   * the label beside it.
   */
  title?: string;
  /**
   * Which vendored drawing to render. It follows `size` whenever `size` says
   * how many px that is, so pass this only when it cannot: a glyph left at the
   * default `1em` inside a surface whose own stylesheet sets a font size above
   * 20 px wants `opsz={24}`. CSS cannot hand a computed font size back to the
   * component that would have to choose, so the choice is a prop.
   */
  opsz?: GlyphOpticalSize;
}

const THRESHOLD = 20;

/**
 * The px a size resolves to, or null when it does not resolve to one. `1em`,
 * `2rem` and `100%` each depend on something only the document knows, so they
 * answer null and leave the optical size to its default.
 */
export function glyphPixels(size: GlyphSize | undefined): number | null {
  if (size === undefined) return null;
  if (typeof size === 'number') return Number.isFinite(size) ? size : null;
  if (size in GLYPH_SIZES) return GLYPH_SIZES[size as GlyphSizeStep];
  const px = /^(\d+(?:\.\d+)?)px$/.exec(size.trim());
  return px === null ? null : Number(px[1]);
}

/** The drawing a rendered size asks for. */
export function glyphOpticalSize(size: GlyphSize | undefined): GlyphOpticalSize {
  const pixels = glyphPixels(size);
  // The default is the smaller drawing because the default size is 1em, and a
  // glyph inheriting a font size in this design system sits in body text or a
  // control label, every step of which is at or below 20 px.
  return pixels !== null && pixels > THRESHOLD ? 24 : 20;
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

export function Glyph({
  drawing,
  size,
  title,
  opsz,
  className,
  ...rest
}: GlyphProps & { drawing: GlyphDrawing }) {
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
      viewBox="0 -960 960 960"
      width={dimension}
      height={dimension}
      fill="currentColor"
      {...semantics}
      className={className === undefined ? 'crewlet-glyph' : `crewlet-glyph ${className}`}
      {...rest}
    >
      <path d={drawing[opsz ?? glyphOpticalSize(size)]} />
    </svg>
  );
}
