import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { fontStack, safeFontFamily } from '../utils/fontFamily.js';
import { normalizeHex } from '../utils/hexColour.js';

/**
 * A brand's colours by role, as the engine stores them. Each is `#rrggbb`;
 * one that is absent, or is not one, sets nothing, and the token it would
 * have driven keeps the page's value.
 */
export interface BrandColors {
  primary?: string | undefined;
  primary_on_dark?: string | undefined;
  secondary?: string | undefined;
  text?: string | undefined;
  light_ground?: string | undefined;
  dark_ground?: string | undefined;
}

/** A mode a scope can be pinned to, for a preview that shows a brand in one mode whatever the page is in. */
export type BrandScopeMode = 'light' | 'dark';

export interface BrandScopeProps extends HTMLAttributes<HTMLDivElement> {
  colors: BrandColors;
  /** The family list for headings. Set only when it reads as family names. */
  headingFamily?: string | undefined;
  /** The family list for everything else. Set only when it reads as family names. */
  bodyFamily?: string | undefined;
  /**
   * Pins the mode. Left out, the scope follows the page's light or dark, as
   * every surface in it does; pinned, it is that mode whatever the page is in:
   * the default theme's palette for the mode, with the brand's steps for it.
   */
  mode?: BrandScopeMode | undefined;
  /** The region the brand applies to. */
  children?: ReactNode;
}

/**
 * The brand mapping's inputs, by role. Spelt out rather than built, so the
 * package's custom property check can hold each to the inputs the mapping
 * reads.
 */
const COLOR_INPUTS: Readonly<Record<keyof BrandColors, string>> = {
  primary: '--brand-primary',
  primary_on_dark: '--brand-primary-on-dark',
  secondary: '--brand-secondary',
  text: '--brand-text',
  light_ground: '--brand-light-ground',
  dark_ground: '--brand-dark-ground',
};

/**
 * The inputs a brand sets, each only once it has passed its gate: a colour as
 * `#rrggbb`, a family list as family names, which then ends in the page's own
 * face, so a face still loading draws as the page's type.
 */
export function brandScopeInputs(colors: BrandColors, headingFamily?: string, bodyFamily?: string): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const [role, input] of Object.entries(COLOR_INPUTS) as [keyof BrandColors, string][]) {
    const value = normalizeHex(colors[role]);
    if (value !== null) inputs[input] = value;
  }
  if (safeFontFamily(headingFamily)) inputs['--brand-font-heading'] = fontStack(headingFamily, 'var(--font-family-display)');
  if (safeFontFamily(bodyFamily)) inputs['--brand-font-body'] = fontStack(bodyFamily, 'var(--font-family-sans)');
  return inputs;
}

/**
 * A region of the page in a company's brand: a doc, a board, a preview. The
 * public tokens inside it (the accent and its family, the grounds, the body
 * text, the faces) take the brand's values, and the page's chrome around it
 * keeps its own.
 *
 * THE MAPPING IS THE ARTIFACT KIT'S. The rules that derive the accent's hover,
 * press, ink, soft fills and the label on it from one colour, per mode, are
 * one stylesheet in @crewlethq/tokens (`css/brand`), and this component's
 * stylesheet (`css/brand-scope`) is built from it with its selectors moved
 * onto the scope. A page in the kit and a region of the dashboard in the same
 * brand are drawn by the same rules. The focus ring stays the theme's.
 *
 * TWO ELEMENTS, ONE BOX. The outer element carries the inputs and captures
 * the page's value of every token the brand drives, which an input left out
 * falls back to; it draws no box (`display: contents`). The inner element is
 * the box, with `className` and every other attribute on it, and sets the
 * body text and face so plain text inside follows the brand. It paints no
 * ground: a surface inside paints its own with the tokens.
 *
 * Nothing a person typed reaches a style unchecked: a colour only as
 * `#rrggbb`, a family list only when it reads as family names.
 */
export function BrandScope({ colors, headingFamily, bodyFamily, mode, className, children, ...rest }: BrandScopeProps) {
  return (
    <div
      className="crewlet-brand-scope"
      data-mode={mode}
      style={brandScopeInputs(colors, headingFamily, bodyFamily) as CSSProperties}
    >
      <div {...rest} className={cx('crewlet-brand-scope__layer', className)}>
        {children}
      </div>
    </div>
  );
}
