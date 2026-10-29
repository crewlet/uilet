import { useId, type CSSProperties, type ReactNode } from 'react';
import { StatusDot } from '../StatusDot/index.js';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

/** One short fact on a card: what it needs, how ready that is, how it behaves. */
export interface ChoiceCardFact {
  /** The fact's name, a word or two: "Needs", "Isolation". */
  label: ReactNode;
  /** The fact: "Docker 24.0.7 found". */
  value: ReactNode;
  /** A state the fact reports, drawn as a dot beside it; none for a plain fact. */
  tone?: Tone | undefined;
}

/** One choice in [ChoiceCards]. */
export interface ChoiceCardOption {
  /** Stable identity, and what `onChange` is called with. */
  value: string;
  /** What the choice is, in a few words: its radio's name, with the tag. */
  label: ReactNode;
  /** A picture of the choice before its name: a product's mark, a glyph. Decorative; the label names it. */
  media?: ReactNode;
  /** A short word beside the choice's name, read as part of its name: "Company default". */
  tag?: ReactNode;
  /** One plain line saying what choosing it means. */
  description?: ReactNode;
  /** A few short facts, one to a line under the description, each its name and its value. */
  facts?: readonly ChoiceCardFact[] | undefined;
  /** The choice cannot be made now. */
  disabled?: boolean | undefined;
  /**
   * Why not, and what fixes it ("Add E2B_API_KEY to use it"), in the warning
   * ink and read with its radio: the one way a card gives its reason. It is
   * the card's last line, or, with `disabledReasonAt`, the value of a fact.
   */
  disabledReason?: ReactNode;
  /**
   * The index of the fact whose value the reason takes the place of ("Needs:
   * E2B key not set. Add E2B_API_KEY"), so a card that cannot be chosen keeps
   * the same lines as the cards beside it rather than growing one.
   */
  disabledReasonAt?: number | undefined;
}

/** The narrowest a card stands: `md` 20rem, `lg` 24rem. */
export type ChoiceCardsMinWidth = 'md' | 'lg';

export interface ChoiceCardsProps {
  /** Names the group for a screen reader. */
  label: string;
  options: readonly ChoiceCardOption[];
  /** The selected choice's `value`, or null when none is. */
  value: string | null;
  onChange: (value: string) => void;
  /**
   * The narrowest a card stands, which decides how many share a row: `md`
   * (20rem) for a short name and facts, `lg` (24rem) for choices with more to
   * say. A form's column holds one to a row; a wider surface two or three.
   */
  minCardWidth?: ChoiceCardsMinWidth | undefined;
  className?: string | undefined;
}

/**
 * One answer from a few, each a card of the same lines: a picture, the
 * choice's name and its tag; one line of description; and a few facts, one to
 * a line. Cards side by side share every line (a subgrid), so the facts of
 * every card stand level, in a grid that wraps.
 *
 * FOR CHOICES A PERSON COMPARES rather than reads down: a product to run, a
 * place to run it, what a new thing is for. Where each answer is a line of
 * words, [ChoiceList] is the lighter control.
 *
 * NATIVE RADIOS, so the arrow keys move the choice and Tab leaves the group as
 * the platform does, and each card is its radio's label, so the whole card
 * takes the pointer. The radio is NAMED by the choice's name and tag alone
 * and DESCRIBED by the rest (the description, the facts, the reason): named by
 * the whole card, it was read as some twenty-five words on every arrow press,
 * a link's words among them. A disabled card is skipped by the arrows, keeps
 * its words at full contrast, and says why it is unavailable and what fixes
 * it, because a choice greyed out with no reason is a dead end.
 *
 * A FACT'S STATE IS NEVER ONLY A COLOUR: the dot sits beside words that say
 * it ("Docker 24.0.7 found", "E2B key not set").
 */
export function ChoiceCards({ label, options, value, onChange, minCardWidth = 'md', className }: ChoiceCardsProps) {
  const name = useId();
  // EVERY CARD SPANS THE SAME ROWS: the name, a description row where any card
  // has one, the most facts any card has, and a reason line where one has it.
  const described = options.some((o) => o.description != null && o.description !== false && o.description !== '');
  const facts = Math.max(0, ...options.map((o) => o.facts?.length ?? 0));
  const inFact = (o: ChoiceCardOption) =>
    o.disabledReasonAt !== undefined && o.disabledReasonAt >= 0 && o.disabledReasonAt < (o.facts?.length ?? 0);
  // A reason given on a fact's line takes no row of its own.
  const reasons = options.some((o) => o.disabled && o.disabledReason && !inFact(o)) ? 1 : 0;
  const rows = { '--crewlet-choice-cards-rows': 1 + (described ? 1 : 0) + facts + reasons } as CSSProperties;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('crewlet-choice-cards', `crewlet-choice-cards--${minCardWidth}`, className)}
      style={rows}
    >
      {options.map((option, index) => {
        // IDS BY POSITION, never by value: a value may hold a space or any
        // character, and an id reference list splits on whitespace.
        const id = `${name}-${index}`;
        const checked = option.value === value;
        const part = (what: string) => `${id}-${what}`;
        const reason = option.disabled && option.disabledReason ? part('reason') : null;
        const reasonAt = reason && inFact(option) ? option.disabledReasonAt! : -1;
        const labelledBy = [part('label'), option.tag ? part('tag') : null].filter(Boolean).join(' ');
        // A REASON ON A FACT'S LINE is described with the fact's name ("Needs:
        // E2B key not set"), so the line it takes is read whole.
        const describedBy = [
          option.description ? part('description') : null,
          ...(option.facts ?? []).map((_, at) => (at === reasonAt ? reason : part(`fact-${at}`))),
          reasonAt < 0 ? reason : null,
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cx('crewlet-choice-cards__card', checked && 'is-checked', option.disabled && 'is-disabled')}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              disabled={option.disabled}
              aria-labelledby={labelledBy}
              aria-describedby={describedBy || undefined}
              onChange={() => onChange(option.value)}
              className="crewlet-choice-cards__radio"
            />
            <span className="crewlet-choice-cards__title">
              {option.media != null ? (
                <span className="crewlet-choice-cards__media" aria-hidden>
                  {option.media}
                </span>
              ) : null}
              <span id={part('label')} className="crewlet-choice-cards__label">
                {option.label}
              </span>
              {option.tag ? (
                <span id={part('tag')} className="crewlet-choice-cards__tag">
                  {option.tag}
                </span>
              ) : null}
            </span>
            {option.description ? (
              <span id={part('description')} className="crewlet-choice-cards__description">
                {option.description}
              </span>
            ) : described ? (
              <span className="crewlet-choice-cards__description" aria-hidden />
            ) : null}
            {option.facts && option.facts.length > 0 ? (
              <span className="crewlet-choice-cards__facts">
                {option.facts.map((fact, at) => (
                  <span
                    key={at}
                    id={at === reasonAt ? reason! : part(`fact-${at}`)}
                    className={cx('crewlet-choice-cards__fact', at === reasonAt && 'is-reason')}
                  >
                    <span className="crewlet-choice-cards__fact-label">{fact.label}</span>
                    {/* A space between name and value, for a reader that reads the line as one string; the flex gap draws it. */}{' '}
                    <span className="crewlet-choice-cards__fact-value">
                      {fact.tone ? (
                        <StatusDot tone={fact.tone}>{at === reasonAt ? option.disabledReason : fact.value}</StatusDot>
                      ) : at === reasonAt ? (
                        option.disabledReason
                      ) : (
                        fact.value
                      )}
                    </span>
                  </span>
                ))}
              </span>
            ) : null}
            {reason && reasonAt < 0 ? (
              <span id={reason} className="crewlet-choice-cards__reason">
                {option.disabledReason}
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
