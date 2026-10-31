import {
  forwardRef,
  useCallback,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Button } from '../Button/index.js';
import { cx } from '../utils/cx.js';

/** Why a row is drawn apart from the rest: it names the reader, or the whole room. */
export type ChatMessageHighlight = 'mention';

/** An outbox row: `sending` is drawn faint in place, `failed` carries its own line. */
export type ChatMessagePending = 'sending' | 'failed';

/**
 * Where the toolbar stands. `auto` rests it on the row's first line, over the
 * row above, and inside the row's own head where the scroller's edge would cut
 * it. `inside` always draws it inside the row, for a row with something of the
 * host's own above it that the toolbar must not cover (the head of a card).
 */
export type ChatMessageActionsPlacement = 'auto' | 'inside';

/** The class every message row carries, which the row's keys walk between. */
export const CHAT_MESSAGE_CLASS = 'crewlet-chat-message';

export interface ChatMessageProps extends Omit<HTMLAttributes<HTMLElement>, 'id' | 'children'> {
  /** The message's own id, drawn as `data-message-id` so a host can find the row it opens at. */
  id: string;
  /** Names the row for a screen reader: "Product Manager, 11:02 AM". */
  label: string;
  /** The author's face, drawn in the gutter of a message that starts a run. A button that opens their profile is styled to fit. */
  avatar: ReactNode;
  /** The author's name, usually a button that opens their profile. */
  author: ReactNode;
  /** After the name: a quiet `Tag` naming the seat's kind ("Agent"), a saved flag, the room a mention came from. */
  badges?: ReactNode;
  /** The short time beside the name ("11:40 AM"). */
  time: string;
  /** The full time, shown on hover of either time. */
  timeTitle: string;
  /** The machine-readable time, for the `<time>` elements' `dateTime`. */
  dateTime?: string | undefined;
  /**
   * The time a continuation shows in its gutter, which is a face wide:
   * "11:40" rather than "11:40 AM". `time` by default.
   */
  gutterTime?: string | undefined;
  /** A later message from the same author, close in time to the one before: no face and no head. */
  continuation?: boolean | undefined;
  /** `mention` for a message that names the reader or the whole room: a light warning wash and a bar on its edge. */
  highlight?: ChatMessageHighlight | null | undefined;
  /** An outbox row. See `ChatMessageFailure` for the line a failed one carries. */
  pending?: ChatMessagePending | undefined;
  /** Holds the row's fill and its toolbar in view while one of the toolbar's menus or pickers is open. */
  active?: boolean | undefined;
  /** The row a link, a mention or a search opened at: a wash of the accent that fades out. */
  flash?: boolean | undefined;
  /** The words are being edited in place: the toolbar steps aside. */
  editing?: boolean | undefined;
  /** The hover toolbar, a `MessageActions`. */
  actions?: ReactNode;
  /** Where the toolbar stands, `auto` by default. */
  actionsPlacement?: ChatMessageActionsPlacement | undefined;
  /** Under the words, one stack a step apart: previews, a `ReactionBar`, a `ThreadSummary`, a `ChatMessageFailure`. */
  footer?: ReactNode;
  /** The message's words. */
  children: ReactNode;
}

/** The nearest ancestor that scrolls vertically: the edge a toolbar over the row would be cut by. */
function scrollerOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

/**
 * One message in a transcript: the author's face in a gutter, the name, a
 * quiet label and the time on one head line, the words, and a footer stack
 * under them.
 *
 * A RUN OF MESSAGES IS ONE BLOCK. A `continuation` (the same author again,
 * close in time) draws no face and no head: its gutter holds the time, a
 * face wide, shown while the row is pointed at or focused, on the baseline
 * of the words' first line.
 *
 * THE TOOLBAR RESTS ON THE ROW'S FIRST LINE, over the row above. Laid across
 * the row's top edge, it covered the end of the row's own head, which on a
 * narrow column is the time of the very message it acts on. A row with less
 * room above it than the toolbar needs, at the top of its scroller, would
 * have it cut by the scroller's edge, so that row draws it inside its own
 * head. The room is MEASURED, when the pointer arrives or focus enters: the
 * toolbar's height less the row's own top inset, against the distance to the
 * scroller's top.
 *
 * A TOUCH SCREEN HAS NO HOVER. A tap on the row focuses it (it is focusable,
 * out of the tab order), and a focused row shows its toolbar there, so
 * replying, saving and the More menu are reached by touch as well.
 *
 * THE KEYS. ArrowUp and ArrowDown on a focused row move to the row before and
 * after it in the same log. A host's own `onKeyDown` runs first, and a key it
 * handles (`preventDefault`) is left alone.
 *
 * NO BOLD. The name is the medium weight and everything else on the head the
 * regular one, in the meta step and the tertiary ink.
 */
export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(function ChatMessage(
  {
    id,
    label,
    avatar,
    author,
    badges,
    time,
    timeTitle,
    dateTime,
    gutterTime,
    continuation = false,
    highlight = null,
    pending,
    active = false,
    flash = false,
    editing = false,
    actions,
    actionsPlacement = 'auto',
    footer,
    children,
    className,
    onKeyDown,
    onPointerEnter,
    onFocus,
    ...rest
  },
  ref,
) {
  const tray = editing ? null : actions;
  const hasTray = tray !== null && tray !== undefined && tray !== false;
  const [inside, setInside] = useState(false);

  const measure = useCallback(
    (row: HTMLElement) => {
      if (actionsPlacement !== 'auto') return;
      const bar = row.querySelector<HTMLElement>(':scope > .crewlet-chat-message__actions');
      if (!bar) return;
      const edge = scrollerOf(row)?.getBoundingClientRect().top ?? 0;
      const need = bar.offsetHeight - (Number.parseFloat(getComputedStyle(row).paddingTop) || 0);
      const next = row.getBoundingClientRect().top - edge < need;
      setInside((was) => (was === next ? was : next));
    },
    [actionsPlacement],
  );

  function keys(event: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const row = event.currentTarget;
    const within = row.closest('[role="log"]') ?? row.parentElement;
    if (!within) return;
    const rows = [...within.querySelectorAll<HTMLElement>(`.${CHAT_MESSAGE_CLASS}`)];
    const next = rows[rows.indexOf(row) + (event.key === 'ArrowUp' ? -1 : 1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  return (
    // A row is an article a reader can land on (a tap, a jump, the arrows)
    // and step from, as the items of a feed are: the keys it takes walk
    // between rows, and the pointer only measures where its toolbar stands.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <article
      {...rest}
      ref={ref}
      className={cx(
        CHAT_MESSAGE_CLASS,
        continuation && 'is-continuation',
        highlight && `is-${highlight}`,
        pending && `is-${pending}`,
        active && 'is-active',
        flash && 'is-flash',
        editing && 'is-editing',
        hasTray && (actionsPlacement === 'inside' || inside) && 'has-actions-inside',
        className,
      )}
      aria-label={label}
      data-message-id={id}
      // Focusable but out of the tab order: a tap, a jump to the message and
      // the arrow keys land here, and Tab walks the controls inside.
      tabIndex={-1}
      onKeyDown={keys}
      onPointerEnter={(event: PointerEvent<HTMLElement>) => {
        if (hasTray) measure(event.currentTarget);
        onPointerEnter?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLElement>) => {
        if (hasTray) measure(event.currentTarget);
        onFocus?.(event);
      }}
    >
      <div className="crewlet-chat-message__gutter">
        {continuation ? (
          <time className="crewlet-chat-message__gutter-time" dateTime={dateTime} title={timeTitle}>
            {gutterTime ?? time}
          </time>
        ) : (
          avatar
        )}
      </div>
      <div className="crewlet-chat-message__main">
        {continuation ? null : (
          <div className="crewlet-chat-message__head">
            <span className="crewlet-chat-message__author">{author}</span>
            {badges}
            <time className="crewlet-chat-message__time" dateTime={dateTime} title={timeTitle}>
              {time}
            </time>
          </div>
        )}
        <div className="crewlet-chat-message__body">{children}</div>
        {footer ? <div className="crewlet-chat-message__footer">{footer}</div> : null}
      </div>
      {hasTray ? <div className="crewlet-chat-message__actions">{tray}</div> : null}
    </article>
  );
});

/** The words a failed row's line says. */
export interface ChatMessageFailureLabels {
  /** Leads the line, before the reason. */
  notSent: string;
  retry: string;
  discard: string;
}

export const CHAT_MESSAGE_FAILURE_LABELS: ChatMessageFailureLabels = {
  notSent: 'Not sent.',
  retry: 'Retry',
  discard: 'Discard',
};

export interface ChatMessageFailureProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Why it was not sent, in a sentence: "The engine did not answer." */
  reason?: ReactNode;
  /** Sends it again. */
  onRetry: () => void;
  /** Drops it from the outbox. */
  onDiscard: () => void;
  labels?: Partial<ChatMessageFailureLabels> | undefined;
}

/**
 * The line under a message that was not sent (`pending="failed"`): what
 * happened in the danger ink, then Retry and Discard. It is a status, so a
 * screen reader hears it once when it appears.
 */
export function ChatMessageFailure({ reason, onRetry, onDiscard, labels: overrides, className, ...rest }: ChatMessageFailureProps) {
  const labels = overrides ? { ...CHAT_MESSAGE_FAILURE_LABELS, ...overrides } : CHAT_MESSAGE_FAILURE_LABELS;
  return (
    <div {...rest} className={cx('crewlet-chat-message-failure', className)} role="status">
      <span className="crewlet-chat-message-failure__words">
        {labels.notSent}
        {reason ? <> {reason}</> : null}
      </span>
      <Button size="small" variant="ghost" onClick={onRetry}>
        {labels.retry}
      </Button>
      <Button size="small" variant="ghost" onClick={onDiscard}>
        {labels.discard}
      </Button>
    </div>
  );
}
