import type { Meta, StoryObj } from '@storybook/react-vite';
import { DensitySwitcher, ThemeSwitcher } from '@crewlethq/ui';

const meta: Meta<typeof ThemeSwitcher> = {
  title: 'UI/ThemeSwitcher',
  component: ThemeSwitcher,
};

export default meta;
type Story = StoryObj<typeof ThemeSwitcher>;

/**
 * Both rows are SETTINGS, so both are radio groups whose arrows change the
 * choice as they move. Each writes its attribute on the root element and
 * remembers it, so the preview around this story changes with them.
 */
export const Preferences: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Each row names itself, so nothing here labels it a second time. */}
      <ThemeSwitcher storageKey="storybook_theme" />
      <DensitySwitcher storageKey="storybook_density" />
      <p style={{ maxWidth: 420, fontSize: 13 }}>
        The density row draws one letter each and is called Compact, Normal and
        Comfortable: the letter is a picture of a size, and a reader hearing
        "S" is being told nothing they can act on.
      </p>
    </div>
  ),
};

/**
 * AS THE RAIL'S FOOT DRAWS THEM. The two rows sit side by side under the
 * navigation, beside a status pill, and are read past rather than read, so
 * they wear the quiet step: the small chip, the first pad on the scale, and a
 * glyph one step under the label register's.
 *
 * A GLYPH ROW AND A LETTER ROW ARE ONE ROW OF CONTROLS. Both hold their chips
 * under the 24px target floor, so every cell in both is that floor and the two
 * groups line up. They measured 98px and 79px wide with no two cells the same
 * before the floor was taken on the width as well as the height.
 */
export const RailFoot: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        width: 'var(--size-shell-rail)',
        padding: 'var(--spacing-3)',
        background: 'var(--color-surface-raised)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <ThemeSwitcher storageKey="storybook_theme" />
      <DensitySwitcher storageKey="storybook_density" />
    </div>
  ),
};
