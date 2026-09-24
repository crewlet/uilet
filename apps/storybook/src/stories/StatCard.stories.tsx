import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonLink, Meter, SegmentedMeter, Sparkline, StatCard, StatGroup } from '@crewlethq/ui';
import { ArrowRightGlyph, CoinsGlyph } from '@crewlethq/icons/glyphs';

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
 * THE LABEL SITS ABOVE THE VALUE, in sentence case at the caption step, which
 * is the approved design's tile and the order a board is read in: the labels
 * are what a reader scans to find the tile they want and the number, at the
 * display step, is the answer underneath. It is also the order a screen reader
 * gets right, "total tokens, 831.3K" rather than "831.3K, total tokens".
 */
export const Basic: Story = {};

/**
 * THE HOME ROW, as the approved design draws it: five tiles on the sheet, each
 * a flat card. A figure at the end of the value's line says where the number
 * has been going or what it is made of (the state bar of who is working,
 * waiting, stopped and idle, a sparkline whose accent point is now, a meter
 * against a budget), a change against an earlier reading heads the second line in the
 * ink of whether it was wanted, and a small control can stand in the figure's
 * place when the number is something to act on.
 */
export const TheHomeRow: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 12,
        padding: 16,
        background: 'var(--color-surface-background)',
      }}
    >
      <StatCard
        label="Agents working now"
        value="4"
        unit="/ 7"
        // Decorative here: the value and the line under it already say every
        // part the bar draws, so a name would read them out a second time.
        trend={
          <SegmentedMeter
            segments={[
              { id: 'working', value: 4, tone: 'info', label: 'working' },
              { id: 'waiting', value: 1, tone: 'warning', label: 'waiting' },
              { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
            ]}
            total={7}
            decorative
          />
        }
        sub="1 waiting · 1 stopped · 1 idle"
      />
      <StatCard
        label="Waiting on your decision"
        value="3"
        trend={
          <ButtonLink href="#/inbox" size="small" variant="secondary" trailingIcon={<ArrowRightGlyph />}>
            Review
          </ButtonLink>
        }
        sub="Oldest waiting 2h 10m"
        // A person kept waiting is a state, so the line takes the warning ink.
        subTone="warning"
      />
      <StatCard
        label="Tasks in progress"
        value="18"
        trend={<Sparkline values={[2, 4, 4, 8, 6, 10, 8, 12, 10, 14, 12, 16]} current />}
        delta={{ value: '+4', polarity: 'neutral' }}
        sub="vs last week · 2 blocked"
      />
      <StatCard
        label="Completed · 7 days"
        value="41"
        trend={<Sparkline values={[2, 5, 4, 8, 7, 10, 9, 13, 11, 16, 17, 21]} current />}
        delta={{ value: '+12%', polarity: 'good' }}
        sub="vs previous 7 days"
      />
      <StatCard
        label="Tokens · 7 days"
        value="12.6M"
        trend={<Meter value={63} max={100} label="Weekly budget" hideLabel />}
        sub="63% of the weekly budget"
      />
    </div>
  ),
};

/**
 * A change is coloured by whether it was WANTED, never by its direction: the
 * sign already says which way the number moved, and more work completed is
 * good news where more tokens spent may not be.
 */
export const Deltas: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: 12 }}>
      <StatCard label="Completed" value="41" delta={{ value: '+12%', polarity: 'good' }} sub="vs previous 7 days" />
      <StatCard label="Tokens" value="12.6M" delta={{ value: '+30%', polarity: 'bad' }} sub="vs previous 7 days" />
      <StatCard label="Tasks in progress" value="18" delta={{ value: '+4', polarity: 'neutral' }} sub="vs last week" />
    </div>
  ),
};

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
    icon: <CoinsGlyph size="sm" />,
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
 * A lone tile is the card, so it is the same object as the panel beside it:
 * the card's ground, its hairline and its 12px corner, flat as every card is.
 * Flush inside a StatGroup it gives all three to the group.
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
