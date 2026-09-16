import { useCallback, useId, type ReactNode } from 'react';
import { Button, type ButtonVariant } from '../Button/index.js';
import { given, Modal, type ModalShape, type ModalSize } from './Modal.js';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * The action. It may be asynchronous, and a REJECTION LEAVES THE SURFACE
   * OPEN: closing on a request that failed tells the reader the thing was
   * done. Report the failure from inside it, where the error is.
   */
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  /** The sentence the prompt leads with. */
  message?: ReactNode;
  /** Anything below the message: an acknowledgement checkbox, a phrase to type. */
  children?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /**
   * The action cannot be undone. It takes the danger fill and makes the
   * surface an `alertdialog`, which asks a reader's software to announce the
   * whole prompt at once rather than its name alone.
   */
  destructive?: boolean | undefined;
  confirmVariant?: ButtonVariant | undefined;
  cancelVariant?: ButtonVariant | undefined;
  /** Not yet answerable, such as a confirmation phrase nobody has typed. */
  confirmDisabled?: boolean | undefined;
  /** Why confirming is unavailable. Read out with the button's name. */
  confirmDisabledReason?: string | undefined;
  /**
   * The request is in flight: the confirm button shows it, and Escape, the
   * veil and the close control all stop closing.
   */
  submitting?: boolean | undefined;
  /** Why cancelling and closing are unavailable while the request is in flight. */
  busyReason?: string | undefined;
  /**
   * `prompt`, the default and what a confirmation IS: a title, a sentence and
   * two buttons, with no head band, no glyph and no close control. `framed`
   * is for a confirmation that grew a form inside it, where the bands keep the
   * question apart from the fields answering it.
   */
  shape?: ModalShape | undefined;
  /** Ignored by the prompt shape, which has a width of its own. */
  size?: ModalSize | undefined;
}

/**
 * A prompt that asks one question and takes one answer.
 *
 * IT IS A FORM, with confirm as its submit button, so Enter from anywhere
 * inside answers it. That is not decoration: an acknowledgement checkbox or a
 * phrase to type puts a control between the reader and the button, and Enter
 * is what everybody presses next.
 *
 * WHAT CHANGED FROM 0.2.0, and why each one was wrong:
 *
 * - `submitting` only stopped the veil. Escape and the close control still
 *   abandoned a request whose outcome nobody had seen. It is `dismissable`
 *   now, which is all three.
 * - The confirm label was swapped for the word "Working" while the request
 *   ran, so a screen reader was told the button had been renamed rather than
 *   that it was busy. It is the Button's own `loading` now: the name holds
 *   still and `aria-busy` says what is happening.
 * - `onConfirm` was called with `void`, so a rejection became an unhandled
 *   rejection the browser reported to nobody. It is awaited now.
 * - It was drawn as a full dialog, with a head band, a glyph and a close
 *   control over one sentence, and the close control did what the Cancel two
 *   inches below it did. It is the PROMPT shape now: a title, the sentence
 *   and the two buttons, 420px and centred. `shape="framed"` is the way back
 *   for a confirmation that grew a form inside it.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirmVariant,
  cancelVariant = 'tertiary',
  confirmDisabled = false,
  confirmDisabledReason = 'Complete the confirmation above to continue.',
  submitting = false,
  busyReason = 'Waiting for this to finish.',
  shape = 'prompt',
  size = 'sm',
}: ConfirmModalProps) {
  const messageId = `${useId()}-message`;
  const resolvedConfirm: ButtonVariant = confirmVariant ?? (destructive ? 'danger' : 'primary');
  const blocked = confirmDisabled || submitting;

  const submit = useCallback(() => {
    // The form submits on Enter as well as on the button, so the guard lives
    // here rather than on the button: a soft-disabled button refuses a click
    // and has nothing to say about a key pressed in a field beside it.
    if (blocked) return;
    void (async () => {
      try {
        await onConfirm();
      } catch {
        // Kept open, and deliberately silent: the caller raised the failure
        // where the error is. What this owes the reader is that a prompt for
        // something that did not happen does not close as though it had.
      }
    })();
  }, [blocked, onConfirm]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      shape={shape}
      size={size}
      role={destructive ? 'alertdialog' : 'dialog'}
      /*
       * THE QUESTION DESCRIBES THE PROMPT, which an alertdialog is required to
       * carry: its name says what is being asked about and the description is
       * the consequence, and a reader's software that announces the name alone
       * would offer "Delete this project?" with no "this cannot be undone"
       * behind it.
       */
      describedBy={given(message) ? messageId : undefined}
      dismissable={!submitting}
      closeDisabledReason={busyReason}
      onSubmit={submit}
      stackBody
      footer={
        <>
          <Button
            variant={cancelVariant}
            onClick={onClose}
            disabledReason={submitting ? busyReason : undefined}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={resolvedConfirm}
            loading={submitting}
            disabledReason={confirmDisabled ? confirmDisabledReason : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {given(message) ? (
        <p className="crewlet-modal__message" id={messageId}>
          {message}
        </p>
      ) : null}
      {children}
    </Modal>
  );
}
