import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** Every string the status draws. */
export interface EditingStatusLabels {
  editing: string;
  unsaved: string;
  saving: string;
}

const LABELS: EditingStatusLabels = {
  editing: 'Editing',
  unsaved: 'Unsaved changes',
  saving: 'Saving',
};

export interface EditingStatusProps {
  /** Whether anything differs from what was opened. */
  dirty: boolean;
  /** Whether a save is in flight. */
  saving?: boolean | undefined;
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
export function EditingStatus({ dirty, saving = false, labels, className }: EditingStatusProps) {
  const text = { ...LABELS, ...labels };
  const state = saving ? text.saving : dirty ? text.unsaved : null;
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
