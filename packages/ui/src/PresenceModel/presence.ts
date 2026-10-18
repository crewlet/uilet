/**
 * Who is present in an artifact, as plain data: the order a roster is drawn
 * in, the hue each collaborator's marks are drawn in, and the words a reader
 * hears for both.
 *
 * FRAMEWORK FREE. Nothing here imports React or touches the document, because
 * two renderers draw presence from it: the React components in this package,
 * which the dashboard draws, and the artifact kit's custom elements, which an
 * artifact page draws. A rule written once here cannot come to differ between
 * the two.
 *
 * THE PRESENCE COLOUR IS THE NARROW EXCEPTION to colour carrying state. A
 * collaborator's hue ties their cursor, their selection ring, their cell
 * outline and their name flag to their name, and nothing else is drawn in it.
 * An agent wears the hue an operator chose for it. A person is given one of
 * the six node hues for the session, in join order, skipping the hues already
 * in use in the room: never a hash of a name, and never stored on the person.
 */

import { NODE_HUES, type NodeHue } from '../utils/nodeHue.js';

/** What a collaborator is doing: the engine's `artifacts.PresenceActivity`. */
export type PresenceActivity = 'editing' | 'viewing' | 'idle';

export const PRESENCE_ACTIVITIES = ['editing', 'viewing', 'idle'] as const satisfies readonly PresenceActivity[];

/** A person, or an agent seat whose turn has the artifact open. */
export type PresenceKind = 'human' | 'agent';

/** One collaborator present in an artifact. */
export interface PresenceMember {
  /** What tells two entries apart: a session, or a seat once tabs are collapsed. */
  id: string;
  /** The seat handle or principal the entry belongs to, so two tabs of one person collapse to one. */
  seat?: string | undefined;
  /** The display name, resolved by the host: the engine sends the seat handle only. */
  name: string;
  kind: PresenceKind;
  activity: PresenceActivity;
  /** The hue the collaborator's marks are drawn in. `assignPresenceHues` gives a person one. */
  hue?: NodeHue | undefined;
  /** An agent's Crewlet character, as `Avatar` draws it. */
  character?: string | undefined;
  /** A person's photo, as `Avatar` draws it. */
  src?: string | undefined;
  /** Where they are, in words: "Editing row Acme Corp", "Reading version 12 for ENG-412". */
  location?: string | undefined;
}

/**
 * The order a roster is drawn in: people editing, agents editing, people
 * viewing, agents viewing, and everybody idle last. Stable inside each band,
 * so members keep the order they joined in.
 */
const BAND: Readonly<Record<PresenceActivity, Readonly<Record<PresenceKind, number>>>> = {
  editing: { human: 0, agent: 1 },
  viewing: { human: 2, agent: 3 },
  idle: { human: 4, agent: 5 },
};

export function presenceOrder<M extends Pick<PresenceMember, 'kind' | 'activity'>>(members: readonly M[]): M[] {
  return members
    .map((member, index) => ({ member, index }))
    .sort((a, b) => BAND[a.member.activity][a.member.kind] - BAND[b.member.activity][b.member.kind] || a.index - b.index)
    .map(({ member }) => member);
}

/** How active an activity is, for choosing which of one person's tabs speaks for them. */
const LIVELINESS: Readonly<Record<PresenceActivity, number>> = { editing: 2, viewing: 1, idle: 0 };

/**
 * One entry per seat: two tabs of one person are one collaborator, and the
 * most active tab speaks for them. Entries with no seat are kept as they are.
 * The first tab's position in the list is kept, so collapsing never reorders.
 */
export function collapseSessions<M extends Pick<PresenceMember, 'id' | 'seat' | 'activity'>>(members: readonly M[]): M[] {
  const bySeat = new Map<string, number>();
  const out: M[] = [];
  for (const member of members) {
    if (member.seat === undefined) {
      out.push(member);
      continue;
    }
    const at = bySeat.get(member.seat);
    if (at === undefined) {
      bySeat.set(member.seat, out.length);
      out.push(member);
    } else if (LIVELINESS[member.activity] > LIVELINESS[out[at]!.activity]) {
      out[at] = member;
    }
  }
  return out;
}

/**
 * The hues presence ASSIGNS, in rotation: the six node hues without purple,
 * the one nearest the accent. The accent is the reader's own active cell and
 * the focus ring, so a collaborator ringed in violet read as the reader's own
 * selection. An agent whose chosen hue is purple keeps it: that hue is its
 * identity, picked by a person, not handed out here.
 */
export const PRESENCE_HUES: readonly NodeHue[] = NODE_HUES.filter((hue) => hue !== 'purple');

/**
 * The hue each member's marks are drawn in.
 *
 * An agent with a chosen hue keeps it. Every other member keeps the hue it was
 * given before (`held`, the previous answer) while it stays present, and a
 * newcomer, in the order given, takes the first of the PRESENCE_HUES nobody
 * present wears; past five, the hue the fewest members wear, so hues repeat as evenly
 * as they can and the name on the flag tells the two apart.
 */
export function assignPresenceHues(
  members: readonly Pick<PresenceMember, 'id' | 'kind' | 'hue'>[],
  held: ReadonlyMap<string, NodeHue> = new Map(),
): Map<string, NodeHue> {
  const out = new Map<string, NodeHue>();
  const uses = new Map<NodeHue, number>(PRESENCE_HUES.map((hue) => [hue, 0]));
  const take = (id: string, hue: NodeHue) => {
    out.set(id, hue);
    uses.set(hue, (uses.get(hue) ?? 0) + 1);
  };
  for (const member of members) {
    if (member.kind === 'agent' && member.hue !== undefined) take(member.id, member.hue);
  }
  for (const member of members) {
    if (out.has(member.id)) continue;
    const previous = held.get(member.id);
    if (previous !== undefined) take(member.id, previous);
  }
  for (const member of members) {
    if (out.has(member.id)) continue;
    let pick: NodeHue = PRESENCE_HUES[0]!;
    for (const hue of PRESENCE_HUES) if ((uses.get(hue) ?? 0) < (uses.get(pick) ?? 0)) pick = hue;
    take(member.id, pick);
  }
  return out;
}

/** Every string presence says, overridable wherever it is drawn. */
export interface PresenceLabels {
  /** The activity word: "Editing", "Viewing", "Reading" for an agent viewing, "Idle". */
  activity: (activity: PresenceActivity, kind: PresenceKind) => string;
  /** The roster's accessible name. `others` counts everyone but the reader. */
  here: (others: number, withSelf: boolean) => string;
  /** One member, read out: "Maya Ortiz, editing row Acme Corp". */
  member: (member: Pick<PresenceMember, 'name' | 'kind' | 'activity' | 'location'>) => string;
  /** The members counted in the overflow chip: "3 more". */
  more: (count: number) => string;
  /** The flag on a cell somebody is editing: "Maya is editing". */
  editing: (names: string) => string;
  /** The words a focused cell gains when others are on it: "Jane Founder is also here." */
  alsoHere: (names: readonly string[]) => string;
}

/** "Maya", "Maya and Jane", "Maya, Jane and 2 others". */
export function joinNames(names: readonly string[], shown = 2): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length <= shown) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const rest = names.length - shown;
  return `${names.slice(0, shown).join(', ')} and ${rest === 1 ? '1 other' : `${rest} others`}`;
}

export const PRESENCE_LABELS: PresenceLabels = {
  activity: (activity, kind) =>
    activity === 'editing' ? 'Editing' : activity === 'idle' ? 'Idle' : kind === 'agent' ? 'Reading' : 'Viewing',
  here: (others, withSelf) => {
    if (withSelf) return others === 0 ? 'Only you are here' : `You and ${others === 1 ? '1 other' : `${others} others`} are here`;
    return others === 1 ? '1 person is here' : `${others} people are here`;
  },
  member: (member) => {
    if (member.location) return `${member.name}, ${member.location}`;
    return `${member.name}, ${PRESENCE_LABELS.activity(member.activity, member.kind).toLowerCase()}`;
  },
  more: (count) => `${count} more`,
  editing: (names) => `${names} is editing`,
  alsoHere: (names) => (names.length === 0 ? '' : `${joinNames(names)} ${names.length === 1 ? 'is' : 'are'} also here.`),
};

/** Labels with a caller's overrides applied, the one way every component merges them. */
export function presenceLabels(overrides?: Partial<PresenceLabels>): PresenceLabels {
  return { ...PRESENCE_LABELS, ...overrides };
}
