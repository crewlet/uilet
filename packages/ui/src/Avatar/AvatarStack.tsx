import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import type { CrewletCharacterId } from '@crewlethq/icons/characters';
import type { NodeHue } from '../utils/nodeHue.js';
import { AVATAR_SIZES, Avatar, type AvatarKind, type AvatarRing, type AvatarSizeStep } from './Avatar.js';

/** One badge in a stack. */
export interface AvatarStackMember {
  /** Who: the initials, and a word of the stack's accessible name. */
  name: string;
  /** An agent (the default) is a squircle; a human is a circle. */
  kind?: AvatarKind | undefined;
  src?: string | undefined;
  /** A state ring on this badge, as `Avatar` draws it. */
  ring?: AvatarRing | undefined;
  /** The Crewlet character an agent member is drawn as, as `Avatar` draws it. */
  character?: CrewletCharacterId | undefined;
  /** The hue an agent member's character is drawn in, as `Avatar` draws it. */
  hue?: NodeHue | undefined;
  /**
   * What tells two members apart when their names do not (a seat's handle, a
   * person's id), unique within the stack. The name is used when it is absent.
   */
  id?: string | undefined;
}

export interface AvatarStackProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Everybody in the stack, in the order they are drawn. */
  members: readonly AvatarStackMember[];
  /**
   * How many badges are drawn before the rest are counted in a chip.
   *
   * FOUR BY DEFAULT, because that is the most any stack in the approved design
   * draws, and a stack is a glance at WHO rather than a roster: past four the
   * overlapped monograms stop being read at all. A whole number of at least 1.
   */
  max?: number | undefined;
  /**
   * The badges' step, `sm` by default.
   *
   * NOT THE NEAREST STEP TO THE DESIGN'S 22px, which is `xs`, because the
   * design draws its stacks' initials at 9px and this kit's smallest type is
   * 11px. Behind the next badge's 6px and its 2px cut-out, a badge shows its
   * box less 8px: at `xs` that leaves 9 of the 14px two mono initials take,
   * 64% of them, the second letter gone to a stem. The design's own stack
   * shows 77% of its initials, and `sm` is the smallest step that shows as
   * much, at 85%.
   */
  size?: AvatarSizeStep | undefined;
  /**
   * The accessible name, where the derived one ("3 agents: SWE, CTO, PM") is
   * not what the stack means where it stands ("Watching: …").
   */
  label?: string | undefined;
  /**
   * The names are already printed beside the stack, so it says nothing
   * itself: "read by 3 agents today" beside a stack that read out the same
   * three names would say them twice.
   */
  decorative?: boolean | undefined;
}

/** "1 agent", "3 agents", "1 person", "2 people". */
function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * What a stack says to somebody who cannot see it: how many of each kind, and
 * every name, the ones counted in the chip included.
 *
 * THE KINDS ARE COUNTED, NOT ASSUMED. A stack of watchers holds people and
 * agents together, and "3 agents: Jane Founder, CTO, SWE" would call a person
 * an agent to the one reader who cannot see the circle that says otherwise.
 */
export function avatarStackLabel(members: readonly AvatarStackMember[]): string {
  const humans = members.filter((member) => member.kind === 'human').length;
  const agents = members.length - humans;
  const agentWords = counted(agents, 'agent', 'agents');
  const humanWords = counted(humans, 'person', 'people');
  const who = humans === 0 ? agentWords : agents === 0 ? humanWords : `${agentWords} and ${humanWords}`;
  return `${who}: ${members.map((member) => member.name).join(', ')}`;
}

/**
 * Several badges drawn as one mark: who is on something, at a glance.
 *
 * EACH BADGE OVERLAPS THE ONE BEFORE IT BY 6PX and is cut out of it by a 2px
 * ring in the colour of the ground the stack stands on, which is the design's
 * own stack. The ground is `--crewlet-avatar-stack-ground`, the sheet by
 * default, which is where the design draws every stack; a stack standing on a
 * card or on any other surface sets it on the stack. Past `max` the rest are
 * counted in a chip, which is a PILL rather than either kind's outline: it is
 * a number, not somebody.
 *
 * ONE IMAGE TO A SCREEN READER, named by `avatarStackLabel`, so a row reads
 * "3 agents: SWE, CTO, PM" once rather than three badge names and a "+2".
 */
export function AvatarStack({
  members,
  max = 4,
  size = 'sm',
  label,
  decorative = false,
  className,
  style,
  ...rest
}: AvatarStackProps) {
  if (!Number.isInteger(max) || max < 1) {
    // A stack that draws no badge is not a stack, and a fractional count is
    // not a count: refused by name rather than rounded into something the
    // caller did not ask for.
    throw new RangeError(`AvatarStack max must be a whole number of at least 1; it was ${max}`);
  }
  if (members.length === 0) return null;

  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;

  return (
    <span
      {...rest}
      className={cx('crewlet-avatar-stack', className)}
      // The step's box, from the one table, for the chip: the badges set their
      // own from their step class, and the chip stands as tall as they do.
      style={{ '--crewlet-avatar-stack-size': `${AVATAR_SIZES[size]}px`, ...style } as CSSProperties}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (label ?? avatarStackLabel(members))}
      aria-hidden={decorative ? true : undefined}
    >
      {shown.map((member) => (
        <Avatar
          key={member.id ?? member.name}
          className="crewlet-avatar-stack__member"
          name={member.name}
          kind={member.kind}
          src={member.src}
          ring={member.ring}
          character={member.character}
          hue={member.hue}
          size={size}
          decorative
        />
      ))}
      {overflow > 0 ? (
        <span className="crewlet-avatar-stack__member crewlet-avatar-stack__more" aria-hidden="true">
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
