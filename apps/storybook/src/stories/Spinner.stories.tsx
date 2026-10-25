import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Spinner } from '@crewlethq/ui';

/**
 * The package's one ring: a button's pending state, a request's state column
 * and a status tag all draw it. It takes the ink of the words beside it, and
 * under reduced motion it stops and stays open (switch the motion preference
 * in your system settings to see it).
 */
const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  args: { size: 'sm' },
  argTypes: { size: { control: 'inline-radio', options: ['em', 'xs', 'sm', 'md'] } },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Basic: Story = {};

/** The glyph scale: 12, 14 and 16px, the size of the glyph it stands in for. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--color-text-secondary)' }}>
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
    </div>
  ),
};

/** In a pending button, in the leading icon's place, with the label kept. */
export const InAButton: Story = {
  render: () => (
    <Button variant="primary" loading>
      Apply to this list
    </Button>
  ),
};
