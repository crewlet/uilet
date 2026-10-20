import { WandSparklesGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/** One suggested brief. */
export interface PromptStarter {
  /** Stable identity. */
  id: string;
  /** What it asks for, in a few words, as the chip reads: "Weekly spend by team". */
  label: string;
  /** The whole brief it puts in the composer when chosen. */
  prompt: string;
}

export interface PromptStartersProps {
  /** Names the list for assistive technology: "Starting points". */
  label: string;
  starters: readonly PromptStarter[];
  /** Called with the chosen starter; the host puts its prompt in its field. */
  onPick: (starter: PromptStarter) => void;
  /** The starter whose prompt the field holds now, drawn as chosen. */
  picked?: string | null | undefined;
  className?: string | undefined;
}

/**
 * Suggested briefs under a composer: a row of chips that each fill the field
 * with a whole, well-formed request, which the person then edits. A blank
 * field is the hardest place to start a request to an agent, and an example
 * of a good brief teaches the shape of one better than a placeholder can.
 *
 * A CHIP FILLS, IT NEVER SENDS: choosing one puts its prompt in the field and
 * leaves the sending to the person, so nothing is asked of an agent that the
 * person did not read.
 */
export function PromptStarters({ label, starters, onPick, picked, className }: PromptStartersProps) {
  return (
    <ul className={cx('crewlet-prompt-starters', className)} aria-label={label}>
      {starters.map((starter) => (
        <li key={starter.id}>
          <button
            type="button"
            className="crewlet-prompt-starters__chip"
            aria-pressed={picked === undefined ? undefined : picked === starter.id}
            title={starter.prompt}
            onClick={() => onPick(starter)}
          >
            <WandSparklesGlyph size="xs" aria-hidden="true" />
            <span className="crewlet-prompt-starters__label">{starter.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
