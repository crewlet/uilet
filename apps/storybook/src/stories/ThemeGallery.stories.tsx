import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThemeGallery, ThemeSwatch } from '@crewlethq/ui';
import { themeRegistry, type ThemeId } from '@crewlethq/tokens';

const meta: Meta<typeof ThemeGallery> = {
  title: 'UI/ThemeGallery',
  component: ThemeGallery,
};

export default meta;
type Story = StoryObj<typeof ThemeGallery>;

/**
 * THE PICKER AND ITS PREVIEW. Every theme as a card under its group; the
 * arrows choose as they move and a click chooses, which applies. Pointing at
 * a card previews it in the pane beside the gallery once the pointer rests,
 * so crossing the grid does not repaint the window at every card, and leaving
 * the gallery puts the pane back on the theme in use.
 */
export const WithPreview: Story = {
  render: function Render() {
    const [value, setValue] = useState<ThemeId>('crewlet');
    const [preview, setPreview] = useState<ThemeId | null>(null);
    const shown = themeRegistry.find((theme) => theme.id === (preview ?? value))!;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) 244px', gap: 'var(--spacing-5)', alignItems: 'start' }}>
        <ThemeGallery value={value} onValueChange={setValue} onPreview={setPreview} />
        <aside style={{ display: 'grid', gap: 'var(--spacing-2)', position: 'sticky', top: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Preview · <b style={{ color: 'var(--color-text-primary)' }}>{shown.name}</b>
          </span>
          <ThemeSwatch swatch={shown.swatch} size="pane" mode="dark" />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{shown.description}</span>
        </aside>
      </div>
    );
  },
};

/** Two cards a row, for a narrow column. */
export const TwoColumns: Story = {
  render: function Render() {
    const [value, setValue] = useState<ThemeId>('iris');
    return (
      <div style={{ width: 300 }}>
        <ThemeGallery value={value} onValueChange={setValue} columns={2} />
      </div>
    );
  },
};
