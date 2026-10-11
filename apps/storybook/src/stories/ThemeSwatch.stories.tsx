import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select, ThemeSwatch, type SelectValue } from '@crewlethq/ui';
import { themeGroups, themeRegistry } from '@crewlethq/tokens';

const meta: Meta<typeof ThemeSwatch> = {
  title: 'UI/ThemeSwatch',
  component: ThemeSwatch,
};

export default meta;
type Story = StoryObj<typeof ThemeSwatch>;

const abyss = themeRegistry.find((theme) => theme.id === 'abyss')!;

/**
 * THREE SIZES OF ONE DRAWING. A chip beside a name in a list, a card in a
 * picker, and a pane large enough to read as a screen. Each is drawn from the
 * theme's registry entry, never from the page, so a thumbnail shows a theme
 * that is not the one on screen. Both palettes by default, dark then light;
 * `mode` draws one.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', width: 260 }}>
      <ThemeSwatch swatch={abyss.swatch} size="chip" label="Abyss" />
      <ThemeSwatch swatch={abyss.swatch} size="card" label="Abyss" />
      <ThemeSwatch swatch={abyss.swatch} size="pane" mode="dark" label="Abyss, dark" />
      <ThemeSwatch swatch={abyss.swatch} size="pane" mode="light" label="Abyss, light" />
    </div>
  ),
};

/** Every theme `@crewlethq/tokens` ships, as a card with its name and tag. */
export const EveryTheme: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 180px)', gap: 'var(--spacing-3)' }}>
      {themeRegistry.map((theme) => (
        <figure key={theme.id} style={{ margin: 0, display: 'grid', gap: 'var(--spacing-1)' }}>
          <ThemeSwatch swatch={theme.swatch} />
          <figcaption style={{ fontSize: 12 }}>
            {theme.name} <span style={{ color: 'var(--color-text-tertiary)' }}>{theme.tag}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

/**
 * AS A SELECT DRAWS IT: the chip is an option's `leading` mark, on the
 * trigger too while it is chosen, and the tag is its `hint`, grouped as the
 * registry groups the themes. A preferences panel's Theme row.
 */
export const InASelect: Story = {
  render: function Render() {
    const [value, setValue] = useState<SelectValue | SelectValue[] | undefined>('crewlet');
    const groupName = (id: string) => themeGroups.find((group) => group.id === id)?.name ?? '';
    return (
      <div style={{ width: 256 }}>
        <Select
          ariaLabel="Theme"
          size="sm"
          value={value}
          onChange={(next) => setValue(next)}
          options={themeRegistry.map((theme) => ({
            value: theme.id,
            label: theme.name,
            hint: theme.tag,
            group: groupName(theme.group),
            leading: <ThemeSwatch swatch={theme.swatch} size="chip" />,
          }))}
        />
      </div>
    );
  },
};
