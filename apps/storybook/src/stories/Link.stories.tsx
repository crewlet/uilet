import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link, Text } from '@crewlethq/ui';

const meta: Meta<typeof Link> = {
  title: 'UI/Link',
  component: Link,
  args: { href: '#/org', children: 'the org chart' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'subtle'] },
    size: { control: 'inline-radio', options: ['body', 'caption'] },
    external: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Link>;

export const InASentence: Story = {
  render: (args) => (
    <Text as="p">
      Every seat in <Link {...args} /> is a queue-driven runtime.
    </Text>
  ),
};

/** An identity a reader clicks through to, rather than an instruction. */
export const Subtle: Story = {
  args: { variant: 'subtle', children: 'Chief Executive' },
};

/**
 * The register that made this a component rather than a class. Spelled as a
 * caption-sized piece of text, this took the caption's quiet ink and stopped
 * reading as a link at all.
 */
export const Caption: Story = {
  args: { size: 'caption', children: 'evt_01HZXQ' },
};

/**
 * The mark AND the sentence. The glyph alone says "new tab" to somebody
 * looking at it and nothing at all to somebody listening, so a visually
 * hidden "(opens in a new tab)" travels with it.
 */
export const External: Story = {
  args: { external: true, href: 'https://docs.crewlet.ai', children: 'the documentation' },
};

/** A whole row is the target: no underline, and the ring is drawn inside. */
export const BlockRow: Story = {
  render: () => (
    <div style={{ maxWidth: 360, border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
      <Link href="#/turns/t-1" block style={{ padding: 'var(--spacing-3)' }}>
        <Text variant="cell">Turn t-1</Text>
        <br />
        <Text variant="caption">execute, 4 rounds</Text>
      </Link>
    </div>
  ),
};
