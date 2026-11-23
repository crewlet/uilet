import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import { Tag } from '../Tag/index.js';
import { Text } from '../Text/index.js';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

/**
 * Where an agent's identity at a vendor stands, the same eight states on every
 * vendor: an App Store Connect team key, a Meta system user, a Google
 * identity, an Expo robot, a token, an app of its own.
 *
 * - `company`: the agent calls as the company's identity.
 * - `none`: the agent has no identity of its own yet.
 * - `checking`: Crewlet is reading the one a person handed in or had made.
 * - `ready`: its own, checked.
 * - `wrong_role` and `wrong_team`: the check read a role or a team the agent
 *   cannot use, and Crewlet kept nothing.
 * - `refused`: the vendor refuses the one it held (revoked, cut off, removed).
 * - `replacing`: a new one is in use and the old one waits to be revoked.
 */
export type AgentIdentityState =
  | 'company'
  | 'none'
  | 'checking'
  | 'ready'
  | 'wrong_role'
  | 'wrong_team'
  | 'refused'
  | 'replacing';

/** Every state, in the order an agent's identity moves through them. */
export const AGENT_IDENTITY_STATES: readonly AgentIdentityState[] = [
  'company',
  'none',
  'checking',
  'ready',
  'wrong_role',
  'wrong_team',
  'refused',
  'replacing',
];

/** One chip: its word and its tone. */
export interface AgentIdentityChip {
  label: string;
  tone: Tone;
}

/** Each state's chip, the same word and tone on every vendor. */
export const AGENT_IDENTITY_CHIPS: Readonly<Record<AgentIdentityState, AgentIdentityChip>> = {
  company: { label: "Company's", tone: 'neutral' },
  none: { label: 'Not set up', tone: 'warning' },
  checking: { label: 'Checking', tone: 'info' },
  ready: { label: 'Ready', tone: 'success' },
  wrong_role: { label: 'Wrong role', tone: 'warning' },
  wrong_team: { label: 'Wrong team', tone: 'danger' },
  refused: { label: 'Refused', tone: 'danger' },
  replacing: { label: 'Replacing', tone: 'warning' },
};

/** The words every vendor's identity is set up with. */
export const AGENT_IDENTITY_WORDS = {
  setUp: 'Set up identity',
  replace: 'Replace identity',
  useCompany: "Use the company's for now",
  makeForMe: 'Make it for me',
} as const;

/** The row status an unfinished identity gives its agent's row: the access table's own word and tone. */
export const AGENT_IDENTITY_NEEDS_YOU: AgentIdentityChip = { label: 'Needs you', tone: 'warning' };

/**
 * Whether the state asks a person to set the agent's identity up, or up
 * again. On a vendor that offers each agent its own identity, the company's
 * is one more identity to replace.
 */
export function agentIdentityNeedsSetUp(state: AgentIdentityState): boolean {
  return (
    state === 'company' || state === 'none' || state === 'wrong_role' || state === 'wrong_team' || state === 'refused'
  );
}

/**
 * Whether the agent's row reads Needs you for its identity.
 *
 * Where the vendor offers each agent an identity of its own (`perAgent`), the
 * row needs a person until the agent's own is checked: the company's identity
 * is never In sync there. Where the vendor offers none, the company's identity
 * is the finished state and asks nothing. The row's other states (off,
 * syncing, refused by the engine) are the page's and win over this one.
 */
export function agentIdentityNeedsYou(state: AgentIdentityState, perAgent: boolean): boolean {
  return perAgent && state !== 'ready';
}

/** What needs a person, said inside the box under the summary. */
export interface AgentIdentityProblem {
  title: ReactNode;
  body: ReactNode;
  /** One control for it, such as a link to the vendor's page. */
  action?: ReactNode;
}

export interface AgentIdentityProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The vendor, by its own name: "Apple", "Google Play", "Meta", "Expo". */
  vendor: string;
  /** The agent's name, which the actions' accessible names end with. */
  agent: string;
  state: AgentIdentityState;
  /**
   * Whether the vendor offers each agent an identity of its own. `false` for
   * a vendor where every agent calls as the company (an ad network with one
   * account per company): the company's identity is the finished state and
   * there is nothing to set up, so no action is drawn whatever is passed.
   */
  perAgent?: boolean | undefined;
  /** One quiet line: who the vendor sees when the agent calls, and what it holds. */
  summary: ReactNode;
  /** What needs a person, in a callout inside the box. */
  problem?: AgentIdentityProblem | undefined;
  /** Opens the set-up sheet. Drawn as Set up identity (primary) or, once ready, Replace identity. */
  onSetUp?: (() => void) | undefined;
  /**
   * Puts the agent back on the company's identity. Offered only while the
   * vendor refuses the agent's own, so its calls can go on; never as a way
   * round setting one up.
   */
  onUseCompany?: (() => void) | undefined;
  /** Why the actions cannot be pressed now, such as a reader without the right to change access. */
  disabledReason?: string | undefined;
}

/**
 * An agent's identity at a vendor, heading the agent's box on an
 * integration's access table, drawn the same way for every vendor.
 *
 * "Identity at <vendor>" and one chip on the left, the one action at the
 * box's top right, one quiet line on who the vendor sees, and anything that
 * needs a person in a callout under it. It holds no vendor words and no data:
 * the page says the state, the line and the problem.
 *
 * It spans its box's whole first row, in a wrapping flex box or a grid, and
 * rules itself off from what follows.
 */
export function AgentIdentity({
  vendor,
  agent,
  state,
  perAgent = true,
  summary,
  problem,
  onSetUp,
  onUseCompany,
  disabledReason,
  className,
  ...rest
}: AgentIdentityProps) {
  const titleId = useId();
  const chip = AGENT_IDENTITY_CHIPS[state];
  const setUp = perAgent && agentIdentityNeedsSetUp(state);
  const replace = perAgent && state === 'ready';
  const primary = onSetUp && (setUp || replace) ? (setUp ? AGENT_IDENTITY_WORDS.setUp : AGENT_IDENTITY_WORDS.replace) : null;
  const company = perAgent && onUseCompany && state === 'refused';
  return (
    <section
      {...rest}
      className={cx('crewlet-agent-identity', className)}
      aria-labelledby={titleId}
      data-state={state}
    >
      <div className="crewlet-agent-identity__head">
        <span className="crewlet-agent-identity__title">
          <Text id={titleId} variant="label">
            Identity at {vendor}
          </Text>
          <Tag size="sm" variant={chip.tone}>
            {chip.label}
          </Tag>
        </span>
        {primary || company ? (
          <span className="crewlet-agent-identity__actions">
            {company ? (
              <Button
                size="small"
                variant="ghost"
                onClick={onUseCompany}
                disabledReason={disabledReason}
                aria-label={`${AGENT_IDENTITY_WORDS.useCompany}: ${agent}`}
              >
                {AGENT_IDENTITY_WORDS.useCompany}
              </Button>
            ) : null}
            {primary ? (
              <Button
                size="small"
                variant={setUp ? 'primary' : 'secondary'}
                onClick={onSetUp}
                disabledReason={disabledReason}
                aria-label={`${primary}: ${agent}`}
              >
                {primary}
              </Button>
            ) : null}
          </span>
        ) : null}
      </div>
      <Text as="p" variant="caption" tone="secondary" className="crewlet-agent-identity__summary">
        {summary}
      </Text>
      {problem ? (
        <Callout variant={chip.tone === 'danger' ? 'danger' : 'warning'} title={problem.title} action={problem.action}>
          {problem.body}
        </Callout>
      ) : null}
    </section>
  );
}
