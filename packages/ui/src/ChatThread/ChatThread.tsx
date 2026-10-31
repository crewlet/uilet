import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { ArrowDownGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { REDUCED_MOTION_QUERY, useMediaMatch } from '../MediaMatch/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** How close to the end, in pixels, still counts as reading the latest. */
export const CHAT_THREAD_FOLLOW_WITHIN = 48;

export interface ChatThreadLabels {
  /** The pill that returns to the end. */
  jumpToLatest: string;
  /** Said after it with how many items arrived since the reader scrolled away. */
  newItems: (count: number) => string;
}

export const CHAT_THREAD_LABELS: ChatThreadLabels = {
  jumpToLatest: 'Jump to latest',
  newItems: (count) => (count === 1 ? '1 new item' : `${count.toLocaleString()} new items`),
};

/** What a host can ask of the thread. */
export interface ChatThreadHandle {
  /** Scrolls to the end and follows it again. */
  scrollToLatest: () => void;
  /**
   * Brings an item into view in the MIDDLE of the log, with what came before
   * and after it in sight: a message opened from a link, a mention or a
   * search, or a card that needs a decision. An item taller than the view
   * lands with its head at the top instead, never past it, so its actions are
   * reached by reading rather than skipped over. The item's own
   * `scroll-margin-top` and `scroll-margin-bottom` are kept clear, so an item
   * that names the height of a pinned day pill stops under it. The Jump to
   * latest row the move brings in is accounted for: the item is placed in the
   * view that is left once the row stands under the log.
   */
  reveal: (element: HTMLElement) => void;
  /**
   * The scrolling element, for a host that measures or moves what is inside
   * it (a windowed transcript, or one that keeps its place while an older
   * page is added above). Null before the log has mounted.
   */
  scroller: () => HTMLDivElement | null;
}

/** Where a short transcript rests in its view: under the top, or on the foot. */
export type ChatThreadRest = 'start' | 'end';

export interface ChatThreadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
  /** Names the log for a screen reader: "Conversation". */
  label: string;
  /** A request is running: the log is `aria-busy` until it settles. */
  busy?: boolean | undefined;
  /**
   * Keeps the end in view while the reader is at it (within 48px). `true` by
   * default; `false` never moves the scroll on its own.
   */
  follow?: boolean | undefined;
  /**
   * Draws the Jump to latest row under the log while the reader is scrolled
   * away from the end. `true` by default; `false` for a log that offers its
   * own way back (a day's Jump to menu), so nothing is added under it.
   */
  jump?: boolean | undefined;
  /**
   * Where a transcript shorter than the view rests: `start` (the default)
   * under the top, or `end`, on the foot, against the composer under it, as a
   * conversation's newest messages always are. The items keep no gap of their
   * own in `end`, since a conversation's rows set their own spacing.
   */
  rest?: ChatThreadRest | undefined;
  /** The thread's blocks, one child per item, oldest first. */
  children?: ReactNode;
  labels?: Partial<ChatThreadLabels> | undefined;
}

/**
 * A conversation as it grows: the scrolling region of messages, answers and
 * cards, which keeps the latest in view while the reader is at the end and
 * lets them read back without being pulled down.
 *
 * A LOG WITH ITS LIVE REGION OFF. It is `role="log"` so assistive technology
 * knows what it is, but `aria-live="off"`, because a streaming answer read
 * token by token is noise: the host announces once, through the page's
 * `Announcer`, when an answer completes. It is focusable, so a keyboard
 * reader can scroll it, and `aria-busy` while a request runs.
 *
 * IT STICKS TO THE END ONLY WHILE THE READER IS THERE. Within 48px of the end
 * it follows whatever arrives; scrolled up, it stays put and a "Jump to
 * latest" pill counts what arrived since. The browser's own scroll anchoring
 * is turned off (it fights a last child that keeps growing), and the
 * anchoring is done here instead.
 *
 * A JUMP HOLDS UNTIL IT LANDS. A smooth scroll passes through positions short
 * of the end, and each one read as the reader leaving: the pill came back and
 * following stopped, so an answer still growing left the jump short and the
 * first press did nothing. While the jump runs, those positions are ignored
 * and growth is followed; the reader's own wheel, touch or key ends it.
 *
 * THE PILL COVERS NOTHING: it sits under the log, in the thread's own column,
 * rather than over the last lines of whatever is being read. A log that
 * offers its own way back (a day's Jump to menu) leaves it out with
 * `jump={false}`.
 */
export const ChatThread = forwardRef<ChatThreadHandle, ChatThreadProps>(function ChatThread(
  { label, busy = false, follow = true, jump = true, rest: restAt = 'start', children, labels: overrides, className, ...rest },
  ref,
) {
  const labels = overrides ? { ...CHAT_THREAD_LABELS, ...overrides } : CHAT_THREAD_LABELS;
  const scroller = useRef<HTMLDivElement | null>(null);
  const items = useRef<HTMLDivElement | null>(null);
  const reduced = useMediaMatch(REDUCED_MOTION_QUERY);
  const count = Children.toArray(children).length;
  // Whether the reader is at the end, read on every scroll. A ref, because
  // the content observer below reads it between renders.
  const atEnd = useRef(true);
  // A smooth jump to the end is under way: the positions it passes through
  // are not the reader leaving.
  const jumping = useRef(false);
  const [detachedAt, setDetachedAt] = useState<number | null>(null);
  const countRef = useRef(count);
  countRef.current = count;
  // Whether the Jump to latest row stands under the log in the last commit,
  // read by reveal() between renders.
  const rowShown = useRef(false);
  rowShown.current = jump && detachedAt !== null;
  // An item reveal() placed in a view the Jump to latest row is about to
  // shorten: placed again once the row stands.
  const revealing = useRef<HTMLElement | null>(null);

  const toEnd = useCallback(
    (smooth: boolean) => {
      const el = scroller.current;
      if (!el) return;
      const top = el.scrollHeight - el.clientHeight;
      if (smooth && !reduced && typeof el.scrollTo === 'function') {
        jumping.current = true;
        el.scrollTo({ top, behavior: 'smooth' });
      } else {
        jumping.current = false;
        el.scrollTop = top;
      }
      atEnd.current = true;
      setDetachedAt(null);
    },
    [reduced],
  );

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const end = el.scrollHeight - el.scrollTop - el.clientHeight <= CHAT_THREAD_FOLLOW_WITHIN;
    if (jumping.current) {
      // On the way to the end: only arriving there ends the jump.
      if (end) jumping.current = false;
      return;
    }
    atEnd.current = end;
    setDetachedAt((prior) => (end ? null : (prior ?? countRef.current)));
  }, []);

  // The reader's own wheel, touch or key ends a jump at once: what they do is
  // never overridden by the jump they asked for a moment before. A jump the
  // content outgrew lands where the end is when the scroll settles.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const interrupt = () => {
      jumping.current = false;
    };
    const settled = () => {
      if (jumping.current) toEnd(false);
    };
    const intents = ['wheel', 'touchstart', 'keydown'] as const;
    el.addEventListener('scrollend', settled);
    for (const intent of intents) el.addEventListener(intent, interrupt, { passive: true });
    return () => {
      el.removeEventListener('scrollend', settled);
      for (const intent of intents) el.removeEventListener(intent, interrupt);
    };
  }, [toEnd]);

  // Follows what arrives while the reader is at the end: a new item, and a
  // last item that grows as its answer streams in.
  useLayoutEffect(() => {
    if (follow && atEnd.current) toEnd(false);
  }, [children, follow, toEnd]);
  useEffect(() => {
    const el = items.current;
    if (!follow || !el || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      if (atEnd.current) toEnd(false);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [follow, toEnd]);

  // THE ITEM IN THE MIDDLE OF THE VIEW. A message opened from a link sat with
  // its foot on the view's foot, the messages after it out of sight, and the
  // Jump to latest row the move then brought in took its last lines as well.
  const place = useCallback(
    (element: HTMLElement) => {
      const el = scroller.current;
      if (!el) return;
      jumping.current = false;
      const box = element.getBoundingClientRect();
      const top = box.top - el.getBoundingClientRect().top + el.scrollTop;
      const margins = getComputedStyle(element);
      const above = Number.parseFloat(margins.scrollMarginTop) || 0;
      const below = Number.parseFloat(margins.scrollMarginBottom) || 0;
      const room = el.clientHeight - above - below;
      // Mid view when it fits; otherwise its head under its margin, never past it.
      const target = box.height <= room ? top - above - (room - box.height) / 2 : top - above;
      el.scrollTop = Math.max(0, Math.min(target, el.scrollHeight - el.clientHeight));
      onScroll();
    },
    [onScroll],
  );

  // Placed again in the view the Jump to latest row left, before paint, once
  // the move that detached the reader has drawn the row.
  const detached = detachedAt !== null;
  useLayoutEffect(() => {
    const element = revealing.current;
    revealing.current = null;
    if (element && detached) place(element);
  }, [detached, place]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToLatest: () => toEnd(true),
      reveal: (element: HTMLElement) => {
        const shown = rowShown.current;
        place(element);
        revealing.current = jump && !shown && !atEnd.current ? element : null;
      },
      scroller: () => scroller.current,
    }),
    [jump, place, toEnd],
  );

  const fresh = detachedAt === null ? 0 : Math.max(0, count - detachedAt);
  return (
    <div {...rest} className={cx('crewlet-chat-thread', restAt === 'end' && 'crewlet-chat-thread--rest-end', className)}>
      <div
        ref={scroller}
        role="log"
        aria-live="off"
        aria-label={label}
        aria-busy={busy || undefined}
        // Focusable, so a keyboard reader can scroll the conversation.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="crewlet-chat-thread__scroller"
        onScroll={onScroll}
      >
        <div ref={items} className="crewlet-chat-thread__items">
          {children}
        </div>
      </div>
      {!jump || detachedAt === null ? null : (
        <div className="crewlet-chat-thread__jump">
          <Button variant="secondary" size="small" shape="pill" leadingIcon={<ArrowDownGlyph />} onClick={() => toEnd(true)}>
            {labels.jumpToLatest}
            {fresh > 0 ? (
              <>
                <span className="crewlet-chat-thread__fresh" aria-hidden="true">
                  {fresh.toLocaleString()}
                </span>
                <VisuallyHidden>{`, ${labels.newItems(fresh)}`}</VisuallyHidden>
              </>
            ) : null}
          </Button>
        </div>
      )}
    </div>
  );
});
