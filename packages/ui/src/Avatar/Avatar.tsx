import { useEffect, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';

export type AvatarShape = 'circle' | 'square';

export interface AvatarProps extends HTMLAttributes<HTMLElement> {
  /** Image source. When set, the avatar renders the image; otherwise it falls back to initials. */
  src?: string | undefined;
  /** Display name used for the initials fallback and the image alt text. */
  name?: string | undefined;
  /** Rendered width and height in pixels. */
  size?: number | undefined;
  /** Outline shape: "circle" for a round badge, "square" for rounded corners. Defaults to "circle". */
  shape?: AvatarShape | undefined;
  /**
   * Optional identity seed for the initials fallback. When set (and no image
   * is shown), the badge background is a stable colour hashed from this value
   * instead of the plain brand accent, so each identity keeps a distinct,
   * consistent colour. Has no effect when an image renders.
   */
  colorSeed?: string | undefined;
}

/**
 * Derive up to two uppercase initials from a name. Uses the first letter of
 * the first two words (for example "Carlos Diaz" becomes "CD", "Acme" becomes
 * "A"). Returns "?" when no usable name is provided.
 */
export const getInitials = (name?: string): string => {
  if (!name) {
    return '?';
  }
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  return words
    .slice(0, 2)
    // Array.from keeps astral characters (emoji, combined scripts) intact
    // where charAt would split a surrogate pair.
    .map((word) => (Array.from(word)[0] ?? '').toUpperCase())
    .join('');
};

/** Number of identity tints defined in Avatar.css (crewlet-avatar--tint-N). */
const TINT_COUNT = 10;

/**
 * Map an identity seed to one of the fixed tint indices in Avatar.css. Uses a
 * small deterministic string hash so the same seed always resolves to the same
 * colour, and different seeds spread across the palette.
 */
export const avatarTint = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % TINT_COUNT;
};

/**
 * Avatar, a round identity badge. Renders the supplied image cropped to a
 * circle, or an initials fallback derived from the name when no image is set.
 * If the image fails to load (for example a stale CDN URL), it degrades to the
 * initials fallback.
 */
export const Avatar = ({
  src,
  name,
  size = 64,
  shape = 'circle',
  colorSeed,
  className = '',
  style,
  ...rest
}: AvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Reset the error state when the source changes so a fresh upload is given
  // a chance to load after a previous URL failed.
  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const dimensions: CSSProperties = { width: size, height: size };
  const shapeClass = `crewlet-avatar--${shape}`;
  const classes = (...extra: string[]) =>
    ['crewlet-avatar', ...extra, shapeClass, className].filter(Boolean).join(' ');

  if (src && !imageFailed) {
    return (
      <img
        {...rest}
        className={classes('crewlet-avatar--image')}
        style={{ ...dimensions, ...style }}
        src={src}
        alt={name ?? ''}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      {...rest}
      className={classes(
        'crewlet-avatar--fallback',
        ...(colorSeed ? ['crewlet-avatar--tint', `crewlet-avatar--tint-${avatarTint(colorSeed)}`] : []),
      )}
      style={{ ...dimensions, fontSize: Math.max(12, Math.round(size / 3)), ...style }}
      role="img"
      aria-label={name ? `${name} avatar` : 'Avatar'}
    >
      {getInitials(name)}
    </span>
  );
};
