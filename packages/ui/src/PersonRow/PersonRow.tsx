import { forwardRef, type ButtonHTMLAttributes, type LiHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { CheckGlyph, PlusGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/**
 * How tall a row stands. `default` is a list's row: a 32px face beside the
 * name over a second line. `compact` is one line, the name with its detail
 * after it, for a list that opens under a caret and has to stay short.
 */
export type PersonRowDensity = 'default' | 'compact';

/**
 * What the row ends with. `toggle` is the mark of a row that adds and takes
 * away: a plus, or a check on the accent once it is chosen. `none` ends the
 * row on its words, for a row that opens something.
 */
export type PersonRowMark = 'toggle' | 'none';

/** What every row draws, whichever element it is. */
export interface PersonRowLook {
  /** The face: an `Avatar` with its status, or a glyph for something that is not a person (a room, `@channel`). */
  avatar: ReactNode;
  /** The person's or agent's name. */
  name: ReactNode;
  /** A small label after the name, such as an "Agent" `Tag`. */
  tag?: ReactNode;
  /** What they are doing now, or their title. One line, cut with an ellipsis. */
  detail?: ReactNode;
  /** Words at the row's end: "Working", "Not in this room". */
  meta?: ReactNode;
  mark?: PersonRowMark | undefined;
  density?: PersonRowDensity | undefined;
}

export interface PersonRowButtonProps extends PersonRowLook, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'name' | 'onSelect'> {
  as?: 'button' | undefined;
  /**
   * Whether the row is chosen, for a row that toggles: it is announced as a
   * pressed button and filled with the accent's soft tint. Left out, the row
   * is a plain button that opens something.
   */
  selected?: boolean | undefined;
  /** Pressing the row. */
  onSelect?: (() => void) | undefined;
}

export interface PersonRowOptionProps extends PersonRowLook, Omit<LiHTMLAttributes<HTMLLIElement>, 'children'> {
  /**
   * An option in a listbox a text field owns (`useListbox`): focus stays in
   * the field, which points at the row with `aria-activedescendant`, so the
   * row is never a tab stop of its own. Spread the hook's `optionHandlers`
   * and give it the hook's `optionId`.
   */
  as: 'option';
  /** `aria-selected`: the highlighted row of a single-choice list, or a chosen row of a multiselectable one. */
  selected?: boolean | undefined;
  /** The row the arrows are on, drawn with a bar on its start edge. */
  highlighted?: boolean | undefined;
  /** An option that cannot be taken. It stays in the list and says so. */
  disabled?: boolean | undefined;
}

export type PersonRowProps = PersonRowButtonProps | PersonRowOptionProps;

/** The row's insides, shared by both elements so a list of either is one design. */
function PersonRowBody({ avatar, name, tag, detail, meta, mark = 'none', density = 'default', selected = false }: PersonRowLook & { selected?: boolean | undefined }) {
  const words =
    density === 'compact' ? (
      <>
        <span className="crewlet-person-row__name">
          {name}
          {tag}
        </span>
        {detail ? <span className="crewlet-person-row__detail">{detail}</span> : null}
      </>
    ) : (
      <span className="crewlet-person-row__text">
        <span className="crewlet-person-row__name">
          {name}
          {tag}
        </span>
        {detail ? <span className="crewlet-person-row__detail">{detail}</span> : null}
      </span>
    );
  return (
    <>
      <span className="crewlet-person-row__face">{avatar}</span>
      {words}
      {meta ? <span className="crewlet-person-row__meta">{meta}</span> : null}
      {mark === 'toggle' ? (
        <span className="crewlet-person-row__mark" aria-hidden="true">
          {selected ? <CheckGlyph size="sm" /> : <PlusGlyph size="sm" />}
        </span>
      ) : null}
    </>
  );
}

/**
 * A person or an agent as one row of a list: their face with its status,
 * their name (and an Agent label), what they are doing now or their title,
 * and, for a row that adds and takes away, a plus that turns into a check.
 *
 * ONE DESIGN FOR EVERY LIST OF PEOPLE. A picker's suggestions, a member list,
 * a search's people and a composer's @ list are the same row, so a face, a
 * name and a second line sit in the same places in all of them. It is a
 * button by default, and an option (`as="option"`) inside a listbox a text
 * field owns, where focus stays in the field.
 *
 * A ROW THAT TOGGLES SAYS SO: `selected` makes it a pressed button, and its
 * mark changes from a plus to a check, so the state is never colour alone.
 */
export const PersonRow = forwardRef<HTMLButtonElement | HTMLLIElement, PersonRowProps>(function PersonRow(props, ref) {
  if (props.as === 'option') {
    const { as: _as, avatar, name, tag, detail, meta, mark, density = 'default', selected = false, highlighted = false, disabled = false, className, ...rest } = props;
    return (
      <li
        {...rest}
        ref={ref as (el: HTMLLIElement | null) => void}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled || undefined}
        className={cx(
          'crewlet-person-row',
          `crewlet-person-row--${density}`,
          selected && 'is-selected',
          highlighted && 'is-highlighted',
          disabled && 'is-disabled',
          className,
        )}
      >
        <PersonRowBody avatar={avatar} name={name} tag={tag} detail={detail} meta={meta} mark={mark} density={density} selected={selected} />
      </li>
    );
  }
  const { as: _as, avatar, name, tag, detail, meta, mark, density = 'default', selected, onSelect, onClick, className, type = 'button', ...rest } = props;
  return (
    <button
      {...rest}
      ref={ref as (el: HTMLButtonElement | null) => void}
      type={type}
      aria-pressed={selected}
      className={cx('crewlet-person-row', `crewlet-person-row--${density}`, selected && 'is-selected', className)}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelect?.();
      }}
    >
      <PersonRowBody avatar={avatar} name={name} tag={tag} detail={detail} meta={meta} mark={mark} density={density} selected={selected} />
    </button>
  );
});
