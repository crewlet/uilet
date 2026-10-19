import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrangeGroup, Card, NODE_HUES, type SurfaceTone } from '@crewlethq/ui';

const meta: Meta<typeof ArrangeGroup> = {
  title: 'UI/ArrangeGroup',
  component: ArrangeGroup,
};

export default meta;
type Story = StoryObj<typeof ArrangeGroup>;

function Group({
  tone,
  editing = false,
  variant,
}: {
  tone: SurfaceTone;
  editing?: boolean;
  variant?: 'band' | 'section';
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [title, setTitle] = useState('Delivery');
  return (
    <ArrangeGroup
      title={title}
      tone={tone}
      variant={variant}
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

/**
 * A SECTION of a page being read, such as a dashboard: the name, its count
 * and the chevron on the page's ground over a hairline in the hue, and the
 * blocks on the page's own grid with no inset.
 */
export const Section: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <Group tone="none" variant="section" />
      <Group tone="cyan" variant="section" />
    </div>
  ),
};

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
