import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import type { DiffSection } from './diff.js';

export interface DiffViewLabels {
  /** The row a dropped run of unchanged lines is drawn as: "12 unchanged lines". */
  skipped: (count: number) => string;
  /** Read in place of the `+` mark on an added line. */
  added: string;
  /** Read in place of the minus mark on a removed line. */
  removed: string;
  /** The region's accessible name when the caller gives none. */
  region: string;
}

export const DIFF_VIEW_LABELS: DiffViewLabels = {
  skipped: (count) => (count === 1 ? '1 unchanged line' : `${count.toLocaleString()} unchanged lines`),
  added: 'Added',
  removed: 'Removed',
  region: 'Line changes',
};

export interface DiffViewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * The lines to draw, grouped into sections with the count of unchanged
   * lines dropped before each: `collapseDiff(diffLines(before, after))`, or
   * sections a host computed some other way.
   */
  sections: readonly DiffSection[];
  labels?: Partial<DiffViewLabels> | undefined;
}

/**
 * A line diff, rendered as the document it is.
 *
 * MONOSPACE AND LINE-NUMBERED on both sides, because the two numbers are what
 * a reader uses to find the paragraph in the version beside it. A skipped run
 * is a row of its own saying how many lines it stands for: a gap silently
 * closed makes a document edited at both ends look like one rewritten in the
 * middle.
 *
 * COLOUR IS NEVER THE ONLY SIGNAL. An added or removed line carries a tint, a
 * drawn mark and a word: the mark is hidden from assistive technology and the
 * word ("Added", "Removed") is read in its place, because a minus sign is
 * announced as anything from "minus" to nothing at all.
 */
export function DiffView({ sections, labels: overrides, className, 'aria-label': ariaLabel, ...rest }: DiffViewProps) {
  const labels: DiffViewLabels = overrides ? { ...DIFF_VIEW_LABELS, ...overrides } : DIFF_VIEW_LABELS;
  return (
    <div {...rest} role="group" aria-label={ariaLabel ?? labels.region} className={cx('crewlet-diff-view', className)}>
      {sections.map((section, s) => (
        // A section has no identity of its own: a diff is computed whole, so
        // its position is what tells two sections apart.
        <div key={s} className="crewlet-diff-view__section">
          {section.skipped > 0 && <div className="crewlet-diff-view__skip">{labels.skipped(section.skipped)}</div>}
          {section.lines.map((line, i) => (
            // THE CLASS NAMES ARE LITERALS, never assembled from the value: a
            // stylesheet gate that cannot see a class cannot tell a rule this
            // file relies on from one nothing uses.
            <div
              key={i}
              className={cx(
                'crewlet-diff-view__line',
                line.kind === 'add' && 'crewlet-diff-view__line--add',
                line.kind === 'remove' && 'crewlet-diff-view__line--remove',
              )}
            >
              <span className="crewlet-diff-view__number" aria-hidden="true">
                {line.before ?? ''}
              </span>
              <span className="crewlet-diff-view__number" aria-hidden="true">
                {line.after ?? ''}
              </span>
              <span className="crewlet-diff-view__mark">
                <span aria-hidden="true">{line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}</span>
                {line.kind === 'add' && <VisuallyHidden>{labels.added}</VisuallyHidden>}
                {line.kind === 'remove' && <VisuallyHidden>{labels.removed}</VisuallyHidden>}
              </span>
              <span className="crewlet-diff-view__text">{line.text || ' '}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export interface DiffSummaryLabels {
  /** Read in place of the drawn counts: "3 lines added, 1 removed". */
  spoken: (added: number, removed: number) => string;
  /** What the counts are measured against: "against version 4". */
  against: (what: string) => string;
}

export const DIFF_SUMMARY_LABELS: DiffSummaryLabels = {
  spoken: (added, removed) =>
    `${added === 1 ? '1 line' : `${added.toLocaleString()} lines`} added, ${removed.toLocaleString()} removed`,
  against: (what) => `against ${what}`,
};

export interface DiffSummaryProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> {
  added: number;
  removed: number;
  /** What the diff is measured against, named the way the reader knows it: "version 4", "rev 12". */
  against?: string | undefined;
  labels?: Partial<DiffSummaryLabels> | undefined;
}

/**
 * The one line above a diff that says how big it is: `+3 −1 against version 4`.
 *
 * The drawn counts are tinted with the same inks as the lines they count, and
 * a sentence is read in their place, so the size of the change never rests on
 * a plus sign and a colour.
 */
export function DiffSummary({ added, removed, against, labels: overrides, className, ...rest }: DiffSummaryProps) {
  const labels: DiffSummaryLabels = overrides ? { ...DIFF_SUMMARY_LABELS, ...overrides } : DIFF_SUMMARY_LABELS;
  return (
    <p {...rest} className={cx('crewlet-diff-summary', className)}>
      <span aria-hidden="true">
        <span className="crewlet-diff-summary__added">+{added.toLocaleString()}</span>{' '}
        <span className="crewlet-diff-summary__removed">{`−${removed.toLocaleString()}`}</span>
      </span>
      <VisuallyHidden>{labels.spoken(added, removed)}</VisuallyHidden>
      {against !== undefined && <> {labels.against(against)}</>}
    </p>
  );
}
