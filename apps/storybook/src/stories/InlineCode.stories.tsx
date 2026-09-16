import type { Meta, StoryObj } from '@storybook/react-vite';
import { Callout, InlineCode, Text } from '@crewlethq/ui';

const meta: Meta<typeof InlineCode> = {
  title: 'UI/InlineCode',
  component: InlineCode,
  args: { children: 'store.driver' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'reference'] },
    tone: { control: 'inline-radio', options: ['default', 'inherit'] },
    truncate: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof InlineCode>;

export const InASentence: Story = {
  render: (args) => (
    <Text as="p">
      The field <InlineCode {...args} /> was retired, and so was the environment variable beside it.
    </Text>
  ),
};

/** A pointer at a value, never the value. Both appear on one screen. */
export const Reference: Story = {
  args: { variant: 'reference', children: '${SLACK_BOT_TOKEN}' },
  render: (args) => (
    <Text as="p">
      The company document stores <InlineCode {...args} /> and the sealed store holds what it points
      at.
    </Text>
  ),
};

/**
 * It wraps anywhere, which is the whole reason it is a component. A URL is one
 * unbreakable word to a line breaker, so without an explicit break opportunity
 * the chip is pushed whole onto its own line and the sentence is torn up.
 */
export const ALongURL: Story = {
  render: () => (
    <div style={{ maxWidth: 260 }}>
      <Text as="p">
        Deliveries are signed against{' '}
        <InlineCode>https://example.com/api/webhooks/github/deliveries</InlineCode> and nothing else.
      </Text>
    </div>
  ),
};

/**
 * Inside a message the chip takes the message's INK and keeps its own ground.
 * The ground is what says the run of monospace is a string somebody types, and
 * a bare one inside an alarming sentence reads as a quotation from somewhere
 * calmer. Every status ink is measured on that well by the palette suite in
 * @crewlethq/tokens, at 4.5:1 or better in both themes.
 *
 * Switch the Theme toolbar to see both palettes.
 */
export const InsideAMessage: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 520 }}>
      <Callout variant="danger" title="The configuration was refused">
        <Text as="p">
          <InlineCode tone="inherit">providers.llm[1].model</InlineCode> names a model no entry offers.
        </Text>
      </Callout>
      <Callout variant="warning" title="A credential is unset">
        <Text as="p">
          <InlineCode tone="inherit" variant="reference">
            ${'{'}SLACK_BOT_TOKEN{'}'}
          </InlineCode>{' '}
          points at an entry the store does not hold.
        </Text>
      </Callout>
    </div>
  ),
};
