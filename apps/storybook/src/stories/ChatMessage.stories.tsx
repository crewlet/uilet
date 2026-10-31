import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import {
  BookmarkGlyph,
  CopyGlyph,
  EllipsisGlyph,
  FaceSlightlySmilingPlusGlyph,
  MessagesSquareGlyph,
  PencilGlyph,
  TrashGlyph,
} from '@crewlethq/icons/glyphs';
import {
  ActionDivider,
  ActivityLine,
  AddReaction,
  Avatar,
  ChatMessage,
  ChatMessageFailure,
  ChatThread,
  EmojiPicker,
  Menu,
  MessageAction,
  MessageActions,
  QuickReaction,
  ReactionBar,
  Tag,
  ThinkingIndicator,
  ThreadSummary,
  type ChatMessageProps,
  type ReactionSummary,
} from '@crewlethq/ui';

/**
 * One message in a transcript: the author's face in a gutter, the name at
 * the medium weight with a quiet Agent label and the time on one head line,
 * the words, and a footer stack (previews, reactions, the thread line).
 *
 * Point at a row: its fill steps up, a continuation shows its time in the
 * gutter, and the toolbar rests on the row's first line, over the row above.
 * On a touch screen a tap on the row shows the toolbar, and the add pill
 * stays in view. Focus a row and ArrowUp and ArrowDown walk the transcript.
 */
const meta: Meta<typeof ChatMessage> = {
  title: 'UI/ChatMessage',
  component: ChatMessage,
  decorators: [
    (Story) => (
      <div style={{ height: 560, maxWidth: 760, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border-default)', borderRadius: 14, overflow: 'hidden' }}>
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatMessage>;

interface Person {
  name: string;
  agent?: boolean;
  face: ReactNode;
}

const PM: Person = { name: 'Product Manager', face: <Avatar name="Product Manager" kind="human" size={36} decorative /> };
const SWE: Person = {
  name: 'Senior Backend Engineer',
  agent: true,
  face: <Avatar name="Senior Backend Engineer" character="gemlet" hue="cyan" status="working" size={36} decorative />,
};
const DESIGNER: Person = { name: 'Designer', face: <Avatar name="Designer" kind="human" size={36} decorative /> };

function Actions({ onBusy, saved, onSave }: { onBusy: (open: boolean) => void; saved: boolean; onSave: () => void }) {
  return (
    <MessageActions>
      {['✅', '👀', '🙌'].map((emoji) => (
        <QuickReaction key={emoji} emoji={emoji} onPick={() => {}} />
      ))}
      {/* The tool carries its own hint, which steps aside while the picker is open. */}
      <EmojiPicker
        label="Add a reaction"
        onPick={() => {}}
        onOpenChange={onBusy}
        trigger={(_open, toggle) => (
          <MessageAction label="Add a reaction" icon={<FaceSlightlySmilingPlusGlyph size="md" />} onClick={toggle} />
        )}
      />
      <MessageAction label="Reply in thread" icon={<MessagesSquareGlyph size="md" />} />
      <MessageAction label={saved ? 'Remove from Saved' : 'Save for later'} icon={<BookmarkGlyph size="md" />} pressed={saved} onClick={onSave} />
      <ActionDivider />
      <Menu
        label="More actions"
        align="end"
        onOpenChange={onBusy}
        renderTrigger={(props) => <MessageAction {...props} label="More actions" icon={<EllipsisGlyph size="md" />} />}
        items={[
          { key: 'copy', label: 'Copy link', icon: <CopyGlyph size="sm" />, onSelect: () => {} },
          { kind: 'separator', key: 's1' },
          { key: 'edit', label: 'Edit message', icon: <PencilGlyph size="sm" />, hint: 'E', onSelect: () => {} },
          { key: 'delete', label: 'Delete message', icon: <TrashGlyph size="sm" />, danger: true, hint: 'Del', onSelect: () => {} },
        ]}
      />
    </MessageActions>
  );
}

type RowProps = Omit<ChatMessageProps, 'id' | 'label' | 'avatar' | 'author' | 'time' | 'timeTitle' | 'children'> & {
  id: string;
  who: Person;
  at: string;
  children: ReactNode;
  withActions?: boolean;
};

/** A row as a host draws one: the face and the name open a profile, and the toolbar holds the row while a menu is open. */
function Row({ id, who, at, children, withActions = true, ...rest }: RowProps) {
  const [busy, setBusy] = useState(0);
  const [saved, setSaved] = useState(false);
  return (
    <ChatMessage
      id={id}
      label={`${who.name}, ${at} AM`}
      avatar={
        <button type="button" aria-label={`Open ${who.name}'s profile`}>
          {who.face}
        </button>
      }
      author={<button type="button">{who.name}</button>}
      badges={who.agent ? <Tag size="xs">Agent</Tag> : undefined}
      time={`${at} AM`}
      gutterTime={at}
      timeTitle={`Thursday, October 30 at ${at} AM`}
      active={busy > 0}
      actions={withActions ? <Actions saved={saved} onSave={() => setSaved((was) => !was)} onBusy={(open) => setBusy((n) => n + (open ? 1 : -1))} /> : undefined}
      {...rest}
    >
      {children}
    </ChatMessage>
  );
}

const REACTIONS: ReactionSummary[] = [
  { emoji: '✅', count: 2, mine: true, people: ['Designer'] },
  { emoji: '👀', count: 1, mine: false, people: ['Product Manager'] },
  { emoji: '🚀', count: 4, mine: false },
];

function Reactions({ reactions = REACTIONS }: { reactions?: ReactionSummary[] }) {
  const [list, setList] = useState(reactions);
  const toggle = (emoji: string) =>
    setList((was) => {
      const found = was.find((r) => r.emoji === emoji);
      if (!found) return [...was, { emoji, count: 1, mine: true }];
      const next = { ...found, mine: !found.mine, count: found.count + (found.mine ? -1 : 1) };
      return next.count === 0 ? was.filter((r) => r.emoji !== emoji) : was.map((r) => (r.emoji === emoji ? next : r));
    });
  return <ReactionBar reactions={list} onToggle={toggle} add={<AddReaction onPick={toggle} />} />;
}

const thread = (
  <ThreadSummary
    replies={4}
    unread={2}
    last="12m ago"
    participants={[
      { name: 'Senior Backend Engineer', character: 'gemlet', hue: 'cyan' },
      { name: 'Designer', kind: 'human' },
      { name: 'Product Manager', kind: 'human' },
    ]}
    onOpen={() => {}}
    working={<ThinkingIndicator status="Senior Backend Engineer is writing a reply · Reading the diff" label="Senior Backend Engineer is writing a reply" />}
  />
);

function Transcript({ children }: { children: ReactNode }) {
  return (
    <>
      <ChatThread label="Messages in #engineering" jump={false}>
        {children}
      </ChatThread>
      <div style={{ padding: '0 var(--spacing-5) var(--spacing-2)' }}>
        <ActivityLine typing="Designer is typing" />
      </div>
    </>
  );
}

/** A run: a head row, then continuations with their time in the gutter. Point at each. */
export const Continuation: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={PM} at="11:02">
        The release notes for 2.4 are ready for review.
      </Row>
      <Row id="b" who={PM} at="11:03" continuation>
        The flashcards change is the headline.
      </Row>
      <Row id="c" who={PM} at="11:03" continuation>
        Comments by noon, please.
      </Row>
      <Row id="d" who={SWE} at="11:05">
        On it. The token rotation fix is in the list as well.
      </Row>
    </Transcript>
  ),
};

/** A message that names the reader: a light warning wash and a bar on its edge, kept under the pointer. */
export const Mention: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={SWE} at="10:48">
        Migration is staged on the canary.
      </Row>
      <Row id="b" who={DESIGNER} at="10:51" highlight="mention">
        @Miles can you sign off the empty state before I hand it over?
      </Row>
      <Row id="c" who={PM} at="10:52">
        Thanks both.
      </Row>
    </Transcript>
  ),
};

/** The row a link or a search opened at: a wash of the accent that fades out. Press Flash again to replay it. */
export const Flash: Story = {
  render: function Flashing() {
    const [run, setRun] = useState(0);
    return (
      <>
        <Transcript>
          <Row id="a" who={PM} at="09:30">
            Standup moves to 9:45 tomorrow.
          </Row>
          <Row key={run} id="b" who={SWE} at="09:41" flash>
            Decision needed: ship the rotation behind a flag, or wait for the audit?
          </Row>
          <Row id="c" who={DESIGNER} at="09:44">
            Flag, I think.
          </Row>
        </Transcript>
        <div style={{ padding: 'var(--spacing-2) var(--spacing-5)' }}>
          <button type="button" onClick={() => setRun((n) => n + 1)}>
            Flash again
          </button>
        </div>
      </>
    );
  },
};

/** Your message being edited in place: the toolbar steps aside while the words are open. */
export const Editing: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={PM} at="14:10">
        Can someone check the staging deploy?
      </Row>
      <Row id="b" who={DESIGNER} at="14:12" editing>
        <textarea
          aria-label="Edit message"
          defaultValue="Checking it now, give me ten minutes."
          style={{ width: '100%', font: 'inherit', boxSizing: 'border-box' }}
        />
      </Row>
    </Transcript>
  ),
};

/** The outbox in place: a sending message is faint, and one that failed says so with Retry and Discard. */
export const SendingAndFailed: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={DESIGNER} at="16:20" pending="sending" withActions={false}>
        Uploading the new icons now.
      </Row>
      <Row
        id="b"
        who={DESIGNER}
        at="16:21"
        continuation
        pending="failed"
        withActions={false}
        footer={<ChatMessageFailure reason="The engine did not answer." onRetry={() => {}} onDiscard={() => {}} />}
      >
        And the empty state copy.
      </Row>
    </Transcript>
  ),
};

/** Reactions under the words: a fill at rest, the strong edge under the pointer, yours in the accent. Toggle them, or add one. */
export const WithReactions: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={SWE} at="12:00" footer={<Reactions />}>
        PR 41 is green and ready to merge.
      </Row>
    </Transcript>
  ),
};

/** The thread line: who replied, how many, how many are new and when the last came, and an agent writing a reply. */
export const WithThread: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={PM} at="11:30" footer={thread}>
        Should the streak move to the top of the review screen?
      </Row>
      <Row id="b" who={DESIGNER} at="11:42">
        Mocks are in the doc.
      </Row>
    </Transcript>
  ),
};

/**
 * The first row at the top of the log has no row above to stand over: its
 * toolbar is measured and drawn inside its own head. Point at it, then at
 * the second row.
 */
export const ToolbarAtTheTop: Story = {
  render: () => (
    <ChatThread label="Messages" jump={false}>
      <Row id="a" who={PM} at="08:00">
        Morning. Two things on the board today.
      </Row>
      <Row id="b" who={SWE} at="08:02">
        I will take the flaky test.
      </Row>
    </ChatThread>
  ),
};

/**
 * On a touch screen there is no hover: a tap on a row focuses it and shows
 * its toolbar, and the add pill stays in view. Open this story on a phone, or
 * with touch emulation, and tap a row.
 */
export const Touch: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={PM} at="15:00" footer={<Reactions reactions={REACTIONS.slice(0, 1)} />}>
        Tap me.
      </Row>
      <Row id="b" who={DESIGNER} at="15:01">
        Then me.
      </Row>
    </Transcript>
  ),
};

/** Every state together, in one transcript. */
export const Everything: Story = {
  render: () => (
    <Transcript>
      <Row id="a" who={PM} at="11:02">
        The release notes for 2.4 are ready for review.
      </Row>
      <Row id="b" who={PM} at="11:03" continuation footer={thread}>
        Should the streak move to the top of the review screen?
      </Row>
      <Row id="c" who={SWE} at="11:05" footer={<Reactions />}>
        PR 41 is green and ready to merge.
      </Row>
      <Row id="d" who={DESIGNER} at="11:07" highlight="mention">
        @Miles the empty state needs your sign-off.
      </Row>
      <Row id="e" who={DESIGNER} at="11:08" continuation pending="sending" withActions={false}>
        Uploading the new icons now.
      </Row>
    </Transcript>
  ),
};
