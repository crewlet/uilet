import { useEffect, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactElement } from 'react';
import { CrewletCharacter, type CrewletCharacterId } from '@crewlethq/icons/characters';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

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
 * The SELECTED ring: a 1.5px line 2px outside the badge, in the accent.
 *
 * It is the one ring there is. A ring used to carry a state too (`info`,
 * `warning`, `danger`, `success`), and on a character plate that already
 * wears its own hue it put a second colour round a 32px mark, framing what
 * the agent was doing louder than who it is. A state is a [AvatarStatus]
 * now, a small badge on the corner whose SHAPE says it.
 */
export type AvatarRing = 'brand';

/**
 * WHAT AN AGENT IS DOING, drawn as a small round badge on the lower-right
 * corner: `working`, `needs` (it is waiting on a person) or `stopped`. An idle
 * badge carries none, because a mark that means "nothing is happening" is one
 * a reader learns to skip.
 *
 * SHAPE FIRST, colour second. Each badge is a state's fill step carrying a
 * glyph, play for working, a question for needs and a square for stopped, so
 * it reads to somebody who cannot separate the hues and in forced-colors mode,
 * where every fill is one system colour. The glyph is in the inverse ink,
 * which the tokens' palette suite holds at 3:1 on each fill (`MARK_ON_FILL`).
 *
 * THE BADGE IS NOT THE ONLY CARRIER. A row that draws a badge with a status
 * says the state in words as well; a badge drawn alone (a breadcrumb, a stack)
 * is the case the glyph exists for. A badge that names itself appends the
 * state to its accessible name.
 */
export type AvatarStatus = 'working' | 'needs' | 'stopped';

/** Every status, in the order a legend lists them. */
export const AVATAR_STATUSES = ['working', 'needs', 'stopped'] as const satisfies readonly AvatarStatus[];

/** What each status is called in a sentence: the accessible name's last words. */
export const AVATAR_STATUS_LABELS: Readonly<Record<AvatarStatus, string>> = {
  working: 'working',
  needs: 'needs you',
  stopped: 'stopped',
};

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
  /**
   * The selected ring, or none. Not drawn on a badge with a `status`: the
   * corner badge is cut out of the outline the ring would follow.
   */
  ring?: AvatarRing | undefined;
  /** What the agent is doing, as a corner badge; none is idle. */
  status?: AvatarStatus | undefined;
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
  /**
   * The Crewlet character an AGENT is drawn as, in place of its initials and
   * of any image. A person is never drawn as one: on a `human` badge this is
   * ignored, and the circle and the initials stay.
   */
  character?: CrewletCharacterId | undefined;
  /**
   * The hue the agent's character is drawn in, on a plate of the same hue.
   * Read only with `character`; a character with no hue is drawn in the
   * neutral badge's ink, on its plate.
   */
  hue?: NodeHue | undefined;
}

/**
 * The smallest badge, in px, a character is drawn at full detail: its keyline
 * and its visor gap. Under it both are hairlines finer than a pixel, which a
 * screen draws as a blur round the body, so the character is drawn compact
 * (see `CrewletCharacterDetail`).
 */
export const AVATAR_CHARACTER_FULL_DETAIL = 56;

/**
 * Two uppercase initials, or one where the name has only one letter to give.
 *
 * SPLIT ON WHITESPACE, HYPHEN, UNDERSCORE AND DOT, because half the names this
 * draws are handles rather than names: `backend-engineer` gives BE,
 * `sre_lead` gives SL and `carlos.diaz` gives CD, where splitting on spaces
 * alone gives B, S and C and a roster of identical badges.
 *
 * A SINGLE WORD STILL GIVES TWO LETTERS, because the seats an org chart names
 * in one word are the ones it draws most (CEO, SWE, PM, DevRel), and a badge
 * of one letter each made the CEO and the CTO the same `C`. The word is read
 * in two ways, in order:
 *
 * 1. Where its case says it is two words run together (a lower-case letter
 *    followed by a capital, as in `DevRel` or `McCall`), the first letter of
 *    each of the first two: DR, MC.
 * 2. Otherwise its first two characters: `CEO` gives CE, `SWE` SW, `PM` PM
 *    and `Acme` AC. An acronym is not split at its capitals, since every
 *    letter of it is one and the first two are its start.
 *
 * A one-character word is its one character.
 */
export const getInitials = (name?: string): string => {
  if (!name) return '?';
  const words = name.trim().split(/[\s\-_.]+/).filter(Boolean);
  if (words.length === 0) return '?';
  // Array.from keeps astral characters (emoji, combined scripts) intact where
  // charAt would split a surrogate pair.
  const first = (word: string) => (Array.from(word)[0] ?? '').toUpperCase();
  if (words.length >= 2) return words.slice(0, 2).map(first).join('') || '?';
  const word = words[0]!;
  const humps = word.split(/(?<=\p{Ll})(?=\p{Lu})/u);
  if (humps.length >= 2) return humps.slice(0, 2).map(first).join('');
  return (
    Array.from(word)
      .slice(0, 2)
      .map((character) => character.toUpperCase())
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
 * An identity badge: an agent's character, an image, or the initials behind it.
 *
 * If the image fails to load (a stale CDN URL, an expired signature) it
 * degrades to the initials rather than to a broken-image glyph. Either way it
 * keeps its kind's outline, its ring and its status: whether somebody has
 * uploaded a photo says nothing about what they are or what they are doing.
 *
 * A BADGE WITH A STATUS IS FRAMED: the face (character, image or initials)
 * stands in a box of its own size beside the corner badge, and the face has a
 * notch cut where the badge sits, so the badge reads on any ground without
 * knowing what colour that ground is. The frame takes the caller's class and
 * style, which is where a layout reaches for the badge.
 */
export const Avatar = ({
  src,
  name,
  size = 'md',
  kind = 'agent',
  tone = 'neutral',
  ring,
  status,
  decorative = false,
  colorSeed,
  character,
  hue,
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
  const framed = status !== undefined;
  const label = name ? `${name} avatar` : 'Avatar';
  const spoken = framed ? `${label}, ${AVATAR_STATUS_LABELS[status]}` : label;

  const classes = cx(
    'crewlet-avatar',
    `crewlet-avatar--${kind}`,
    step === null ? null : `crewlet-avatar--${step}`,
    framed ? 'crewlet-avatar--notched' : null,
    ring === undefined || framed ? null : `crewlet-avatar--ring-${ring}`,
    framed ? null : className,
  );
  const faceStyle = framed ? measured : { ...measured, ...style };

  function drawFace() {
  /*
   * AN AGENT'S CHARACTER IS ITS FACE, and it wins over an image: it is the
   * identity an operator chose for the seat, where an image is whatever a
   * profile happened to carry. It is centred by the character itself, which
   * frames every silhouette square on its optical centre, and its face is cut
   * through it, so every slit shows the plate.
   */
    if (character !== undefined && kind === 'agent') {
      return (
        <span
          {...rest}
          className={cx(
            classes,
            'crewlet-avatar--character',
            hue === undefined ? 'crewlet-avatar--neutral' : `crewlet-avatar--hue-${hue}`,
          )}
          style={faceStyle}
          role={decorative ? undefined : 'img'}
          aria-hidden={decorative ? true : undefined}
          aria-label={decorative ? undefined : spoken}
        >
          <CrewletCharacter
            className="crewlet-avatar__character"
            character={character}
            detail={pixels >= AVATAR_CHARACTER_FULL_DETAIL ? 'full' : 'compact'}
          />
        </span>
      );
    }

    if (src && !imageFailed) {
      return (
        <img
          {...rest}
          className={cx(classes, 'crewlet-avatar--image')}
          style={faceStyle}
          src={src}
          alt={decorative ? '' : framed ? `${name ?? ''}, ${AVATAR_STATUS_LABELS[status]}` : (name ?? '')}
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
        style={faceStyle}
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : spoken}
      >
        {getInitials(name)}
      </span>
    );
  }

  const face = drawFace();
  if (!framed) return face;
  return (
    <span
      className={cx('crewlet-avatar-frame', className)}
      style={{ '--crewlet-avatar-size': `${pixels}px`, ...style } as CSSProperties}
    >
      {face}
      <span className={`crewlet-avatar__status crewlet-avatar__status--${status}`} aria-hidden="true">
        {STATUS_GLYPHS[status]}
      </span>
    </span>
  );
};

/**
 * Each status's glyph, on a 14-unit grid the badge scales: a play wedge, a
 * question mark and a square. FILLED where it can be, because a stroke a
 * badge's 10px draws at under a pixel is a blur; the question mark is the one
 * stroke, at a width that stays a line.
 */
const STATUS_GLYPHS: Readonly<Record<AvatarStatus, ReactElement>> = {
  working: (
    <svg viewBox="0 0 14 14" focusable="false">
      <path d="M5.4 3.9 10.2 7l-4.8 3.1z" fill="currentColor" />
    </svg>
  ),
  needs: (
    <svg viewBox="0 0 14 14" focusable="false">
      <path
        d="M5.1 5.3a1.9 1.9 0 1 1 2.7 1.7c-.55.27-.8.62-.8 1.15v.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7" cy="10.45" r=".85" fill="currentColor" />
    </svg>
  ),
  stopped: (
    <svg viewBox="0 0 14 14" focusable="false">
      <rect x="4.6" y="4.6" width="4.8" height="4.8" rx=".7" fill="currentColor" />
    </svg>
  ),
};
