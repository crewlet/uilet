import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BrandSample, SegmentedControl, type BrandSampleColors, type BrandSampleKind, type BrandSampleMode } from '@crewlethq/ui';
import mark from '@crewlethq/icons/favicon/crewlet.svg';
import wordmark from '@crewlethq/icons/svg/crewlet-icon.svg';

const meta: Meta<typeof BrandSample> = {
  title: 'UI/BrandSample',
  component: BrandSample,
};

export default meta;
type Story = StoryObj<typeof BrandSample>;

/** A brand's roles, as the engine stores them: lowercase `#rrggbb`. Story data, not tokens. */
const BRAND: BrandSampleColors = {
  primary: '#5b3df5',
  primary_on_dark: '#9d8bff',
  secondary: '#0e9f8a',
  text: '#16131f',
  light_ground: '#fbfaff',
  dark_ground: '#120a2b',
};

/**
 * THE FOUR DRAWINGS: a doc's opening and a title slide, each in light and in
 * dark. The mode is the sample's own, whatever the page's is, so the Brand
 * page's preview shows both.
 */
export const Grid: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, maxWidth: 880 }}>
      <BrandSample kind="doc" mode="light" name="Crewlet" colors={BRAND} logo={wordmark} mark={mark} />
      <BrandSample kind="doc" mode="dark" name="Crewlet" colors={BRAND} logo={wordmark} mark={mark} />
      <BrandSample kind="slide" mode="light" name="Crewlet" colors={BRAND} logo={wordmark} mark={mark} />
      <BrandSample kind="slide" mode="dark" name="Crewlet" colors={BRAND} logo={wordmark} mark={mark} />
    </div>
  ),
};

/**
 * THE PREVIEW ASIDE: the draft as it stands, a Doc or Slide switch and a
 * light or dark one above it, at an aside's width.
 */
export const Aside: Story = {
  render: function Render() {
    const [kind, setKind] = useState<BrandSampleKind>('doc');
    const [mode, setMode] = useState<BrandSampleMode>('light');
    return (
      <div style={{ display: 'grid', gap: 12, width: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <SegmentedControl<BrandSampleKind>
            semantics="radio"
            label="What the preview shows"
            size="sm"
            value={kind}
            onValueChange={setKind}
            options={[
              { value: 'doc', label: 'Doc' },
              { value: 'slide', label: 'Slide' },
            ]}
          />
          <SegmentedControl<BrandSampleMode>
            semantics="radio"
            label="Mode"
            size="sm"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
        <BrandSample kind={kind} mode={mode} name="Crewlet" colors={BRAND} logo={wordmark} mark={mark} />
      </div>
    );
  },
};

/** A GALLERY COVER: the same drawing at a card's width, edge to edge in the card's own clipped corner. */
export const Cover: Story = {
  render: () => (
    <div style={{ width: 260 }}>
      <BrandSample kind="slide" mode="dark" name="Crewlet" colors={BRAND} mark={mark} />
    </div>
  ),
};

/**
 * A BRAND NOT SET YET: every role the brand lacks is the product's own for the
 * sample's mode, no logo is the company's name in the heading face, and a
 * family list that is not names is the package's face.
 */
export const Fallbacks: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, maxWidth: 880 }}>
      <BrandSample kind="doc" mode="light" name="Halcyon Freight" colors={{}} headingFamily="x; color: red" />
      <BrandSample kind="slide" mode="dark" name="Halcyon Freight" colors={{ primary: '#c2410c' }} />
    </div>
  ),
};

/** The brand's own faces: a serif heading over a system body. */
export const Faces: Story = {
  render: () => (
    <div style={{ width: 420 }}>
      <BrandSample
        kind="doc"
        mode="light"
        name="Crewlet"
        colors={BRAND}
        logo={wordmark}
        headingFamily="ui-serif, Georgia, serif"
        bodyFamily="system-ui"
      />
    </div>
  ),
};
