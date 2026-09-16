import { useEffect, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

/**
 * Round, or a rounded square.
 *
 * `square` IS THE DEFAULT. The engine's identity mark is a rounded square, and
 * it is what a reader sees in every seat chip, every list row and every header
 * on that product; a design system with two identity marks has two looks.
 * `circle` stays for a PERSON in a member list, where the round badge is the
 * platform convention that surface already speaks.
 */
export type AvatarShape = 'circle' | 'square';

/**
 * How much colour a badge spends on WHO something is.
 *
 * `neutral` is the default, and the change from 0.2.0. A hash of a name
 * carries no information: rename the seat and its colour changes, which is the
 * proof it never meant anything. Worse, the eight families a hash spreads over
 * are the same eight the product spends on states and phases, so one amber
 * meant "the execute phase", "needs a person" and "the Analyst" at once.
 * Identity is the monogram and the name beside it.
 *
 * `brand` is for the one badge that is the reader themselves, and `seeded` for
 * a roster where a stable per-identity tint genuinely helps a reader scan, a
 * member list being the case it was built for. Each seeded ground is a token
 * measured at 4.5:1 under white initials.
 */
export type AvatarTone = 'neutral' | 'brand' | 'seeded';

/**
 * Filled, or drawn.
 *
 * `dashed` is a HUMAN seat: the engine does not run it. That is a structural
 * fact rather than a status, so it is carried by the edge rather than by a
 * hue, which is what leaves the status hues meaning only what they mean.
 */
export type AvatarVariant = 'solid' | 'dashed';

/** The four steps, in px. A number is accepted for anything outside them. */
export const AVATAR_SIZES = { xs: 20, sm: 26, md: 32, lg: 40 } as const;

export type AvatarSizeStep = keyof typeof AVATAR_SIZES;
export type AvatarSize = AvatarSizeStep | number;

export interface AvatarProps extends HTMLAttributes<HTMLElement> {
  /** Image source. With one set the badge renders the image; otherwise the initials. */
  src?: string | undefined;
  /** The name behind the initials, and the image's alt text. */
  name?: string | undefined;
  /** A step, or a number of px. */
  size?: AvatarSize | undefined;
  shape?: AvatarShape | undefined;
  tone?: AvatarTone | undefined;
  variant?: AvatarVariant | undefined;
  /**
   * The name is already printed beside this badge, so the badge itself says
   * nothing. Without it a row reads "Carlos Diaz avatar, Carlos Diaz".
   */
  decorative?: boolean | undefined;
  /**
   * What the seeded tint is hashed from, where it is not the name: a stable id
   * outlives a rename, so the colour does too. Only read with `tone="seeded"`.
   */
  colorSeed?: string | undefined;
}

/**
 * Up to two uppercase initials.
 *
 * SPLIT ON WHITESPACE, HYPHEN, UNDERSCORE AND DOT, because half the names this
 * draws are handles rather than names: `backend-engineer` gives BE,
 * `sre_lead` gives SL and `carlos.diaz` gives CD, where splitting on spaces
 * alone gives B, S and C and a roster of identical badges.
 */
export const getInitials = (name?: string): string => {
  if (!name) return '?';
  const words = name.trim().split(/[\s\-_.]+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (
    words
      .slice(0, 2)
      // Array.from keeps astral characters (emoji, combined scripts) intact
      // where charAt would split a surrogate pair.
      .map((word) => (Array.from(word)[0] ?? '').toUpperCase())
      .join('') || '?'
  );
};

/** How many identity tints @crewlethq/tokens measures and Avatar.css binds. */
const TINT_COUNT = 10;

/**
 * Map a seed to one of the fixed tints. A small deterministic hash, so the
 * same seed always resolves to the same colour and different seeds spread.
 */
export const avatarTint = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % TINT_COUNT;
};

/** The px a size prop means. */
export function avatarPixels(size: AvatarSize): number {
  return typeof size === 'number' ? size : AVATAR_SIZES[size];
}

/**
 * The corner a square badge of this many pixels takes.
 *
 * THE CORNER MOVES WITH THE BOX, which is the rule the steps are drawn to:
 * 4px at 20, 8px at 26 and 32, 12px at 40. A numeric size has to obey the same
 * rule or it contradicts it, and it did: every arbitrary box took the middle
 * step, so `size={80}` rendered an 8px corner where `size="lg"` at half the
 * width renders 12px, a bigger badge drawn squarer than a smaller one. The
 * bands are the steps' own midpoints, so a number lands on the corner of the
 * step nearest it and the ladder is one ladder rather than two.
 *
 * The values are spelled in full rather than composed from the step name: the
 * package's variable check reads `var(--radius-${name})` as a reference to a
 * token called `--radius-`, which nothing emits.
 */
export function avatarSquareCorner(pixels: number): string {
  if (pixels < 23) return 'var(--radius-xs)';
  if (pixels < 36) return 'var(--radius-md)';
  return 'var(--radius-lg)';
}

/**
 * An identity badge: an image, or the initials behind it.
 *
 * If the image fails to load (a stale CDN URL, an expired signature) it
 * degrades to the initials rather than to a broken-image glyph.
 */
export const Avatar = ({
  src,
  name,
  size = 'md',
  shape = 'square',
  tone = 'neutral',
  variant = 'solid',
  decorative = false,
  colorSeed,
  className,
  style,
  ...rest
}: AvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Reset when the source changes, so a fresh upload is given a chance to load
  // after a previous URL failed.
  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const step = typeof size === 'number' ? null : size;
  const pixels = avatarPixels(size);
  /*
   * A step takes its type from the scale, in the stylesheet. A number is an
   * arbitrary size nothing in the scale can answer for, so its own font size
   * is computed here: 0.36 of the box is what keeps two initials inside a
   * circle, with a floor of 9px, under which they are not initials any more.
   */
  const measured: CSSProperties =
    step === null
      ? {
          width: pixels,
          height: pixels,
          fontSize: Math.max(9, Math.round(pixels * 0.36)),
          // And its corner, for the same reason: the stylesheet's square steps
          // move the radius with the box, so an arbitrary box that took one
          // fixed step would be squarer or rounder than every step beside it.
          ...(shape === 'square' ? { borderRadius: avatarSquareCorner(pixels) } : {}),
        }
      : {};

  const seeded = tone === 'seeded' ? avatarTint(colorSeed ?? name ?? '') : null;

  const classes = cx(
    'crewlet-avatar',
    `crewlet-avatar--${shape}`,
    step === null ? null : `crewlet-avatar--${step}`,
    className,
  );

  if (src && !imageFailed) {
    return (
      <img
        {...rest}
        // The dashed edge travels with the image: whether a human seat has
        // uploaded a photo says nothing about whether the engine runs it.
        className={cx(classes, 'crewlet-avatar--image', variant === 'dashed' && 'crewlet-avatar--dashed')}
        style={{ ...measured, ...style }}
        src={src}
        alt={decorative ? '' : (name ?? '')}
        aria-hidden={decorative ? true : undefined}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      {...rest}
      className={cx(
        classes,
        'crewlet-avatar--fallback',
        `crewlet-avatar--${tone}`,
        variant === 'dashed' && 'crewlet-avatar--dashed',
        seeded === null ? null : `crewlet-avatar--tint-${seeded}`,
      )}
      style={{ ...measured, ...style }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : name ? `${name} avatar` : 'Avatar'}
    >
      {getInitials(name)}
    </span>
  );
};
