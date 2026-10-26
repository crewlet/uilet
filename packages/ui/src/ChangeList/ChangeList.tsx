import { useId, type ReactNode } from 'react';
import { ArrowRightGlyph } from '@crewlethq/icons/glyphs';
import { DiffList, type DiffListLabels, type DiffRow } from '../DiffList/index.js';
import { Disclosure } from '../Disclosure/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** One run of a word diff: unchanged (`=`), added (`+`) or removed (`-`). */
export interface WordDiffPart {
  op: '=' | '+' | '-';
  text: string;
}

interface RowBase {
  /** What the field is called: "Status", "Assignee". */
  label: string;
  /** A consequence under the value, in the smallest tertiary type: "No open task matches this title". Never the current value, which the pair shows. */
  note?: ReactNode;
}

/**
 * A value that is more than a line: a list (`ChangeListItems`), a page of
 * text, a preview. It takes the row's whole width under its label, and its
 * tint is a block rather than a highlight, because a list or paragraphs drawn
 * inside a highlighted run of words read as one run-on line.
 */
interface BlockValue {
  block?: boolean | undefined;
}

/** A fact that does not change, such as the page being edited. */
export interface ChangeListFactRow extends RowBase, BlockValue {
  kind: 'fact';
  value: ReactNode;
}

/** A value that changes from one thing to another. */
export interface ChangeListChangedRow extends RowBase, BlockValue {
  kind: 'changed';
  from: ReactNode;
  to: ReactNode;
}

/** A value set where there was none. */
export interface ChangeListAddedRow extends RowBase, BlockValue {
  kind: 'added';
  to: ReactNode;
  /**
   * Marks the value with a small "New" tag, for a field added to a record
   * that already exists. Left off on a create, where every field is new and
   * the list's heading already says so.
   */
  isNew?: boolean | undefined;
}

/** A value taken away. */
export interface ChangeListRemovedRow extends RowBase, BlockValue {
  kind: 'removed';
  from: ReactNode;
}

/** Long text that changes (a page section, a comment), as a word diff. */
export interface ChangeListTextRow extends RowBase {
  kind: 'text';
  words: readonly WordDiffPart[];
  /** The same change, path by path, opened under "Show the whole change" as a `DiffList`. */
  whole?: readonly DiffRow[] | undefined;
  /** Unchanged runs longer than this many characters are shortened with an ellipsis. 80 by default. */
  collapseOver?: number | undefined;
}

export type ChangeListRow =
  | ChangeListFactRow
  | ChangeListChangedRow
  | ChangeListAddedRow
  | ChangeListRemovedRow
  | ChangeListTextRow;

export interface ChangeListLabels {
  /** Said before the old value of a change: "Changed from Any open status to Blocked". */
  changedFrom: string;
  /** Said where the arrow is drawn. */
  to: string;
  /** Said before a value set where there was none. */
  added: string;
  /** Said before a value taken away. */
  removed: string;
  /** The small tag on a field new to an existing record. */
  isNew: string;
  /** Said before each added run of a word diff, with its own punctuation: "added:". */
  addedWords: string;
  /** Said before each removed run of a word diff, with its own punctuation: "removed:". */
  removedWords: string;
  /** Said between two changed runs that touch, so neither reads into the other: ";". */
  betweenChanges: string;
  /** The disclosure that opens the whole change. */
  showWhole: string;
}

export const CHANGE_LIST_LABELS: ChangeListLabels = {
  changedFrom: 'Changed from',
  to: 'to',
  added: 'Added:',
  removed: 'Removed:',
  isNew: 'New',
  addedWords: 'added:',
  removedWords: 'removed:',
  betweenChanges: ';',
  showWhole: 'Show the whole change',
};

export interface ChangeListProps {
  rows: readonly ChangeListRow[];
  /** The eyebrow over the rows: "What will change", "What will be created", "What changed". */
  heading?: ReactNode;
  /**
   * The change is over (applied, declined, expired). The values step back to
   * the secondary ink; the tints stay, so the record of what changed is still
   * there to read.
   */
  settled?: boolean | undefined;
  labels?: Partial<ChangeListLabels> | undefined;
  /** Words for the `DiffList` behind "Show the whole change". */
  diffLabels?: Partial<DiffListLabels> | undefined;
  className?: string | undefined;
}

/** The longest run of unchanged words kept whole in a word diff. */
export const CHANGE_LIST_COLLAPSE_OVER = 80;

const ELLIPSIS = '…';

/**
 * An unchanged run of a word diff, shortened when it is long. The run before
 * the first change keeps its end, the run after the last keeps its start, and
 * a run between two changes keeps both, cut at word boundaries, because what a
 * reader needs from unchanged text is the words that touch the change.
 */
export function shortenUnchanged(text: string, place: 'first' | 'middle' | 'last', max = CHANGE_LIST_COLLAPSE_OVER): string {
  if (text.length <= max) return text;
  const keep = place === 'middle' ? Math.floor(max / 2) : max;
  const words = text.trim();
  const head = () => {
    const cut = words.slice(0, keep);
    const space = cut.lastIndexOf(' ');
    return (space > 0 ? cut.slice(0, space) : cut).trim();
  };
  const tail = () => {
    const cut = words.slice(Math.max(0, words.length - keep));
    const space = cut.indexOf(' ');
    return (space >= 0 ? cut.slice(space + 1) : cut).trim();
  };
  // The spaces that touched the change are kept, so the words stay apart.
  const lead = /^\s/.test(text) ? ' ' : '';
  const trail = /\s$/.test(text) ? ' ' : '';
  if (place === 'first') return `${ELLIPSIS} ${tail()}${trail}`;
  if (place === 'last') return `${lead}${head()} ${ELLIPSIS}`;
  return `${lead}${head()} ${ELLIPSIS} ${tail()}${trail}`;
}

function WordDiff({ row, labels }: { row: ChangeListTextRow; labels: ChangeListLabels }) {
  const max = row.collapseOver ?? CHANGE_LIST_COLLAPSE_OVER;
  const changes = row.words.map((part, index) => (part.op === '=' ? -1 : index)).filter((index) => index >= 0);
  const firstChange = changes[0] ?? Number.POSITIVE_INFINITY;
  const lastChange = changes[changes.length - 1] ?? Number.NEGATIVE_INFINITY;
  return (
    <p className="crewlet-change-list__words">
      {row.words.map((part, index) => {
        if (part.op === '+' || part.op === '-') {
          const Mark = part.op === '+' ? 'ins' : 'del';
          // TWO CHANGED RUNS THAT TOUCH are drawn apart by their tints and
          // said apart by a separator nobody sees, so "relationship. test"
          // removed and "relationship." added never read as one word.
          const touches = row.words[index + 1] !== undefined && row.words[index + 1]!.op !== '=';
          return (
            <Mark
              key={index}
              className={part.op === '+' ? 'crewlet-change-list__inserted' : 'crewlet-change-list__deleted'}
            >
              <VisuallyHidden>{`${part.op === '+' ? labels.addedWords : labels.removedWords} `}</VisuallyHidden>
              {part.text}
              {touches ? <VisuallyHidden>{`${labels.betweenChanges} `}</VisuallyHidden> : null}
            </Mark>
          );
        }
        const place = index < firstChange ? 'first' : index > lastChange ? 'last' : 'middle';
        return <span key={index}>{shortenUnchanged(part.text, place, max)}</span>;
      })}
    </p>
  );
}

/**
 * A list value, one item a line: what a block row holds for a field that is a
 * list (a seat's responsibilities, a voice's rules), rather than its items
 * joined into one line.
 */
export function ChangeListItems({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="crewlet-change-list__items">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** A block value: the same words and tints as a line's, stacked across the row. */
function BlockValue({ row, labels }: { row: Exclude<ChangeListRow, ChangeListTextRow>; labels: ChangeListLabels }) {
  switch (row.kind) {
    case 'fact':
      return <div className="crewlet-change-list__fact crewlet-change-list__block crewlet-change-list__block--plain">{row.value}</div>;
    case 'changed':
      return (
        <>
          <del className="crewlet-change-list__from crewlet-change-list__block">
            <VisuallyHidden>{`${labels.changedFrom} `}</VisuallyHidden>
            {row.from}
          </del>
          <ins className="crewlet-change-list__to crewlet-change-list__block">
            <VisuallyHidden>{`${labels.to} `}</VisuallyHidden>
            {row.to}
          </ins>
        </>
      );
    case 'added':
      return (
        <>
          {row.isNew ? (
            <Tag size="xs" variant="success">
              {labels.isNew}
            </Tag>
          ) : null}
          <ins className="crewlet-change-list__to crewlet-change-list__block">
            <VisuallyHidden>{`${labels.added} `}</VisuallyHidden>
            {row.to}
          </ins>
        </>
      );
    case 'removed':
      return (
        <del className="crewlet-change-list__removed crewlet-change-list__block">
          <VisuallyHidden>{`${labels.removed} `}</VisuallyHidden>
          {row.from}
        </del>
      );
  }
}

function Value({ row, labels }: { row: Exclude<ChangeListRow, ChangeListTextRow>; labels: ChangeListLabels }) {
  if (row.block) return <BlockValue row={row} labels={labels} />;
  switch (row.kind) {
    case 'fact':
      return <span className="crewlet-change-list__fact">{row.value}</span>;
    case 'changed':
      return (
        <span className="crewlet-change-list__pair">
          <VisuallyHidden>{`${labels.changedFrom} `}</VisuallyHidden>
          <del className="crewlet-change-list__from">{row.from}</del>
          {/* The arrow and the new value wrap together, under the old value on a narrow card. */}
          <span className="crewlet-change-list__next">
            <ArrowRightGlyph size="sm" className="crewlet-change-list__arrow" />
            <VisuallyHidden>{` ${labels.to} `}</VisuallyHidden>
            <ins className="crewlet-change-list__to">{row.to}</ins>
          </span>
        </span>
      );
    case 'added':
      return (
        <span className="crewlet-change-list__pair">
          <ins className="crewlet-change-list__to">
            <VisuallyHidden>{`${labels.added} `}</VisuallyHidden>
            {row.to}
          </ins>
          {row.isNew ? (
            <Tag size="xs" variant="success">
              {labels.isNew}
            </Tag>
          ) : null}
        </span>
      );
    case 'removed':
      return (
        <del className="crewlet-change-list__removed">
          <VisuallyHidden>{`${labels.removed} `}</VisuallyHidden>
          {row.from}
        </del>
      );
  }
}

/**
 * What a change will do, field by field, as a before and after.
 *
 * THE CHANGE IS THE THING SCANNED. A changed field shows its old value struck
 * through, an arrow and its new value on the added tint; an added one its new
 * value on that tint; a removed one its old value struck through on the
 * removed tint; long text a word diff with "Show the whole change" opening
 * the path-by-path `DiffList`. These are `DiffList`'s tones and grammar, so a
 * change a person approves looks like every other diff in the product.
 *
 * THE ARROW IS NEVER THE ONLY WORD: a pair is said "Changed from Any open
 * status to Blocked", and every added or removed value says so before it. The
 * old value is struck through in the tertiary ink and the new one carries the
 * weight, so the eye lands on what the field will hold.
 *
 * A DESCRIPTION LIST on `PropertyList`'s grid: the labels in one column, the
 * values in the other, rows apart by the list's spacing rather than rules,
 * and no box of its own inside the card that holds it.
 */
export function ChangeList({ rows, heading, settled = false, labels: overrides, diffLabels, className }: ChangeListProps) {
  const labels = overrides ? { ...CHANGE_LIST_LABELS, ...overrides } : CHANGE_LIST_LABELS;
  const headingId = useId();
  return (
    <div className={cx('crewlet-change-list', settled && 'crewlet-change-list--settled', className)}>
      {heading === undefined || heading === null ? null : (
        <div id={headingId} className="crewlet-change-list__heading">
          {heading}
        </div>
      )}
      <dl className="crewlet-change-list__rows" aria-labelledby={heading === undefined || heading === null ? undefined : headingId}>
        {rows.map((row, index) => (
          <div
            // A label is unique within a change in practice, but two rows of one
            // field (removed and added) are not impossible, so the position
            // completes the key.
            key={`${index}:${row.label}`}
            className={cx(
              'crewlet-change-list__row',
              `crewlet-change-list__row--${row.kind}`,
              row.kind !== 'text' && row.block && 'crewlet-change-list__row--block',
            )}
          >
            <dt className="crewlet-change-list__label">{row.label}</dt>
            <dd className="crewlet-change-list__value">
              {row.kind === 'text' ? (
                <>
                  <WordDiff row={row} labels={labels} />
                  {row.whole && row.whole.length > 0 ? (
                    <Disclosure title={labels.showWhole} headingLevel="none" size="compact" className="crewlet-change-list__whole">
                      <DiffList rows={[...row.whole]} layout="auto" labels={diffLabels} />
                    </Disclosure>
                  ) : null}
                </>
              ) : (
                <Value row={row} labels={labels} />
              )}
              {row.note === undefined || row.note === null ? null : (
                <span className="crewlet-change-list__note">{row.note}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
