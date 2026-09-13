import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard } from '@crewlethq/ui';

const meta: Meta<typeof StatCard> = {
  title: 'UI/StatCard',
  component: StatCard,
  args: {
    label: 'Total Tokens',
    value: '831.3K',
    tone: 'neutral',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'brand', 'success', 'warning', 'danger', 'info'] },
    loading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Basic: Story = {};

export const WithSub: Story = {
  args: { label: 'Agents', value: '7', sub: '3 working, 4 idle', tone: 'success' },
};

export const WithIcon: Story = {
  args: {
    label: 'Tokens (7d)',
    value: '831.3K',
    sub: '722.0K in / 109.3K out',
    tone: 'brand',
    icon: <span className="material-symbols-outlined">token</span>,
  },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Row: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 12 }}>
      <StatCard label="Total Tokens" value="831.3K" />
      <StatCard label="Input" value="722.0K" />
      <StatCard label="Output" value="109.3K" />
      <StatCard label="LLM Calls" value="48" />
    </div>
  ),
};
