import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  /** Controls visibility. When false the modal renders nothing. */
  open: boolean;
  /** Called when the user requests to close (backdrop click, escape, or X). */
  onClose: () => void;
  /** Title shown in the header. */
  title?: ReactNode;
  /** Optional subtitle line beneath the title. */
  subtitle?: ReactNode;
  /** Footer content (typically Cancel / Confirm buttons). */
  footer?: ReactNode;
  /** Body content. */
  children?: ReactNode;
  /** Max-width preset. Defaults to `sm` (480px). */
  size?: ModalSize;
  /** When true (default), clicking the backdrop closes the modal. */
  closeOnBackdrop?: boolean;
  /** When false, the close X is hidden. */
  showCloseButton?: boolean;
  /** Extra class on the dialog frame. */
  className?: string;
  /** ID hooks for label / description (aria-labelledby / aria-describedby). */
  labelledBy?: string;
  describedBy?: string;
}

export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  size = 'sm',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
  labelledBy,
  describedBy,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  /*
   * Read through a ref so opening does not depend on the identity of
   * onClose. A caller passing an inline arrow, which is the normal way
   * to write one, would otherwise change it on every render: the effect
   * would tear down and re-run per keystroke, returning focus to
   * whatever was focused before the dialog and then to the dialog
   * itself, so typing into a field inside would lose it every
   * character.
   */
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so keyboard users land inside.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const onBackdropMouseDown = () => {
    if (closeOnBackdrop) onClose();
  };

  const stopPropagation = (event: React.MouseEvent) => event.stopPropagation();

  return createPortal(
    <div
      className="crewlet-modal-overlay"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        className={`crewlet-modal crewlet-modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onMouseDown={stopPropagation}
      >
        {(title || subtitle || showCloseButton) && (
          <div className="crewlet-modal__header">
            <div className="crewlet-modal__heading">
              {title ? <h2 className="crewlet-modal__title" id={labelledBy}>{title}</h2> : null}
              {subtitle ? <p className="crewlet-modal__subtitle">{subtitle}</p> : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                className="crewlet-modal__close"
                onClick={onClose}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" aria-hidden>close</span>
              </button>
            ) : null}
          </div>
        )}
        {children !== undefined ? <div className="crewlet-modal__body">{children}</div> : null}
        {footer ? <div className="crewlet-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
};
