import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrangeGroup, Card, NODE_HUES, type SurfaceTone } from '@crewlethq/ui';

const meta: Meta<typeof ArrangeGroup> = {
  title: 'UI/ArrangeGroup',
  component: ArrangeGroup,
};

export default meta;
type Story = StoryObj<typeof ArrangeGroup>;

function Group({ tone, editing = false }: { tone: SurfaceTone; editing?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [title, setTitle] = useState('Delivery');
  return (
    <ArrangeGroup
      title={title}
      tone={tone}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      count={2}
      onTitleChange={editing ? setTitle : undefined}
    >
      <Card style={{ gridColumn: 'span 6' }}>Tasks in progress</Card>
      <Card style={{ gridColumn: 'span 6' }}>Completed</Card>
    </ArrangeGroup>
  );
}

/** A titled band that folds; the header is one button with `aria-expanded`. */
export const Basic: Story = { render: () => <Group tone="blue" /> };

/** Editing, the name is a field in the header. */
export const Editing: Story = { render: () => <Group tone="purple" editing /> };

/** The six hues and none: the band carries the hue, the body stays the page's. */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['none', ...NODE_HUES] as SurfaceTone[]).map((t) => (
        <Group key={t} tone={t} />
      ))}
    </div>
  ),
};

/** Empty, it says what to do. */
export const Empty: Story = {
  render: () => (
    <ArrangeGroup title="Spend" tone="amber" collapsed={false} onCollapsedChange={() => undefined} count={0} empty="Drag widgets here." />
  ),
};
