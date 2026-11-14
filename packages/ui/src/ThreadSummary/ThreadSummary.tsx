import type { ReactNode } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { AvatarStack, type AvatarStackMember } from '../Avatar/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';

export interface ThreadSummaryLabels {
  /** "1 reply", "4 replies". */
  replies: (count: number) => string;
  /** The replies the reader has not read: "2 new". */
  fresh: (count: number) => string;
  /**
   * When the last reply came, in the line's accessible name, given the
   * caller's words for it: "last reply 12m ago". The line itself shows the
   * caller's words alone ("12m ago"), after the count.
   */
  last: (when: string) => string;
}

/** The repliers' faces, the avatar's smallest step (20px), overlapped on the small control's line. */
export const THREAD_SUMMARY_FACE = 'xs' as const;

export const THREAD_SUMMARY_LABELS: ThreadSummaryLabels = {
  replies: (count) => (count === 1 ? '1 reply' : `${count.toLocaleString()} replies`),
  fresh: (count) => `${count.toLocaleString()} new`,
  last: (when) => `last reply ${when}`,
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
  /** Under the line: the agents writing replies in the thread, as a `WorkingLine`. */
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
 * when the last came: "4 replies · 12m ago". It opens the thread, from
 * anywhere on the line.
 *
 * AS LONG AS WHAT IT SAYS. It hugs its faces and its words, so a room of
 * threads reads as short facts under their messages rather than as a column
 * of bars. Nothing is hidden at rest: under the pointer only the hairline,
 * its ground and the chevron that says it opens come in, and the chevron's
 * place is always laid out, so the line never changes length.
 *
 * OPEN IS A STATE, NOT WORDS. While the thread is open beside the room the
 * line wears the selected surface inside its hairline, and the message it
 * hangs off wears it too; the chevron, which says "opens", is gone. A screen
 * reader hears the state as the button's `aria-expanded`, and its name keeps
 * every fact the line shows: "4 replies, 2 new, last reply 12m ago".
 *
 * Its faces sit on the content edge: the line's inset and edge are taken back
 * outside it.
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
  return (
    <div className={cx('crewlet-thread-summary-wrap', className)}>
      <button
        type="button"
        className={cx('crewlet-thread-summary', open && 'is-open')}
        // Every fact the line shows, once, as words: the time reads as "last
        // reply 12m ago" rather than a bare "12m ago" after the count.
        aria-label={[count, fresh, last ? labels.last(last) : null].filter(Boolean).join(', ')}
        aria-expanded={open}
        onClick={onOpen}
      >
        <AvatarStack members={participants} size={THREAD_SUMMARY_FACE} max={3} decorative />
        <span className="crewlet-thread-summary__count">{count}</span>
        {fresh ? (
          <Tag size="xs" variant="brand">
            {fresh}
          </Tag>
        ) : null}
        {last ? (
          <span className="crewlet-thread-summary__last" aria-hidden="true">
            {last}
          </span>
        ) : null}
        <ChevronRightGlyph size="sm" className="crewlet-thread-summary__chevron" />
      </button>
      {working}
    </div>
  );
}
