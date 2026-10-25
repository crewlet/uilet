import { formatRelative, toISO, useNow, type TimeValue } from '../RelativeTime/index.js';
import { cx } from '../utils/cx.js';

/** Every string the status draws. */
export interface EditingStatusLabels {
  editing: string;
  unsaved: string;
  saving: string;
  /**
   * The state once the last save landed, followed by how long ago: "Saved",
   * drawn "Saved 2m ago". The word is announced; the time is not.
   */
  saved: string;
}

const LABELS: EditingStatusLabels = {
  editing: 'Editing',
  unsaved: 'Unsaved changes',
  saving: 'Saving',
  saved: 'Saved',
};

export interface EditingStatusProps {
  /** Whether anything differs from what was opened. */
  dirty: boolean;
  /** Whether a save is in flight. */
  saving?: boolean | undefined;
  /**
   * When the last save landed. Given, a status with nothing unsaved and no
   * save in flight says how long ago: a draft that keeps itself, as a setup
   * wizard's does ("Draft · Saved 2 min ago" with `labels.editing` "Draft").
   */
  savedAt?: TimeValue;
  labels?: Partial<EditingStatusLabels> | undefined;
  className?: string | undefined;
}

/**
 * The quiet state a page is in while somebody edits it: "Editing", and a dot
 * with "Unsaved changes" once anything differs from what was opened.
 *
 * It sits in the bar beside Save and Cancel, which are the caller's: what a
 * save sends and what Cancel discards are decisions about the caller's own
 * record. A STATUS, announced politely, so a screen reader hears the change
 * from saved to unsaved without being interrupted. On a narrow bar the words
 * fold away and the dot stays, named by the same words.
 */
export function EditingStatus({ dirty, saving = false, savedAt, labels, className }: EditingStatusProps) {
  const text = { ...LABELS, ...labels };
  const showSaved = !saving && !dirty && savedAt !== undefined && savedAt !== null && toISO(savedAt) !== null;
  const state = saving ? text.saving : dirty ? text.unsaved : showSaved ? text.saved : null;
  return (
    <span className={cx('crewlet-editing-status', dirty && 'crewlet-editing-status--dirty', className)}>
      <span className="crewlet-editing-status__dot" aria-hidden="true" />
      <span className="crewlet-editing-status__text">
        {/*
          THE LIVE REGION HOLDS THE WORDS AND NOTHING THAT TICKS: the label and
          the state, a space between them for the ear (the dot between them is
          the stylesheet's, which nobody reads), so "Draft Saved" is said once
          when the save lands. How long ago follows it outside the region, so
          the minute turning over is shown and never announced.
        */}
        <span role="status" aria-live="polite" className="crewlet-editing-status__live">
          <span className="crewlet-editing-status__label">{text.editing}</span>
          {state ? ' ' : null}
          {state ? <span className="crewlet-editing-status__state">{state}</span> : null}
        </span>
        {showSaved ? (
          <>
            {' '}
            <SavedAgo at={savedAt} />
          </>
        ) : null}
      </span>
    </span>
  );
}

/**
 * How long ago the last save landed, on the shared clock: a component of its
 * own so only a status that shows a time subscribes to the clock.
 */
function SavedAgo({ at }: { at: TimeValue }) {
  const now = useNow();
  const ago = formatRelative(at, now);
  if (ago === null) return null;
  return (
    <time className="crewlet-editing-status__ago" dateTime={toISO(at) ?? undefined}>
      {ago}
    </time>
  );
}
