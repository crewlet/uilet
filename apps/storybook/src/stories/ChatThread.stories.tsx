import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LayoutDashboardGlyph } from '@crewlethq/icons/glyphs';
import {
  Button,
  ChatThread,
  MessageBubble,
  Prose,
  RunChip,
  Skeleton,
  StepList,
  Tag,
  VisuallyHidden,
  type ChatThreadHandle,
} from '@crewlethq/ui';

/**
 * A conversation as it grows: a focusable log with its live region off, which
 * follows the end while the reader is within 48px of it and stays put once
 * they scroll up, with a Jump to latest pill counting what arrived. The
 * browser's scroll anchoring is off and the anchoring is done in code.
 */
const meta: Meta<typeof ChatThread> = {
  title: 'UI/ChatThread',
  component: ChatThread,
  decorators: [
    (Story) => (
      <div style={{ height: 480, maxWidth: 420, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border-default)', borderRadius: 14 }}>
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatThread>;

const sentWith = (
  <Tag size="xs" appearance="outline" leadingIcon={<LayoutDashboardGlyph size="xs" />}>
    <VisuallyHidden>Sent with </VisuallyHidden>Work › Tasks
  </Tag>
);

function exchange(index: number): ReactNode[] {
  return [
    <MessageBubble key={`q${index}`} from="self" attachment={sentWith}>
      Which agents spent the most tokens this week? ({index + 1})
    </MessageBubble>,
    <Prose key={`a${index}`} measure="narrow">
      <p>Agent SWE used the most this week: 2.96M tokens, 38% of the company’s 7.84M.</p>
    </Prose>,
  ];
}

export const ShortThread: Story = {
  render: () => <ChatThread label="Conversation">{[0, 1].flatMap(exchange)}</ChatThread>,
};

/**
 * Scroll up while the answer keeps growing, then press Jump to latest: the
 * jump lands at the end it finds when it gets there, and the pill sits under
 * the log, covering nothing.
 */
export const JumpWhileGrowing: Story = {
  render: function Growing() {
    const [count, setCount] = useState(6);
    useEffect(() => {
      const timer = setInterval(() => setCount((n) => (n < 40 ? n + 1 : n)), 400);
      return () => clearInterval(timer);
    }, []);
    return <ChatThread label="Conversation">{Array.from({ length: count }, (_, i) => i).flatMap(exchange)}</ChatThread>;
  },
};

/** Scroll up: the thread stays put and the pill appears. */
export const LongThread: Story = {
  render: () => <ChatThread label="Conversation">{Array.from({ length: 8 }, (_, index) => exchange(index)).flat()}</ChatThread>,
};

const WORDS =
  'Agent SWE used the most this week: 2.96M tokens, 38% of the company’s 7.84M. The company has used 78% of its 10M weekly ceiling, which resets on Monday at 00:00 Berlin time.'.split(
    ' ',
  );

function Streaming() {
  // One tick drives it all: each answer streams a word per tick, rests ten
  // ticks once complete, then the next exchange begins.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 180);
    return () => clearInterval(timer);
  }, []);
  const cycle = WORDS.length + 10;
  const extra = Math.floor(tick / cycle);
  const shown = Math.min(WORDS.length, tick % cycle);
  const done = shown === WORDS.length;
  return (
    <ChatThread label="Conversation" busy={!done}>
      {[...Array.from({ length: 3 + extra }, (_, index) => exchange(index)).flat()]}
      <RunChip key="chip" state={done ? 'done' : 'working'} title={done ? 'Done in 5s' : 'Working'} meta={done ? '2 steps' : `${Math.ceil(shown / 5)}s`}>
        <StepList
          label="Steps"
          steps={[
            { id: 'read', label: 'Read token spend by agent', state: 'done', duration: '0.4s', detail: 'get_spend · GET /tokens/breakdown?group=seat&window=week' },
            { id: 'ceiling', label: 'Read the weekly ceiling', state: done ? 'done' : 'running', detail: 'list_budgets · GET /budgets' },
          ]}
        />
      </RunChip>
      <Prose key="answer" measure="narrow" streaming={!done}>
        <p>{WORDS.slice(0, shown).join(' ')}</p>
      </Prose>
    </ChatThread>
  );
}

/** An answer streams in and the thread follows it; scroll up and it stops following, and the pill counts new items. */
export const StreamingWithStick: Story = { render: () => <Streaming /> };

/** Thinking: the run chip with nothing to open yet, over three skeleton lines (the shimmer is flat under reduced motion). */
export const Thinking: Story = {
  render: () => (
    <ChatThread label="Conversation" busy>
      <MessageBubble from="self" attachment={sentWith}>
        Which agents spent the most tokens this week?
      </MessageBubble>
      <RunChip state="thinking" title="Thinking" />
      <Skeleton variant="text" rows={3} label="Thinking" />
    </ChatThread>
  ),
};

function Revealing() {
  const handle = useRef<ChatThreadHandle>(null);
  const card = useRef<HTMLDivElement>(null);
  return (
    <>
      <ChatThread ref={handle} label="Conversation">
        {[0, 1, 2].flatMap(exchange)}
        <div ref={card} style={{ height: 600, border: '1px solid var(--color-border-default)', borderRadius: 12, padding: 16 }}>
          A tall card that needs a decision: its head comes to the top of the view, since the whole of it does not fit.
        </div>
        {[3].flatMap(exchange)}
      </ChatThread>
      {/* On the thread's own 16px inset, so the control starts where its items do. */}
      <div style={{ padding: '0 var(--spacing-4) var(--spacing-4)' }}>
        <Button size="small" variant="secondary" onClick={() => card.current && handle.current?.reveal(card.current)}>
          Reveal the decision
        </Button>
      </div>
    </>
  );
}

/**
 * `reveal` brings an item into the middle of the view, with what came before
 * and after it in sight, and a card taller than the view with its head at the
 * top. It places the item in the view the Jump to latest row leaves once the
 * move has brought that row in.
 */
export const RevealADecision: Story = { render: () => <Revealing /> };

/**
 * `jump={false}`: a log that offers its own way back (a day's Jump to menu)
 * draws no row under itself. Scroll up and nothing is added or laid over it.
 */
export const WithoutTheJumpRow: Story = {
  render: () => (
    <ChatThread label="Conversation" jump={false}>
      {Array.from({ length: 8 }, (_, index) => exchange(index)).flat()}
    </ChatThread>
  ),
};
