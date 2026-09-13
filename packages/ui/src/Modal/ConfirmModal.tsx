import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from '../Button/Button.js';
import { Modal, type ModalSize } from './Modal.js';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  message?: ReactNode;
  /** Body content shown below the message (extra context, fields, etc.). */
  children?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** When true, the confirm button uses the danger variant. */
  destructive?: boolean;
  confirmVariant?: ButtonVariant;
  /** Disables the confirm button (e.g. while typing a confirmation phrase). */
  confirmDisabled?: boolean;
  /** Replaces the confirm label with a loading affordance and disables the modal. */
  submitting?: boolean;
  size?: ModalSize;
}

export const ConfirmModal = ({
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
  confirmDisabled = false,
  submitting = false,
  size = 'sm',
}: ConfirmModalProps) => {
  const resolvedVariant: ButtonVariant = confirmVariant ?? (destructive ? 'danger' : 'primary');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      closeOnBackdrop={!submitting}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button
            variant={resolvedVariant}
            onClick={() => { void onConfirm(); }}
            disabled={confirmDisabled || submitting}
          >
            {submitting ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <p className="crewlet-modal__message">{message}</p> : null}
      {children}
    </Modal>
  );
};
