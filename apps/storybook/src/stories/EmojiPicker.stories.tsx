import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { FaceSlightlySmilingGlyph, StarGlyph } from '@crewlethq/icons/glyphs';
import { EMOJI_GROUP_GLYPHS, EMOJI_GROUPS, EmojiPicker, IconButton, type EmojiGroup } from '@crewlethq/ui';

/**
 * A searchable grid of emoji in a popover. The field has focus when it
 * opens: type to filter, Enter picks the first match, ArrowDown goes into the
 * grid, which is one tab stop the arrows walk by its rows; ArrowUp from the
 * top row returns to the field, and Escape closes it. A row of category tabs
 * over the field jumps the grid to a group, and the tab of the group at the
 * grid's top is underlined. The panel keeps one size whatever it shows.
 */
const meta: Meta<typeof EmojiPicker> = {
  title: 'UI/EmojiPicker',
  component: EmojiPicker,
};

export default meta;
type Story = StoryObj<typeof EmojiPicker>;

function Picking({ groups, groupGlyphs }: { groups?: readonly EmojiGroup[]; groupGlyphs?: Record<string, ReactNode> }) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
      <EmojiPicker
        label="Insert an emoji"
        tooltip="Emoji"
        align="start"
        groups={groups}
        groupGlyphs={groupGlyphs}
        onPick={(emoji) => setPicked((was) => [...was, emoji])}
        trigger={(_open, toggle) => <IconButton label="Emoji" size="sm" variant="ghost" icon={<FaceSlightlySmilingGlyph size="sm" />} onClick={toggle} />}
      />
      <span aria-live="polite">{picked.join(' ')}</span>
    </div>
  );
}

/** Open it from the composer's emoji tool, and pick. */
export const Default: Story = { render: () => <Picking /> };

/** A host's own group: it takes a tab of its own, with the glyph the host names for it. */
const TEAM: EmojiGroup = {
  label: 'Team',
  items: [
    { emoji: '⭐', name: 'star', shortcode: ':star:' },
    { emoji: '🏆', name: 'trophy', shortcode: ':trophy:' },
    { emoji: '🎯', name: 'target', shortcode: ':dart:' },
    { emoji: '🧭', name: 'compass', shortcode: ':compass:' },
  ],
};

/** More groups than the grid holds at once: press a tab to jump, scroll to move the underline. */
export const CategoryTabs: Story = {
  render: () => (
    <Picking groups={[...EMOJI_GROUPS, TEAM, ...EMOJI_GROUPS.map((group) => ({ ...group, label: `${group.label}, again` }))]} groupGlyphs={{ ...EMOJI_GROUP_GLYPHS, Team: <StarGlyph size="lg" /> }} />
  ),
};
