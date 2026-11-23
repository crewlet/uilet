import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { Eyebrow } from '../Eyebrow/index.js';
import { InlineCode } from '../InlineCode/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { titleWhenCut } from '../utils/titleIfCut.js';

export interface AssignmentListLabels {
  /** Said before the value a pending row had: "Was". */
  was: string;
  /** The tag on a row whose change is not saved yet. */
  notSaved: string;
}

export const ASSIGNMENT_LIST_LABELS: AssignmentListLabels = {
  was: 'Was',
  notSaved: 'Not saved',
};

/** One subject and what it is assigned: a seat and its model. */
export interface AssignmentRow {
  /** Stable within the list. */
  key: string;
  /** The subject's mark: an avatar, a helper's glyph. */
  icon?: ReactNode;
  /** The subject's name, plain words so a cut one can show them whole. */
  name: string;
  /** Where the name leads, such as the subject's own page: the name becomes a link. */
  href?: string | undefined;
  /** The name's hover text, where the name alone is not the whole story (a handle beside it). */
  nameTitle?: string | undefined;
  /** The control that picks the value: an `AssignmentPicker` (inside a Menu or Popover) or a `Select`. */
  value?: ReactNode;
  /**
   * A value split into parts, each its own picker: a seat whose jobs run on different models.
   * Each line's label sits under the name and its picker in the value column.
   */
  lines?: readonly AssignmentLine[] | undefined;
  /**
   * The row has a change not saved yet: the value it had, said under the name
   * ("Was platform-sonnet-8 · Not saved") and the picker tinted. A string is
   * drawn as a code chip; a node as given.
   */
  was?: ReactNode;
  /** The row's own actions, such as a `Menu`; its column is kept on every row. */
  actions?: ReactNode;
}

/** One part of a split row: "Coding" and its picker. */
export interface AssignmentLine {
  key: string;
  label: string;
  value: ReactNode;
}

export interface AssignmentGroup {
  key: string;
  /** The group's eyebrow: "Helpers", "Seats". */
  label?: ReactNode;
  rows: readonly AssignmentRow[];
}

export interface AssignmentListProps {
  groups: readonly AssignmentGroup[];
  /**
   * The bar under the rows, for the pending changes: "1 change not saved",
   * Discard and the action that reviews them.
   */
  footer?: ReactNode;
  labels?: Partial<AssignmentListLabels> | undefined;
  className?: string | undefined;
}

/**
 * Who is assigned what: a row a subject, its value and picker right after the name rather than at the far edge,
 * names and values cut with their words on hover, and a pending row saying what it was, its picker on the warning tint.
 */
export function AssignmentList({ groups, footer, labels: overrides, className }: AssignmentListProps) {
  const labels = overrides ? { ...ASSIGNMENT_LIST_LABELS, ...overrides } : ASSIGNMENT_LIST_LABELS;
  const id = useId();
  return (
    <div className={cx('crewlet-assignment-list', className)}>
      <div className="crewlet-assignment-list__grid">
      {groups.map((group) => {
        const labelId = `${id}-${group.key}`;
        const labelled = group.label !== undefined && group.label !== null;
        return (
          <section
            key={group.key}
            className="crewlet-assignment-list__group"
            aria-labelledby={labelled ? labelId : undefined}
          >
            {labelled ? (
              <Eyebrow as="div" id={labelId} className="crewlet-assignment-list__label">
                {group.label}
              </Eyebrow>
            ) : null}
            <ul className="crewlet-assignment-list__rows">
              {group.rows.map((row) => (
                <Row key={row.key} row={row} labels={labels} />
              ))}
            </ul>
          </section>
        );
      })}
      </div>
      {footer === undefined || footer === null ? null : <div className="crewlet-assignment-list__footer">{footer}</div>}
    </div>
  );
}

function Row({ row, labels }: { row: AssignmentRow; labels: AssignmentListLabels }) {
  const pending = row.was !== undefined && row.was !== null;
  return (
    <li className={cx('crewlet-assignment-list__row', pending && 'is-pending')}>
      <div className="crewlet-assignment-list__who">
        <span className="crewlet-assignment-list__name">
          {row.icon === undefined || row.icon === null ? null : (
            <span className="crewlet-assignment-list__icon">{row.icon}</span>
          )}
          {row.href === undefined ? (
            <span className="crewlet-assignment-list__words" title={row.nameTitle} onMouseEnter={row.nameTitle ? undefined : titleWhenCut}>
              {row.name}
            </span>
          ) : (
            <a
              className="crewlet-assignment-list__words crewlet-assignment-list__link"
              href={row.href}
              title={row.nameTitle}
              onMouseEnter={row.nameTitle ? undefined : titleWhenCut}
            >
              {row.name}
            </a>
          )}
        </span>
        {pending ? (
          <span className="crewlet-assignment-list__was">
            <span className="crewlet-assignment-list__was-value">
              {labels.was}{' '}
              {typeof row.was === 'string' ? (
                <InlineCode truncate className="crewlet-assignment-list__old" onMouseEnter={titleWhenCut}>
                  {row.was}
                </InlineCode>
              ) : (
                row.was
              )}
            </span>
            <Tag size="xs" variant="warning">
              {labels.notSaved}
            </Tag>
          </span>
        ) : null}
      </div>
      <div className="crewlet-assignment-list__value">{row.value}</div>
      <div className="crewlet-assignment-list__actions">{row.actions}</div>
      {row.lines?.map((line) => (
        <div key={line.key} className="crewlet-assignment-list__line">
          <span className="crewlet-assignment-list__line-label" onMouseEnter={titleWhenCut}>
            {line.label}
          </span>
          <div className="crewlet-assignment-list__value">{line.value}</div>
        </div>
      ))}
    </li>
  );
}

export interface AssignmentPickerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** The value's own name, in the primary ink: "platform-sonnet-8". */
  primary: string;
  /** What it is, quieter, given way first: "Claude Sonnet 4.5". */
  secondary?: string | undefined;
  /** A mark before the value, such as its provider's. */
  icon?: ReactNode;
  /** Tints the picker as a change not saved yet. Inside an `AssignmentList` row with `was` it is tinted already. */
  pending?: boolean | undefined;
}

/**
 * An assignment's value as the button that changes it: its name, what it is and a chevron, cut with the whole value
 * on hover. Spread a `Menu`'s `renderTrigger` props onto it, and give it an `aria-label` naming the row.
 */
export const AssignmentPicker = forwardRef<HTMLButtonElement, AssignmentPickerProps>(function AssignmentPicker(
  { primary, secondary, icon, pending = false, className, type = 'button', title, onMouseEnter, ...rest },
  ref,
) {
  const whole = secondary ? `${primary} · ${secondary}` : primary;
  return (
    <button
      ref={ref}
      type={type}
      title={title}
      className={cx('crewlet-assignment-picker', pending && 'is-pending', className)}
      onMouseEnter={(event) => {
        // The whole value on hover while either part is cut, and no title while both fit.
        if (title === undefined) {
          const parts = event.currentTarget.querySelectorAll<HTMLElement>('.crewlet-assignment-picker__value > span');
          const cut = Array.from(parts).some((part) => part.scrollWidth > part.clientWidth);
          if (cut) event.currentTarget.setAttribute('title', whole);
          else event.currentTarget.removeAttribute('title');
        }
        onMouseEnter?.(event);
      }}
      {...rest}
    >
      <span className="crewlet-assignment-picker__value">
        {icon === undefined || icon === null ? null : (
          <span className="crewlet-assignment-picker__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="crewlet-assignment-picker__primary">{primary}</span>
        {secondary ? <span className="crewlet-assignment-picker__secondary">{secondary}</span> : null}
      </span>
      <ChevronDownGlyph size="sm" className="crewlet-assignment-picker__chevron" />
    </button>
  );
});
