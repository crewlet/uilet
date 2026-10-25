import type { HTMLAttributes, ReactNode } from 'react';
import { BanGlyph, CircleAlertGlyph, CircleCheckGlyph, ClockGlyph, LockGlyph, RefreshCwGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { ChangeList, type ChangeListLabels, type ChangeListRow } from '../ChangeList/index.js';
import type { DiffListLabels } from '../DiffList/index.js';
import { ReceiptStrip, RefusalStrip } from '../ReceiptStrip/index.js';
import { Spinner } from '../Spinner/index.js';
import { StatusCard, type StatusCardStatus } from '../StatusCard/index.js';
import { cx } from '../utils/cx.js';
// The empty live region below borrows the shared visually hidden class.
import '../VisuallyHidden/index.js';

/**
 * Where a proposed change stands: `pending` (waiting on the person),
 * `stepup` (the approval needs a fresh sign-in), `applying` (approved and
 * being carried out), `applied`, `declined`, `expired`, `stale` (what it
 * would change moved after it was prepared) and `failed` (refused or not
 * carried out when approved).
 */
export type ProposalState = 'pending' | 'stepup' | 'applying' | 'applied' | 'declined' | 'expired' | 'stale' | 'failed';

export const PROPOSAL_STATES = [
  'pending',
  'stepup',
  'applying',
  'applied',
  'declined',
  'expired',
  'stale',
  'failed',
] as const satisfies readonly ProposalState[];

/**
 * Where the change lands: on the page the person is looking at (a filter on
 * a list), which is applied, or in the company's records, which is saved.
 * It decides the words of the busy and done states: "Applying" and "Applied",
 * or "Saving" and "Saved".
 */
export type ProposalScope = 'page' | 'server';

/** What the change does to a record: change fields of one, or create one. */
export type ProposalKind = 'change' | 'create';

/**
 * What a `failed` card came to: refused or not carried out, so nothing
 * changed (`unchanged`), or carried out without an answer, so nobody can say
 * whether it landed (`unknown`). Only `unchanged` says "Nothing changed.".
 */
export type ProposalFailureOutcome = 'unchanged' | 'unknown';

export const PROPOSAL_FAILURE_OUTCOMES = ['unchanged', 'unknown'] as const satisfies readonly ProposalFailureOutcome[];

/**
 * Why the person's own decision was refused while the card stays open to
 * another one: the approval was turned down (a fresh sign-in, a change that
 * moved) but the proposal itself still stands.
 */
export interface ProposalDecisionRefusal {
  /** The refusal, in the engine's own sentence. */
  sentence: ReactNode;
  /** What the person can do next, on its own quieter line. */
  hint?: ReactNode;
}

export interface ProposalCardLabels {
  needsApproval: string;
  needsSignIn: string;
  applying: string;
  saving: string;
  applied: string;
  saved: string;
  declined: string;
  expired: string;
  stale: string;
  notApplied: string;
  /** The Tag of a failed card whose outcome is `unknown`. */
  notConfirmed: string;
  decline: string;
  confirmIdentity: string;
  prepareAgain: string;
  tryAgain: string;
  whatWillChange: string;
  whatWillBeCreated: string;
  whatChanged: string;
  whatWasCreated: string;
  whatWasProposed: string;
  stepUpNotice: string;
  declinedNotice: string;
  expiredNotice: string;
  staleNotice: string;
  nothingChanged: string;
  /** The sentence of a failed card whose outcome is `unknown` and that has no `failure` of its own. */
  unknownNotice: string;
  /** Why Decline is held while the approved change is carried out. */
  busy: string;
}

export const PROPOSAL_CARD_LABELS: ProposalCardLabels = {
  needsApproval: 'Needs your approval',
  needsSignIn: 'Needs sign-in',
  applying: 'Applying',
  saving: 'Saving',
  applied: 'Applied',
  saved: 'Saved',
  declined: 'Declined',
  expired: 'Expired',
  stale: 'Needs a fresh look',
  notApplied: 'Not applied',
  notConfirmed: 'Not confirmed',
  decline: 'Decline',
  confirmIdentity: 'Confirm it’s you',
  prepareAgain: 'Prepare it again',
  tryAgain: 'Try again',
  whatWillChange: 'What will change',
  whatWillBeCreated: 'What will be created',
  whatChanged: 'What changed',
  whatWasCreated: 'What was created',
  whatWasProposed: 'What was proposed',
  stepUpNotice: 'This approval asks you to sign in again. Nothing changed yet.',
  declinedNotice: 'You declined this. Nothing changed.',
  expiredNotice: 'This proposal expired. Nothing changed.',
  staleNotice: 'What this would change moved after it was prepared, so it was not applied. Nothing changed.',
  nothingChanged: 'Nothing changed.',
  unknownNotice: 'Could not confirm whether this was applied. It may have landed.',
  busy: 'The approved change is being carried out',
};

export interface ProposalCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The action itself, in sentence case: "Filter this list", "Create task", "Share artifact". */
  title: string;
  /** Where the change applies, as the card's subtitle: "This list only", "Saved for the company". */
  subtitle?: ReactNode;
  state: ProposalState;
  /** `server` (the default) or `page`; see `ProposalScope`. */
  scope?: ProposalScope | undefined;
  /** `change` (the default) or `create`, which heads the list "What will be created". */
  kind?: ProposalKind | undefined;
  /** What the change does, in one sentence, above the list. */
  summary?: ReactNode;
  /** The change, field by field (`ChangeList`). The scope is the subtitle, never a row. */
  changes: readonly ChangeListRow[];
  /** Replaces the list's heading, which otherwise follows `kind` and `state`. */
  changesHeading?: ReactNode;
  /** The consequence, in one sentence, under the list. */
  note?: ReactNode;
  /** The primary action, named for its effect: "Apply to this list", "Create task". Never a bare "OK". */
  approveLabel: string;
  /**
   * Called by the primary action. In `stepup` the primary is "Confirm it's
   * you" and calls this too: the host opens its sign-in check and approves
   * again with the fresh session.
   */
  onApprove: () => void;
  onDecline: () => void;
  /** Offers "Prepare it again" on an expired or stale card. */
  onPrepareAgain?: (() => void) | undefined;
  /** Offers "Try again" on a failed card, where the refusal's class may succeed on a retry. */
  onRetry?: (() => void) | undefined;
  /** What was done, for an applied card: "Created ENG-156 · assigned to Agent SWE". */
  receipt?: ReactNode;
  /**
   * Why it was not applied, for a failed card, in the engine's own sentence.
   * "Nothing changed." follows it when `failureOutcome` is `unchanged`.
   */
  failure?: ReactNode;
  /**
   * What a failed card came to; see `ProposalFailureOutcome`. `unchanged`
   * (the default) follows the sentence with "Nothing changed." under the Tag
   * "Not applied". `unknown` never claims that: the Tag reads "Not
   * confirmed" and the strip is the `failure` sentence alone, or
   * `labels.unknownNotice` without one. Ignored in every other state.
   */
  failureOutcome?: ProposalFailureOutcome | undefined;
  /**
   * What the person can do next about a failure, on its own quieter line
   * after the failure sentence (and "Nothing changed.", where it is said):
   * the route's next step, such as "Ask an admin to give you access." Drawn
   * only with `failure`.
   */
  failureHint?: ReactNode;
  /**
   * Why the primary action cannot be taken now, while the card waits on the
   * person (`pending`) or on a fresh sign-in (`stepup`): a page action whose
   * screen refuses the prepared change, say. The primary is held soft
   * disabled, as Decline is held while applying, so it keeps its focus and
   * its pointer events, says it is unavailable, and is described by this
   * sentence, which the foot also shows above the buttons. Ignored in every
   * other state. Decline stays available.
   */
  approveBlocked?: string | undefined;
  /**
   * Why the person's last decision was refused while the card still waits on
   * one (`pending` or `stepup`): the approval came back refused, but the
   * proposal stands and can be decided again. Drawn above the decision in the
   * danger ink, with its hint, and announced politely: the foot keeps a live
   * region for it from the moment the card can be decided, so words that
   * arrive later are heard. The consumer clears it (on the next press, say).
   * Ignored in every other state, where the strip says what happened.
   */
  decisionRefusal?: ProposalDecisionRefusal | undefined;
  /** Replaces the default sentence of a step-up, declined, expired or stale card. */
  notice?: ReactNode;
  labels?: Partial<ProposalCardLabels> | undefined;
  /** Words for the change list. */
  changeLabels?: Partial<ChangeListLabels> | undefined;
  /** Words for the `DiffList` behind "Show the whole change". */
  diffLabels?: Partial<DiffListLabels> | undefined;
}

const SETTLED: ReadonlySet<ProposalState> = new Set(['applied', 'declined', 'expired', 'stale', 'failed']);

function statusOf(
  state: ProposalState,
  scope: ProposalScope,
  outcome: ProposalFailureOutcome,
  labels: ProposalCardLabels,
): StatusCardStatus {
  switch (state) {
    case 'pending':
      return { label: labels.needsApproval, tone: 'warning', icon: <ClockGlyph size="xs" /> };
    case 'stepup':
      return { label: labels.needsSignIn, tone: 'warning', icon: <LockGlyph size="xs" /> };
    case 'applying':
      return { label: scope === 'page' ? labels.applying : labels.saving, tone: 'neutral', icon: <Spinner size="xs" /> };
    case 'applied':
      return { label: scope === 'page' ? labels.applied : labels.saved, tone: 'success', icon: <CircleCheckGlyph size="xs" /> };
    case 'declined':
      return { label: labels.declined, tone: 'neutral', icon: <BanGlyph size="xs" /> };
    case 'expired':
      return { label: labels.expired, tone: 'neutral', icon: <ClockGlyph size="xs" /> };
    case 'stale':
      return { label: labels.stale, tone: 'neutral', icon: <ClockGlyph size="xs" /> };
    case 'failed':
      return {
        label: outcome === 'unknown' ? labels.notConfirmed : labels.notApplied,
        tone: 'danger',
        icon: <CircleAlertGlyph size="xs" />,
      };
  }
}

function headingOf(state: ProposalState, kind: ProposalKind, labels: ProposalCardLabels): string {
  if (state === 'applied') return kind === 'create' ? labels.whatWasCreated : labels.whatChanged;
  if (SETTLED.has(state)) return labels.whatWasProposed;
  return kind === 'create' ? labels.whatWillBeCreated : labels.whatWillChange;
}

/**
 * A change prepared for the person to approve, and what became of it: one
 * card from the moment it is proposed until it is applied, declined, expires
 * or is refused.
 *
 * THE HEAD IS THE ACTION, THE TAG IS THE STATE. "Create task" with "Needs
 * your approval", then "Saving", then "Saved". The body is a summary, the
 * change as before and after pairs (`ChangeList`) and a one-sentence
 * consequence; the foot is the decision, or a strip that says what happened.
 *
 * APPROVAL IS ALWAYS AN EXPLICIT PRESS. Nothing here takes focus when the
 * card arrives and Enter in a composer never reaches it, so a person typing
 * cannot approve by accident. While the approved change is carried out the
 * primary keeps its label with the spinner in its leading slot (a button whose
 * text becomes "Saving" has stopped saying what it does), soft disabled so
 * focus stays on it, and Decline is held with its reason.
 *
 * SETTLED, THE BODY STEPS BACK. Applied, declined, expired, stale and failed
 * cards draw their body in the secondary ink so the strip reads first, and
 * the before and after pairs stay, so the record of what changed is there.
 *
 * Every sentence a refusal shows is the caller's (the engine's), never the
 * card's own words about why.
 *
 * "NOTHING CHANGED." ONLY WHEN IT IS TRUE. A failure whose outcome nobody
 * could confirm (`failureOutcome="unknown"`) may have landed, so the card
 * says "Not confirmed" and never adds the reassurance.
 */
export function ProposalCard({
  title,
  subtitle,
  state,
  scope = 'server',
  kind = 'change',
  summary,
  changes,
  changesHeading,
  note,
  approveLabel,
  onApprove,
  onDecline,
  onPrepareAgain,
  onRetry,
  receipt,
  failure,
  failureOutcome = 'unchanged',
  failureHint,
  approveBlocked,
  decisionRefusal,
  notice,
  labels: overrides,
  changeLabels,
  diffLabels,
  className,
  ...rest
}: ProposalCardProps) {
  const labels = overrides ? { ...PROPOSAL_CARD_LABELS, ...overrides } : PROPOSAL_CARD_LABELS;
  const settled = SETTLED.has(state);

  // WHILE THE PERSON COULD STILL DECIDE: applying already holds the primary
  // with its spinner, and a settled card has no primary at all, so a held
  // primary and a refused decision are drawn only now.
  const deciding = state === 'pending' || state === 'stepup';
  const blocked = deciding && approveBlocked ? approveBlocked : undefined;
  const refusal = deciding ? decisionRefusal : undefined;

  const decision =
    deciding || state === 'applying' ? (
      <>
        {/* ONE LIVE REGION, KEPT for as long as the foot holds a decision
            (through the applying that an approval passes through on its way
            back to a refusal) and hidden while it is empty, so a refusal that
            arrives after the card did is announced: a region inserted
            together with its words often is not. */}
        <div
          role="status"
          className={cx('crewlet-proposal-card__refusal', refusal === undefined && 'crewlet-visually-hidden')}
        >
          {refusal === undefined ? null : (
            <RefusalStrip announce={false} hint={refusal.hint}>
              {refusal.sentence}
            </RefusalStrip>
          )}
        </div>
        {/* SHOWN, NOT READ TWICE: the primary carries the same sentence as
            its description, so this copy is for the eye only. */}
        {blocked === undefined ? null : (
          <p className="crewlet-proposal-card__blocked" aria-hidden="true">
            {blocked}
          </p>
        )}
        <Button
          variant="secondary"
          onClick={onDecline}
          disabledReason={state === 'applying' ? labels.busy : undefined}
        >
          {labels.decline}
        </Button>
        <Button variant="primary" loading={state === 'applying'} disabledReason={blocked} onClick={onApprove}>
          {state === 'stepup' ? labels.confirmIdentity : approveLabel}
        </Button>
      </>
    ) : undefined;

  const again =
    (state === 'expired' || state === 'stale') && onPrepareAgain ? (
      <Button variant="secondary" size="small" leadingIcon={<RefreshCwGlyph />} onClick={onPrepareAgain}>
        {labels.prepareAgain}
      </Button>
    ) : undefined;

  const strip =
    state === 'stepup' ? (
      <ReceiptStrip tone="neutral" icon={<LockGlyph size="md" />}>
        {notice ?? labels.stepUpNotice}
      </ReceiptStrip>
    ) : state === 'applied' && receipt !== undefined ? (
      <ReceiptStrip tone="success">{receipt}</ReceiptStrip>
    ) : state === 'declined' ? (
      <ReceiptStrip tone="neutral" icon={<BanGlyph size="md" />}>
        {notice ?? labels.declinedNotice}
      </ReceiptStrip>
    ) : state === 'expired' ? (
      <ReceiptStrip tone="neutral" icon={<ClockGlyph size="md" />}>
        {notice ?? labels.expiredNotice}
      </ReceiptStrip>
    ) : state === 'stale' ? (
      <ReceiptStrip tone="neutral" icon={<ClockGlyph size="md" />}>
        {notice ?? labels.staleNotice}
      </ReceiptStrip>
    ) : state === 'failed' ? (
      <RefusalStrip
        placement="foot"
        hint={failure === undefined ? undefined : failureHint}
        onRetry={onRetry}
        labels={{ retry: labels.tryAgain }}
      >
        {failureOutcome === 'unknown'
          ? (failure ?? labels.unknownNotice)
          : failure === undefined
            ? labels.nothingChanged
            : <>{failure} {labels.nothingChanged}</>}
      </RefusalStrip>
    ) : undefined;

  return (
    <StatusCard
      {...rest}
      title={title}
      subtitle={subtitle}
      status={statusOf(state, scope, failureOutcome, labels)}
      settled={settled}
      strip={strip}
      actions={decision ?? again}
      actionsAlign={decision ? 'end' : 'start'}
      className={cx('crewlet-proposal-card', `crewlet-proposal-card--${state}`, className)}
      data-state={state}
      data-outcome={state === 'failed' ? failureOutcome : undefined}
    >
      {summary === undefined || summary === null ? null : <p className="crewlet-proposal-card__summary">{summary}</p>}
      <ChangeList
        rows={changes}
        heading={changesHeading ?? headingOf(state, kind, labels)}
        settled={settled}
        labels={changeLabels}
        diffLabels={diffLabels}
      />
      {note === undefined || note === null ? null : <p className="crewlet-proposal-card__note">{note}</p>}
    </StatusCard>
  );
}
