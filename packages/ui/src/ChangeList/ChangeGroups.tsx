import { useId, useState, type ReactNode } from 'react';
import { Button } from '../Button/index.js';
import { cx } from '../utils/cx.js';
import { titleWhenCut } from '../utils/titleIfCut.js';
import { CHANGE_LIST_LABELS, ChangeList, type ChangeListLabels, type ChangeListRow } from './ChangeList.js';

/** One subject's changes: a seat and its jobs, a record and its fields. */
export interface ChangeGroup {
  /** Stable within the groups. */
  key: string;
  subject: ReactNode;
  /** The subject as plain words, listed beside "Show N more" while it is folded. Taken from `subject` when that is a string. */
  subjectText?: string | undefined;
  rows: readonly ChangeListRow[];
}

export interface ChangeGroupsProps {
  groups: readonly ChangeGroup[];
  /** An eyebrow over every group: "What changes". */
  heading?: ReactNode;
  /** Subjects shown before the rest fold behind "Show N more". 3 by default. */
  collapseAfter?: number | undefined;
  /** Rows a subject shows before its own rest fold. All by default. */
  rowsCollapseAfter?: number | undefined;
  labels?: Partial<ChangeListLabels> | undefined;
  className?: string | undefined;
}

export const CHANGE_GROUPS_COLLAPSE_AFTER = 3;

function plain(group: ChangeGroup): string {
  return group.subjectText ?? (typeof group.subject === 'string' ? group.subject : '');
}

/**
 * Changes to several subjects, each said once over its own rows with every value on one line (`ChangeList` with
 * `subject` and `truncate`). Past a few subjects the rest fold behind "Show N more", named beside it.
 */
export function ChangeGroups({
  groups,
  heading,
  collapseAfter = CHANGE_GROUPS_COLLAPSE_AFTER,
  rowsCollapseAfter,
  labels: overrides,
  className,
}: ChangeGroupsProps) {
  const labels = overrides ? { ...CHANGE_LIST_LABELS, ...overrides } : CHANGE_LIST_LABELS;
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const folds = groups.length > collapseAfter + 1;
  const shown = folds && !expanded ? groups.slice(0, collapseAfter) : groups;
  const hiddenNames = folds
    ? groups
        .slice(collapseAfter)
        .map(plain)
        .filter((name) => name !== '')
        .join(', ')
    : '';
  const hasHeading = heading !== undefined && heading !== null;
  return (
    <div
      role="group"
      aria-labelledby={hasHeading ? `${id}-heading` : undefined}
      className={cx('crewlet-change-groups', className)}
    >
      {hasHeading ? (
        <div id={`${id}-heading`} className="crewlet-change-list__heading">
          {heading}
        </div>
      ) : null}
      <div id={`${id}-groups`} className="crewlet-change-groups__list">
        {shown.map((group) => (
          <ChangeList
            key={group.key}
            subject={group.subject}
            rows={group.rows}
            truncate
            collapseAfter={rowsCollapseAfter}
            labels={labels}
          />
        ))}
      </div>
      {folds ? (
        <div className="crewlet-change-groups__more">
          <Button
            variant="ghost"
            size="small"
            flush
            aria-expanded={expanded}
            aria-controls={`${id}-groups`}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? labels.less : labels.more(groups.length - collapseAfter)}
          </Button>
          {expanded || hiddenNames === '' ? null : (
            <span className="crewlet-change-groups__hidden" onMouseEnter={titleWhenCut}>
              {hiddenNames}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
