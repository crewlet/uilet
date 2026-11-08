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
import { useLogTabbing } from './tabbing.js';

/** How close to the end, in pixels, a reader scrolling down is taken back to it. */
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
   * Keeps the end in view while the reader is at it. `true` by default;
   * `false` never moves the scroll on its own.
   */
  follow?: boolean | undefined;
  /**
   * Called when the reader leaves the end or comes back to it: the one
   * answer to "is the reader at the latest", for a host that counts what
   * arrives meanwhile rather than reading the scroll position a second way.
   */
  onFollowChange?: ((following: boolean) => void) | undefined;
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
  /**
   * The items run edge to edge, with no inset or gap of their own, for a log
   * whose items carry their own (`ChatMessage` rows, `ChatDay`s): its rows'
   * hover surface reaches both edges and their faces line up with a composer
   * under the log on the same side inset. Only a short step stays above the
   * first item and under the last.
   */
  flush?: boolean | undefined;
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
 * IT STICKS TO THE END ONLY WHILE THE READER IS THERE. At the end it follows
 * whatever arrives, and a view that shrinks under it (a composer growing a
 * line) keeps the latest in sight. The reader leaves the end with the first
 * upward move, however small: it used to count anywhere within 48px as the
 * end and pull them back on the next render, so a slow wheel or a trackpad
 * near the end could not scroll up at all. Scrolling down to within 48px
 * takes them back. Scrolled up, a "Jump to latest" pill counts what arrived.
 *
 * AND THE READER'S PLACE HOLDS WHILE THEY ARE AWAY. The browser's own scroll
 * anchoring is turned off (it fights a last child that keeps growing), so the
 * thread anchors itself: the item at the top of the view stays where it
 * stood while what is above it changes height (an older page, a row drawn
 * at its real height, a preview that loads), before the change is painted.
 * The anchor is read again after every layout pass, so a jump that lands on
 * a part a windowed host has not drawn yet (a spacer) anchors on the rows the
 * host then draws there, never on the day that holds them.
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
  {
    label,
    busy = false,
    follow = true,
    onFollowChange,
    jump = true,
    rest: restAt = 'start',
    flush = false,
    children,
    labels: overrides,
    className,
    ...rest
  },
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
  // are not the reader leaving. And the content's height it set out for.
  const jumping = useRef(false);
  const jumpedFor = useRef(0);
  // The position the last scroll was read at, so the next one tells which
  // way the reader moved.
  const last = useRef(0);
  // Away from the end: the item at the top of the view, and its offset there.
  const anchor = useRef<Anchor | null>(null);
  const followChange = useRef(onFollowChange);
  followChange.current = onFollowChange;
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

  const settle = useCallback((el: HTMLDivElement) => {
    last.current = el.scrollTop;
  }, []);

  const setFollowing = useCallback((following: boolean) => {
    if (atEnd.current === following) return;
    atEnd.current = following;
    followChange.current?.(following);
  }, []);

  const toEnd = useCallback(
    (smooth: boolean) => {
      const el = scroller.current;
      if (!el) return;
      const top = el.scrollHeight - el.clientHeight;
      if (smooth && !reduced && typeof el.scrollTo === 'function') {
        jumping.current = true;
        jumpedFor.current = el.scrollHeight;
        el.scrollTo({ top, behavior: 'smooth' });
      } else {
        jumping.current = false;
        el.scrollTop = top;
      }
      settle(el);
      anchor.current = null;
      setFollowing(true);
      setDetachedAt(null);
    },
    [reduced, settle, setFollowing],
  );

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const was = last.current;
    settle(el);
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (jumping.current) {
      // On the way to the end: only arriving there ends the jump.
      if (distance <= CHAT_THREAD_FOLLOW_WITHIN) jumping.current = false;
      return;
    }
    // AN UPWARD MOVE THAT DOES NOT LAND ON THE END IS THE READER'S: the
    // browser moves the scroll up on its own only to clamp it to a shorter
    // end, and the thread's own corrections are settled before their event.
    const moved = el.scrollTop - was;
    let following = atEnd.current;
    if (distance < 1) following = true;
    else if (moved < 0) following = false;
    else if (moved > 0) following = distance <= CHAT_THREAD_FOLLOW_WITHIN;
    setFollowing(following);
    anchor.current = following ? null : anchorIn(el, items.current);
    setDetachedAt((prior) => (following ? null : (prior ?? countRef.current)));
  }, [settle, setFollowing]);

  // Moves the view by the height that changed above the anchor, then reads the
  // anchor again from what is now drawn: one read in a scroll event saw the
  // content before the host drew what that scroll brought into view.
  const hold = useCallback(() => {
    const el = scroller.current;
    const mark = anchor.current;
    if (!el || atEnd.current || jumping.current) return;
    if (mark?.element.isConnected) {
      const delta = depthIn(el, mark.element) - mark.at;
      if (Math.abs(delta) >= 0.5) {
        el.scrollTop += delta;
        settle(el);
      }
    }
    anchor.current = anchorIn(el, items.current);
  }, [settle]);

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

  // At the end, the end is followed (a new item, a last item growing as its
  // answer streams in); away from it, the reader's place is held. A smooth
  // jump lands by itself, unless the content outgrew it on the way.
  const keep = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    if (!atEnd.current) hold();
    else if (follow && !(jumping.current && el.scrollHeight === jumpedFor.current)) toEnd(false);
  }, [follow, hold, toEnd]);
  // After every render, before the paint, and whenever the content or the
  // view changes size between renders.
  useLayoutEffect(keep);
  useEffect(() => {
    const view = scroller.current;
    const content = items.current;
    if (!view || !content || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(keep);
    observer.observe(content);
    observer.observe(view);
    return () => observer.disconnect();
  }, [keep]);

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

  const tabbing = useLogTabbing(scroller);
  const fresh = detachedAt === null ? 0 : Math.max(0, count - detachedAt);
  return (
    <div
      {...rest}
      className={cx(
        'crewlet-chat-thread',
        restAt === 'end' && 'crewlet-chat-thread--rest-end',
        flush && 'crewlet-chat-thread--flush',
        className,
      )}
      onKeyDownCapture={(event) => {
        rest.onKeyDownCapture?.(event);
        tabbing.onKeyDownCapture(event);
      }}
      onFocusCapture={(event) => {
        rest.onFocusCapture?.(event);
        tabbing.onFocusCapture(event);
      }}
    >
      <div
        ref={scroller}
        role="log"
        aria-live="off"
        aria-label={label}
        aria-busy={busy || undefined}
        // Focusable, so a keyboard reader can scroll the conversation. Tab
        // arriving here moves on to a message row (tabbing.ts).
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

/** An item the reader's place is kept by, and how far into the content it stands. */
interface Anchor {
  element: Element;
  at: number;
}

/** How far below the top of the scrolled content `element` stands, in px. */
function depthIn(view: HTMLElement, element: Element): number {
  return element.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop;
}

/**
 * The part at the top of the view: the first item in view, in document order,
 * looked into for the first of its own parts in view, a few levels down,
 * whether the view holds all of it or not. A group is never the anchor while
 * a part of it is in view: older rows land at the start of the day that holds
 * them, and a day short enough to fit the view kept its top while they pushed
 * the reader's rows down. A pinned or positioned part (a day's sticky pill)
 * never moves with the content, so it is stepped over, and so is a part the
 * host marks `overflow-anchor: none`, the platform's own way out: a head that
 * older items land under, or a windowed list's spacer, whose top stays put
 * while the rows inside it are drawn.
 */
function anchorIn(view: HTMLElement, content: HTMLElement | null): Anchor | null {
  const top = view.getBoundingClientRect().top;
  const bottom = top + view.clientHeight;
  let found: Element | null = null;
  let parent: Element | null = content;
  for (let depth = 0; parent && depth < ANCHOR_DEPTH; depth++) {
    let next: Element | null = null;
    for (const child of Array.from(parent.children)) {
      const box = child.getBoundingClientRect();
      if (box.height === 0 || box.bottom <= top || box.top >= bottom) continue;
      const style = getComputedStyle(child);
      if (style.position === 'sticky' || style.position === 'fixed' || style.position === 'absolute') continue;
      if (style.overflowAnchor === 'none') continue;
      next = child;
      break;
    }
    if (!next) break;
    found = next;
    parent = next;
  }
  return found ? { element: found, at: depthIn(view, found) } : null;
}

/** How deep the anchor is looked for: a day, a row, the row's own parts. */
const ANCHOR_DEPTH = 4;
