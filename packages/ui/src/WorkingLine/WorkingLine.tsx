import { useId, useState, type HTMLAttributes } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { Avatar, AvatarStack, type AvatarStackMember } from '../Avatar/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { BouncingDots } from './BouncingDots.js';

/** One agent on the line: its face, as a stack draws it, and what it is doing. */
export interface WorkingAgent extends AvatarStackMember {
  /**
   * The words after its name: "is thinking", "is mulling it over...". A
   * trailing ellipsis is dropped, because the line draws its own dots. Left
   * out, a working agent "is working" and a queued one "is queued".
   */
  status?: string | undefined;
  /** It has not started: the request waits behind something it is already doing. */
  queued?: boolean | undefined;
}

/** Every word the line prints or announces, for a surface in another language. */
export interface WorkingLineLabels {
  /** After two or more names at work. */
  working: string;
  /** After two or more names, all queued. */
  queued: string;
  /** After one name at work with no status of its own. */
  workingOne: string;
  /** After one queued name with no status of its own. */
  queuedOne: string;
  /** The names past the first two, after them: "and 4 others". */
  others: (count: number) => string;
  /** The first two of three or more names, before `others`: "A, B". */
  series: (names: readonly string[]) => string;
  /** Queued agents beside the ones at work: "1 queued". */
  queuedCount: (count: number) => string;
  /** Names a list: "A, B and C". */
  list: (names: readonly string[]) => string;
  /** The toggle that opens one line per agent. */
  detail: string;
}

export const WORKING_LINE_LABELS: WorkingLineLabels = {
  working: 'are working',
  queued: 'are queued',
  workingOne: 'is working',
  queuedOne: 'is queued',
  others: (count) => `and ${count} ${count === 1 ? 'other' : 'others'}`,
  series: (names) => names.join(', '),
  queuedCount: (count) => `${count} queued`,
  list: (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`),
  detail: 'Each agent at work',
};

export interface WorkingLineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Every agent at work on the request, in the order they started. Empty, the line draws nothing and keeps its live region. */
  agents: readonly WorkingAgent[];
  /** How many faces are drawn before the rest are counted in a chip. Three by default. */
  max?: number | undefined;
  /**
   * Say who is at work through the line's own polite region. On by default;
   * off where another line on screen already announces the same agents.
   */
  announce?: boolean | undefined;
  /** The per-agent lines start open (a story, a screenshot). */
  defaultExpanded?: boolean | undefined;
  labels?: Partial<WorkingLineLabels> | undefined;
}

/** Drops the ellipsis an engine phrase ends on: the line draws its own dots. */
function phrase(status: string | undefined): string {
  return (status ?? '').trim().replace(/(?:\.{3}|…)$/u, '').trimEnd();
}

/** The words after one agent's name. */
function agentPhrase(agent: WorkingAgent, labels: WorkingLineLabels): string {
  return phrase(agent.status) || (agent.queued ? labels.queuedOne : labels.workingOne);
}

/** The pieces of the line as it is drawn: whose names, the words after them, and how many wait. */
export interface WorkingSentence {
  /** The names printed: "Backend Engineer", "Backend Engineer and App Engineer", or "Backend Engineer, App Engineer" before `others`. */
  names: string;
  /** "and 4 others" after three or more names; empty otherwise. Drawn whole where the names truncate. */
  others: string;
  /** "is thinking", "are working", "are queued". */
  verb: string;
  /** "1 queued", beside agents at work; empty otherwise. */
  queued: string;
  /** Whether `names` prints every agent on the line. */
  everyone: boolean;
  /** Nothing on the line has started. */
  waiting: boolean;
}

/**
 * The line in words. The agents at work lead; queued ones are counted after
 * them, and lead only when none has started. One leading agent keeps its own
 * phrase, so its variety shows; two or more share one verb.
 */
export function workingSentence(agents: readonly WorkingAgent[], overrides?: Partial<WorkingLineLabels>): WorkingSentence {
  const labels = overrides ? { ...WORKING_LINE_LABELS, ...overrides } : WORKING_LINE_LABELS;
  const active = agents.filter((agent) => !agent.queued);
  const waiting = agents.filter((agent) => agent.queued);
  const lead = active.length > 0 ? active : waiting;
  const counted = lead.length > 2;
  const names = counted ? labels.series(lead.slice(0, 2).map((agent) => agent.name)) : labels.list(lead.map((agent) => agent.name));
  const others = counted ? labels.others(lead.length - 2) : '';
  const verb =
    lead.length === 1 ? agentPhrase(lead[0]!, labels) : active.length > 0 ? labels.working : labels.queued;
  const queued = active.length > 0 && waiting.length > 0 ? labels.queuedCount(waiting.length) : '';
  return { names, others, verb, queued, everyone: !counted && queued === '', waiting: active.length === 0 };
}

/**
 * What the line's region says: every name, at work and queued, and never a
 * phrase, so a reader hears who starts and stops rather than every step.
 */
export function workingAnnouncement(agents: readonly WorkingAgent[], overrides?: Partial<WorkingLineLabels>): string {
  const labels = overrides ? { ...WORKING_LINE_LABELS, ...overrides } : WORKING_LINE_LABELS;
  const said = (group: readonly WorkingAgent[], one: string, many: string) =>
    group.length === 0 ? '' : `${labels.list(group.map((agent) => agent.name))} ${group.length === 1 ? one : many}.`;
  return [
    said(
      agents.filter((agent) => !agent.queued),
      labels.workingOne,
      labels.working,
    ),
    said(
      agents.filter((agent) => agent.queued),
      labels.queuedOne,
      labels.queued,
    ),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Every agent at work on a request, on one line: their faces in a small
 * stack, each in its own character's colour, then one sentence. "Backend
 * Engineer is thinking", "Backend Engineer and App Engineer are working",
 * "Backend Engineer, App Engineer and 4 others are working".
 *
 * ALIVE WHILE IT WORKS. A lighter band sweeps across the names and rests, a
 * single agent's phrase fades in as it changes, and three dots bounce after
 * the verb. Queued agents are counted, still; a line of nothing but queued
 * agents does not move at all. Under reduced motion every part holds still
 * and the words carry the meaning.
 *
 * DETAIL ON DEMAND. With more than one agent, a chevron at the line's end
 * (its target the whole line) opens one compact line per agent, its face,
 * name and own phrase, queued agents included.
 *
 * ONE ANNOUNCEMENT. A polite region names who is at work and who waits, and
 * changes only when that does: a phrase changing is never read out. The
 * region stays mounted while the line is empty, so the first agent to start
 * is heard. Where the names are counted, the stack names every face.
 */
export function WorkingLine({
  agents,
  max = 3,
  announce = true,
  defaultExpanded = false,
  labels: overrides,
  className,
  ...rest
}: WorkingLineProps) {
  const labels = overrides ? { ...WORKING_LINE_LABELS, ...overrides } : WORKING_LINE_LABELS;
  const [open, setOpen] = useState(defaultExpanded);
  const detailID = useId();
  const ordered = [...agents.filter((agent) => !agent.queued), ...agents.filter((agent) => agent.queued)];
  const sentence = workingSentence(ordered, labels);
  const expandable = ordered.length > 1;
  const expanded = expandable && open;

  return (
    <div
      {...rest}
      className={cx(
        'crewlet-working-line',
        ordered.length === 0 && 'is-idle',
        sentence.waiting && 'is-queued',
        expanded && 'is-open',
        className,
      )}
    >
      {announce ? (
        <VisuallyHidden>
          <span role="status">{workingAnnouncement(ordered, labels)}</span>
        </VisuallyHidden>
      ) : null}
      {ordered.length === 0 ? null : (
        <div className="crewlet-working-line__summary">
          <AvatarStack
            className="crewlet-working-line__faces"
            members={ordered}
            max={max}
            size="xs"
            decorative={sentence.everyone}
            label={labels.list(ordered.map((agent) => agent.name))}
          />
          {/* The spaces between its pieces are text, for a screen reader; the flex gaps lay them out. */}
          <span className="crewlet-working-line__text">
            {/* The names under the band: they truncate, and the count after them never does. */}
            <span className="crewlet-working-line__who">
              <span className="crewlet-working-line__names">{sentence.names}</span>
              {sentence.others ? (
                <>
                  {' '}
                  <span className="crewlet-working-line__others">{sentence.others}</span>
                </>
              ) : null}
            </span>{' '}
            {/* Keyed by its words, so a new phrase fades in rather than swapping in place. */}
            <span key={sentence.verb} className="crewlet-working-line__verb">
              {sentence.verb}
            </span>
            {sentence.waiting ? null : <BouncingDots className="crewlet-working-line__dots" />}
            {sentence.queued ? (
              <>
                {' '}
                <span className="crewlet-working-line__queued">{sentence.queued}</span>
              </>
            ) : null}
          </span>
          {expandable ? (
            <button
              type="button"
              className="crewlet-working-line__toggle"
              aria-label={labels.detail}
              aria-expanded={expanded}
              aria-controls={detailID}
              onClick={() => setOpen((was) => !was)}
            >
              <ChevronDownGlyph size="sm" className="crewlet-working-line__chevron" />
            </button>
          ) : null}
        </div>
      )}
      {expanded ? (
        <ul id={detailID} className="crewlet-working-line__detail" aria-label={labels.detail}>
          {ordered.map((agent) => {
            const words = agentPhrase(agent, labels);
            return (
              <li key={agent.id ?? agent.name} className={cx('crewlet-working-line__agent', agent.queued && 'is-queued')}>
                <Avatar
                  name={agent.name}
                  kind={agent.kind}
                  src={agent.src}
                  character={agent.character}
                  hue={agent.hue}
                  size="xs"
                  decorative
                />
                <span className="crewlet-working-line__agent-name">{agent.name}</span>{' '}
                <span key={words} className="crewlet-working-line__agent-phrase">
                  {words}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
