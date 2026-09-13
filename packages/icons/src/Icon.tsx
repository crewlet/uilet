import type { ComponentType, SVGProps } from 'react';
import * as Generated from './generated/index.js';
import type { IconName } from './generated/index.js';

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

const registry = Generated as unknown as Record<
  IconName,
  ComponentType<SVGProps<SVGSVGElement>>
>;

export const Icon = ({ name, size, title, style, ...rest }: IconProps) => {
  const Component = registry[name];
  if (!Component) {
    return null;
  }
  const dimension = resolveSize(size);
  const a11y = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true, focusable: false };
  return (
    <Component
      {...a11y}
      {...rest}
      style={{ width: dimension, height: dimension, ...style }}
    />
  );
};
