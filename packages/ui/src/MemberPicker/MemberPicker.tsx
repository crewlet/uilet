import { useId, useState, type ReactNode } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { Checkbox } from '../Checkbox/index.js';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

/** One member a group holds: an agent, a person. */
export interface MemberPickerMember {
  /** Stable identity, and what the value names. */
  key: string;
  /** The member's name: its checkbox's name. */
  name: string;
  /** One quiet line under the name: what it does, its role. */
  detail?: ReactNode;
  /** Its face, decorative beside the name: an avatar. */
  avatar?: ReactNode;
}

/** A group of members granted as one: a team, whose grant reaches members who join it later. */
export interface MemberPickerGroup {
  key: string;
  /** The group's name: its checkbox's name. */
  label: string;
  members: readonly MemberPickerMember[];
}

/**
 * What is chosen: whole groups, members on their own, and members left out of
 * a chosen group. A member is in when its group is chosen and it is not left
 * out, or when it is chosen on its own.
 */
export interface MemberPickerValue {
  groups: readonly string[];
  members: readonly string[];
  except: readonly string[];
}

export interface MemberPickerLabels {
  /** Under a chosen group's name. */
  later: string;
  /** A member's mark while its group reaches it: "Through Product". */
  through: (group: string) => string;
  /** A member's mark once left out of its chosen group. */
  leftOut: string;
  /** The live count: "4 of 6 agents". */
  summary: (chosen: number, total: number) => string;
  /** A group's member count: "6 agents". */
  count: (n: number) => string;
  /** The expand control's name: "Show the agents in Product". */
  expand: (group: string) => string;
}

export const MEMBER_PICKER_LABELS: MemberPickerLabels = {
  later: 'Includes agents who join later',
  through: (group) => `Through ${group}`,
  leftOut: 'Left out',
  summary: (chosen, total) => `${chosen} of ${total} ${total === 1 ? 'agent' : 'agents'}`,
  count: (n) => `${n} ${n === 1 ? 'agent' : 'agents'}`,
  expand: (group) => `Show the agents in ${group}`,
};

export interface MemberPickerProps {
  /** Names the picker for a screen reader: "Who gets Sentry". */
  label: string;
  groups: readonly MemberPickerGroup[];
  /** Members in no group, listed after the groups. */
  ungrouped?: readonly MemberPickerMember[] | undefined;
  value: MemberPickerValue;
  onChange: (value: MemberPickerValue) => void;
  /** Groups open at first; every group with a member chosen on its own or left out opens too. */
  defaultOpen?: readonly string[] | undefined;
  labels?: Partial<MemberPickerLabels> | undefined;
  className?: string | undefined;
}

const without = (list: readonly string[], drop: readonly string[]) => list.filter((k) => !drop.includes(k));
const plus = (list: readonly string[], add: readonly string[]) => [...new Set([...list, ...add])];

/** Every member the value reaches, each once. */
export function chosenMembers(groups: readonly MemberPickerGroup[], ungrouped: readonly MemberPickerMember[], value: MemberPickerValue): Set<string> {
  const out = new Set<string>();
  for (const g of groups) {
    for (const m of g.members) {
      if ((value.groups.includes(g.key) && !value.except.includes(m.key)) || value.members.includes(m.key)) out.add(m.key);
    }
  }
  for (const m of ungrouped) if (value.members.includes(m.key)) out.add(m.key);
  return out;
}

/**
 * Who gets something, as one list: each group a row with a three-state box,
 * its member count and, once chosen, that it reaches members who join later;
 * each group opens to its members, every member a row with its face, its name
 * and one quiet line. A member a chosen group reaches says so ("Through
 * Product"), and unticking it leaves it out of that group's grant rather than
 * dropping the group; a member of an unchosen group is chosen on its own. The
 * count of everyone reached stays at the top as the choice moves.
 *
 * GROUP FIRST, MEMBERS AS OVERRIDES, because a group's grant is the one that
 * survives the organization changing: it reaches whoever joins, where a list
 * of names reaches only the names. So choosing a group clears the overrides
 * inside it, and unchoosing it drops them too, leaving no stale exception.
 *
 * A GROUP'S BOX SAYS WHETHER THE GROUP ITSELF IS CHOSEN: ticked when it is
 * and it reaches every member, mixed when it is chosen with members left out,
 * or when only some of its members are chosen on their own (even all of them,
 * since a member who joins later would not be), and empty when nobody in it
 * is reached. Ticking a mixed group chooses it whole.
 *
 * NATIVE CHECKBOXES, a group's partly chosen state set as the DOM's own
 * `indeterminate`, so a screen reader says "mixed" and Space toggles as the
 * platform does. The open control is the kit's IconButton with
 * `aria-expanded`. Ids come from positions, never keys, since a key may hold
 * a space and an id reference list splits on whitespace.
 */
export function MemberPicker({
  label,
  groups,
  ungrouped = [],
  value,
  onChange,
  defaultOpen = [],
  labels: overrides,
  className,
}: MemberPickerProps) {
  const words = { ...MEMBER_PICKER_LABELS, ...overrides };
  const id = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () =>
      new Set([
        ...defaultOpen,
        ...groups.filter((g) => g.members.some((m) => value.except.includes(m.key) || value.members.includes(m.key))).map((g) => g.key),
      ]),
  );
  const total = new Set([...groups.flatMap((g) => g.members.map((m) => m.key)), ...ungrouped.map((m) => m.key)]).size;
  const chosen = chosenMembers(groups, ungrouped, value);
  const toggleGroup = (g: MemberPickerGroup, on: boolean) => {
    const keys = g.members.map((m) => m.key);
    onChange({
      groups: on ? plus(value.groups, [g.key]) : without(value.groups, [g.key]),
      // THE GROUP'S OWN OVERRIDES GO EITHER WAY: chosen whole, nobody is left
      // out or chosen twice; unchosen, nobody stays chosen behind its back.
      members: without(value.members, keys),
      except: without(value.except, keys),
    });
  };
  /*
   * A MEMBER'S BOX ANSWERS FOR THE MEMBER, from any row it is listed in: by
   * whether a chosen group reaches it, not by the row's own group. A member
   * listed under two groups is two rows, and a row under an unchosen group,
   * ticked because a chosen one reached the member, was a box no click could
   * untick. Ticked, it is in through a chosen group or on its own; unticked,
   * it is out of every chosen group that holds it.
   */
  const toggleMember = (m: MemberPickerMember, on: boolean) => {
    const reached = groups.some((g) => value.groups.includes(g.key) && g.members.some((x) => x.key === m.key));
    onChange({
      ...value,
      members: on && !reached ? plus(value.members, [m.key]) : without(value.members, [m.key]),
      except: !on && reached ? plus(value.except, [m.key]) : without(value.except, [m.key]),
    });
  };

  // `at` is the row's place: `g0-m1` for a group's second member, `u-m0` for
  // the first member in no group. A member listed in two groups is two rows.
  const memberRow = (m: MemberPickerMember, group: MemberPickerGroup | null, at: string) => {
    const viaGroup = !!group && value.groups.includes(group.key);
    const leftOut = viaGroup && value.except.includes(m.key);
    const mark = viaGroup ? (leftOut ? words.leftOut : words.through(group.label)) : null;
    const detailId = m.detail ? `${id}-${at}-detail` : null;
    const markId = mark ? `${id}-${at}-mark` : null;
    const describedBy = cx(detailId, markId);
    const boxId = `${id}-${at}-box`;
    return (
      <li key={m.key} className={cx('crewlet-member-picker__member', leftOut && 'is-left-out')}>
        <Checkbox
          id={boxId}
          label={m.name}
          hideLabel
          size="sm"
          checked={chosen.has(m.key)}
          onCheckedChange={(on) => toggleMember(m, on)}
          {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        />
        {m.avatar != null ? (
          <span className="crewlet-member-picker__avatar" aria-hidden>
            {m.avatar}
          </span>
        ) : null}
        {/* THE NAME AND ITS LINE ARE THE BOX'S TARGET, as a group's name is
            its box's: a press on the words a reader is reading ticks the
            member, rather than only one on the bare box beside them. */}
        <label htmlFor={boxId} className="crewlet-member-picker__text">
          <span className="crewlet-member-picker__name">{m.name}</span>
          {detailId ? (
            <span id={detailId} className="crewlet-member-picker__detail">
              {m.detail}
            </span>
          ) : null}
        </label>
        {markId ? (
          <span id={markId} className={cx('crewlet-member-picker__mark', leftOut && 'is-left-out')}>
            {mark}
          </span>
        ) : null}
      </li>
    );
  };

  return (
    <div className={cx('crewlet-member-picker', className)} role="group" aria-label={label}>
      <p className="crewlet-member-picker__summary" aria-live="polite">
        {words.summary(chosen.size, total)}
      </p>
      <ul className="crewlet-member-picker__list">
        {groups.map((g, gi) => {
          const whole = value.groups.includes(g.key);
          const reached = g.members.filter((m) => chosen.has(m.key)).length;
          const all = g.members.length > 0 && reached === g.members.length;
          const ticked = whole && (all || g.members.length === 0);
          const mixed = !ticked && reached + (whole ? 1 : 0) > 0;
          const isOpen = open.has(g.key);
          const panel = `${id}-g${gi}`;
          return (
            <li key={g.key} className={cx('crewlet-member-picker__group', isOpen && 'is-open')}>
              <div className="crewlet-member-picker__group-row">
                <IconButton
                  size="sm"
                  variant="ghost"
                  className="crewlet-member-picker__toggle"
                  label={words.expand(g.label)}
                  icon={<ChevronRightGlyph size="sm" />}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? panel : undefined}
                  onClick={() =>
                    setOpen((was) => {
                      const next = new Set(was);
                      if (next.has(g.key)) next.delete(g.key);
                      else next.add(g.key);
                      return next;
                    })
                  }
                />
                <Checkbox
                  label={g.label}
                  size="sm"
                  checked={ticked}
                  indeterminate={mixed}
                  description={whole ? words.later : undefined}
                  onCheckedChange={() => toggleGroup(g, !ticked)}
                />
                <span className="crewlet-member-picker__count">{words.count(g.members.length)}</span>
              </div>
              {isOpen ? (
                <ul id={panel} className="crewlet-member-picker__members">
                  {g.members.map((m, mi) => memberRow(m, g, `g${gi}-m${mi}`))}
                </ul>
              ) : null}
            </li>
          );
        })}
        {ungrouped.length > 0 ? (
          <li className="crewlet-member-picker__group">
            <ul className="crewlet-member-picker__members is-ungrouped">{ungrouped.map((m, mi) => memberRow(m, null, `u-m${mi}`))}</ul>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
