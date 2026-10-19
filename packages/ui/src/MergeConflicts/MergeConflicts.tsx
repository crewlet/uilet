import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../Button/index.js';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { cx } from '../utils/cx.js';

/** Which side of one clash a person keeps. */
export type MergeChoice = 'theirs' | 'mine' | 'both';

/** One passage both edits changed: their lines and the draft's. */
export interface MergeClash {
  theirs: readonly string[];
  mine: readonly string[];
}

export interface MergeConflictsLabels {
  /** The heading, by how many places clash, naming the other side ("revision 4"). */
  heading: (count: number, theirs: string) => string;
  intro: string;
  /** A side's caption over its lines. */
  theirsCaption: (theirs: string) => string;
  mineCaption: string;
  /** What a side shows when it removed the passage. */
  removed: string;
  /** The choice control's name, for place n (from 1). */
  choiceLabel: (place: number) => string;
  choices: Record<MergeChoice, string>;
  apply: string;
  applyBlocked: string;
  cancel: string;
  /** How many places still have no answer. */
  remaining: (count: number) => string;
}

export const MERGE_CONFLICTS_LABELS: MergeConflictsLabels = {
  heading: (count, theirs) =>
    count === 1 ? `You and ${theirs} changed the same lines` : `You and ${theirs} changed the same lines in ${count} places`,
  intro: 'For each conflict, keep their lines, yours or both.',
  theirsCaption: (theirs) => `Theirs · ${theirs}`,
  mineCaption: 'Yours',
  removed: '(removed)',
  choiceLabel: (place) => `Place ${place}: which lines to keep`,
  choices: { theirs: 'Theirs', mine: 'Yours', both: 'Both' },
  apply: 'Apply to my draft',
  applyBlocked: 'Settle every place first.',
  cancel: 'Not now',
  remaining: (count) => (count === 1 ? '1 place still to settle.' : `${count} places still to settle.`),
};

const ORDER: readonly MergeChoice[] = ['theirs', 'mine', 'both'];

export interface MergeConflictsProps {
  /** Every passage both edits changed, in document order. */
  clashes: readonly MergeClash[];
  /** What the other side is called: "revision 4", "version 7". */
  theirs: string;
  /** Called with one choice per clash, in order, once every clash has one. */
  onApply: (choices: MergeChoice[]) => void;
  onCancel: () => void;
  className?: string | undefined;
  labels?: Partial<MergeConflictsLabels> | undefined;
}

/**
 * Settling the passages two edits of one text both changed: each clash shows
 * the other side's lines beside the draft's, and the person keeps theirs,
 * their own or both.
 *
 * NOTHING IS PRE-CHOSEN. A default would be the interface deciding whose
 * sentence survives, so Apply waits for every clash to have an answer. The
 * merge itself (which passages clash, and the text a set of choices makes) is
 * the host's: this draws the decision and reports it.
 *
 * FOCUS MOVES TO THE HEADING when it opens, since it replaces the editor the
 * person was typing in and they need to hear why.
 */
export function MergeConflicts({ clashes, theirs, onApply, onCancel, className, labels: overrides }: MergeConflictsProps) {
  const labels: MergeConflictsLabels = overrides ? { ...MERGE_CONFLICTS_LABELS, ...overrides } : MERGE_CONFLICTS_LABELS;
  const [choices, setChoices] = useState<(MergeChoice | undefined)[]>(() => clashes.map(() => undefined));
  const left = choices.filter((c) => c === undefined).length;
  const heading = useId();
  const first = useRef<HTMLHeadingElement>(null);
  useEffect(() => first.current?.focus(), []);
  const options = ORDER.map((value) => ({ value, label: labels.choices[value] }));
  return (
    <section className={cx('crewlet-merge-conflicts', className)} aria-labelledby={heading}>
      <h2 className="crewlet-merge-conflicts__title" id={heading} ref={first} tabIndex={-1}>
        {labels.heading(clashes.length, theirs)}
      </h2>
      <p className="crewlet-merge-conflicts__note">{labels.intro}</p>
      <ol className="crewlet-merge-conflicts__list">
        {clashes.map((clash, i) => (
          <li key={i} className="crewlet-merge-conflicts__item">
            <div className="crewlet-merge-conflicts__sides">
              <figure className="crewlet-merge-conflicts__side">
                <figcaption>{labels.theirsCaption(theirs)}</figcaption>
                <pre>{clash.theirs.join('\n') || labels.removed}</pre>
              </figure>
              <figure className="crewlet-merge-conflicts__side">
                <figcaption>{labels.mineCaption}</figcaption>
                <pre>{clash.mine.join('\n') || labels.removed}</pre>
              </figure>
            </div>
            <SegmentedControl
              semantics="radio"
              size="sm"
              label={labels.choiceLabel(i + 1)}
              value={choices[i] ?? ''}
              onValueChange={(v) => setChoices(choices.map((c, k) => (k === i ? (v as MergeChoice) : c)))}
              options={options}
            />
          </li>
        ))}
      </ol>
      <div className="crewlet-merge-conflicts__foot">
        <Button
          size="small"
          variant="primary"
          disabledReason={left === 0 ? undefined : labels.applyBlocked}
          onClick={() => onApply(choices as MergeChoice[])}
        >
          {labels.apply}
        </Button>
        <Button size="small" variant="ghost" onClick={onCancel}>
          {labels.cancel}
        </Button>
        {left > 0 && <span className="crewlet-merge-conflicts__note">{labels.remaining(left)}</span>}
      </div>
    </section>
  );
}
