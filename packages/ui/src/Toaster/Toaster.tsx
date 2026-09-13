import type { CSSProperties, ReactNode } from 'react';

export type ToastVariant = 'info' | 'success' | 'warn' | 'error';

export interface ToastAction {
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Open external href in a new tab. */
  external?: boolean;
}

export interface Toast<TVariant extends string = string> {
  /** Stable id used by the consumer to map dismiss requests. */
  id: string | number;
  /**
   * Variant drives the icon and colour family. `info`, `success`, `warn` and
   * `error` come with a default icon (and, except for `info`, a default
   * title). Any other string, including `'quota'`, has no default icon or
   * title, so pass `icon` and `title`, or `renderBody`. `'quota'` (a usage
   * limit notice) is announced as an alert like `error`, and paints the icon
   * the caller passes with the brand accent.
   */
  variant?: TVariant;
  title?: ReactNode;
  message?: ReactNode;
  /** Milliseconds before auto-dismiss. 0 (or undefined → 0) means sticky. */
  duration?: number;
  /** Bump on dedup-replace to restart the progress bar animation. */
  version?: number;
  /** Standard inline action button. Can also be passed as a full ReactNode for full control. */
  action?: ToastAction | ReactNode;
  /** Optional icon name (Material symbol) or full ReactNode to override the variant icon. */
  icon?: ReactNode;
  /** Replace the standard body with a custom renderer, for a toast shape the standard layout does not cover (for example a limit notice with its own action). */
  renderBody?: (ctx: { onDismiss: () => void; toast: Toast<TVariant> }) => ReactNode;
}

export interface ToasterProps<TVariant extends string = string> {
  toasts: Toast<TVariant>[];
  onDismiss: (id: string | number) => void;
  /** Override how an action with `href` renders, for apps that need a router-aware Link. */
  renderAction?: (action: ToastAction, ctx: { onDismiss: () => void }) => ReactNode;
  /** Override the visible position. Defaults to bottom-right. */
  position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  className?: string;
}

const ICONS: Record<ToastVariant, string> = {
  info: 'info',
  success: 'check_circle',
  warn: 'warning',
  error: 'error',
};

const TITLES: Record<ToastVariant, string | null> = {
  info: null,
  success: 'Success',
  warn: 'Heads up',
  error: 'Something went wrong',
};

const isToastAction = (value: unknown): value is ToastAction => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ('label' in v) && (('onClick' in v) || ('href' in v));
};

interface ToastItemProps<TVariant extends string> {
  toast: Toast<TVariant>;
  onDismiss: () => void;
  renderAction?: ToasterProps<TVariant>['renderAction'];
}

const ToastItem = <TVariant extends string>({ toast, onDismiss, renderAction }: ToastItemProps<TVariant>) => {
  const variant = (toast.variant as ToastVariant) || 'info';
  const knownVariant = (['info', 'success', 'warn', 'error'] as const).includes(variant as ToastVariant);
  const classes = [
    'crewlet-toast',
    `crewlet-toast--${toast.variant ?? 'info'}`,
  ]
    .filter(Boolean)
    .join(' ');

  const role = variant === 'error' || toast.variant === 'quota' ? 'alert' : 'status';

  const icon = toast.icon ?? (knownVariant ? (
    <span className="material-symbols-outlined" aria-hidden>{ICONS[variant as ToastVariant]}</span>
  ) : null);

  const fallbackTitle = knownVariant ? TITLES[variant as ToastVariant] : null;

  const renderStandardAction = (): ReactNode => {
    if (toast.action === undefined || toast.action === null) return null;
    if (!isToastAction(toast.action)) {
      // Caller passed a raw ReactNode; render it as-is.
      return <div className="crewlet-toast__actions">{toast.action as ReactNode}</div>;
    }
    const action = toast.action;
    if (renderAction) {
      const node = renderAction(action, { onDismiss });
      return <div className="crewlet-toast__actions">{node}</div>;
    }
    if (action.href) {
      const isExternal = action.external ?? /^https?:\/\//.test(action.href);
      return (
        <div className="crewlet-toast__actions">
          <a
            className="crewlet-toast__action-link"
            href={action.href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
            onClick={onDismiss}
          >
            {action.label}
          </a>
        </div>
      );
    }
    return (
      <div className="crewlet-toast__actions">
        <button
          type="button"
          className="crewlet-toast__action-btn"
          onClick={() => {
            action.onClick?.();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      </div>
    );
  };

  return (
    <div className={classes} role={role}>
      {toast.renderBody ? (
        toast.renderBody({ onDismiss, toast })
      ) : (
        <>
          {icon ? <span className="crewlet-toast__icon">{icon}</span> : null}
          <div className="crewlet-toast__body">
            {(toast.title || fallbackTitle) ? (
              <div className="crewlet-toast__title">{toast.title || fallbackTitle}</div>
            ) : null}
            {toast.message ? <div className="crewlet-toast__message">{toast.message}</div> : null}
            {renderStandardAction()}
          </div>
        </>
      )}

      <button
        type="button"
        className="crewlet-toast__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined" aria-hidden>close</span>
      </button>

      {toast.duration && toast.duration > 0 ? (
        <div
          key={toast.version ?? 0}
          className="crewlet-toast__progress"
          style={{ animationDuration: `${toast.duration}ms` }}
          onAnimationEnd={onDismiss}
          aria-hidden
        />
      ) : null}
    </div>
  );
};

export const Toaster = <TVariant extends string = string>({
  toasts,
  onDismiss,
  renderAction,
  position = 'bottom-right',
  className = '',
}: ToasterProps<TVariant>) => {
  if (!toasts?.length) return null;

  const style: CSSProperties | undefined = undefined;
  const classes = ['crewlet-toaster', `crewlet-toaster--${position}`, className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      style={style}
    >
      {toasts.map((toast) => (
        <ToastItem<TVariant>
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          renderAction={renderAction}
        />
      ))}
    </div>
  );
};
