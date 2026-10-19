import { useState, type ReactNode } from 'react';
import { ArrowUpDownGlyph, MinusGlyph, PencilGlyph, PlusGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { SlideStage } from '../SlideStage/index.js';
import { cx } from '../utils/cx.js';

/** What happened to one slide between two versions. */
export type SlideChange = 'unchanged' | 'changed' | 'added' | 'removed';

/** One slide of two versions, paired by its id. */
export interface SlideCompareRow {
  key: string;
  /** What a reader calls it: its heading in the newer version, else the older. */
  title: string;
  change: SlideChange;
  /** Its one-based place in the older version; absent for a slide it lacks. */
  fromPosition?: number | undefined;
  /** Its one-based place in the newer version; absent for a slide it lacks. */
  toPosition?: number | undefined;
  /** Whether it moved among the slides both versions hold. */
  moved?: boolean | undefined;
  /** The slide as the older version draws it, at its own size. */
  from?: ReactNode;
  /** The slide as the newer version draws it, at its own size. */
  to?: ReactNode;
}

export interface SlideCompareLabels {
  changed: string;
  added: string;
  removed: string;
  unchanged: string;
  moved: (from: number, to: number) => string;
  missing: (version: string) => string;
  summary: (counts: Record<Exclude<SlideChange, 'unchanged'> | 'moved', number>) => string;
  showUnchanged: (count: number) => string;
  hideUnchanged: string;
  identical: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const SLIDE_COMPARE_LABELS: SlideCompareLabels = {
  changed: 'Changed',
  added: 'Added',
  removed: 'Removed',
  unchanged: 'Unchanged',
  moved: (from, to) => `Moved from ${from} to ${to}`,
  missing: (version) => `Not in ${version}`,
  summary: (c) =>
    [
      c.changed && plural(c.changed, 'slide changed', 'slides changed'),
      c.added && plural(c.added, 'added', 'added'),
      c.removed && plural(c.removed, 'removed', 'removed'),
      c.moved && plural(c.moved, 'moved', 'moved'),
    ]
      .filter(Boolean)
      .join(', ') + '.',
  showUnchanged: (n) => `Show the ${plural(n, 'unchanged slide', 'unchanged slides')}`,
  hideUnchanged: 'Hide the unchanged slides',
  identical: 'The two versions hold the same slides, in the same order.',
};

export interface SlideCompareProps {
  rows: readonly SlideCompareRow[];
  fromLabel: string;
  toLabel: string;
  className?: string | undefined;
  labels?: Partial<SlideCompareLabels> | undefined;
}

const MARKS = {
  changed: PencilGlyph,
  added: PlusGlyph,
  removed: MinusGlyph,
  unchanged: null,
} as const;

/**
 * Two versions of a deck compared slide by slide: each slide's older and newer
 * drawings side by side, paired by its id, with a slide one version lacks in
 * its place and an empty side saying so.
 *
 * SAID IN WORDS, NEVER COLOUR ALONE. Every row names what happened to it
 * (Changed, Added, Removed, Moved from 6 to 7) beside a glyph, and the list
 * opens with the count of each, so a reader hears the comparison before they
 * look at it. Unchanged slides are folded away behind one control, since the
 * question was what changed.
 */
export function SlideCompare({ rows, fromLabel, toLabel, className, labels }: SlideCompareProps) {
  const text = { ...SLIDE_COMPARE_LABELS, ...labels };
  const [showAll, setShowAll] = useState(false);
  const counts = { changed: 0, added: 0, removed: 0, moved: 0 };
  for (const r of rows) {
    if (r.change !== 'unchanged') counts[r.change] += 1;
    if (r.moved) counts.moved += 1;
  }
  const still = rows.filter((r) => r.change === 'unchanged' && !r.moved);
  const shown = showAll ? rows : rows.filter((r) => r.change !== 'unchanged' || r.moved);
  const differs = counts.changed + counts.added + counts.removed + counts.moved > 0;
  return (
    <div className={cx('crewlet-slide-compare', className)}>
      <p className="crewlet-slide-compare__summary">{differs ? text.summary(counts) : text.identical}</p>
      <ol className="crewlet-slide-compare__list">
        {shown.map((row) => {
          const Mark = MARKS[row.change];
          return (
            <li key={row.key} className="crewlet-slide-compare__row" data-change={row.change}>
              <div className="crewlet-slide-compare__head">
                <span className="crewlet-slide-compare__title">
                  {row.toPosition ?? row.fromPosition}. {row.title}
                </span>
                {row.change === 'unchanged' && row.moved ? null : (
                  <span className="crewlet-slide-compare__change">
                    {Mark ? <Mark size="sm" /> : null}
                    {text[row.change]}
                  </span>
                )}
                {row.moved && row.fromPosition !== undefined && row.toPosition !== undefined ? (
                  <span className="crewlet-slide-compare__change">
                    <ArrowUpDownGlyph size="sm" />
                    {text.moved(row.fromPosition, row.toPosition)}
                  </span>
                ) : null}
              </div>
              <div className="crewlet-slide-compare__sides">
                {[
                  { side: 'from', label: fromLabel, node: row.from, at: row.fromPosition },
                  { side: 'to', label: toLabel, node: row.to, at: row.toPosition },
                ].map((s) => (
                  <div key={s.side} className="crewlet-slide-compare__side" data-side={s.side}>
                    {s.node !== undefined && s.node !== null ? (
                      <SlideStage label={`${s.label}, slide ${s.at ?? ''}, ${row.title}`}>{s.node}</SlideStage>
                    ) : (
                      <p className="crewlet-slide-compare__missing">{text.missing(s.label)}</p>
                    )}
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      {still.length > 0 ? (
        <Button size="small" variant="ghost" onClick={() => setShowAll((v) => !v)}>
          {showAll ? text.hideUnchanged : text.showUnchanged(still.length)}
        </Button>
      ) : null}
    </div>
  );
}
