import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconTile } from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';
import { ChartPieGlyph, DatabaseGlyph, GaugeGlyph, LayersGlyph, ListChecksGlyph, RadioGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';

/**
 * A glyph on a tinted square, what a choice in a catalog is told apart by
 * before its name is read. The hue marks a kind, never a state.
 */
const meta: Meta<typeof IconTile> = {
  title: 'UI/IconTile',
  component: IconTile,
  args: { children: <GaugeGlyph size="sm" /> },
};

export default meta;
type Story = StoryObj<typeof IconTile>;

export const Default: Story = {};

export const Hues: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      {(['purple', 'cyan', 'green', 'amber', 'rose', 'blue'] as const).map((hue) => (
        <IconTile key={hue} hue={hue}>
          <RadioGlyph size="sm" />
        </IconTile>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <IconTile hue="amber" size="sm">
        <ChartPieGlyph size="sm" />
      </IconTile>
      <IconTile hue="amber">
        <ChartPieGlyph size="sm" />
      </IconTile>
      <IconTile hue="amber" size="lg">
        <ChartPieGlyph size="md" />
      </IconTile>
    </div>
  ),
};

/** A place or a record rather than a kind: the raised ground in the secondary ink, as an Open in app card draws a task. */
export const Neutral: Story = {
  render: () => (
    <IconTile tone="neutral" size="sm">
      <ListChecksGlyph size="sm" />
    </IconTile>
  ),
};

/**
 * A disc is one entry of a catalogue: round, with the vendor it lives at on
 * its lower corner, a ring and a badge when it needs a person (the word is
 * said beside it), and a dashed edge while nobody has confirmed it.
 */
export const Discs: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <IconTile shape="disc" tone="neutral" size="sm">
          <LayersGlyph />
        </IconTile>
        <IconTile shape="disc" tone="neutral" mark={<VendorMark vendor="aws" />}>
          <DatabaseGlyph />
        </IconTile>
        <IconTile shape="disc" tone="neutral" mark={<VendorMark vendor="aws" />} status={{ tone: 'danger' }}>
          <DatabaseGlyph />
        </IconTile>
        <IconTile shape="disc" tone="neutral" status={{ tone: 'warning' }}>
          <LayersGlyph />
        </IconTile>
        <IconTile shape="disc" tone="neutral" dashed>
          <LayersGlyph />
        </IconTile>
        <IconTile shape="disc" hue="purple" size="lg" mark={<VendorMark vendor="github" />} status={{ tone: 'info' }}>
          <LayersGlyph />
        </IconTile>
      </div>
    </BothThemes>
  ),
};
