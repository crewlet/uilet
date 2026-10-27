import { type ReactElement, type ReactNode } from 'react';
import { XGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

export interface FilterPillProps {
  /** What the filter is on: "Status". */
  field: ReactNode;
  /**
   * How the value is compared: "is", "contains", "is any of". Left out, the
   * field and the value are joined by a colon ("Role: Admin").
   */
  operator?: ReactNode;
  /**
   * What the filter is set to: "In progress". Left out for a filter that is a
   * switch with no value ("Blocked"), which the field alone names.
   */
  value?: ReactNode;
  /** Takes the filter off. Left out, the pill has no remove control. */
  onRemove?: (() => void) | undefined;
  /**
   * Names the remove control. Defaults to the whole filter as a sentence,
   * "Remove the Status is In progress filter", where its parts are words: a
   * row of pills each announcing "Remove" names nothing.
   */
  removeLabel?: string | undefined;
  /**
   * Draws the words as a control, for a pill whose words open the filter's
   * editor (a popover's trigger). Called with the words and the class the
   * control takes; it returns that control, a `<button>`.
   */
  renderWords?: ((words: ReactNode, className: string) => ReactElement) | undefined;
  className?: string | undefined;
}

/** The class the words take, as text or as the control `renderWords` returns. */
export const FILTER_PILL_WORDS_CLASS = 'crewlet-filter-pill__words';

/** The parts as one sentence, where every part is a word: "Status is In progress". */
export function filterPillSentence(field: ReactNode, operator?: ReactNode, value?: ReactNode): string | undefined {
  const parts = [field, operator, value].filter((part) => part !== undefined && part !== null && part !== '');
  if (!parts.every((part) => typeof part === 'string' || typeof part === 'number')) return undefined;
  return parts.join(' ');
}

/**
 * One filter in force on a list: the field, how it compares, the value, and
 * the control that takes it off.
 *
 * THREE PARTS IN THREE REGISTERS, because a filter is a sentence and a pill
 * set in one register reads as a label. The field and the relation are the
 * secondary ink at the regular weight; the value, the answer a reader checks,
 * is the accent ink at the semibold weight. The parts are drawn a step apart
 * AND separated by real spaces, so the pill reads, copies and is announced as
 * the sentence it is, never as "StatusisIn progress".
 *
 * THE ACCENT GROUND, because a filter in force is where the reader is in the
 * data: the same soft fill and edge a pressed [FilterChip] and the selected row
 * carry. The remove control is a second button beside the words, behind a
 * hairline, named by the whole filter; it keeps the pill's ink rather than
 * turning red, because taking a filter off destroys nothing.
 */
export function FilterPill({
  field,
  operator,
  value,
  onRemove,
  removeLabel,
  renderWords,
  className,
}: FilterPillProps) {
  const hasValue = value !== undefined && value !== null && value !== '';
  const hasOperator = operator !== undefined && operator !== null && operator !== '';
  const words = (
    <>
      <span className="crewlet-filter-pill__field">
        {field}
        {hasValue && !hasOperator ? ':' : null}
      </span>
      {hasOperator ? (
        <>
          {' '}
          <span className="crewlet-filter-pill__operator">{operator}</span>
        </>
      ) : null}
      {hasValue ? (
        <>
          {' '}
          <span className="crewlet-filter-pill__value">{value}</span>
        </>
      ) : null}
    </>
  );
  const sentence = filterPillSentence(field, hasOperator ? operator : undefined, hasValue ? value : undefined);
  return (
    <div className={cx('crewlet-filter-pill', className)}>
      {renderWords ? renderWords(words, FILTER_PILL_WORDS_CLASS) : <span className={FILTER_PILL_WORDS_CLASS}>{words}</span>}
      {onRemove ? (
        <IconButton
          className="crewlet-filter-pill__remove"
          size="sm"
          variant="ghost"
          label={removeLabel ?? (sentence ? `Remove the ${sentence} filter` : 'Remove this filter')}
          icon={<XGlyph size="xs" />}
          onClick={onRemove}
        />
      ) : null}
    </div>
  );
}
