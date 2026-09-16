import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text, type TextVariant } from '@crewlethq/ui';

const meta: Meta<typeof Text> = {
  title: 'UI/Text',
  component: Text,
  args: { variant: 'body', children: 'The org chart is the execution graph.' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['display', 'stat', 'heading', 'lead', 'body', 'cell', 'caption', 'label'],
    },
    tone: { control: 'inline-radio', options: [undefined, 'primary', 'secondary', 'tertiary'] },
    mono: { control: 'boolean' },
    numeric: { control: 'boolean' },
    truncate: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

const REGISTERS: { variant: TextVariant; what: string }[] = [
  { variant: 'display', what: 'A page title' },
  { variant: 'stat', what: '12,400' },
  { variant: 'heading', what: 'A panel title' },
  { variant: 'lead', what: 'The sentence that introduces a screen' },
  { variant: 'body', what: 'Body copy, and the one that needs no thought' },
  { variant: 'cell', what: 'A value inside a dense row' },
  { variant: 'caption', what: 'Metadata beside a value' },
  { variant: 'label', what: 'A column head' },
];

/** Every register at once, which is the only way to read a scale. */
export const Registers: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      {REGISTERS.map(({ variant, what }) => (
        <div key={variant} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-4)' }}>
          <Text variant="label" style={{ width: 80, flex: 'none' }}>
            {variant}
          </Text>
          <Text variant={variant}>{what}</Text>
        </div>
      ))}
    </div>
  ),
};

/**
 * A register sets its own ink, and a tone overrides it. There is deliberately
 * no decoration step: that ink is measured into the 2.8 to 4.5:1 band and
 * carries a mark, never a word.
 */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
      <Text>Primary, the default</Text>
      <Text tone="secondary">Secondary, for a supporting sentence</Text>
      <Text tone="tertiary">Tertiary, for a fact a reader still has to read</Text>
      <Text variant="caption">A caption, quiet without being told to be</Text>
    </div>
  ),
};

/** Tabular figures, so a number that ticks up moves nothing beside it. */
export const Numeric: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
      <Text variant="cell" numeric>
        1,111,111
      </Text>
      <Text variant="cell" numeric>
        8,888,888
      </Text>
      <Text variant="cell">1,111,111 without tabular figures</Text>
      <Text variant="cell">8,888,888 without tabular figures</Text>
    </div>
  ),
};

/** One line, two lines, or a bounded measure. */
export const Cutting: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', maxWidth: 320 }}>
      <Text truncate>A single line that has more to say than the column it sits in has room for</Text>
      <Text clamp={2}>
        Two lines, then an ellipsis. A summary in a card belongs here: the reader gets enough to
        decide whether to open the record, and the card stays the height of every other card.
      </Text>
      <Text as="p" measure="narrow">
        A bounded measure, so a paragraph in a side panel does not run the full width of a desk
        monitor and lose the reader between one line and the next.
      </Text>
    </div>
  ),
};
