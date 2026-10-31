import { useEffect, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode } from 'react';
import { CrewletCharacter, type CrewletCharacterId } from '@crewlethq/icons/characters';
import { radius } from '@crewlethq/tokens';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/**
 * WHAT THE BADGE STANDS FOR: an agent (the default), what the engine runs, or a
 * human, a person.
 *
 * ONE SHAPE FOR BOTH. Every face is the same rounded square, its corner two
 * ninths of the side between the xs and lg radius steps (`AVATAR_CORNER`). A
 * person was a circle and an agent a squircle, so a row of people and agents
 * changed shape from face to face; with one shape the face's contents say who
 * it is. An agent's initials are set in the mono face and a person's in the
 * sans face, an agent may be drawn as its character, and the name is always
 * beside the face or in its accessible name, so the kind never rests on a hue.
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
/**
 * A step, a number of px, or `text`: a face inside a sentence, sized by the
 * words around it (1.15em square, a little taller than their capitals, so it
 * reads as a face and costs the line no height where `InlineRef` sets it).
 */
export type AvatarSize = AvatarSizeStep | number | 'text';

/** The px a text-sized face is drawn as for its detail: a body line's 16px. */
const TEXT_FACE_PIXELS = 16;

/**
 * Every face's corner, as a share of its box, held between two radius steps.
 *
 * Two ninths of the side (8px on a 36px face): a corner that moves WITH the
 * box rather than sitting on one radius step, which would read as a pill at
 * the smallest face and as a plain box at the largest. It never drops under
 * the xs radius (4px), where a 20px face would read as square, and never
 * passes the lg radius (12px), where a large profile face would read as a
 * circle.
 *
 * THE STYLESHEET COMPUTES IT, from `--crewlet-avatar-size`, for a step and for
 * a numeric size alike, so there is one ladder and nothing to keep in step
 * with it. The ratio is restated in `Avatar.css`, which cannot import it, and
 * the suite holds the two equal; the two steps are read from the radius
 * tokens here and there alike.
 */
export const AVATAR_CORNER_RATIO = 2 / 9;

/** A radius token's value, in px. */
const radiusPixels = (value: string): number => Number.parseFloat(value);

/** The least and the most a face's corner is drawn with, in px: the xs and lg radius steps. */
export const AVATAR_CORNER_RANGE = { min: radiusPixels(radius.xs), max: radiusPixels(radius.lg) } as const;

export interface AvatarProps extends HTMLAttributes<HTMLElement> {
  /** Image source. With one set the badge renders the image; otherwise the initials. */
  src?: string | undefined;
  /** The name behind the initials, and the image's alt text. */
  name?: string | undefined;
  /** A step, a number of px, or `text` to be sized by the words around it. */
  size?: AvatarSize | undefined;
  /** An agent (the default, its initials in the mono face) or a human (in the sans face). Both are one rounded square. */
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
   * A glyph on the corner saying HOW a principal is present rather than what
   * it is doing: a person's or a seat's badge acting through an API token
   * wears a key there, so the face stays theirs and the credential is still
   * shown. It sits where a status sits, cut into the same notch, in the
   * neutral badge's raised fill, and a `status` wins over it. A component,
   * drawn at the corner's own scale.
   */
  mark?: ReactNode;
  /**
   * What the mark means, said after the name by a badge that names itself
   * ("Miles avatar, signed in with an API token"). A decorative badge says
   * nothing, as it says nothing of a status.
   */
  markLabel?: string | undefined;
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
   * ignored, and the initials stay.
   */
  character?: CrewletCharacterId | undefined;
  /**
   * The hue the agent's character is drawn in, on a plate of the same hue.
   * Read only with `character`; a character with no hue is drawn in the
   * neutral badge's ink, on its plate.
   */
  hue?: NodeHue | undefined;
  /**
   * A glyph drawn in place of the initials, for a principal that is not a
   * person or an agent and whose name's initials would mean nothing: an API
   * token, a service account. "TO" from `token:reader` reads as somebody's
   * initials. A component, not a name; it is drawn at the badge's own scale.
   * An image or an agent's character still wins over it.
   */
  icon?: ReactNode;
}

/**
 * The words an agent's name leads with that its badge already says.
 *
 * Only a LEADING "agent" word, and only on an agent's badge, because that is
 * the only case where the word restates the kind: a person called "Agent
 * Smith" keeps the word, because it is their name.
 */
const AGENT_WORD = /^agent(?:[\s._-]+)(?=\S)/i;

/**
 * The name an agent's initials are drawn from: its leading "agent" word
 * dropped (`Agent CEO` gives CEO, `agent-cto` gives cto), and every other
 * name as it is.
 *
 * THE BADGE ALREADY SAYS "AGENT". A company that names its seats for what
 * they are ("Agent CEO", "Agent CTO", "Agent PM") otherwise got AC, AC and
 * AP: the two seats a chart draws most were the same badge side by side. The
 * badge's accessible name keeps the whole name. A name that is nothing but
 * the word keeps it, since an empty one draws the anonymous badge.
 */
export function avatarInitialsName(name: string | undefined, kind: AvatarKind): string | undefined {
  if (name === undefined || kind !== 'agent') return name;
  const rest = name.replace(AGENT_WORD, '');
  return rest.trim() ? rest : name;
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
 * SPLIT ON WHITESPACE, HYPHEN, UNDERSCORE, DOT AND COLON, because half the
 * names this draws are handles rather than names: `backend-engineer` gives BE,
 * `sre_lead` gives SL, `carlos.diaz` gives CD and `ci:release` CR, where
 * splitting on spaces alone gives B, S, C and C and a roster of identical
 * badges. PUNCTUATION AROUND A WORD IS NOT A LETTER: "review (API token)"
 * gave R( where it gives RA.
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
  const words = name
    .trim()
    .split(/[\s\-_.:]+/)
    .map((word) => word.replace(/^\p{P}+|\p{P}+$/gu, ''))
    .filter(Boolean);
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
  if (size === 'text') return TEXT_FACE_PIXELS;
  return typeof size === 'number' ? size : AVATAR_SIZES[size];
}

/**
 * The corner a face of this many pixels is drawn with, in px.
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
  return Math.min(AVATAR_CORNER_RANGE.max, Math.max(AVATAR_CORNER_RANGE.min, pixels * AVATAR_CORNER_RATIO));
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
  mark,
  markLabel,
  decorative = false,
  colorSeed,
  character,
  hue,
  icon,
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

  const text = size === 'text';
  const step = typeof size === 'number' || text ? null : size;
  const pixels = avatarPixels(size);
  /*
   * A step takes its box and its type from the scale, in the stylesheet. A
   * number sets the SAME custom property the steps set, so its box, and the
   * corner computed from it, come out of the one rule every step goes
   * through: a numeric badge cannot be drawn squarer or rounder than the steps
   * either side of it. Its type is computed here, because nothing in the scale
   * can answer for an arbitrary box: 0.36 of it keeps two initials inside the
   * outline, with a floor of 9px, under which they are not initials any more.
   */
  const measured =
    step === null && !text
      ? ({
          '--crewlet-avatar-size': `${pixels}px`,
          fontSize: Math.max(9, Math.round(pixels * 0.36)),
        } as CSSProperties)
      : {};

  const seeded = tone === 'seeded' ? avatarTint(colorSeed ?? name ?? '') : null;
  // A STATUS WINS OVER A MARK: there is one corner, and what an agent is
  // doing is the more urgent of the two.
  const marked = status === undefined && mark !== undefined && mark !== null;
  const framed = status !== undefined || marked;
  const corner = status !== undefined ? AVATAR_STATUS_LABELS[status] : marked ? markLabel : undefined;
  const label = name ? `${name} avatar` : 'Avatar';
  const spoken = corner ? `${label}, ${corner}` : label;

  const classes = cx(
    'crewlet-avatar',
    `crewlet-avatar--${kind}`,
    step === null ? null : `crewlet-avatar--${step}`,
    text ? 'crewlet-avatar--text' : null,
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
          alt={decorative ? '' : corner ? `${name ?? ''}, ${corner}` : (name ?? '')}
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
          icon === undefined || icon === null ? null : 'crewlet-avatar--icon',
        )}
        style={faceStyle}
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : spoken}
      >
        {icon === undefined || icon === null ? (
          // A TEXT-SIZED FACE takes the words' size for its box, so its
          // initials are set apart at a size of their own.
          text ? (
            <span className="crewlet-avatar__initials">{getInitials(avatarInitialsName(name, kind))}</span>
          ) : (
            getInitials(avatarInitialsName(name, kind))
          )
        ) : (
          <span className="crewlet-avatar__icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </span>
    );
  }

  const face = drawFace();
  if (!framed) return face;
  return (
    <span
      className={cx('crewlet-avatar-frame', className)}
      style={(text ? style : { '--crewlet-avatar-size': `${pixels}px`, ...style }) as CSSProperties}
    >
      {face}
      {status !== undefined ? (
        <span className={`crewlet-avatar__status crewlet-avatar__status--${status}`} aria-hidden="true">
          {STATUS_GLYPHS[status]}
        </span>
      ) : (
        <span className="crewlet-avatar__status crewlet-avatar__status--mark" aria-hidden="true">
          {mark}
        </span>
      )}
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
