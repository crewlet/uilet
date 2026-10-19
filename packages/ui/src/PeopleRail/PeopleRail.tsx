import { useId, type ReactNode } from 'react';
import { isCrewletCharacter } from '@crewlethq/icons/characters';
import { XGlyph } from '@crewlethq/icons/glyphs';
import { Avatar } from '../Avatar/index.js';
import { Button } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import {
  PRESENCE_LABELS,
  collapseSessions,
  presenceOrder,
  type PresenceLabels,
  type PresenceMember,
} from '../PresenceModel/index.js';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel } from '../utils/headingLevel.js';

/** The reader, drawn first as "You". */
export type PeopleRailSelf = Pick<PresenceMember, 'name' | 'kind' | 'character' | 'hue' | 'src'>;

export interface PeopleRailLabels {
  title: string;
  close: string;
  you: string;
  nobody: string;
  follow: string;
  following: string;
  /** The Follow control's accessible name, which names whom it follows. */
  followName: (name: string) => string;
  stopFollowingName: (name: string) => string;
  /** The activity word under a name with no location: "Editing", "Reading". */
  activity: PresenceLabels['activity'];
}

export const PEOPLE_RAIL_LABELS: PeopleRailLabels = {
  title: 'People here',
  close: 'Close people',
  you: 'You',
  nobody: 'Nobody else is here right now.',
  follow: 'Follow',
  following: 'Following',
  followName: (name) => `Follow ${name}`,
  stopFollowingName: (name) => `Stop following ${name}`,
  activity: PRESENCE_LABELS.activity,
};

export interface PeopleRailProps {
  /** Everybody present but the reader. Two tabs of one seat are listed once, the most active. */
  members: readonly PresenceMember[];
  /** The reader, listed first as "You". */
  self?: PeopleRailSelf | undefined;
  /** The key of the followed member: its `seat`, or its `id` where it has none. */
  following?: string | undefined;
  /** Follow a member, or `null` to stop. Without it the rail offers no Follow controls. */
  onFollow?: ((member: PresenceMember | null) => void) | undefined;
  /** Close the rail. Without it the rail draws no close control. */
  onClose?: (() => void) | undefined;
  /** Further controls for one member, before Follow: "Open turn" for an agent at work. */
  actions?: ((member: PresenceMember) => ReactNode) | undefined;
  labels?: Partial<PeopleRailLabels> | undefined;
  /**
   * `card` is the rail on its own: a bordered card with its heading and its
   * close. `plain` is its list alone, for a host that already frames and
   * names it (an artifact's side panel), so the two are never a box drawn in
   * a box with the same title twice.
   */
  variant?: 'card' | 'plain' | undefined;
  className?: string | undefined;
}

/** What identifies a member for following: the seat, so a second tab of the same person stays followed. */
export function peopleRailKey(member: Pick<PresenceMember, 'id' | 'seat'>): string {
  return member.seat ?? member.id;
}

/**
 * Who is in a shared document now, what each is doing and where, with Follow
 * beside everybody but the reader.
 *
 * THE SAME FACTS AS THE PRESENCE STACK, IN WORDS. A ring, a cursor and a cell
 * outline are decorative to assistive technology, so this list is where a
 * screen reader user learns who is here and where. It is ordered the way the
 * stack is (people editing, agents editing, people viewing, agents reading,
 * anybody idle last), so the two never disagree about who comes first.
 *
 * FOLLOW IS A TOGGLE, pressed while following, and its name says whom it
 * follows or stops following, because a column of buttons all called "Follow"
 * is a column of identical controls to a screen reader. The strip that says
 * the reader is following is `FollowBanner`, which the host draws.
 */
export function PeopleRail({
  members,
  self,
  following,
  onFollow,
  onClose,
  actions,
  labels: overrides,
  variant = 'card',
  className,
}: PeopleRailProps) {
  const labels: PeopleRailLabels = overrides ? { ...PEOPLE_RAIL_LABELS, ...overrides } : PEOPLE_RAIL_LABELS;
  const headingID = useId();
  const Heading = headingTag(useHeadingLevel());
  const others = presenceOrder(collapseSessions(members));

  const plain = variant === 'plain';
  const Root = plain ? 'div' : 'aside';
  return (
    <Root
      className={cx('crewlet-people-rail', plain && 'crewlet-people-rail--plain', className)}
      aria-labelledby={plain ? undefined : headingID}
    >
      {plain ? null : (
        <div className="crewlet-people-rail__head">
          <Heading className="crewlet-people-rail__title" id={headingID}>
            {labels.title}
          </Heading>
          {onClose && (
            <IconButton size="sm" variant="ghost" label={labels.close} icon={<XGlyph size="sm" />} onClick={onClose} />
          )}
        </div>
      )}
      {/* The markers are off, and WebKit drops the list role with them, so
          the role is declared and the redundant-role rule silenced for that. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" className="crewlet-people-rail__list">
        {self && (
          <li className="crewlet-people-rail__person">
            <PresenceBadge member={self} />
            <span className="crewlet-people-rail__text">
              <span className="crewlet-people-rail__name">{labels.you}</span>
            </span>
          </li>
        )}
        {others.map((member) => {
          const key = peopleRailKey(member);
          const followed = following !== undefined && following === key;
          const extra = actions?.(member);
          return (
            <li key={key} className="crewlet-people-rail__person">
              <PresenceBadge member={member} />
              <span className="crewlet-people-rail__text">
                <span className="crewlet-people-rail__name">{member.name}</span>
                <span className="crewlet-people-rail__where">
                  {member.location ?? labels.activity(member.activity, member.kind)}
                </span>
              </span>
              {(extra !== undefined && extra !== null) || onFollow ? (
                <span className="crewlet-people-rail__actions">
                  {extra}
                  {onFollow && (
                    <Button
                      size="small"
                      variant={followed ? 'primary' : 'secondary'}
                      pressed={followed}
                      aria-label={followed ? labels.stopFollowingName(member.name) : labels.followName(member.name)}
                      onClick={() => onFollow(followed ? null : member)}
                    >
                      {followed ? labels.following : labels.follow}
                    </Button>
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {others.length === 0 && <p className="crewlet-people-rail__note">{labels.nobody}</p>}
    </Root>
  );
}

/** A member's badge, drawn the way the presence stack draws it: an agent in its character and hue. */
function PresenceBadge({ member }: { member: PeopleRailSelf }) {
  return (
    <Avatar
      name={member.name}
      kind={member.kind}
      src={member.src}
      character={member.character !== undefined && isCrewletCharacter(member.character) ? member.character : undefined}
      hue={member.kind === 'agent' ? member.hue : undefined}
      size="sm"
      decorative
    />
  );
}
