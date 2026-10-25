import { useId, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface ChoiceButtonOption {
  value: string;
  label: ReactNode;
  /** A line under the label: what choosing it means. */
  detail?: ReactNode;
  /**
   * A small picture before the words, decorative (the label names the
   * option): a `ColorChip` on a suggested colour.
   */
  media?: ReactNode;
}

/**
 * `md` is the Inbox's answer, as tall as a touch target, in a column. `sm` is
 * the same option, compact, in a row that wraps: suggestions beside a field.
 */
export type ChoiceButtonsSize = 'md' | 'sm';

export interface ChoiceButtonsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Names the group: "Answers". */
  label: string;
  options: readonly ChoiceButtonOption[];
  /** The option the asker recommends: drawn first, filled, and marked. */
  recommended?: string | null | undefined;
  /** The mark on the recommended option, read as part of its name. */
  recommendedLabel?: string | undefined;
  /** Sends one option. */
  onChoose: (value: string) => void;
  /** `md` (the Inbox's answer) by default, or `sm`, compact and in a wrapping row. */
  size?: ChoiceButtonsSize | undefined;
  /**
   * The option already applied, for options that stay on screen after a
   * press (a suggestion that updated a field). Given, every option is a
   * toggle button that says whether it is the one applied, and that one is
   * drawn chosen: the selected edge and fill, never the accent. `null` when
   * none is; left out, the options send and say nothing of a choice.
   */
  chosen?: string | null | undefined;
  /**
   * The option being sent. It is announced as busy, and every option holds
   * still until the answer lands, so a second press cannot send a second
   * answer. What landed is the caller's to say, where the options were.
   */
  pending?: string | null | undefined;
  /**
   * Why nothing can be chosen now. Every option keeps its focus and reads the
   * reason after its name, as a disabled `Button` does.
   */
  disabledReason?: string | undefined;
}

/**
 * One answer from a short list, sent with ONE PRESS: each option is a button
 * as tall as a touch target, the recommended one first and filled.
 *
 * WHEN IT IS RIGHT. Where the question is the whole screen and the options are
 * the answer, a reader should not have to select and then submit. Where an
 * answer is chosen among other edits, or needs a field of its own under it,
 * `ChoiceList` is the part: a radio group with a footer that sends.
 *
 * NOT THE NATIVE `disabled`, for the reason `Button` gives: it takes focus off
 * the control the reader just pressed and drops it on the page body.
 * `aria-disabled` and `aria-busy` say the same and leave focus where it was.
 */
export function ChoiceButtons({
  label,
  options,
  recommended,
  recommendedLabel = 'Recommended',
  onChoose,
  pending,
  disabledReason,
  size = 'md',
  chosen,
  className,
  ...rest
}: ChoiceButtonsProps) {
  const reasonId = useId();
  const first = options.find((o) => o.value === recommended);
  const ordered = first ? [first, ...options.filter((o) => o !== first)] : options;
  const busy = pending !== undefined && pending !== null;
  const inert = busy || disabledReason !== undefined;

  return (
    <div
      {...rest}
      role="group"
      aria-label={label}
      className={cx('crewlet-choice-buttons', size === 'sm' && 'crewlet-choice-buttons--sm', className)}
    >
      {ordered.map((option) => {
        const isRecommended = option === first;
        const isChosen = chosen !== undefined && chosen !== null && option.value === chosen;
        return (
          <button
            key={option.value}
            type="button"
            className={cx(
              'crewlet-choice-buttons__option',
              isRecommended && 'crewlet-choice-buttons__option--recommended',
              isChosen && 'is-chosen',
            )}
            aria-pressed={chosen === undefined ? undefined : isChosen}
            aria-disabled={inert || undefined}
            aria-busy={pending === option.value || undefined}
            aria-describedby={disabledReason === undefined ? undefined : reasonId}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              if (inert) {
                event.preventDefault();
                return;
              }
              onChoose(option.value);
            }}
          >
            {option.media === undefined || option.media === null ? null : (
              <span className="crewlet-choice-buttons__media" aria-hidden="true">
                {option.media}
              </span>
            )}
            <span className="crewlet-choice-buttons__text">
              <span className="crewlet-choice-buttons__label">{option.label}</span>
              {option.detail === undefined ? null : (
                <>
                  {' '}
                  <span className="crewlet-choice-buttons__detail">{option.detail}</span>
                </>
              )}
            </span>
            {isRecommended ? (
              <>
                {' '}
                <span className="crewlet-choice-buttons__note">{recommendedLabel}</span>
              </>
            ) : null}
          </button>
        );
      })}
      {disabledReason === undefined ? null : <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden>}
    </div>
  );
}
