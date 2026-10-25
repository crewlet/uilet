import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconTile } from '@crewlethq/ui';
import { ChartPieGlyph, GaugeGlyph, ListChecksGlyph, RadioGlyph } from '@crewlethq/icons/glyphs';

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
