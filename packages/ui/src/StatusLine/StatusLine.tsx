import { Fragment, type ReactNode } from 'react';
import { StatusDot } from '../StatusDot/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

export interface StatusLineProps {
  /** The state's word: "Working", "Needs you", "Away". */
  label: ReactNode;
  /**
   * The state's dot. Left out, the word stands alone in the secondary ink, as
   * a state with no running work (a person's) does, so the two differ without colour.
   */
  tone?: Tone | undefined;
  /** A halo on the dot, for a state still under way. */
  pulse?: boolean | undefined;
  /** Quiet notes after the word, each after a middle dot: "3 waiting", "pausing". */
  notes?: readonly ReactNode[] | undefined;
  /**
   * The state in full (what it does, who waits, why it paused): in the kit
   * Tooltip on the word, and read with the line.
   */
  detail?: ReactNode;
  /**
   * `wrap` (the default) lets the notes take a second line in a narrow cell;
   * `clip` keeps one line and cuts the notes with an ellipsis, as a card caption does.
   */
  overflow?: 'wrap' | 'clip' | undefined;
  className?: string | undefined;
}

/**
 * A state in one calm line: its dot and word, then what else is true of it as
 * quiet notes. It takes the surrounding text size, so a table cell or a card
 * caption sets it.
 */
export function StatusLine({ label, tone, pulse = false, notes = [], detail, overflow = 'wrap', className }: StatusLineProps) {
  const word =
    tone === undefined ? (
      <span className="crewlet-status-line__word">{label}</span>
    ) : (
      <StatusDot tone={tone} pulse={pulse}>
        {label}
      </StatusDot>
    );
  const shown = notes.filter((note) => note !== null && note !== undefined && note !== false && note !== '');
  const described = detail !== undefined && detail !== null && detail !== false && detail !== '';
  return (
    <span
      className={cx('crewlet-status-line', overflow === 'clip' && 'crewlet-status-line--clip', className)}
      data-quiet={tone === undefined ? '' : undefined}
    >
      {described ? (
        <Tooltip content={<span aria-hidden="true">{detail}</span>} placement="top">
          <span className="crewlet-status-line__main">{word}</span>
        </Tooltip>
      ) : (
        <span className="crewlet-status-line__main">{word}</span>
      )}
      {shown.length > 0 && (
        <span className="crewlet-status-line__notes">
          {shown.map((note, at) => (
            // The middle dot is drawn; a reader hears a pause instead.
            <Fragment key={at}>
              <span className="crewlet-status-line__note">
                <span aria-hidden="true">· </span>
                <VisuallyHidden>, </VisuallyHidden>
                {note}
              </span>{' '}
            </Fragment>
          ))}
        </span>
      )}
      {described && <VisuallyHidden>{detail}</VisuallyHidden>}
    </span>
  );
}
