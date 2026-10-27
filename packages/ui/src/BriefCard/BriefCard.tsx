import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { ArrowRightGlyph, CircleCheckGlyph, MessageCircleQuestionMarkGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { StatusCard } from '../StatusCard/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { SuggestionList, SuggestionRow } from '../SuggestionRow/index.js';
import { cx } from '../utils/cx.js';

/** The most rows a brief draws: what waits on the reader is a short list or it is not a brief. */
export const BRIEF_CARD_MAX_NEEDS = 3;

/** The one thing a row or the recommendation lets the reader do, in one press. */
export interface BriefCardAction {
  /** A verb and its object: "Answer", "Open GOP-11", "Ask why". */
  label: string;
  onSelect: () => void;
}

/**
 * How loud a row is. `danger` is for a fact the host knows (an agent stopped,
 * a failed turn), never for urgency a writer chose; most rows are `warning`.
 */
export type BriefCardNeedTone = 'danger' | 'warning' | 'neutral';

/** One thing that waits on the reader, pointing at the record it is about. */
export interface BriefCardNeed {
  key: string;
  /** What waits, with its number and its name: "QA asks which store build to test on GOP-11". */
  text: ReactNode;
  /** One fact under it: "Asked 2 hours ago". */
  detail?: ReactNode;
  tone?: BriefCardNeedTone | undefined;
  action?: BriefCardAction | undefined;
}

/** The one next step the brief recommends. */
export interface BriefCardRecommendation {
  text: ReactNode;
  action?: BriefCardAction | undefined;
}

/** A question the reader can ask next, in the same conversation. */
export interface BriefCardFollowUp {
  key: string;
  question: string;
  onSelect: () => void;
}

export interface BriefCardLabels {
  /** The card's title. */
  heading: string;
  needs: string;
  /** Said in the needs block when nothing waits on the reader. */
  clear: string;
  recommended: string;
  followUps: string;
  /** The head's Tag: how many rows wait on the reader. */
  count: (n: number) => string;
  /** The head's Tag when nothing waits. */
  allClear: string;
}

export const BRIEF_CARD_LABELS: BriefCardLabels = {
  heading: 'Brief',
  needs: 'Needs you',
  clear: 'Nothing needs you.',
  recommended: 'Recommended',
  followUps: 'Ask next',
  count: (n) => (n === 1 ? '1 needs you' : `${n} need you`),
  allClear: 'All clear',
};

export interface BriefCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** What the brief covers, beside the title: "Inbox", "Decision on GOP-11". */
  scope?: ReactNode;
  /** When the brief was written, as the reader reads a time: "Just now". */
  asOf?: ReactNode;
  /** What is going on, in one sentence with numbers and names. */
  summary: ReactNode;
  /** What waits on the reader, at most [BRIEF_CARD_MAX_NEEDS]. An empty list says `labels.clear`. */
  needs: readonly BriefCardNeed[];
  /** The one next step, or `null` where nothing is worth recommending. */
  recommended: BriefCardRecommendation | null;
  /** Questions to ask next, drawn as suggestion rows under the recommendation. */
  followUps?: readonly BriefCardFollowUp[] | undefined;
  labels?: Partial<BriefCardLabels> | undefined;
}

/**
 * A brief, as the assistant's answer card: one sentence on what is going on,
 * the rows that wait on the reader (never more than three, each pointing at
 * its record with the one press that deals with it), one recommended next
 * step, and the questions worth asking next.
 *
 * A FIXED SHAPE, NOT PROSE. A reader who asks for a brief on every page learns
 * where each answer sits and reads only the part they need. Nothing waiting is
 * said in words, "Nothing needs you.", rather than drawn as an empty block, and
 * the head's Tag says the count before the body is read.
 *
 * THE CARD DRAWS, THE HOST DECIDES. Every action is the host's own callback,
 * so where a row leads (a record opened, a question asked) is settled by the
 * code that built the brief, never by text inside it.
 */
export function BriefCard({
  scope,
  asOf,
  summary,
  needs,
  recommended,
  followUps,
  labels: overrides,
  className,
  ...rest
}: BriefCardProps) {
  const labels = overrides ? { ...BRIEF_CARD_LABELS, ...overrides } : BRIEF_CARD_LABELS;
  const id = useId();
  const rows = needs.slice(0, BRIEF_CARD_MAX_NEEDS);
  const hasScope = !(scope === undefined || scope === null || scope === '');
  const hasAsOf = !(asOf === undefined || asOf === null || asOf === '');
  const subtitle =
    hasScope || hasAsOf ? (
      <span className="crewlet-brief-card__where">
        {hasScope ? <span>{scope}</span> : null}
        {hasScope && hasAsOf ? <span aria-hidden="true">·</span> : null}
        {hasAsOf ? <span className="crewlet-brief-card__asof">{asOf}</span> : null}
      </span>
    ) : undefined;
  return (
    <StatusCard
      {...rest}
      title={labels.heading}
      subtitle={subtitle}
      status={
        rows.length > 0
          ? { label: labels.count(rows.length), tone: 'warning' }
          : { label: labels.allClear, tone: 'success', icon: <CircleCheckGlyph size="xs" /> }
      }
      className={cx('crewlet-brief-card', className)}
    >
      <div className="crewlet-brief-card__body">
        <p className="crewlet-brief-card__summary">{summary}</p>
        <section className="crewlet-brief-card__block" aria-labelledby={`${id}-needs`}>
          <h4 className="crewlet-brief-card__label" id={`${id}-needs`}>
            {labels.needs}
          </h4>
          {rows.length === 0 ? (
            <p className="crewlet-brief-card__clear">
              <CircleCheckGlyph size="sm" aria-hidden="true" />
              {labels.clear}
            </p>
          ) : (
            // A list the reader moves through by item; Safari drops the role of a list styled without markers.
            // eslint-disable-next-line jsx-a11y/no-redundant-roles
            <ul role="list" className="crewlet-brief-card__needs">
              {rows.map((need) => (
                <li key={need.key} className="crewlet-brief-card__need">
                  <span className="crewlet-brief-card__dot">
                    <StatusDot tone={need.tone ?? 'warning'} />
                  </span>
                  <span className="crewlet-brief-card__words">
                    <span>{need.text}</span>
                    {need.detail === undefined || need.detail === null ? null : (
                      <span className="crewlet-brief-card__detail">{need.detail}</span>
                    )}
                  </span>
                  {need.action ? (
                    <Button size="small" variant="secondary" onClick={need.action.onSelect}>
                      {need.action.label}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        {recommended === null ? null : (
          <section className="crewlet-brief-card__block" aria-labelledby={`${id}-next`}>
            <h4 className="crewlet-brief-card__label" id={`${id}-next`}>
              {labels.recommended}
            </h4>
            <div className="crewlet-brief-card__next">
              <ArrowRightGlyph size="sm" aria-hidden="true" className="crewlet-brief-card__arrow" />
              <span>{recommended.text}</span>
              {recommended.action ? (
                <Button size="small" variant="primary" onClick={recommended.action.onSelect}>
                  {recommended.action.label}
                </Button>
              ) : null}
            </div>
          </section>
        )}
        {followUps && followUps.length > 0 ? (
          <section className="crewlet-brief-card__block" aria-labelledby={`${id}-ask`}>
            <h4 className="crewlet-brief-card__label" id={`${id}-ask`}>
              {labels.followUps}
            </h4>
            <SuggestionList className="crewlet-brief-card__follow-ups">
              {followUps.map((f) => (
                <SuggestionRow key={f.key} icon={<MessageCircleQuestionMarkGlyph size="sm" />} onSelect={f.onSelect}>
                  {f.question}
                </SuggestionRow>
              ))}
            </SuggestionList>
          </section>
        ) : null}
      </div>
    </StatusCard>
  );
}
