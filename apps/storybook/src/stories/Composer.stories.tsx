import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { Button, Composer, IconButton, Menu, SendButton, Tag, Toolbar, formatMarkdown } from '@crewlethq/ui';
import {
  AtSignGlyph,
  BoldGlyph,
  FaceSlightlySmilingGlyph,
  ItalicGlyph,
  LayoutDashboardGlyph,
  ListGlyph,
  ListOrderedGlyph,
  PlusGlyph,
  StrikethroughGlyph,
} from '@crewlethq/icons/glyphs';

/**
 * A message written in place: a field that grows with its text and a footer
 * with the send keys (Enter to send, Shift+Enter for a new line), a counter
 * near the limit, and the actions.
 */
const meta: Meta<typeof Composer> = {
  title: 'UI/Composer',
  component: Composer,
};

export default meta;
type Story = StoryObj<typeof Composer>;

function Reply({ initial = '' }: { initial?: string }) {
  const [text, setText] = useState(initial);
  return (
    <div style={{ maxWidth: 560 }}>
      <Composer
        label="Your reply"
        value={text}
        onChange={setText}
        onSubmit={() => {}}
        maxLength={200}
        placeholder="Tell them what you want instead"
        actions={
          <>
            <Button size="small" variant="ghost">
              Cancel
            </Button>
            <Button size="small" variant="primary" disabled={!text.trim()}>
              Submit
            </Button>
          </>
        }
      />
    </div>
  );
}

export const Default: Story = { render: () => <Reply /> };

/** Past four fifths of the limit, the counter appears. */
export const NearTheLimit: Story = {
  render: () => <Reply initial={'Keep greedy settlement for groups above twelve, and exact search below. '.repeat(3)} />,
};

function Brief() {
  const [text, setText] = useState('');
  return (
    <div style={{ maxWidth: 560 }}>
      <Composer
        label="Brief"
        value={text}
        onChange={setText}
        onSubmit={() => {}}
        placeholder="What it is for, who it is for, and what done looks like"
      />
    </div>
  );
}

/**
 * Only the send shortcut, as a create page's brief has it: on a phone the
 * hint is not drawn and its footer goes with it, so no empty strip is left
 * under the field. Narrow the viewport under 640px to see it.
 */
export const HintOnly: Story = { render: () => <Brief /> };

type ChatProps = { initial?: string; running?: boolean; disabledReason?: string; attached?: boolean; max?: number };

/**
 * A chat composer: Enter sends and Shift+Enter writes a line (never while an
 * input method is composing), the field starts at one line and grows to six,
 * and the send button sits on the field's row with its corner nested in the
 * box's. The page the question is about is attached above the field.
 */
function Chat({ initial = '', running = false, disabledReason, attached = true, max = 4000 }: ChatProps) {
  const [text, setText] = useState(initial);
  const [page, setPage] = useState(attached);
  const [busy, setBusy] = useState(running);
  const empty = !text.trim();
  return (
    <div style={{ maxWidth: 420 }}>
      <Composer
        label={page ? 'Ask a follow-up' : 'Ask about agents, tasks or spend'}
        placeholder="Ask a follow-up"
        value={text}
        onChange={setText}
        sendHint={false}
        maxLength={max}
        disabledReason={disabledReason}
        onSubmit={() => {
          if (empty) return;
          setText('');
          setBusy(true);
        }}
        attachmentsLabel="Attached to this question"
        attachments={
          page ? (
            <Tag
              size="sm"
              appearance="outline"
              leadingIcon={<LayoutDashboardGlyph size="xs" />}
              onRemove={() => setPage(false)}
              removeAriaLabel="Remove Work › Tasks from this question"
            >
              Work › Tasks
            </Tag>
          ) : (
            <Button
              size="small"
              variant="ghost"
              leadingIcon={<PlusGlyph />}
              aria-label="Add Work › Tasks to this question"
              onClick={() => setPage(true)}
            >
              Add this page
            </Button>
          )
        }
        trailing={
          <SendButton
            mode={busy ? 'stop' : 'send'}
            disabledReason={disabledReason ?? (empty ? 'Write a question first' : undefined)}
            onPress={() => {
              if (busy) setBusy(false);
              else if (!empty) {
                setText('');
                setBusy(true);
              }
            }}
          />
        }
      />
    </div>
  );
}

export const EnterToSend: Story = { render: () => <Chat /> };

/** While a request runs the send button is Stop, on the same element. */
export const Running: Story = { render: () => <Chat running /> };

/**
 * Offline: the whole composer takes the disabled field's look, faded once,
 * and the reason is the placeholder, short enough to keep one line.
 */
export const DisabledOffline: Story = { render: () => <Chat disabledReason="Offline" /> };

/** Rate limited: the draft that could not be sent stays, and the reason describes the field. */
export const DisabledWithADraft: Story = {
  render: () => <Chat disabledReason="You can ask again in 30 seconds" initial="Which budget runs out first?" />,
};

/** The near-limit counter, in a chat composer. */
export const ChatNearTheLimit: Story = {
  render: () => <Chat max={120} initial={'Only show blocked tasks in Core, most tokens first. '.repeat(2)} />,
};

/** The page removed: "Add this page" stands where the chip was. */
export const PageRemoved: Story = { render: () => <Chat attached={false} /> };

/**
 * A CONVERSATION'S MESSAGE BOX: the formatting row along the top (`toolbar`),
 * one line of words, and the tools at the footer's start (`tools`) with the
 * send button keeping the corner. Each formatting control applies
 * `formatMarkdown` to the field's selection. The row folds by its own width
 * (`fold="container"`): bold, italic and strikethrough stay, and the rest move
 * into a menu where the box is narrow, as in a side panel.
 */
function RoomComposer({ width = 560, chat = false }: { width?: number; chat?: boolean }) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement | null>(null);
  const apply = (format: 'bold' | 'italic' | 'strikethrough' | 'bulletList' | 'numberedList') => {
    const box = field.current;
    const selection = { start: box?.selectionStart ?? text.length, end: box?.selectionEnd ?? text.length };
    setText(formatMarkdown(text, selection, format).value);
  };
  return (
    <div style={{ maxWidth: width }}>
      <Composer
        ref={field}
        appearance={chat ? 'chat' : 'default'}
        value={text}
        onChange={setText}
        onSubmit={() => setText('')}
        sendHint={false}
        rows={1}
        label="Message #engineering"
        placeholder="Message #engineering"
        toolbar={
          <Toolbar label="Formatting" fold="container">
            <IconButton label="Bold" icon={<BoldGlyph size="xs" />} size="sm" variant="ghost" onClick={() => apply('bold')} />
            <IconButton label="Italic" icon={<ItalicGlyph size="xs" />} size="sm" variant="ghost" onClick={() => apply('italic')} />
            <IconButton label="Strikethrough" icon={<StrikethroughGlyph size="xs" />} size="sm" variant="ghost" onClick={() => apply('strikethrough')} />
            <Toolbar.Separator />
            <Toolbar.Wide>
              <IconButton label="Numbered list" icon={<ListOrderedGlyph size="xs" />} size="sm" variant="ghost" onClick={() => apply('numberedList')} />
              <IconButton label="Bulleted list" icon={<ListGlyph size="xs" />} size="sm" variant="ghost" onClick={() => apply('bulletList')} />
            </Toolbar.Wide>
            <Toolbar.Overflow>
              <Menu
                label="More formatting"
                items={[
                  { key: 'numbered', label: 'Numbered list', onSelect: () => apply('numberedList') },
                  { key: 'bulleted', label: 'Bulleted list', onSelect: () => apply('bulletList') },
                ]}
              />
            </Toolbar.Overflow>
          </Toolbar>
        }
        tools={
          <>
            <IconButton label="Attach" icon={<PlusGlyph size="xs" />} size="sm" variant="ghost" />
            <IconButton label="Emoji" icon={<FaceSlightlySmilingGlyph size="xs" />} size="sm" variant="ghost" />
            <IconButton label="Mention someone" icon={<AtSignGlyph size="xs" />} size="sm" variant="ghost" />
          </>
        }
        actions={<SendButton mode="send" disabledReason={text.trim() === '' ? 'Write a message first' : undefined} onPress={() => setText('')} />}
      />
    </div>
  );
}

export const WithToolsAndFormatting: Story = { render: () => <RoomComposer /> };

/** The same box at a side panel's width: the formatting row folds into a menu rather than wrapping. */
export const InANarrowPane: Story = { render: () => <RoomComposer width={300} /> };

/**
 * THE CHAT APPEARANCE (`appearance="chat"`): the box rests on the quiet box
 * edge and the pointer passing over it changes nothing.
 */
export const ChatAppearance: Story = { render: () => <RoomComposer chat /> };

/**
 * Focused, the chat box's edge steps to the strong grey and its shadow lifts,
 * with no accent ring. Reached by the keyboard, the step is two pixels thick.
 */
export const ChatAppearanceFocused: Story = {
  render: () => <RoomComposer chat />,
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLTextAreaElement>('.crewlet-composer__field')?.focus();
  },
};
