import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container, Text } from '@crewlethq/ui';

const meta: Meta<typeof Container> = {
  title: 'UI/Container',
  component: Container,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl', '2xl', 'full'] },
  },
  args: { size: 'lg' },
};

export default meta;
type Story = StoryObj<typeof Container>;

const Band = ({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }) => (
  <Container size={size}>
    <div
      style={{
        background: 'var(--color-surface-subtle)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-3)',
        marginBlock: 'var(--spacing-2)',
      }}
    >
      <Text variant="label">{size}</Text>
    </div>
  </Container>
);

/** The measures, one under another, so the scale is readable as a scale. */
export const Sizes: Story = {
  render: () => (
    <div style={{ paddingBlock: 'var(--spacing-5)' }}>
      {(['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const).map((size) => (
        <Band key={size} size={size} />
      ))}
    </div>
  ),
};

/**
 * `full` keeps the gutter and drops the measure, for a canvas or a wide grid
 * that genuinely wants the viewport but still needs its content off the
 * window edge.
 */
export const Full: Story = { args: { size: 'full' }, render: () => <Band size="full" /> };
