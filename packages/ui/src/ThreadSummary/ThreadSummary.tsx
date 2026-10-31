import type { ReactNode } from 'react';
import { AvatarStack, type AvatarStackMember } from '../Avatar/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';

export interface ThreadSummaryLabels {
  /** "1 reply", "4 replies". */
  replies: (count: number) => string;
  /** The replies the reader has not read: "2 new". */
  fresh: (count: number) => string;
  /** When the last reply came, given the caller's words for it: "Last reply 12m ago". */
  last: (when: string) => string;
  /** Shown in place of the last reply's time under the pointer. */
  view: string;
  /** Shown in its place while the thread is open beside the room. */
  open: string;
}

export const THREAD_SUMMARY_LABELS: ThreadSummaryLabels = {
  replies: (count) => (count === 1 ? '1 reply' : `${count.toLocaleString()} replies`),
  fresh: (count) => `${count.toLocaleString()} new`,
  last: (when) => `Last reply ${when}`,
  view: 'View thread',
  open: 'Thread open',
};

export interface ThreadSummaryProps {
  /** How many replies the thread holds. */
  replies: number;
  /** Who replied, each once, as faces: at most three are drawn. */
  participants: readonly AvatarStackMember[];
  /** When the last reply came, in the caller's words: "12m ago". */
  last: string;
  /** Replies the reader has not read; none by default. */
  unread?: number | undefined;
  /** Under the line: an agent writing a reply in the thread, as a `ThinkingIndicator`. */
  working?: ReactNode;
  /** The thread is open beside the room (`aria-expanded`). */
  open?: boolean | undefined;
  onOpen: () => void;
  labels?: Partial<ThreadSummaryLabels> | undefined;
  className?: string | undefined;
}

/**
 * The line under a message that has replies: the repliers' faces, "4
 * replies" at the medium weight in the accent's ink, how many are new, and
 * when the last one came. It opens the thread.
 *
 * UNDER THE POINTER OR THE KEYBOARD it is lifted onto the transcript's own
 * ground inside a hairline, and "View thread" takes the place of the last
 * reply's time in the same cell, so the line keeps its width. Its faces sit
 * on the content edge: the line's inset and edge are taken back outside it.
 */
export function ThreadSummary({
  replies,
  participants,
  last,
  unread = 0,
  working,
  open = false,
  onOpen,
  labels: overrides,
  className,
}: ThreadSummaryProps) {
  const labels = overrides ? { ...THREAD_SUMMARY_LABELS, ...overrides } : THREAD_SUMMARY_LABELS;
  const count = labels.replies(replies);
  const fresh = unread > 0 ? labels.fresh(unread) : null;
  const when = labels.last(last);
  return (
    <div className={cx('crewlet-thread-summary-wrap', className)}>
      <button
        type="button"
        className={cx('crewlet-thread-summary', open && 'is-open')}
        // The words a reader sees, once: the cell that swaps the time for
        // "View thread" would otherwise name the button differently under the
        // pointer than at rest.
        aria-label={[count, fresh, when].filter(Boolean).join(', ')}
        aria-expanded={open}
        onClick={onOpen}
      >
        <AvatarStack members={participants} size="xs" max={3} decorative />
        <span className="crewlet-thread-summary__count">{count}</span>
        {fresh ? (
          <Tag size="xs" variant="brand">
            {fresh}
          </Tag>
        ) : null}
        <span className="crewlet-thread-summary__tail" aria-hidden="true">
          <span className="crewlet-thread-summary__last">{when}</span>
          <span className="crewlet-thread-summary__view">{open ? labels.open : labels.view}</span>
        </span>
      </button>
      {working}
    </div>
  );
}
