import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ColorChip } from '@crewlethq/ui';

const meta: Meta<typeof ColorChip> = {
  title: 'UI/ColorChip',
  component: ColorChip,
  args: { value: '#007f7f', size: 'xs', shape: 'round' },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm'] },
    shape: { control: 'inline-radio', options: ['round', 'square'] },
  },
};

export default meta;
type Story = StoryObj<typeof ColorChip>;

/** A COLOUR AS A CHIP and nothing else, with an edge of its own. */
export const Basic: Story = {};

/** A VALUE THAT IS NOT #rrggbb draws the hatch of no colour. */
export const Empty: Story = { args: { value: '' } };

/**
 * THE MARK ON A SUGGESTION: a small button that applies a colour, with the
 * chip as its leading mark and the words saying what it is.
 */
export const OnSuggestions: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Button size="small" variant="outline" leadingIcon={<ColorChip value="#00a0a0" />}>
        Use #00a0a0 · 3:1
      </Button>
      <Button size="small" variant="outline" leadingIcon={<ColorChip value="#007f7f" />}>
        Use #007f7f · 4.5:1, best for text links
      </Button>
      <Button size="small" variant="ghost">
        Use on dark grounds instead
      </Button>
    </div>
  ),
};
