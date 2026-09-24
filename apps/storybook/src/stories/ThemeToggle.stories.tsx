import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, ThemeSwitcher, ThemeToggle, useThemePreference } from '@crewlethq/ui';

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

/**
 * One press from the palette on the screen to the other one. It resolves a
 * reader who follows the system against the system, so the first press always
 * repaints, and it writes the explicit opposite. Its name is what a press will
 * do and its glyph is where it goes: a sun on a dark page, a moon on a light
 * one.
 */
export const Default: Story = {
  args: { storageKey: 'storybook_theme' },
};

/**
 * AS THE RAIL'S FOOT DRAWS IT, beside the reader's own identity row: the
 * quiet `sm` step and the ghost chrome, which lifts only on a hover.
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
        background: 'var(--color-surface-frame)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Avatar name="Jane Founder" kind="human" size="sm" />
      <span style={{ flex: 1, minWidth: 0 }}>Jane Founder</span>
      <ThemeToggle storageKey="storybook_theme" />
    </div>
  ),
};

/**
 * ONE PREFERENCE, TWO CONTROLS. The application holds the choice with one
 * `useThemePreference` and hands it to the toggle in the rail and the full row
 * on a settings screen, both CONTROLLED: neither writes anything of its own,
 * so there is one writer and the two can never disagree.
 */
export const Owned: Story = {
  render: function Owned() {
    const [theme, setTheme] = useThemePreference({ storageKey: 'storybook_theme' });
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        <ThemeToggle value={theme} onChange={setTheme} />
        <ThemeSwitcher value={theme} onChange={setTheme} />
      </div>
    );
  },
};
