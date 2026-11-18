import { useId, type ReactNode } from 'react';
import { CheckGlyph } from '@crewlethq/icons/glyphs';
import { DiffView } from '../DiffView/index.js';
import { EmptyState } from '../EmptyState/index.js';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { cx } from '../utils/cx.js';
import { HeadingLevelProvider, headingTag, nextHeadingLevel, useHeadingLevel } from '../utils/headingLevel.js';

/** How two versions are compared: what changed between them, or the versions themselves. */
export type VersionCompareLens = 'changes' | 'versions';

export const VERSION_COMPARE_LENSES = ['changes', 'versions'] as const satisfies readonly VersionCompareLens[];

export interface VersionCompareLabels {
  /** The heading when the host gives no title: "Version 3 and version 5". */
  title: (from: string, to: string) => string;
  /** Names the lens switch. */
  lens: string;
  changes: string;
  versions: string;
  /** The changes region's accessible name. */
  region: (from: string, to: string) => string;
  identicalTitle: string;
  identicalDescription: string;
}

export const VERSION_COMPARE_LABELS: VersionCompareLabels = {
  title: (from, to) => `${from} and ${to}`,
  lens: 'Compare by',
  changes: 'Changes',
  versions: 'Side by side',
  region: (from, to) => `Changes from ${from} to ${to}`,
  identicalTitle: 'Nothing changed',
  identicalDescription: 'The two versions hold the same text.',
};

export interface VersionCompareProps {
  /** The older version, named the way the reader knows it: "Version 3", "rev 12". */
  fromLabel: string;
  /** The newer version. */
  toLabel: string;
  /** The heading. Defaults to naming both versions. */
  title?: ReactNode;
  /** A sentence beside the heading: "What changed between them". */
  description?: ReactNode;
  /** The lens on show. A lens with nothing to draw falls back to the other. */
  lens: VersionCompareLens;
  /** Switches the lens. Without it, or with only one lens to draw, no switch is drawn. */
  onLensChange?: ((lens: VersionCompareLens) => void) | undefined;
  /**
   * The older text, compared line by line with `after` for the changes lens.
   * Leave both out and pass `changes` for a comparison the host draws itself,
   * such as a list of changed files.
   */
  before?: string | undefined;
  after?: string | undefined;
  /** The changes lens, drawn by the host in place of the line diff of `before` and `after`. */
  changes?: ReactNode;
  /** Unchanged lines kept either side of a change in the line diff. Three by default. */
  context?: number | undefined;
  /** The older version, drawn for the versions lens. */
  from?: ReactNode;
  /** The newer version, drawn for the versions lens. With `from` left out it is drawn alone. */
  to?: ReactNode;
  /**
   * The versions lens, drawn by the host in place of the two panes: content
   * compared item by item, where two independent panes could not line the
   * items up (a deck's slides, paired by id, with added and removed ones in
   * place).
   */
  versions?: ReactNode;
  /** A sentence over the versions lens: "Both versions show today's data." */
  note?: ReactNode;
  /** Controls at the end of the head, after the lens switch: "Back to the page". */
  actions?: ReactNode;
  labels?: Partial<VersionCompareLabels> | undefined;
  className?: string | undefined;
}

/**
 * Two versions of a document, compared: what changed between them, or the two
 * drawn side by side.
 *
 * THE OLDER VERSION IS ALWAYS THE "FROM" SIDE and the left pane, whichever the
 * reader picked first, so a comparison reads forward in time. The host orders
 * the two before it hands them over.
 *
 * THE CHANGES LENS IS A [DiffView] of the two texts when the host hands them
 * over, with its counts above it; two identical texts are said in words
 * ("Nothing changed") rather than drawn as a pane of unmarked lines. A comparison that is not two texts, such as the files
 * of two releases, is drawn by the host in `changes`.
 *
 * A LENS THAT CANNOT BE DRAWN IS ABSENT, not offered and then empty: a first
 * version has nothing to compare with, and a sheet has no side by side.
 */
export function VersionCompare({
  fromLabel,
  toLabel,
  title,
  description,
  lens,
  onLensChange,
  before,
  after,
  changes,
  context = 3,
  from,
  to,
  versions,
  note,
  actions,
  labels: overrides,
  className,
}: VersionCompareProps) {
  const labels: VersionCompareLabels = overrides ? { ...VERSION_COMPARE_LABELS, ...overrides } : VERSION_COMPARE_LABELS;
  const headingID = useId();
  const level = useHeadingLevel();
  const Heading = headingTag(level);
  const inner = nextHeadingLevel(level);
  const PaneHeading = headingTag(inner);

  const hostChanges = changes !== undefined && changes !== null;
  const canChanges = hostChanges || (before !== undefined && after !== undefined);
  const hostVersions = versions !== undefined && versions !== null;
  const canVersions =
    hostVersions || (from !== undefined && from !== null) || (to !== undefined && to !== null);
  const shown: VersionCompareLens =
    lens === 'versions' ? (canVersions ? 'versions' : 'changes') : canChanges ? 'changes' : 'versions';

  const panes = [
    { key: 'from', label: fromLabel, node: from },
    { key: 'to', label: toLabel, node: to },
  ].filter((pane) => pane.node !== undefined && pane.node !== null);

  return (
    <section className={cx('crewlet-version-compare', className)} aria-labelledby={headingID}>
      <div className="crewlet-version-compare__head">
        <div className="crewlet-version-compare__titles">
          <Heading className="crewlet-version-compare__title" id={headingID}>
            {title ?? labels.title(fromLabel, toLabel)}
          </Heading>
          {description !== undefined && description !== null && (
            <p className="crewlet-version-compare__description">{description}</p>
          )}
        </div>
        {onLensChange && canChanges && canVersions && (
          <SegmentedControl<VersionCompareLens>
            semantics="radio"
            activate="manual"
            size="sm"
            label={labels.lens}
            value={shown}
            onValueChange={onLensChange}
            options={[
              { value: 'changes', label: labels.changes },
              { value: 'versions', label: labels.versions },
            ]}
          />
        )}
        {actions}
      </div>
      <HeadingLevelProvider level={inner}>
        {shown === 'changes' ? (
          <div className="crewlet-version-compare__changes">
            {hostChanges || before === undefined || after === undefined ? (
              changes
            ) : (
              // Compared only while this lens is on show.
              <DiffView
                before={before}
                after={after}
                context={context}
                against={fromLabel}
                aria-label={labels.region(fromLabel, toLabel)}
                empty={
                  <EmptyState
                    size="compact"
                    icon={<CheckGlyph size="xl" />}
                    title={labels.identicalTitle}
                    description={labels.identicalDescription}
                  />
                }
              />
            )}
          </div>
        ) : (
          <div className="crewlet-version-compare__versions">
            {note !== undefined && note !== null && <p className="crewlet-version-compare__note">{note}</p>}
            {hostVersions ? (
              versions
            ) : (
            <div className="crewlet-version-compare__panes">
              {panes.map((pane) => (
                <div key={pane.key} className="crewlet-version-compare__pane">
                  <PaneHeading className="crewlet-version-compare__pane-title">{pane.label}</PaneHeading>
                  <HeadingLevelProvider level={nextHeadingLevel(inner)}>{pane.node}</HeadingLevelProvider>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </HeadingLevelProvider>
    </section>
  );
}
