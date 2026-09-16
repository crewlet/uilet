/**
 * The signature illustrations, reachable by name.
 *
 * `name` is a registry lookup, so importing `Icon` at all brings EVERY
 * illustration into the bundle, and `crewlet-reading` alone is most of half a
 * megabyte of path data. That is the price of choosing an illustration from a
 * value, and it is only worth paying where the value really is data. Where the
 * illustration is known at the import site, import the component: every one of
 * them is a named export of this package, and a bundler then keeps that one.
 *
 * A glyph is not an illustration and is not here: see Glyph.tsx and
 * @crewlethq/icons/glyphs.
 */

import type { SVGProps } from 'react';
import type { IconName } from './generated/index.js';
import { ICONS } from './generated/registry.js';

const sizes = {
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
} as const;

export type IconSize = keyof typeof sizes | number | string;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'fontSize'> {
  name: IconName;
  size?: IconSize;
  title?: string;
}

const resolveSize = (size: IconSize | undefined): string =>
  size === undefined
    ? sizes.md
    : typeof size === 'number'
      ? `${size}px`
      : size in sizes
        ? sizes[size as keyof typeof sizes]
        : size;

export const Icon = ({ name, size, title, style, ...rest }: IconProps) => {
  const Component = ICONS[name];
  if (!Component) {
    return null;
  }
  const dimension = resolveSize(size);
  /*
   * A titled icon is named and exposed, an untitled one is hidden. Never both:
   * aria-hidden wins over role="img", and the generated components declare
   * aria-hidden themselves, so a title that did not clear it left the icon
   * looking named and staying silent.
   */
  const a11y = title
    ? { role: 'img', 'aria-label': title, 'aria-hidden': undefined, focusable: false }
    : { 'aria-hidden': true, focusable: false };
  return (
    <Component
      {...a11y}
      {...rest}
      style={{ width: dimension, height: dimension, ...style }}
    />
  );
};
