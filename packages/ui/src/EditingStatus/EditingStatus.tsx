import { formatRelative, useNow, type TimeValue } from '../RelativeTime/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** Every string the status draws. */
export interface EditingStatusLabels {
  editing: string;
  unsaved: string;
  saving: string;
  /** Shown once the last save landed, with how long ago: "Saved 2 min ago". */
  saved: (ago: string) => string;
  /**
   * Said in its place: the time is shown and not announced, so a screen
   * reader hears "Saved" when the save lands rather than every minute after.
   */
  savedSpoken: string;
}

const LABELS: EditingStatusLabels = {
  editing: 'Editing',
  unsaved: 'Unsaved changes',
  saving: 'Saving',
  saved: (ago) => `Saved ${ago}`,
  savedSpoken: 'Saved',
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
  const state = saving ? (
    text.saving
  ) : dirty ? (
    text.unsaved
  ) : savedAt !== undefined && savedAt !== null ? (
    <SavedAgo at={savedAt} labels={text} />
  ) : null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cx('crewlet-editing-status', dirty && 'crewlet-editing-status--dirty', className)}
    >
      <span className="crewlet-editing-status__dot" aria-hidden="true" />
      <span className="crewlet-editing-status__label">{text.editing}</span>
      {/*
        * A SEPARATOR FOR THE EAR. The dot between the two words is drawn by
        * the stylesheet, which a live region does not read, so the region
        * said "EditingUnsaved changes" as one word.
        */}
      {state && <VisuallyHidden>, </VisuallyHidden>}
      {state && <span className="crewlet-editing-status__state">{state}</span>}
    </span>
  );
}

/**
 * How long ago the last save landed, on the shared clock. A component of its
 * own so only a status that shows a time subscribes to the clock. The time is
 * hidden from the live region and "Saved" is said instead, so the minute
 * ticking over is never announced.
 */
function SavedAgo({ at, labels }: { at: TimeValue; labels: EditingStatusLabels }) {
  const now = useNow();
  const ago = formatRelative(at, now);
  if (ago === null) return null;
  return (
    <>
      <span aria-hidden="true">{labels.saved(ago)}</span>
      <VisuallyHidden>{labels.savedSpoken}</VisuallyHidden>
    </>
  );
}
