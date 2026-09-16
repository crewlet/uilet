import type { ReactNode } from 'react';
import { AddGlyph, ArrowForwardGlyph, DifferenceGlyph, RemoveGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** What happened to one path between two documents. */
export type DiffKind = 'added' | 'removed' | 'changed';

export interface DiffRow {
  kind: DiffKind;
  /** Where in the document, such as `roles.planner.model`. */
  path: ReactNode;
  /** What was there. Read for a removal, and for the left half of a change. */
  from?: ReactNode;
  /** What is there now. Read for an addition, and for the right half. */
  to?: ReactNode;
}

export interface DiffListLabels {
  added: string;
  removed: string;
  changed: string;
  /** Joins the two halves of a change, where the arrow is drawn. */
  to: string;
}

export const DIFF_LIST_LABELS: DiffListLabels = {
  added: 'added',
  removed: 'removed',
  changed: 'changed',
  to: 'to',
};

export interface DiffListProps {
  rows: DiffRow[];
  /** What an empty diff says. Two identical documents are a fact, not a gap. */
  emptyMessage?: ReactNode;
  labels?: Partial<DiffListLabels>;
  className?: string;
}

const GLYPHS = {
  added: AddGlyph,
  removed: RemoveGlyph,
  changed: DifferenceGlyph,
} as const;

/**
 * The difference between two documents, one path per row.
 *
 * COLOUR IS NEVER THE ONLY SIGNAL, and a diff is where that rule is easiest
 * to break: green, red and amber rows read perfectly until somebody cannot
 * tell them apart, which is one reader in twelve. Every row therefore carries
 * its glyph AND its word, the word is in the accessibility tree rather than
 * in a title, and the tint behind it is the third carrier rather than the
 * first.
 *
 * AND THE ARROW IS NOT THE WORD EITHER. A change reads "from this to that";
 * drawn, that is a glyph between two values, and a screen reader is given the
 * word "to" in its place, because an arrow is announced as anything from
 * "right arrow" to nothing at all.
 *
 * Monospace, because what a row holds is a path and two values out of a
 * configuration document, where an aligned column of characters is the whole
 * point and a proportional face makes two nearly-identical values look alike.
 */
export function DiffList({ rows, emptyMessage, labels: overrides, className }: DiffListProps) {
  const labels: DiffListLabels = overrides ? { ...DIFF_LIST_LABELS, ...overrides } : DIFF_LIST_LABELS;

  if (rows.length === 0 && emptyMessage != null) {
    return <p className="crewlet-diff-list__empty">{emptyMessage}</p>;
  }

  return (
    // A list, and said to be one: the markers are off, and WebKit drops the
    // list role with them, so "12 differences" would never be read. The
    // redundant-role rule is silenced for that reason, not obeyed.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" className={cx('crewlet-diff-list', className)}>
      {rows.map((row, index) => {
        const Glyph = GLYPHS[row.kind];
        return (
          <li
            // The path is not unique on its own: a rename is a removal and an
            // addition of two different paths, and a document can carry the
            // same path twice under different parents. The position is what
            // identifies a row in a diff, which is computed whole or not
            // at all.
            key={`${index}:${row.kind}`}
            className={cx('crewlet-diff-list__row', `crewlet-diff-list__row--${row.kind}`)}
          >
            <span className="crewlet-diff-list__mark">
              <Glyph size="sm" />
              <VisuallyHidden>{labels[row.kind]}</VisuallyHidden>
            </span>
            <span className="crewlet-diff-list__path">{row.path}</span>
            <span className="crewlet-diff-list__value">
              {row.kind === 'added' ? (
                row.to
              ) : row.kind === 'removed' ? (
                row.from
              ) : (
                <>
                  <span className="crewlet-diff-list__from">{row.from}</span>
                  <ArrowForwardGlyph className="crewlet-diff-list__arrow" size="sm" />
                  <VisuallyHidden>{labels.to}</VisuallyHidden>
                  <span className="crewlet-diff-list__to">{row.to}</span>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
