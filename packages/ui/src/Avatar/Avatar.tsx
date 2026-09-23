import { useEffect, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

/**
 * WHAT THE BADGE STANDS FOR, drawn as its outline.
 *
 * `agent` is the default: a SQUIRCLE with the initials in the mono face, which
 * is what the engine runs and what nearly every badge on that product is.
 * `human` is a CIRCLE with the initials in the sans face: a person.
 *
 * ONE STRUCTURAL CUE, where there used to be two. The badge took a `shape`
 * (square or circle) and a `variant` (solid, or `dashed` for a human seat), and
 * the two could disagree: a dashed square and a solid circle were both
 * reachable and meant nothing. The approved design draws a person as a circle
 * and an agent as a squircle, and that outline is the whole of the difference,
 * so it is the one prop. It is a SHAPE rather than a hue, which leaves every
 * hue meaning only a state, and it reads to somebody who cannot separate hues
 * at all.
 */
export type AvatarKind = 'agent' | 'human';

/**
 * How much colour a badge spends on WHO something is.
 *
 * `neutral` is the default. A hash of a name carries no information: rename
 * the seat and its colour changes, which is the proof it never meant anything.
 * Identity is the outline, the monogram and the name beside it.
 *
 * `seeded` is for a roster where a stable per-identity tint genuinely helps a
 * reader scan, a member list being the case it was built for. Each seeded
 * ground is a token measured at 4.5:1 under white initials.
 *
 * THERE IS NO `brand` TONE ANY MORE. The accent means "here", "the primary
 * action" and "focus"; a badge filled with it was identity drawn in the
 * reader's-position colour. A badge that is SELECTED says so with
 * `ring="brand"`, which is the design's own selected badge.
 */
export type AvatarTone = 'neutral' | 'seeded';

/**
 * The STATE ring: a 1.5px line 2px outside the badge, in one of the state
 * fills or the accent.
 *
 * `info`, `warning`, `danger` and `success` are what the thing is DOING, and
 * `brand` is SELECTED. Which state each one means is the consumer's to decide,
 * and to SAY in words beside the badge: the ring is never the only carrier of
 * a state, because in forced-colors mode every ring is the same system colour.
 * No ring at all is the resting state.
 */
export type AvatarRing = Exclude<Tone, 'neutral'>;

/** The four steps, in px. A number is accepted for anything outside them. */
export const AVATAR_SIZES = { xs: 20, sm: 26, md: 32, lg: 40 } as const;

export type AvatarSizeStep = keyof typeof AVATAR_SIZES;
export type AvatarSize = AvatarSizeStep | number;

/**
 * An agent's corner, as a share of its box.
 *
 * The approved design draws 7px at 24 and 9px at 30 (and 5 at 18, 6 at 20, 8
 * at 26 and 28, 13 at 44): a corner that moves WITH the box rather than
 * sitting on one radius step, which would read as a pill at the smallest badge
 * and as a plain box at the largest. 0.29 is that ladder as one number, and
 * every size the design draws lands within 0.62px of it.
 *
 * THE STYLESHEET COMPUTES IT, from `--crewlet-avatar-size`, for a step and for
 * a numeric size alike, so there is one ladder and nothing to keep in step
 * with it. The number is restated in `Avatar.css`, which cannot import it, and
 * the suite holds the two equal.
 */
export const AVATAR_CORNER_RATIO = 0.29;

export interface AvatarProps extends HTMLAttributes<HTMLElement> {
  /** Image source. With one set the badge renders the image; otherwise the initials. */
  src?: string | undefined;
  /** The name behind the initials, and the image's alt text. */
  name?: string | undefined;
  /** A step, or a number of px. */
  size?: AvatarSize | undefined;
  /** An agent (the default) is a squircle; a human is a circle. */
  kind?: AvatarKind | undefined;
  tone?: AvatarTone | undefined;
  /** A state ring, or none. `brand` is selected. */
  ring?: AvatarRing | undefined;
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
 * The corner an agent's badge of this many pixels is drawn with, in px, where
 * the browser draws a circular corner (`Avatar.css` has the squircle).
 *
 * The same arithmetic the stylesheet does, for a caller that has to round
 * something ELSE to match a badge: `ImageUpload`'s trigger and overlay sit
 * over the picture, and a corner of their own would show the badge's corners
 * through them at every size but one.
 *
 * NOT ROUNDED, because the stylesheet cannot round: a whole-pixel corner there
 * would take `round()` with a literal length, which the package's literal
 * check refuses in a radius, and a rounded number here would then disagree
 * with the badge under it by up to half a pixel. A fractional corner is
 * anti-aliased like any other curve.
 */
export function avatarCorner(pixels: number): number {
  return pixels * AVATAR_CORNER_RATIO;
}

/**
 * An identity badge: an image, or the initials behind it.
 *
 * If the image fails to load (a stale CDN URL, an expired signature) it
 * degrades to the initials rather than to a broken-image glyph. Either way it
 * keeps its kind's outline and its ring: whether somebody has uploaded a photo
 * says nothing about what they are or what they are doing.
 */
export const Avatar = ({
  src,
  name,
  size = 'md',
  kind = 'agent',
  tone = 'neutral',
  ring,
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
   * A step takes its box and its type from the scale, in the stylesheet. A
   * number sets the SAME custom property the steps set, so its box, and the
   * agent's corner computed from it, come out of the one rule every step goes
   * through: a numeric badge cannot be drawn squarer or rounder than the steps
   * either side of it. Its type is computed here, because nothing in the scale
   * can answer for an arbitrary box: 0.36 of it keeps two initials inside the
   * outline, with a floor of 9px, under which they are not initials any more.
   */
  const measured =
    step === null
      ? ({
          '--crewlet-avatar-size': `${pixels}px`,
          fontSize: Math.max(9, Math.round(pixels * 0.36)),
        } as CSSProperties)
      : {};

  const seeded = tone === 'seeded' ? avatarTint(colorSeed ?? name ?? '') : null;

  const classes = cx(
    'crewlet-avatar',
    `crewlet-avatar--${kind}`,
    step === null ? null : `crewlet-avatar--${step}`,
    ring === undefined ? null : `crewlet-avatar--ring-${ring}`,
    className,
  );

  if (src && !imageFailed) {
    return (
      <img
        {...rest}
        className={cx(classes, 'crewlet-avatar--image')}
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
