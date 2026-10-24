import {
  useLayoutEffect,
  useRef,
  type FormEvent,
  type FormHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Button } from '../Button/index.js';
import { EditingStatus, type EditingStatusLabels } from '../EditingStatus/index.js';
import { Kbd } from '../Kbd/index.js';
import { isComposing } from '../Layer/index.js';
import { cx } from '../utils/cx.js';

/** Every string the editor's bar draws. */
export interface InlineEditorLabels {
  save: string;
  cancel: string;
  /** Why Save does nothing while nothing has changed. */
  unchanged: string;
  /** Why Save does nothing while a field refuses its value. */
  invalid: string;
  /** Why Cancel does nothing while the save is in flight. */
  saving: string;
  /** The words after the shortcut's keycap: "to save". */
  shortcut: string;
  status?: Partial<EditingStatusLabels> | undefined;
}

export const INLINE_EDITOR_LABELS: InlineEditorLabels = {
  save: 'Save',
  cancel: 'Cancel',
  unchanged: 'Nothing has changed yet.',
  invalid: 'Fix the highlighted field first.',
  saving: 'Saving. Wait for it to finish.',
  shortcut: 'to save',
};

export interface InlineEditorProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children' | 'aria-label'> {
  /** The form's name, for a reader moving by landmark: "Edit the mission". */
  label: string;
  /** The fields. Their values, and what a save sends, are the caller's. */
  children: ReactNode;
  /** Save was asked for: the button, or Mod+Enter from inside the form. Not called while Save is unavailable. */
  onSave: () => void;
  /** Cancel was asked for: the button, or Escape from inside the form. Not called while saving. */
  onCancel: () => void;
  /** Anything differs from what was opened. Save waits for it, and the bar says so. */
  dirty: boolean;
  /** A save is in flight: Save spins, and neither Save nor Cancel can be pressed again. */
  saving?: boolean | undefined;
  /** A field refuses its value. Save waits for it. */
  invalid?: boolean | undefined;
  /** Why the last save failed, said as an alert above the bar. */
  error?: ReactNode;
  /** A note above the bar that is not an error: a `ConflictNote` once the record moved on. */
  notice?: ReactNode;
  /**
   * Puts the focus in the first field when the editor opens, at the end of
   * what it holds. ON by default, because an editor is opened by a press of
   * Edit, and the reader's next keystroke is meant for the field, not for the
   * button that has gone. Named as `ListInput`'s is.
   */
  focusOnMount?: boolean | undefined;
  /** Draws the Mod+Enter keycap beside Save. ON by default. */
  shortcutHint?: boolean | undefined;
  /** Controls at the start of the bar, after the status: a "Reset to the default" link. */
  secondaryActions?: ReactNode;
  labels?: Partial<InlineEditorLabels> | undefined;
}

/** The first control in `root` that takes typing or a press, in document order. */
function firstField(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    'textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [contenteditable="true"]',
  );
}

/**
 * One record edited where it is read: its fields, then a bar with the editing
 * status at its start and Cancel and Save at its end.
 *
 * WHY IT EXISTS. A page that shows a mission, a list of policies or a goal and
 * lets the reader change it has the same five decisions to make every time,
 * and each one made differently is a page that behaves unlike its neighbour:
 * which keys save and cancel, whether a Save with nothing to save can be
 * pressed, where the failure is said, where the focus goes when the form
 * opens, and what the reader is told while the save is in flight. This is
 * those five, once.
 *
 * IT OWNS NO STATE. The draft, the save call, what happens on a conflict and
 * where the focus goes once the editor closes are the caller's: the record is
 * the caller's, and so is the button that opened the editor, which is the one
 * place the focus belongs when it closes.
 *
 * THE KEYS. Mod+Enter saves from any field (Enter alone belongs to the field:
 * a newline in a paragraph, the next item in a list) and Escape cancels, each
 * only once nothing inside has claimed the key first (an open menu's Escape
 * closes the menu, not the editor) and never in the middle of an input
 * method's composition.
 *
 * SAVE IS NEVER A DEAD BUTTON. While nothing has changed, while a field
 * refuses its value and while a save is in flight it stays reachable and says
 * why it does nothing, rather than being natively disabled, which takes the
 * focus away from the reader who just pressed it.
 */
export function InlineEditor({
  label,
  children,
  onSave,
  onCancel,
  dirty,
  saving = false,
  invalid = false,
  error,
  notice,
  focusOnMount = true,
  shortcutHint = true,
  secondaryActions,
  labels: overrides,
  className,
  onKeyDown,
  ...rest
}: InlineEditorProps) {
  const labels = { ...INLINE_EDITOR_LABELS, ...overrides };
  const form = useRef<HTMLFormElement | null>(null);

  // ONCE, as the editor opens: an editor that took the focus on every render
  // would take it back from the field the reader moved to.
  const focusAtMount = useRef(focusOnMount);
  useLayoutEffect(() => {
    if (!focusAtMount.current || !form.current) return;
    const field = firstField(form.current);
    if (!field) return;
    field.focus();
    // At the END of what is there: the reader opened it to change the words,
    // and a caret at the start of a paragraph is a caret in front of all of it.
    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      const end = field.value.length;
      try {
        field.setSelectionRange(end, end);
      } catch {
        // An input type with no selection (a number, an email) keeps its own.
      }
    }
  }, []);

  const blocked = saving ? labels.saving : invalid ? labels.invalid : !dirty ? labels.unchanged : null;

  const save = () => {
    if (blocked === null) onSave();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save();
  };

  const keys = (event: KeyboardEvent<HTMLFormElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isComposing(event)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!saving) onCancel();
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.altKey) {
      event.preventDefault();
      save();
    }
  };

  return (
    /*
     * THE FORM LISTENS FOR ITS TWO KEYS, as React's own handler rather than a
     * native one, because React's runs after every handler inside it: that is
     * what lets an open menu's Escape close the menu and stop there. A
     * native listener on the form would hear the key first, before anything
     * inside had the chance to claim it.
     */
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <form
      {...rest}
      ref={form}
      aria-label={label}
      aria-busy={saving || undefined}
      noValidate
      className={cx('crewlet-inline-editor', className)}
      onSubmit={submit}
      onKeyDown={keys}
    >
      <div className="crewlet-inline-editor__fields">{children}</div>
      {notice ? <div className="crewlet-inline-editor__notice">{notice}</div> : null}
      {error ? (
        <div className="crewlet-inline-editor__error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="crewlet-inline-editor__bar">
        <span className="crewlet-inline-editor__start">
          <EditingStatus dirty={dirty} saving={saving} labels={labels.status} />
          {secondaryActions}
        </span>
        <span className="crewlet-inline-editor__end">
          {shortcutHint ? (
            <span className="crewlet-inline-editor__hint">
              <Kbd keys={['Mod', 'Enter']} subtle /> {labels.shortcut}
            </span>
          ) : null}
          <Button
            size="small"
            variant="ghost"
            {...(saving ? { disabledReason: labels.saving } : {})}
            onClick={() => {
              if (!saving) onCancel();
            }}
          >
            {labels.cancel}
          </Button>
          <Button
            size="small"
            variant="primary"
            type="submit"
            loading={saving}
            {...(blocked !== null && !saving ? { disabledReason: blocked } : {})}
          >
            {labels.save}
          </Button>
        </span>
      </div>
    </form>
  );
}
