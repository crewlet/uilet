import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BookmarkGlyph, EllipsisGlyph, FaceSlightlySmilingPlusGlyph, MessagesSquareGlyph } from '@crewlethq/icons/glyphs';
import { ActionDivider, EmojiPicker, Menu, MessageAction, MessageActions, QuickReaction } from '@crewlethq/ui';

/**
 * The tray a message shows on hover, keyboard focus or a tap: three quick
 * reactions, add reaction, reply in a thread, save, then More. It is the
 * transcript's own ground ringed with the hairline and a small shadow, with
 * the large corner and 30px tools, and one tab stop the arrow keys walk.
 * `ChatMessage` places it on the row's first line.
 */
const meta: Meta<typeof MessageActions> = {
  title: 'UI/MessageActions',
  component: MessageActions,
};

export default meta;
type Story = StoryObj<typeof MessageActions>;

function Tray({ held }: { held?: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <MessageActions>
      <QuickReaction emoji="✅" onPick={() => {}} disabledReason={held} />
      <QuickReaction emoji="👀" onPick={() => {}} disabledReason={held} />
      <QuickReaction emoji="🙌" onPick={() => {}} disabledReason={held} />
      <EmojiPicker
        label="Add a reaction"
        onPick={() => {}}
        trigger={(_open, toggle) => (
          <MessageAction label="Add a reaction" icon={<FaceSlightlySmilingPlusGlyph size="md" />} onClick={toggle} disabledReason={held} />
        )}
      />
      <MessageAction label="Reply in thread" icon={<MessagesSquareGlyph size="md" />} />
      <MessageAction
        label={saved ? 'Remove from Saved' : 'Save for later'}
        icon={<BookmarkGlyph size="md" />}
        pressed={saved}
        onClick={() => setSaved((was) => !was)}
      />
      <ActionDivider />
      <Menu
        label="More actions"
        align="end"
        renderTrigger={(props) => <MessageAction {...props} label="More actions" icon={<EllipsisGlyph size="md" />} />}
        items={[
          { key: 'copy', label: 'Copy link', onSelect: () => {} },
          { key: 'unread', label: 'Mark unread', hint: 'U', onSelect: () => {} },
        ]}
      />
    </MessageActions>
  );
}

/** Tab to the tray once, then walk it with the arrows. Save is a toggle; More and add reaction read as held while open. */
export const Default: Story = { render: () => <Tray /> };

/**
 * A reader who is not in the room: the quick reactions and Add a reaction are
 * marked unavailable, do nothing when pressed, and say why in their hint, as
 * the reactions under the words do. Reply, save and More stay available.
 */
export const Held: Story = { render: () => <Tray held="Join the room to react." /> };
