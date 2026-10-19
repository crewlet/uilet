import type { HTMLAttributes, ReactNode } from 'react';
import { DatabaseGlyph, PencilGlyph, RotateCcwClockGlyph, ShieldGlyph, UploadGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { PrincipalAvatar, type Principal } from '../Principal/index.js';
import { RelativeTime, type TimeValue } from '../RelativeTime/index.js';
import { Timeline } from '../Timeline/index.js';
import { cx } from '../utils/cx.js';

/**
 * What made a version.
 *
 * A schema or a capability change has a row of its own, because it changes
 * what the page CAN DO rather than what it shows. A restore is a publish of an
 * old version as a new one, never a rewrite of history, so it names the
 * version it brought back.
 */
export type VersionKind = 'publish' | 'restore' | 'schema' | 'capabilities';

export interface VersionItem {
  version: number;
  kind?: VersionKind | undefined;
  /** A name somebody gave this version ("Review draft"). */
  label?: string | undefined;
  /** What changed, in the author's words or the engine's ("Added totals row"). */
  summary?: string | undefined;
  author: Principal;
  at: TimeValue;
  /** Where it came from: a task and a turn, as a link or as words. */
  source?: ReactNode;
  /** For a restore: the version it brought back. */
  restoredFrom?: number | undefined;
}

export interface VersionTimelineLabels {
  list: string;
  version: (version: number) => string;
  latest: string;
  publish: string;
  restore: (from: number | undefined) => string;
  schema: string;
  capabilities: string;
  compare: string;
  /** The compare control's accessible name; it is a toggle, pressed while this version is compared. */
  compareWith: (version: number) => string;
  restoreAction: string;
  restoreVersion: (version: number) => string;
  labelAction: string;
  labelVersion: (version: number) => string;
  /** The line for versions the engine no longer keeps, given the oldest it does. */
  retention: (oldestKept: number) => string;
}

const LABELS: VersionTimelineLabels = {
  list: 'Versions',
  version: (version) => `Version ${version}`,
  latest: 'Latest',
  publish: 'Published',
  restore: (from) => (from === undefined ? 'Restored' : `Restored version ${from}`),
  schema: 'Schema changed',
  capabilities: 'Capabilities changed',
  compare: 'Compare',
  compareWith: (version) => `Compare with version ${version}`,
  restoreAction: 'Restore',
  restoreVersion: (version) => `Restore version ${version}`,
  labelAction: 'Label',
  labelVersion: (version) => `Label version ${version}`,
  retention: (oldestKept) =>
    oldestKept > 2
      ? `Versions 1 to ${oldestKept - 1} are past the retention window and are no longer kept.`
      : 'Version 1 is past the retention window and is no longer kept.',
};

const GLYPHS: Record<VersionKind, ReactNode> = {
  publish: <UploadGlyph size="xs" />,
  restore: <RotateCcwClockGlyph size="xs" />,
  schema: <DatabaseGlyph size="xs" />,
  capabilities: <ShieldGlyph size="xs" />,
};

export interface VersionTimelineProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** Newest first. */
  versions: readonly VersionItem[];
  /** The newest version. The highest one listed when left out. */
  latest?: number | undefined;
  /** The version on show. */
  selected: number;
  /** The version the one on show is compared with, if any. */
  against?: number | undefined;
  onSelect: (version: number) => void;
  /** Compares the version on show with this one; `null` stops comparing. Without it there is no compare control. */
  onCompare?: ((version: number | null) => void) | undefined;
  /** Publishes this version again as a new one. Without it there is no restore control. */
  onRestore?: ((version: number) => void) | undefined;
  /** Names this version. Without it there is no name control. */
  onLabel?: ((version: number) => void) | undefined;
  /** The oldest version the engine still keeps; anything below it is said to be past retention. */
  oldestKept?: number | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  labels?: Partial<VersionTimelineLabels> | undefined;
}

/**
 * An artifact's versions, newest first, with the one on show and the one it is
 * compared with marked.
 *
 * SELECTING IS NOT RESTORING. Choosing a row shows that version; Restore is a
 * separate control, and it publishes the old version as a new one, so nothing
 * a reader does here rewrites history. The newest version offers no Restore,
 * because it is already what everybody sees.
 */
export function VersionTimeline({
  versions,
  latest,
  selected,
  against,
  onSelect,
  onCompare,
  onRestore,
  onLabel,
  oldestKept,
  now,
  labels,
  className,
  ...rest
}: VersionTimelineProps) {
  const text = { ...LABELS, ...labels };
  const newest = latest ?? versions.reduce((high, item) => Math.max(high, item.version), 0);
  const gap = oldestKept !== undefined && oldestKept > 1;

  return (
    <nav {...rest} aria-label={text.list} className={cx('crewlet-version-timeline', className)}>
      <Timeline>
        {versions.map((item) => {
          const kind = item.kind ?? 'publish';
          const current = item.version === selected;
          const compared = item.version === against;
          const what = kind === 'restore' ? text.restore(item.restoredFrom) : text[kind];
          return (
            <Timeline.Item
              key={item.version}
              marker={GLYPHS[kind]}
              // The row's own button says the version, so the ledger's hidden
              // label would read it twice.
              label={false}
              className={cx(current && 'is-current', compared && 'is-compared')}
            >
              <button
                type="button"
                className="crewlet-version-timeline__select"
                aria-current={current || undefined}
                onClick={() => onSelect(item.version)}
              >
                <span className="crewlet-version-timeline__head">
                  <span className="crewlet-version-timeline__number">{text.version(item.version)}</span>
                  {item.version === newest ? <span className="crewlet-version-timeline__latest">{text.latest}</span> : null}
                  {item.label ? <span className="crewlet-version-timeline__label">{item.label}</span> : null}
                </span>
                {item.summary ? <span className="crewlet-version-timeline__summary">{item.summary}</span> : null}
              </button>
              <span className="crewlet-version-timeline__meta">
                <PrincipalAvatar principal={item.author} size="xs" />
                <span>{item.author.name}</span>
                <span aria-hidden>·</span>
                <RelativeTime value={item.at} now={now} />
                {/* WHAT MADE IT is a fact about the version, read at the meta
                    step beside who and when, so "Published" never competes
                    with the version number it qualifies. */}
                <span aria-hidden>·</span>
                <span className="crewlet-version-timeline__kind">{what}</span>
              </span>
              {item.source ? <span className="crewlet-version-timeline__source">{item.source}</span> : null}
              {onCompare || onRestore || onLabel ? (
                <span className="crewlet-version-timeline__actions">
                  {onCompare && !current ? (
                    <Button
                      size="small"
                      variant="ghost"
                      pressed={compared}
                      aria-label={text.compareWith(item.version)}
                      onClick={() => onCompare(compared ? null : item.version)}
                    >
                      {text.compare}
                    </Button>
                  ) : null}
                  {onRestore && item.version !== newest ? (
                    <Button
                      size="small"
                      variant="ghost"
                      leadingIcon={<RotateCcwClockGlyph />}
                      aria-label={text.restoreVersion(item.version)}
                      onClick={() => onRestore(item.version)}
                    >
                      {text.restoreAction}
                    </Button>
                  ) : null}
                  {onLabel ? (
                    <Button
                      size="small"
                      variant="ghost"
                      leadingIcon={<PencilGlyph />}
                      aria-label={text.labelVersion(item.version)}
                      onClick={() => onLabel(item.version)}
                    >
                      {text.labelAction}
                    </Button>
                  ) : null}
                </span>
              ) : null}
            </Timeline.Item>
          );
        })}
      </Timeline>
      {gap ? <p className="crewlet-version-timeline__gap">{text.retention(oldestKept)}</p> : null}
    </nav>
  );
}
