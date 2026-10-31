import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FaceSlightlySmilingGlyph } from '@crewlethq/icons/glyphs';
import { EmojiPicker, IconButton } from '@crewlethq/ui';

/**
 * A searchable grid of emoji in a popover. The field has focus when it
 * opens: type to filter, Enter picks the first match, ArrowDown goes into the
 * grid, which is one tab stop the arrows walk by its rows; ArrowUp from the
 * top row returns to the field, and Escape closes it.
 */
const meta: Meta<typeof EmojiPicker> = {
  title: 'UI/EmojiPicker',
  component: EmojiPicker,
};

export default meta;
type Story = StoryObj<typeof EmojiPicker>;

function Picking() {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
      <EmojiPicker
        label="Insert an emoji"
        tooltip="Emoji"
        align="start"
        onPick={(emoji) => setPicked((was) => [...was, emoji])}
        trigger={(_open, toggle) => <IconButton label="Emoji" size="sm" variant="ghost" icon={<FaceSlightlySmilingGlyph size="sm" />} onClick={toggle} />}
      />
      <span aria-live="polite">{picked.join(' ')}</span>
    </div>
  );
}

/** Open it from the composer's emoji tool, and pick. */
export const Default: Story = { render: () => <Picking /> };
