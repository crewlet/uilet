import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard, StatGroup } from '@crewlethq/ui';
import { TokenGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof StatCard> = {
  title: 'UI/StatCard',
  component: StatCard,
  args: {
    label: 'Total tokens',
    value: '831.3K',
    tone: 'neutral',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'success', 'warning', 'danger', 'info'] },
    loading: { control: 'boolean' },
    flush: { control: 'boolean' },
    unit: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

/**
 * THE LABEL SITS ABOVE THE VALUE, in the micro-caps register, which is the
 * engine's order and the one a board is read in: the labels are what a reader
 * scans to find the tile they want and the number is the answer underneath. It
 * is also the order a screen reader gets right, "total tokens, 831.3K" rather
 * than "831.3K, total tokens".
 */
export const Basic: Story = {};

export const WithSub: Story = {
  args: { label: 'Seats', value: '7', sub: '3 working, 4 idle' },
};

export const WithUnit: Story = {
  args: { label: 'Median turn', value: '412', unit: 'ms' },
};

export const WithIcon: Story = {
  args: {
    label: 'Tokens (7d)',
    value: '831.3K',
    sub: '722.0K in, 109.3K out',
    icon: <TokenGlyph size="sm" />,
  },
};

/**
 * A placeholder line and `aria-busy`, not `--`. Two dashes are read aloud as
 * "dash dash" and look exactly like a measured value of nothing, which is a
 * different fact from a value that has not arrived.
 */
export const Loading: Story = {
  args: { loading: true },
};

/**
 * A lone tile brings the engine's whole panel recipe, so it is the same object
 * as the panel beside it: the surface, the hairline, the 12px corner and the
 * elevation, which is a top hairline on dark and a shadow on light. It gives
 * the elevation back when it is flush inside a StatGroup.
 */
export const Standalone: Story = {
  args: { label: 'Seats', value: '12', sub: '3 working, 9 idle' },
  decorators: [(Story) => <div style={{ maxWidth: 260 }}>{Story()}</div>],
};

/**
 * A tone paints the VALUE, and only where the number IS an outcome: a turn's
 * decision, a probe's verdict. Tinting every tile would spend the four status
 * hues on decoration and leave the one tile that means something
 * indistinguishable from its neighbours.
 */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 12 }}>
      <StatCard label="Total tokens" value="831.3K" />
      <StatCard label="Delivered" value="48" tone="success" />
      <StatCard label="Waiting on a person" value="2" tone="warning" />
      <StatCard label="Refusals" value="3" tone="danger" />
    </div>
  ),
};

/**
 * A row as one card. The column count never moves with its contents: a grid
 * that reflowed as tiles appeared moved every number on the page for a reason
 * that had nothing to do with the numbers.
 */
export const AsAGroup: Story = {
  render: () => (
    <StatGroup columns={4}>
      <StatCard flush label="Total tokens" value="831.3K" sub="7 days" />
      <StatCard flush label="Input" value="722.0K" />
      <StatCard flush label="Output" value="109.3K" />
      <StatCard flush label="LLM calls" value="48" />
    </StatGroup>
  ),
};

export const AGroupStillLoading: Story = {
  render: () => (
    <StatGroup columns={3}>
      <StatCard flush label="Total tokens" value="0" loading />
      <StatCard flush label="Input" value="0" loading />
      <StatCard flush label="Output" value="0" loading />
    </StatGroup>
  ),
};
