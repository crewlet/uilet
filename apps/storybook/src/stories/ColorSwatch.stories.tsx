import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorSwatch } from '@crewlethq/ui';

const meta: Meta<typeof ColorSwatch> = {
  title: 'UI/ColorSwatch',
  component: ColorSwatch,
};

export default meta;
type Story = StoryObj<typeof ColorSwatch>;

/** A brand's roles, as the engine stores them: lowercase `#rrggbb`. Story data, not tokens. */
const BRAND = {
  primary: '#5b3df5',
  secondary: '#0e9f8a',
  text: '#16131f',
  lightGround: '#fbfaff',
} as const;

/**
 * THE COLOURS CARD FOR A READER: each role as a chip, its name, its value and
 * a copy control that says whether the value landed. A role with no colour is
 * the hatch of none, never a guess.
 */
export const Swatches: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16, maxWidth: 900 }}>
      <ColorSwatch name="Primary" value={BRAND.primary} description="Links, buttons and accents" />
      <ColorSwatch name="Secondary" value={BRAND.secondary} description="Highlights and charts" />
      <ColorSwatch name="Text" value={BRAND.text} description="Body text" />
      <ColorSwatch name="Light ground" value={BRAND.lightGround} description="Pages and slides" />
      <ColorSwatch name="Dark ground" value="" description="Covers and dark slides" />
    </div>
  ),
};

/** The small swatch, a chip beside the words, for a dense list such as the adopt dialog's changes. */
export const Small: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <ColorSwatch size="sm" name="Primary" value={BRAND.primary} />
      <ColorSwatch size="sm" name="Text" value={BRAND.text} copyable={false} />
      <ColorSwatch size="sm" name="Dark ground" value="" />
    </div>
  ),
};
