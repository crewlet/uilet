import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandScope, Button, Checkbox, Tag, type BrandColors } from '@crewlethq/ui';

const meta: Meta<typeof BrandScope> = {
  title: 'UI/BrandScope',
  component: BrandScope,
};

export default meta;
type Story = StoryObj<typeof BrandScope>;

/** A brand's roles, as the engine stores them: lowercase `#rrggbb`. Story data, not tokens. */
const ACME: BrandColors = {
  primary: '#0a7f5a',
  primary_on_dark: '#3fd69a',
  secondary: '#f2a33a',
  text: '#1d2b24',
  light_ground: '#f7f4ec',
  dark_ground: '#0b1410',
};

/**
 * What a branded region holds: a ground, a heading in the heading face, a
 * paragraph with a link, the primary action, a selected tag and a ticked box,
 * every one painted with the public tokens and none with a brand colour of its
 * own.
 */
function Doc({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-3)',
        padding: 'var(--spacing-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-background)',
        border: '1px solid var(--color-border-default)',
      }}
    >
      <h2 style={{ margin: 0, fontFamily: 'var(--font-family-display)', fontSize: 'var(--font-size-2xl)' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
        Every team finished the quarter on plan. <a href="#/breakdown" style={{ color: 'var(--color-text-link-quiet)' }}>See the breakdown</a>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)', alignItems: 'center' }}>
        <Button>Publish the review</Button>
        <Button variant="secondary">Share</Button>
        <Tag variant="brand">Selected</Tag>
        <Checkbox label="Notify the team" defaultChecked />
      </div>
    </div>
  );
}

/**
 * A REGION IN THE BRAND, THE CHROME IN THE PRODUCT'S: the same doc outside the
 * scope and inside it. The brand follows the page's light or dark (the Mode
 * toolbar), each mode from its own steps: the primary for dark grounds in
 * dark, the brand's text on its light ground only. The focus ring stays the
 * theme's.
 */
export const Region: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, maxWidth: 1000 }}>
      <Doc title="Without a brand" />
      <BrandScope colors={ACME} headingFamily="Georgia, 'Times New Roman', serif">
        <Doc title="In the Acme brand" />
      </BrandScope>
    </div>
  ),
};

/**
 * A PINNED MODE: the same brand in light beside dark, whatever the page is in,
 * as a preview shows it. A role the brand lacks takes the default theme's
 * value for the pinned mode.
 */
export const Pinned: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, maxWidth: 1000 }}>
      <BrandScope colors={ACME} mode="light">
        <Doc title="Light" />
      </BrandScope>
      <BrandScope colors={ACME} mode="dark">
        <Doc title="Dark" />
      </BrandScope>
    </div>
  ),
};

/**
 * ONE INPUT, THE WHOLE FAMILY: a brand that sets only its primary colour
 * restyles the accent, its hover, press, ink, soft fill and the label on it,
 * and leaves the grounds, the text and the faces on the page's own.
 */
export const PrimaryOnly: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <BrandScope colors={{ primary: '#f5c400' }}>
        <Doc title="A yellow primary" />
      </BrandScope>
    </div>
  ),
};
