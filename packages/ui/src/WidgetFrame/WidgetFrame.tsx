import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { CircleAlertGlyph, ClockGlyph, LockGlyph } from '@crewlethq/icons/glyphs';
import { RelativeTime, type TimeValue } from '../RelativeTime/index.js';
import { Skeleton } from '../Skeleton/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * Where a figure's data stands.
 *
 * - `loading`: not read yet.
 * - `live`: kept current as it changes (a datastore collection on the socket).
 * - `ready`: read, and true as of `asOf`.
 * - `stale`: read, and older than its source promises; still drawn, and marked.
 * - `refused`: the reader may not read the data behind it. The figure is not
 *   drawn at all, and `detail` says why.
 * - `failed`: the read did not complete. The figure is not drawn, and `detail`
 *   says what happened.
 */
export type DatasetStatus = 'loading' | 'live' | 'ready' | 'stale' | 'refused' | 'failed';

/** What a widget's figure is drawn from, and when it was true. */
export interface WidgetSource {
  /** The dataset's title: what the figure cites. */
  label: string;
  /** When the figure was true. Unset for a live source or one not read yet. */
  asOf?: TimeValue | undefined;
  status: DatasetStatus;
  /** The refusal or failure sentence, for `refused` and `failed`. */
  detail?: string | undefined;
}

export interface WidgetFrameLabels {
  live: string;
  asOf: string;
  stale: string;
  loading: (title: string) => string;
  /** The sentence drawn for `refused` or `failed` when the host gave no detail. */
  refused: string;
  failed: string;
  /** Said before the citation to a screen reader: "Source: Open tasks, as of 2m ago". */
  cite: string;
}

const LABELS: WidgetFrameLabels = {
  live: 'live',
  asOf: 'as of',
  stale: 'stale',
  loading: (title) => `Loading ${title}`,
  refused: 'You do not have access to the data behind this figure.',
  failed: 'This figure could not be loaded.',
  cite: 'Source:',
};

export interface WidgetFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  title: string;
  source: WidgetSource;
  /**
   * Opens the host's Sources rail at this figure's dataset. Given, the
   * citation is a button; without it, plain text.
   */
  onCite?: (() => void) | undefined;
  /** The host's controls for this figure, such as a menu offering CSV and PNG. */
  actions?: ReactNode;
  /** The heading level of the title. Default 3, under a board's own heading. */
  headingLevel?: 2 | 3 | 4 | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  labels?: Partial<WidgetFrameLabels> | undefined;
  children: ReactNode;
}

/**
 * One figure on a dashboard: its title, the figure, and the line that says
 * what it is drawn from and when that was true.
 *
 * EVERY FIGURE CITES ITS SOURCE. A number with no provenance is a number
 * nobody can check, so the citation is part of the frame rather than
 * something a host may forget: the dataset's title, then "live" or "as of" a
 * relative time (the exact instant on hover). With `onCite` the citation is a
 * button that opens the host's Sources rail at that dataset.
 *
 * A REFUSAL IS NOT AN ALARM. A reader who may not read the tracker opening a
 * dashboard that cites it is an ordinary state, so `refused` draws a calm
 * sentence in place of the figure, never an error colour, and draws nothing
 * of the figure itself: a host that passed rows by mistake still shows none.
 * `failed` reads the same way with its own sentence.
 *
 * Sits inside the host's `ArrangeFrame`, which owns the grid, the drag and
 * the resize; this owns what is inside the card.
 */
export function WidgetFrame({
  title,
  source,
  onCite,
  actions,
  headingLevel = 3,
  now,
  labels,
  className,
  children,
  ...rest
}: WidgetFrameProps) {
  const text = { ...LABELS, ...labels };
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;
  const blocked = source.status === 'refused' || source.status === 'failed';

  // The parts are separated by real spaces, not only by the flex gap: an
  // accessible name is the text of the nodes, and spans with nothing between
  // them read as one run-on word ("Source:Spend by seatas of").
  const citation = (
    <>
      <VisuallyHidden>{text.cite}</VisuallyHidden> <span className="crewlet-widget-frame__source">{source.label}</span>
      {source.status === 'live' ? (
        <>
          {' '}
          <span className="crewlet-widget-frame__when">{text.live}</span>
        </>
      ) : source.asOf !== undefined && source.asOf !== null && !blocked ? (
        <>
          {' '}
          <span className="crewlet-widget-frame__when">
            {text.asOf} <RelativeTime value={source.asOf} now={now} />
          </span>
        </>
      ) : null}
      {source.status === 'stale' ? (
        <>
          {' '}
          <span className="crewlet-widget-frame__stale">
            <ClockGlyph size="xs" />
            <VisuallyHidden>{text.stale}</VisuallyHidden>
          </span>
        </>
      ) : null}
    </>
  );

  return (
    <section
      {...rest}
      className={cx('crewlet-widget-frame', `crewlet-widget-frame--${source.status}`, className)}
      aria-labelledby={titleId}
      aria-busy={source.status === 'loading' || undefined}
    >
      <header className="crewlet-widget-frame__head">
        <Heading id={titleId} className="crewlet-widget-frame__title">
          {title}
        </Heading>
        {actions ? <div className="crewlet-widget-frame__actions">{actions}</div> : null}
      </header>
      <div className="crewlet-widget-frame__body">
        {source.status === 'loading' ? (
          <Skeleton variant="text" rows={3} label={text.loading(title)} />
        ) : blocked ? (
          <p className="crewlet-widget-frame__blocked">
            <span className="crewlet-widget-frame__blocked-glyph" aria-hidden>
              {source.status === 'refused' ? <LockGlyph size="sm" /> : <CircleAlertGlyph size="sm" />}
            </span>
            <span>{source.detail ?? (source.status === 'refused' ? text.refused : text.failed)}</span>
          </p>
        ) : (
          children
        )}
      </div>
      <footer className="crewlet-widget-frame__cite">
        {onCite ? (
          <button type="button" className="crewlet-widget-frame__cite-button" onClick={onCite}>
            {citation}
          </button>
        ) : (
          <span className="crewlet-widget-frame__cite-text">{citation}</span>
        )}
      </footer>
    </section>
  );
}
