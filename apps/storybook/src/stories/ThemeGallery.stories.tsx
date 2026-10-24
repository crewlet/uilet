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

/**
 * A THEME OF SOMETHING OTHER THAN THE PRODUCT: a slide deck's themes, each
 * card drawn by the caller as the deck's cover in that theme (`renderPreview`),
 * listed under no heading.
 */
export const CallerDrawnPreview: Story = {
  render: function Render() {
    const decks = [
      { id: 'nightshade', name: 'Nightshade', tag: 'Periwinkle on blue-black', group: 'deck', ground: '#0d0f16', ink: '#e8ebf4', accent: '#9584ff' },
      { id: 'ink', name: 'Ink', tag: 'Navy and paper', group: 'deck', ground: '#1d2433', ink: '#f5f3ee', accent: '#2f5d8c' },
      { id: 'paper', name: 'Paper', tag: 'White, quiet and exact', group: 'deck', ground: '#f2f2ee', ink: '#111111', accent: '#2450e6' },
    ];
    const [value, setValue] = useState('nightshade');
    return (
      <div style={{ maxWidth: 420 }}>
        <ThemeGallery
          label="Deck theme"
          value={value}
          onValueChange={setValue}
          themes={decks}
          groups={[]}
          renderPreview={(theme) => {
            const deck = decks.find((d) => d.id === theme.id)!;
            return (
              <span style={{ display: 'grid', gap: 6, aspectRatio: '16 / 9', padding: 12, background: deck.ground, color: deck.ink, fontSize: 11, alignContent: 'center' }}>
                <span style={{ width: 16, height: 2, background: deck.accent }} />
                Quarterly plan
              </span>
            );
          }}
        />
      </div>
    );
  },
};

/**
 * THE COMPANY'S OWN THEME AMONG THE PRODUCT'S: the slides create page's
 * picker, the brand's theme first with its tag as the accent's pill, and
 * every other theme with its tag as a quiet line under its name. A tag is
 * drawn and said once: the card's name carries it.
 */
export const WithCompanyBrand: Story = {
  render: function Render() {
    const decks = [
      { id: 'brand', name: 'FairSplit', tag: 'Your company brand', tagTone: 'brand' as const, group: 'deck', ground: '#0d1a14', ink: '#eaf6f0', accent: '#3ccb9c' },
      { id: 'nightshade', name: 'Nightshade', tag: 'Periwinkle on blue-black', group: 'deck', ground: '#0d0f16', ink: '#e8ebf4', accent: '#9584ff' },
      { id: 'paper', name: 'Paper', group: 'deck', ground: '#f2f2ee', ink: '#111111', accent: '#2450e6' },
    ];
    const [value, setValue] = useState('brand');
    return (
      <div style={{ maxWidth: 420 }}>
        <ThemeGallery
          label="Deck theme"
          value={value}
          onValueChange={setValue}
          themes={decks}
          groups={[]}
          columns={2}
          renderPreview={(theme) => {
            const deck = decks.find((d) => d.id === theme.id)!;
            return (
              <span style={{ display: 'grid', gap: 6, aspectRatio: '16 / 9', padding: 12, background: deck.ground, color: deck.ink, fontSize: 11, alignContent: 'center' }}>
                <span style={{ width: 16, height: 2, background: deck.accent }} />
                Quarterly plan
              </span>
            );
          }}
        />
      </div>
    );
  },
};
