import { useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { BanGlyph, CircleAlertGlyph, CircleCheckGlyph, ClockGlyph, LockGlyph, RefreshCwGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { ChangeList, type ChangeListLabels, type ChangeListRow } from '../ChangeList/index.js';
import { Checkbox } from '../Checkbox/index.js';
import type { DiffListLabels } from '../DiffList/index.js';
import { Disclosure } from '../Disclosure/index.js';
import { ReceiptStrip, RefusalStrip } from '../ReceiptStrip/index.js';
import { Spinner } from '../Spinner/index.js';
import { StatusCard, type StatusCardStatus } from '../StatusCard/index.js';
import { cx } from '../utils/cx.js';

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
 * How much the decision weighs: `default`, or `danger` for a change that
 * removes, discards or overwrites something (removing a seat, deleting a
 * record). Danger draws the card's leading edge and its title in the danger
 * ink and the primary as the danger button, while the card waits on the
 * person or carries the change out.
 */
export type ProposalTone = 'default' | 'danger';

export const PROPOSAL_TONES = ['default', 'danger'] as const satisfies readonly ProposalTone[];

/**
 * A deliberate confirmation: a checkbox the person ticks before the primary
 * can be pressed, for a change whose consequence has to be acknowledged.
 */
export interface ProposalConfirmation {
  /**
   * What the person confirms, as the checkbox's name: "I understand the QA
   * Engineer seat and its history are removed."
   */
  label: ReactNode;
}

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
  /** Why the primary is held until the `confirmation` is ticked, said as its description. */
  confirmationNeeded: string;
  /** The title of the collapsed `details` section. */
  details: string;
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
  confirmationNeeded: 'Check the confirmation above first',
  details: 'Technical details',
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
  /**
   * The precise request behind the change (a method, a path, a body) for a
   * reader who wants it: a collapsed `Disclosure` at the foot of the body,
   * above the note, titled `labels.details`, whose content mounts only once
   * it is opened. Never where the change itself is said: the list is.
   */
  details?: ReactNode;
  /** `default`, or `danger` for a change that removes or discards something; see `ProposalTone`. */
  tone?: ProposalTone | undefined;
  /**
   * A checkbox above the decision that the person ticks before the primary
   * can be pressed. Until then the primary is held soft disabled and
   * described by `labels.confirmationNeeded`, as `approveBlocked` holds it.
   * The tick belongs to the proposal it was given for: it clears when the
   * card settles, and when the card is handed a different proposal (another
   * `title` or `approveLabel`) in place. Drawn while the card waits on the
   * person and while the approved change is carried out.
   */
  confirmation?: ProposalConfirmation | undefined;
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

/**
 * HOW LONG A PRIMARY THAT HAS JUST APPEARED IGNORES THE POINTER. A card that
 * replaces another can put its primary exactly where the last one's was,
 * under a pointer that is still there, and the second press of a double click
 * (or a press already on its way) landed on the new card's Approve. 500ms is
 * the platform's default double-click interval (Windows and macOS alike), so
 * no press meant for what stood there before reaches the new primary, and it
 * is well under the time a reader takes to read the title it acts on.
 */
const ARMING_MS = 500;

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
 * FOCUS IS NEVER DROPPED. The decision's buttons leave when the card
 * settles, and a reader who pressed one from the keyboard would be left on
 * the page body. Focus moves to what replaced them: the strip that says what
 * happened, or the card itself when there is none. Only when focus was in
 * the card as it settled: a reader who has moved on is not pulled back.
 *
 * "NOTHING CHANGED." ONLY WHEN IT IS TRUE. A failure whose outcome nobody
 * could confirm (`failureOutcome="unknown"`) may have landed, so the card
 * says "Not confirmed" and never adds the reassurance.
 *
 * A DESTRUCTIVE CHANGE LOOKS LIKE ONE (`tone="danger"`): the danger rail down
 * the leading edge, the title in the danger ink and the danger primary. The
 * colour only adds weight; the title, the summary and the confirmation say
 * what is lost in words. With `confirmation`, the primary waits on a ticked
 * checkbox, so the decision is a deliberate act rather than a single press.
 *
 * A PRIMARY THAT HAS JUST APPEARED IS NOT YET UNDER THE POINTER. For half a
 * second after the card arrives (or returns to a decision) its primary takes
 * no pointer, so a press meant for the card it replaced cannot approve this
 * one. The keyboard is never held.
 *
 * THE PRECISE REQUEST IS THERE, FOLDED (`details`): a compact disclosure,
 * collapsed by default, for a reader who wants the method, path and body.
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
  details,
  tone = 'default',
  confirmation,
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
  const uid = useId();
  const cardId = rest.id ?? `${uid}-card`;
  const stripId = `${uid}-strip`;

  // WHETHER FOCUS WAS IN THE CARD AS IT SETTLED, read during the render that
  // settles it: by the time any effect runs the focused button has been
  // removed and focus has already fallen to the body.
  const previous = useRef(state);
  const regain = useRef(false);
  if (previous.current !== state) {
    if (settled && !SETTLED.has(previous.current) && typeof document !== 'undefined') {
      regain.current = document.getElementById(cardId)?.contains(document.activeElement) ?? false;
    }
    previous.current = state;
  }
  useLayoutEffect(() => {
    if (!regain.current) return;
    regain.current = false;
    const holder = document.activeElement;
    // Something still holds focus (a control that stayed): leave it there.
    if (holder && holder !== document.body) return;
    (document.getElementById(stripId) ?? document.getElementById(cardId))?.focus({ preventScroll: true });
  }, [state, stripId, cardId]);
  // What focus can be moved to once the card has settled, and nothing a Tab stops at.
  const landing = settled ? { id: stripId, tabIndex: -1 } : {};

  // WHILE THE PERSON COULD STILL DECIDE: applying already holds the primary
  // with its spinner, and a settled card has no primary at all, so a held
  // primary and a refused decision are drawn only now.
  const deciding = state === 'pending' || state === 'stepup';
  const blocked = deciding && approveBlocked ? approveBlocked : undefined;
  const refusal = deciding ? decisionRefusal : undefined;
  // The danger tone is the weight of a decision still to be made or being
  // carried out; a settled card steps back with the rest of its body.
  const danger = tone === 'danger' && !settled;

  // WHICH PROPOSAL THIS IS, as far as the card can tell: a host that hands
  // the same card a different proposal in place (rather than keying it) gives
  // it another action or another primary, and neither the tick nor the
  // arming below may carry over to it.
  const identity = `${title}\u0000${approveLabel}`;

  // THE TICK BELONGS TO ONE PROPOSAL, and clears once the card settles, so a
  // card prepared again starts unticked.
  const [tickedFor, setTickedFor] = useState<string | undefined>(undefined);
  if (settled && tickedFor !== undefined) setTickedFor(undefined);
  const unconfirmed =
    deciding && confirmation !== undefined && tickedFor !== identity ? labels.confirmationNeeded : undefined;

  // THE PRIMARY ARMS A MOMENT AFTER IT APPEARS (see ARMING_MS): when the
  // card arrives, when it is handed another proposal, and when it comes back
  // to a decision (a step-up, a refused approval). Until then it takes no
  // pointer, so it neither shows a hover nor answers a press from a pointer
  // that was already resting there. It still takes focus and the keyboard,
  // which can only reach it on purpose, and it is never drawn as disabled.
  const armKey = deciding ? `${state}\u0000${identity}` : undefined;
  const [arm, setArm] = useState({ key: armKey, armed: false });
  if (arm.key !== armKey) setArm({ key: armKey, armed: false });
  useEffect(() => {
    if (armKey === undefined) return;
    const timer = setTimeout(
      () => setArm((current) => (current.key === armKey ? { key: armKey, armed: true } : current)),
      ARMING_MS,
    );
    return () => clearTimeout(timer);
  }, [armKey]);
  const arming = armKey !== undefined && !(arm.key === armKey && arm.armed);

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
        {confirmation === undefined ? null : (
          <Checkbox
            className="crewlet-proposal-card__confirmation"
            size="sm"
            tone={danger ? 'danger' : 'default'}
            label={confirmation.label}
            checked={tickedFor === identity}
            disabled={state === 'applying'}
            onCheckedChange={(checked) => setTickedFor(checked ? identity : undefined)}
          />
        )}
        <Button
          variant="secondary"
          onClick={onDecline}
          disabledReason={state === 'applying' ? labels.busy : undefined}
        >
          {labels.decline}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          className="crewlet-proposal-card__approve"
          loading={state === 'applying'}
          disabledReason={blocked ?? unconfirmed}
          data-arming={arming || undefined}
          onClick={onApprove}
        >
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
      <ReceiptStrip {...landing} tone="success">
        {receipt}
      </ReceiptStrip>
    ) : state === 'declined' ? (
      <ReceiptStrip {...landing} tone="neutral" icon={<BanGlyph size="md" />}>
        {notice ?? labels.declinedNotice}
      </ReceiptStrip>
    ) : state === 'expired' ? (
      <ReceiptStrip {...landing} tone="neutral" icon={<ClockGlyph size="md" />}>
        {notice ?? labels.expiredNotice}
      </ReceiptStrip>
    ) : state === 'stale' ? (
      <ReceiptStrip {...landing} tone="neutral" icon={<ClockGlyph size="md" />}>
        {notice ?? labels.staleNotice}
      </ReceiptStrip>
    ) : state === 'failed' ? (
      <RefusalStrip
        {...landing}
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
      id={cardId}
      // The card itself takes focus when it settled with no strip to land on.
      tabIndex={settled ? -1 : rest.tabIndex}
      title={title}
      subtitle={subtitle}
      status={statusOf(state, scope, failureOutcome, labels)}
      settled={settled}
      strip={strip}
      actions={decision ?? again}
      actionsAlign={decision ? 'end' : 'start'}
      rail={danger ? 'danger' : undefined}
      className={cx(
        'crewlet-proposal-card',
        `crewlet-proposal-card--${state}`,
        danger && 'crewlet-proposal-card--danger',
        className,
      )}
      data-state={state}
      data-tone={danger ? 'danger' : undefined}
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
      {details === undefined || details === null ? null : (
        <Disclosure className="crewlet-proposal-card__details" title={labels.details} size="compact" lazy>
          {details}
        </Disclosure>
      )}
      {note === undefined || note === null ? null : <p className="crewlet-proposal-card__note">{note}</p>}
    </StatusCard>
  );
}
