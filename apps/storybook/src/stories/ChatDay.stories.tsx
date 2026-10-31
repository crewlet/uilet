import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { ChatDay, ChatDayPill, ChatDivider, Menu } from '@crewlethq/ui';

/**
 * A day of a conversation under its date. The day's rule is a hairline in
 * the flow where the day starts; its pill sits on the rule, then stays pinned
 * a little under the top of the list while any of the day is in view, until
 * the next day's pill pushes it out. Scroll the list to see it.
 */
const meta: Meta<typeof ChatDay> = {
  title: 'UI/ChatDay',
  component: ChatDay,
  decorators: [
    (Story) => (
      <div style={{ height: 520, maxWidth: 560, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border-default)', borderRadius: 14, overflow: 'hidden' }}>
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatDay>;

/** A stand-in row: the message rows are ChatMessage's. */
function Row({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, padding: '6px var(--crewlet-chat-pad-x)', fontSize: 'var(--crewlet-chat-text)' }}>{children}</p>;
}

const rows = (day: string, count: number) => Array.from({ length: count }, (_, i) => <Row key={i}>{`${day}, message ${i + 1}. Shipping the October release.`}</Row>);

/**
 * The scrolling list the days are drawn in. In a product it is a ChatThread;
 * here a plain scroller, so the story shows the day and nothing else.
 */
function List({ children }: { children: ReactNode }) {
  return (
    // Focusable, so a keyboard reader can scroll it, as ChatThread's log is.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div role="log" aria-label="Messages in #engineering" tabIndex={0} style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 'var(--spacing-4)' }}>
      {children}
    </div>
  );
}

export const Days: Story = {
  render: () => (
    <List>
      <ChatDay label="Monday, October 27">{rows('Monday', 8)}</ChatDay>
      <ChatDay label="Yesterday">{rows('Yesterday', 8)}</ChatDay>
      <ChatDay label="Today">{rows('Today', 6)}</ChatDay>
    </List>
  ),
};

/**
 * Each pill is a Jump to menu: the host passes its `Menu` in the `pill` slot
 * with a `ChatDayPill` as the trigger, which draws the chevron that says so.
 */
export const JumpToMenu: Story = {
  render: () => {
    const jump = (label: string) => (
      <Menu
        label={`${label}. Jump to a date`}
        align="start"
        renderTrigger={(props) => <ChatDayPill {...props} label={label} />}
        items={[
          { key: 'latest', label: 'Most recent', onSelect: () => undefined },
          { key: 'week', label: 'Last week', onSelect: () => undefined },
          { key: 'beginning', label: 'The very beginning', onSelect: () => undefined },
          { kind: 'separator', key: 's' },
          { key: 'date', label: 'Jump to a specific date', onSelect: () => undefined },
        ]}
      />
    );
    return (
      <List>
        <ChatDay label="Yesterday" pill={jump('Yesterday')}>
          {rows('Yesterday', 10)}
        </ChatDay>
        <ChatDay label="Today" pill={jump('Today')}>
          {rows('Today', 10)}
        </ChatDay>
      </List>
    );
  },
};

/**
 * The New line takes no height. A day whose first message is the first
 * unread one draws it on its own rule (Today); otherwise it sits between two
 * rows of the day (Yesterday).
 */
export const NewLine: Story = {
  render: () => (
    <List>
      <ChatDay label="Yesterday">
        {rows('Yesterday', 3)}
        <ChatDivider variant="unread" label="New" />
        {rows('Yesterday, unread', 3)}
      </ChatDay>
      <ChatDay label="Today" unread="New">
        {rows('Today', 4)}
      </ChatDay>
    </List>
  ),
};

/**
 * A host with a bar floating over the top of the list (an unread banner)
 * raises the pin, so the pills pin under the bar rather than behind it.
 */
export const RaisedPin: Story = {
  render: () => (
    <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', ['--crewlet-chat-day-pin' as string]: 'calc(var(--spacing-2) * 2 + var(--crewlet-chat-day-pill))' }}>
      <div style={{ position: 'absolute', top: 'var(--spacing-2)', left: '50%', transform: 'translateX(-50%)', zIndex: 100, height: 'var(--crewlet-chat-day-pill)', padding: '0 var(--spacing-3)', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-brand-accent)', color: 'var(--color-text-on-accent)', fontSize: 'var(--font-size-xs)' }}>
        12 new messages since 10:21 AM
      </div>
      <List>
        <ChatDay label="Yesterday">{rows('Yesterday', 10)}</ChatDay>
        <ChatDay label="Today">{rows('Today', 10)}</ChatDay>
      </List>
    </div>
  ),
};

/** A thread pane sets its reply count over the replies as a quiet labelled rule. */
export const DateRule: Story = {
  render: () => (
    <div style={{ padding: 'var(--spacing-4) 0' }}>
      <Row>The root message of the thread.</Row>
      <ChatDivider variant="date" label="3 replies" />
      <Row>The first reply.</Row>
    </div>
  ),
};
