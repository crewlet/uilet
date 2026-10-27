import { useEffect, type HTMLAttributes, type ReactNode } from 'react';
import { CircleCheckGlyph, MessageCircleQuestionMarkGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { StatusCard } from '../StatusCard/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { SuggestionList, SuggestionRow } from '../SuggestionRow/index.js';
import { cx } from '../utils/cx.js';

/**
 * The most rows a brief draws: what waits on the reader is a short list or it
 * is not a brief. The host ranks and caps; the card's own cut is a guard.
 */
export const BRIEF_CARD_MAX_NEEDS = 3;

/** The most follow-ups a brief draws: the next questions, not a menu. The host caps them. */
export const BRIEF_CARD_MAX_FOLLOW_UPS = 2;

/** The one thing a row lets the reader do, in one press. */
export interface BriefCardAction {
  /** A verb and its object: "Answer", "Open GOP-11", "Ask why". */
  label: string;
  onSelect: () => void;
}

/**
 * How loud a row is. Every row is something to act on, so `warning` is the
 * default; `danger` is for a fact the host knows (an agent stopped, a failed
 * turn, a task marked urgent), never for urgency a writer chose.
 */
export type BriefCardNeedTone = 'danger' | 'warning';

/** One thing the reader has to do, pointing at the record it is about. */
export interface BriefCardNeed {
  key: string;
  /** What to do, as an instruction naming its record: "Answer GOP-11: which build QA tests". */
  text: ReactNode;
  /** Why now, in one fact: "Asked 2 hours ago, blocks the beta". */
  detail?: ReactNode;
  tone?: BriefCardNeedTone | undefined;
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
  /** The list's accessible name. */
  needs: string;
  /** The mark on the first row, the one the brief recommends, where there are rows to rank. */
  first: string;
  followUps: string;
  /** The verdict in the head while rows wait: "2 things need you". */
  count: (n: number) => string;
  /** The verdict in the head when nothing waits. */
  allClear: string;
}

export const BRIEF_CARD_LABELS: BriefCardLabels = {
  heading: 'Brief',
  needs: 'Needs you',
  first: 'Do first',
  followUps: 'Ask next',
  count: (n) => (n === 1 ? '1 thing needs you' : `${n} things need you`),
  allClear: 'Nothing needs you',
};

// `about` is also HTML's RDFa attribute, which a card has no use for: the prop takes its name.
export interface BriefCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'about'> {
  /** What the brief covers, beside the title: "Inbox", "Decision GOP-11". */
  scope?: ReactNode;
  /** When the brief was written, as the reader reads a time: "Just now". */
  asOf?: ReactNode;
  /** What the page or record is about right now, in one line. */
  about: ReactNode;
  /**
   * What the reader has to do, most pressing first, at most
   * [BRIEF_CARD_MAX_NEEDS]. THE HOST RANKS AND CAPS: the first row is the
   * recommendation, and a row past the cap is dropped with a warning outside
   * production, since the verdict in the head counts only the rows drawn. An
   * empty list is "Nothing needs you".
   */
  needs: readonly BriefCardNeed[];
  /** One fact from elsewhere that bears on what to do, drawn quiet under the rows. */
  context?: ReactNode;
  /** Questions to ask next, at most [BRIEF_CARD_MAX_FOLLOW_UPS], drawn as suggestion rows at the foot. */
  followUps?: readonly BriefCardFollowUp[] | undefined;
  labels?: Partial<BriefCardLabels> | undefined;
}

/**
 * A brief, as the assistant's answer card: a verdict, one line on what the
 * page is about, and the things the reader has to do (never more than three,
 * ranked, each pointing at its record with the one press that deals with it).
 *
 * THE VERDICT IS SAID ONCE, IN THE HEAD, AND THE CARD DERIVES IT. The Tag
 * counts the rows ("2 things need you") or says "Nothing needs you", so the
 * card's region name answers "do I need to do anything" before the body is
 * read, and no writer can put a verdict beside rows that contradict it.
 *
 * THE HEAD'S TONE IS THE LOUDEST ROW'S: danger when any row is danger,
 * otherwise warning, and the success tone for "Nothing needs you".
 *
 * THE FIRST ROW IS THE RECOMMENDATION. Its press is the card's primary button,
 * and where there are two or more rows to rank it is marked "Do first"; a
 * separate recommendation would say the first row again.
 *
 * THE CARD DRAWS, THE HOST DECIDES. Every action is the host's own callback,
 * so where a row leads (a record opened, a question asked) is settled by the
 * code that built the brief, never by text inside it.
 */
export function BriefCard({
  scope,
  asOf,
  about,
  needs,
  context,
  followUps,
  labels: overrides,
  className,
  ...rest
}: BriefCardProps) {
  const labels = overrides ? { ...BRIEF_CARD_LABELS, ...overrides } : BRIEF_CARD_LABELS;
  const handedNeeds = needs.length;
  const handedFollowUps = followUps?.length ?? 0;
  // The host ranks and caps (BRIEF_CARD_MAX_NEEDS, BRIEF_CARD_MAX_FOLLOW_UPS):
  // a row cut here is one the reader is never told about, so say so where a
  // developer will see it rather than drop it in silence. Once per change of
  // the counts, not once per render.
  useEffect(() => {
    if (!developing()) return;
    if (handedNeeds > BRIEF_CARD_MAX_NEEDS) {
      console.warn(
        `[crewlet] BriefCard was handed ${handedNeeds} needs and draws the first ${BRIEF_CARD_MAX_NEEDS}: rank and cap them before passing them.`,
      );
    }
    if (handedFollowUps > BRIEF_CARD_MAX_FOLLOW_UPS) {
      console.warn(
        `[crewlet] BriefCard was handed ${handedFollowUps} follow-ups and draws the first ${BRIEF_CARD_MAX_FOLLOW_UPS}.`,
      );
    }
  }, [handedNeeds, handedFollowUps]);
  const rows = needs.slice(0, BRIEF_CARD_MAX_NEEDS);
  const asks = followUps ? followUps.slice(0, BRIEF_CARD_MAX_FOLLOW_UPS) : [];
  const ranked = rows.length > 1;
  const hasScope = !(scope === undefined || scope === null || scope === '');
  const hasAsOf = !(asOf === undefined || asOf === null || asOf === '');
  const hasContext = !(context === undefined || context === null || context === '');
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
          ? {
              label: labels.count(rows.length),
              tone: rows.some((need) => need.tone === 'danger') ? 'danger' : 'warning',
            }
          : { label: labels.allClear, tone: 'success', icon: <CircleCheckGlyph size="xs" /> }
      }
      className={cx('crewlet-brief-card', className)}
    >
      <div className="crewlet-brief-card__body">
        <p className="crewlet-brief-card__about">{about}</p>
        {rows.length === 0 ? null : (
          // A list the reader moves through by item; Safari drops the role of a list styled without markers.
          // eslint-disable-next-line jsx-a11y/no-redundant-roles
          <ol role="list" aria-label={labels.needs} className="crewlet-brief-card__needs">
            {rows.map((need, i) => (
              <li
                key={need.key}
                className={cx('crewlet-brief-card__need', i === 0 && ranked && 'crewlet-brief-card__need--first')}
              >
                <span className="crewlet-brief-card__dot">
                  <StatusDot tone={need.tone ?? 'warning'} />
                </span>
                <span className="crewlet-brief-card__words">
                  {i === 0 && ranked ? <span className="crewlet-brief-card__first">{labels.first}</span> : null}
                  <span>{need.text}</span>
                  {need.detail === undefined || need.detail === null ? null : (
                    <span className="crewlet-brief-card__detail">{need.detail}</span>
                  )}
                </span>
                {need.action ? (
                  <Button size="small" variant={i === 0 ? 'primary' : 'secondary'} onClick={need.action.onSelect}>
                    {need.action.label}
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {hasContext ? <p className="crewlet-brief-card__context">{context}</p> : null}
        {asks.length > 0 ? (
          <SuggestionList aria-label={labels.followUps} className="crewlet-brief-card__follow-ups">
            {asks.map((f) => (
              <SuggestionRow key={f.key} icon={<MessageCircleQuestionMarkGlyph size="sm" />} onSelect={f.onSelect}>
                {f.question}
              </SuggestionRow>
            ))}
          </SuggestionList>
        ) : null}
      </div>
    </StatusCard>
  );
}

/**
 * Whether the host is a development build. A bundler replaces
 * `process.env.NODE_ENV` with a literal, so the check costs nothing in a
 * production build and is true in development. It is NOT guarded with
 * `typeof process`: that expression is not replaced, and in a browser it is
 * 'undefined' even in development, which would silence the warning
 * everywhere. An ESM host with no bundler has no `process` at all, and the
 * ReferenceError reads as not developing.
 */
function developing(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}
