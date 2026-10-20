import { Children, isValidElement, useId, type HTMLAttributes, type ReactNode } from 'react';
import { ClockGlyph } from '@crewlethq/icons/glyphs';
import { RelativeTime, type TimeValue } from '../RelativeTime/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import type { DatasetStatus } from '../WidgetFrame/index.js';

/**
 * Where a dataset's rows come from: the artifact's own datastore, a named read
 * of the engine's domains, a data file of the version, or a calculation over
 * other datasets.
 */
export type DatasetSourceKind = 'store' | 'engine' | 'file' | 'calc';

/** Every source kind, in the order a legend lists them. */
export const DATASET_SOURCE_KINDS: readonly DatasetSourceKind[] = ['store', 'engine', 'file', 'calc'];

export interface DatasetSourceLabels {
  kinds: Record<DatasetSourceKind, string>;
  /** The row count, "12 rows". */
  rows: (count: number) => string;
  live: string;
  asOf: string;
  stale: string;
  loading: string;
  /** The sentence drawn for `refused` or `failed` when the host gave no detail. */
  refused: string;
  failed: string;
  /** Said before the refresh promise to a screen reader: "Refreshes: Every 2 min". */
  refresh: string;
}

const PLURAL = new Intl.PluralRules('en');

const LABELS: DatasetSourceLabels = {
  kinds: { store: 'Datastore', engine: 'Engine', file: 'File', calc: 'Calculated' },
  rows: (count) => `${count.toLocaleString('en')} ${PLURAL.select(count) === 'one' ? 'row' : 'rows'}`,
  live: 'Live',
  asOf: 'As of',
  stale: 'stale',
  loading: 'Loading',
  refused: 'You do not have access to this data.',
  failed: 'This dataset could not be loaded.',
  refresh: 'Refreshes:',
};

export interface DatasetSourceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children' | 'onSelect'> {
  /** The dataset's title, which every figure drawn from it cites. */
  title: string;
  kind: DatasetSourceKind;
  /** What the dataset reads, in the author's terms: "tracker.items, scope mine". */
  definition: ReactNode;
  /** How it is kept current, in words: "Live", "Every 2 min", "On change". */
  refresh?: string | undefined;
  /** When the rows were true. Unset for a live source or one not read yet. */
  asOf?: TimeValue | undefined;
  status: DatasetStatus;
  /** The refusal or failure sentence, for `refused` and `failed`. */
  detail?: string | undefined;
  /** How many rows the reader holds. Unset while loading, refused or failed. */
  rows?: number | undefined;
  /** Whether this entry is the one the host is showing. */
  selected?: boolean | undefined;
  /** Given, the entry is a toggle button that selects it, announced as pressed. */
  onSelect?: (() => void) | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  labels?: Partial<Omit<DatasetSourceLabels, 'kinds'>> & { kinds?: Partial<Record<DatasetSourceKind, string>> };
  /** A preview of the rows, drawn under the entry by the host when it is selected. */
  children?: ReactNode;
}

/**
 * One entry of a dashboard's Sources rail: a dataset's title, where it reads
 * from, what it reads, how it is kept current, and where it stands now.
 *
 * THE PROVENANCE OF EVERY FIGURE IN ONE PLACE. A widget cites its dataset by
 * title; this is what that citation opens: the definition a reader can check,
 * the refresh promise, and "as of" the instant the rows were true, so a
 * number on the board is never a number nobody can trace.
 *
 * SELECTABLE WITHOUT NESTING. With `onSelect` the summary is a toggle button
 * (`aria-pressed`), and the host's rows preview (`children`) is drawn AFTER
 * it, outside it: a table inside a button is invalid markup and unreachable
 * to a screen reader.
 *
 * AN OPEN ENTRY IS ONE CARD. Once its preview is drawn, the entry frames the
 * summary and the preview together, the summary as the card's head, so the
 * figures read as this source's rather than as the next item of the rail.
 *
 * A refusal reads as calmly here as on the figure: the reader may not read
 * the data, which is an ordinary state, so it takes the secondary ink and
 * never an error colour.
 */
export function DatasetSource({
  title,
  kind,
  definition,
  refresh,
  asOf,
  status,
  detail,
  rows,
  selected = false,
  onSelect,
  now,
  labels,
  className,
  children,
  ...rest
}: DatasetSourceProps) {
  const text: DatasetSourceLabels = { ...LABELS, ...labels, kinds: { ...LABELS.kinds, ...labels?.kinds } };
  const titleId = useId();
  const blocked = status === 'refused' || status === 'failed';
  const open = selected && children !== undefined && children !== null && children !== false;

  const state =
    status === 'loading' ? (
      <span className="crewlet-dataset-source__state">{text.loading}</span>
    ) : blocked ? (
      <span className="crewlet-dataset-source__state crewlet-dataset-source__state--blocked">
        {detail ?? (status === 'refused' ? text.refused : text.failed)}
      </span>
    ) : status === 'live' ? (
      <span className="crewlet-dataset-source__state">{text.live}</span>
    ) : asOf !== undefined && asOf !== null ? (
      <span className="crewlet-dataset-source__state">
        {text.asOf} <RelativeTime value={asOf} now={now} />
        {status === 'stale' ? (
          <>
            {' '}
            <span className="crewlet-dataset-source__stale">
              <ClockGlyph size="xs" />
              <VisuallyHidden>{text.stale}</VisuallyHidden>
            </span>
          </>
        ) : null}
      </span>
    ) : null;

  // Separated by real spaces as well as by the layout's gaps, so the
  // button's accessible name reads as words rather than one run-on string.
  const summary = (
    <>
      <span className="crewlet-dataset-source__head">
        <span id={titleId} className="crewlet-dataset-source__title">
          {title}
        </span>{' '}
        <Tag size="xs" appearance="outline" className="crewlet-dataset-source__kind">
          {text.kinds[kind]}
        </Tag>
      </span>{' '}
      <span className="crewlet-dataset-source__definition">{definition}</span>{' '}
      <span className="crewlet-dataset-source__meta">
        {state}
        {rows !== undefined && !blocked && status !== 'loading' ? (
          <>
            {' '}
            <span className="crewlet-dataset-source__rows">{text.rows(rows)}</span>
          </>
        ) : null}
      </span>
      {/* HOW IT IS KEPT CURRENT IS A LINE OF ITS OWN. On the line of facts
          above it, it wrapped under them and began with the separator. */}
      {refresh ? (
        <>
          {' '}
          <span className="crewlet-dataset-source__refresh">
            <VisuallyHidden>{text.refresh} </VisuallyHidden>
            {refresh}
          </span>
        </>
      ) : null}
    </>
  );

  return (
    <div
      {...rest}
      className={cx(
        'crewlet-dataset-source',
        `crewlet-dataset-source--${status}`,
        selected && 'crewlet-dataset-source--selected',
        open && 'crewlet-dataset-source--open',
        className,
      )}
      aria-busy={status === 'loading' || undefined}
    >
      {onSelect ? (
        <button type="button" className="crewlet-dataset-source__summary" aria-pressed={selected} onClick={onSelect}>
          {summary}
        </button>
      ) : (
        <div className="crewlet-dataset-source__summary">{summary}</div>
      )}
      {open ? (
        <div className="crewlet-dataset-source__preview" role="group" aria-labelledby={titleId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export interface DatasetSourceListProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  /** What the list is, for a screen reader: "Sources". */
  label: string;
  /** The entries, each a `DatasetSource`. */
  children: ReactNode;
}

/**
 * A dashboard's Sources rail: every dataset the board draws from, one
 * `DatasetSource` per item, as a real list (`role="list"` is kept explicit
 * because Safari drops a list's role once its markers are styled away).
 */
export function DatasetSourceList({ label, className, children, ...rest }: DatasetSourceListProps) {
  return (
    // Safari drops a list's role once its markers are styled away, so the
    // role is declared and the redundant-role rule silenced for that.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul {...rest} role="list" aria-label={label} className={cx('crewlet-dataset-source-list', className)}>
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <li key={child.key ?? undefined} className="crewlet-dataset-source-list__item">
            {child}
          </li>
        ) : null,
      )}
    </ul>
  );
}
