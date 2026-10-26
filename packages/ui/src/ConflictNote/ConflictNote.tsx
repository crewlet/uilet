import type { HTMLAttributes, ReactNode } from 'react';
import { CircleAlertGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { cx } from '../utils/cx.js';

export interface ConflictNoteLabels {
  /** The sentence once the host knows who won the race. */
  changedBy: (subject: string, name: string) => string;
  /** The sentence while it does not, or when nobody can be named. */
  changed: (subject: string) => string;
  dismiss: string;
}

export const CONFLICT_NOTE_LABELS: ConflictNoteLabels = {
  changedBy: (subject, name) => `${subject} was changed by ${name} since you opened it. Look again, then retry.`,
  changed: (subject) => `${subject} was changed since you opened it. Look again, then retry.`,
  dismiss: 'Dismiss',
};

export interface ConflictNoteProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> {
  /** What the sentence calls the record the reader tried to change: a key, a title. */
  subject: string;
  /**
   * Who changed it in the meantime, once the host has looked it up. Without
   * it the note says the record changed and names nobody, or says `message`.
   */
  changedBy?: string | undefined;
  /**
   * The sentence to say while nobody can be named, in place of the default:
   * usually the server's own refusal.
   */
  message?: ReactNode;
  /** Takes the note down. Without it the note offers no Dismiss control. */
  onDismiss?: (() => void) | undefined;
  /** Controls beside Dismiss: "Reload", "Keep mine". */
  actions?: ReactNode;
  labels?: Partial<ConflictNoteLabels> | undefined;
}

/**
 * The refusal of a lost race: somebody changed a record between the reader's
 * read and their write, and the write was refused.
 *
 * IT NAMES WHO WON, when the host can say, because "changed by Maya since you
 * opened it" names the person to talk to where "somebody else" names nobody.
 * Until the host knows, it says the record changed, or the server's own
 * sentence.
 *
 * AN ALERT, because it answers a press the reader just made and they need to
 * hear that the change did not land. The glyph is drawn beside the words so
 * the danger ink is never the only carrier.
 */
export function ConflictNote({
  subject,
  changedBy,
  message,
  onDismiss,
  actions,
  labels: overrides,
  className,
  ...rest
}: ConflictNoteProps) {
  const labels: ConflictNoteLabels = overrides ? { ...CONFLICT_NOTE_LABELS, ...overrides } : CONFLICT_NOTE_LABELS;
  const named = changedBy !== undefined && changedBy !== '';
  const sentence = named ? labels.changedBy(subject, changedBy) : (message ?? labels.changed(subject));
  return (
    <div {...rest} role="alert" className={cx('crewlet-conflict-note', className)}>
      <CircleAlertGlyph size="sm" className="crewlet-conflict-note__glyph" />
      {/*
        THE SENTENCE AND ITS CONTROLS WRAP TOGETHER, in the column beside the
        glyph, so on a narrow screen the controls move under the words rather
        than under the glyph, as a Callout's action does.
      */}
      <span className="crewlet-conflict-note__body">
        <span className="crewlet-conflict-note__text">{sentence}</span>
        {(actions !== undefined || onDismiss) && (
          <span className="crewlet-conflict-note__actions">
            {actions}
            {onDismiss && (
              <Button size="small" variant="ghost" onClick={onDismiss}>
                {labels.dismiss}
              </Button>
            )}
          </span>
        )}
      </span>
    </div>
  );
}
