import type { Meta, StoryObj } from '@storybook/react-vite';
import { CanvasSchematic } from '@crewlethq/ui';

/**
 * UI / CanvasSchematic.
 *
 * A design's gallery cover, drawn from its canvas's numbers: every board where
 * the canvas puts it, the cover board marked and titled, notes as faint
 * blocks. Nothing is framed and nothing is captured.
 */
const meta: Meta<typeof CanvasSchematic> = {
  title: 'UI/CanvasSchematic',
  component: CanvasSchematic,
};

export default meta;
type Story = StoryObj<typeof CanvasSchematic>;

const BOARDS = [
  { id: 'hero', x: 0, y: 0, w: 1440, h: 900, title: 'Hero' },
  { id: 'features', x: 1540, y: 0, w: 1440, h: 900, title: 'Features' },
  { id: 'pricing', x: 0, y: 1000, w: 1440, h: 900, title: 'Pricing' },
  { id: 'mobile', x: 1540, y: 1000, w: 390, h: 844, title: 'Mobile' },
];

/** At a gallery card's size. */
export const Default: Story = {
  render: () => (
    <div style={{ width: 280, height: 160 }}>
      <CanvasSchematic
        label="Launch landing page, 4 boards"
        boards={BOARDS}
        notes={[{ x: 0, y: -160, w: 1200, h: 100 }]}
        cover="hero"
      />
    </div>
  ),
};
