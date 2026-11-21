/**
 * The conversation both column suites draw: a thread with `column`, its
 * exchanges, and a composer under it centred at the column's width as an
 * application centres its own, each measured.
 */
import { flushSync } from 'react-dom';
import type { Root } from 'react-dom/client';
import type { CSSProperties } from 'react';
import { ChatThread, MessageBubble, Prose } from '@crewlethq/ui';

export interface Box {
  left: number;
  right: number;
  width: number;
}

export interface Column {
  thread: Box;
  /** The items' content box: the column itself. */
  items: Box;
  bubble: Box;
  answer: Box;
  composer: Box;
  /** The wide measure, as wide as it is drawn at the items' own type. */
  measure: number;
  /** The width the scroller's bar takes from its content. */
  bar: number;
  /** Whether anything scrolls sideways. */
  overflows: boolean;
}

/** The composer's box: centred on the thread's holder at the column's width, the thread's inset below it. */
const COMPOSER: CSSProperties = {
  paddingInline:
    'max(var(--spacing-4), (100% - var(--crewlet-chat-thread-column, var(--size-measure-wide))) / 2)',
};

function box(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, width: r.width };
}

function content(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const left = r.left + parseFloat(s.paddingLeft);
  const right = r.right - parseFloat(s.paddingRight);
  return { left, right, width: right - left };
}

const ANSWER =
  'Agent SWE used the most this week: 2.96M tokens, 38% of the company’s 7.84M. The company has used 78% of its 10M weekly ceiling, which resets on Monday at 00:00 Berlin time.';

export async function drawColumn(
  root: Root,
  { exchanges, style, column }: { exchanges: number; style?: CSSProperties | undefined; column: boolean },
): Promise<Column> {
  flushSync(() =>
    root.render(
      <div style={{ ...style, height: '100vh', display: 'flex', flexDirection: 'column' }} data-holder>
        <ChatThread label="Conversation" column={column}>
          {Array.from({ length: exchanges }, (_, i) => [
            <MessageBubble key={`q${String(i)}`} from="self">
              Which agents spent the most tokens this week?
            </MessageBubble>,
            <Prose key={`a${String(i)}`} measure="none">
              <p>{ANSWER}</p>
            </Prose>,
          ]).flat()}
        </ChatThread>
        <div style={COMPOSER} data-composer>
          <textarea aria-label="Ask" style={{ display: 'block', width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div data-measure style={{ width: 'var(--size-measure-wide)', height: 0 }} />
      </div>,
    ),
  );
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  const holder = document.querySelector<HTMLElement>('[data-holder]')!;
  const scroller = holder.querySelector<HTMLElement>('.crewlet-chat-thread__scroller')!;
  const bubbles = holder.querySelectorAll('.crewlet-message__bubble');
  const answers = holder.querySelectorAll('.crewlet-prose');
  return {
    thread: box(holder.querySelector('.crewlet-chat-thread')!),
    items: content(holder.querySelector<HTMLElement>('.crewlet-chat-thread__items')!),
    bubble: box(bubbles[bubbles.length - 1]!),
    answer: box(answers[answers.length - 1]!),
    composer: box(holder.querySelector('[data-composer] textarea')!),
    measure: holder.querySelector('[data-measure]')!.getBoundingClientRect().width,
    bar: scroller.offsetWidth - scroller.clientWidth,
    overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth || scroller.scrollWidth > scroller.clientWidth,
  };
}
