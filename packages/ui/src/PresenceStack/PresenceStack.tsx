import type { CSSProperties } from 'react';
import { isCrewletCharacter } from '@crewlethq/icons/characters';
import { AVATAR_SIZES, Avatar, type AvatarSizeStep } from '../Avatar/index.js';
import { presenceHueClass } from '../PresenceRing/index.js';
import { presenceLabels, presenceOrder, type PresenceLabels, type PresenceMember } from '../PresenceModel/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface PresenceStackProps {
  /** Everybody present but the reader, in the order they joined. The stack orders them by activity. */
  members: readonly PresenceMember[];
  /** Whether the reader is present too, which is what the accessible name counts from: "You and 3 others are here". */
  self?: boolean | undefined;
  /** How many badges are drawn before the rest are counted in a chip. Four by default. */
  max?: number | undefined;
  size?: AvatarSizeStep | undefined;
  /**
   * Makes each badge a button: a host opens its own menu from it ("Follow
   * Maya", "Open turn"). Without it the stack is one image with one name.
   */
  onSelect?: ((member: PresenceMember) => void) | undefined;
  /** The stack's accessible name, where the derived one is not what it means where it stands. */
  label?: string | undefined;
  labels?: Partial<PresenceLabels> | undefined;
  className?: string | undefined;
}

/**
 * Who is here, at a glance: the badges of everybody present in an artifact,
 * people editing first, then agents editing, people viewing, agents reading,
 * and anybody idle last.
 *
 * A PRESENT BADGE WEARS A RING IN THE COLLABORATOR'S HUE, the same hue their
 * cursor and cell outline are drawn in, which is how a reader matches a ring
 * on a cell to a face in the stack. It is the presence colour exception (D22):
 * the badge carries the name, and the ring is never the only carrier. An idle
 * collaborator's badge loses its ring and fades, and says "Idle" in words.
 *
 * Built on the avatar stack's own geometry (the overlap, the cut-out ring in
 * the ground's colour, the counted chip), so a presence stack and a stack of
 * watchers beside it are one mark.
 */
export function PresenceStack({ members, self = true, max = 4, size = 'sm', onSelect, label, labels, className }: PresenceStackProps) {
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(`PresenceStack max must be a whole number of at least 1; it was ${max}`);
  }
  const text = presenceLabels(labels);
  const ordered = presenceOrder(members);
  if (ordered.length === 0 && !self) return null;
  const shown = ordered.slice(0, max);
  const hidden = ordered.slice(max);
  const here = label ?? text.here(ordered.length, self);
  const spoken = [here, ...ordered.map((member) => text.member(member))].join('. ');

  const badge = (member: PresenceMember) => (
    <Avatar
      name={member.name}
      kind={member.kind}
      src={member.src}
      character={member.character !== undefined && isCrewletCharacter(member.character) ? member.character : undefined}
      hue={member.kind === 'agent' ? member.hue : undefined}
      size={size}
      decorative
      className={cx(
        'crewlet-presence-stack__badge',
        member.hue !== undefined && member.activity !== 'idle' && presenceHueClass(member.hue),
        member.hue !== undefined && member.activity !== 'idle' && 'crewlet-presence-stack__badge--present',
        member.activity === 'idle' && 'crewlet-presence-stack__badge--idle',
      )}
    />
  );

  const more =
    hidden.length > 0 ? (
      <span className="crewlet-avatar-stack__member crewlet-avatar-stack__more" aria-hidden="true">
        +{hidden.length}
      </span>
    ) : null;

  const style = { '--crewlet-avatar-stack-size': `${AVATAR_SIZES[size]}px` } as CSSProperties;

  if (onSelect === undefined) {
    if (ordered.length === 0) return null;
    return (
      <span className={cx('crewlet-avatar-stack', 'crewlet-presence-stack', className)} style={style} role="img" aria-label={spoken}>
        {shown.map((member) => (
          <span key={member.id} className={cx('crewlet-avatar-stack__member', 'crewlet-presence-stack__member', `crewlet-presence-stack__member--${member.kind}`)}>
            {badge(member)}
          </span>
        ))}
        {more}
      </span>
    );
  }

  return (
    <div className={cx('crewlet-avatar-stack', 'crewlet-presence-stack', className)} style={style} role="group" aria-label={here}>
      {shown.map((member) => (
        <button
          key={member.id}
          type="button"
          className={cx('crewlet-avatar-stack__member', 'crewlet-presence-stack__member', `crewlet-presence-stack__member--${member.kind}`)}
          aria-label={text.member(member)}
          title={text.member(member)}
          onClick={() => onSelect(member)}
        >
          {badge(member)}
        </button>
      ))}
      {more}
      {hidden.length > 0 ? (
        <VisuallyHidden>{`${text.more(hidden.length)}: ${hidden.map((member) => text.member(member)).join(', ')}`}</VisuallyHidden>
      ) : null}
    </div>
  );
}
