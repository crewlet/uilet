import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowDownToLineGlyph, ClockGlyph, CircleCheckGlyph, LockGlyph } from '@crewlethq/icons/glyphs';
import { Button, ReceiptStrip, StatusCard } from '@crewlethq/ui';

/**
 * A record with a state, as the product's own card: the default Card, a
 * sentence-case title, the state as a Tag at the end of the head, what
 * happened as a strip at the foot. No tone rail and no tinted head. A foot
 * holding a decision is end-aligned; a foot of utilities only starts on the
 * text edge.
 */
const meta: Meta<typeof StatusCard> = {
  title: 'UI/StatusCard',
  component: StatusCard,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof StatusCard>;

export const WithADecision: Story = {
  render: () => (
    <StatusCard
      title="Create task"
      subtitle="Saved for the company"
      status={{ label: 'Needs your approval', tone: 'warning', icon: <ClockGlyph size="xs" /> }}
      actions={
        <>
          <Button variant="secondary">Decline</Button>
          <Button variant="primary">Create task</Button>
        </>
      }
    >
      <p>File a new task in Core and assign it to Agent SWE.</p>
    </StatusCard>
  ),
};

export const WithUtilities: Story = {
  render: () => (
    <StatusCard
      title="Token spend by agent"
      subtitle="This week, from Monday"
      subtitlePlacement="below"
      actionsAlign="start"
      actions={
        <Button variant="ghost" size="small" leadingIcon={<ArrowDownToLineGlyph />}>
          CSV
        </Button>
      }
    >
      <p>Rows go here.</p>
    </StatusCard>
  ),
};

export const Settled: Story = {
  render: () => (
    <StatusCard
      title="Open in app"
      settled
      status={{ label: 'Opened', tone: 'success', icon: <CircleCheckGlyph size="xs" /> }}
      strip={<ReceiptStrip>Opened beside this conversation.</ReceiptStrip>}
    >
      <p>Fix the flaky sign-in test</p>
    </StatusCard>
  ),
};

/** On a narrow card (a phone sheet), a decision's buttons share the row as blocks. */
export const NarrowDecision: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
  render: () => (
    <StatusCard
      title="Share artifact"
      status={{ label: 'Needs sign-in', tone: 'warning', icon: <LockGlyph size="xs" /> }}
      actions={
        <>
          <Button variant="secondary">Decline</Button>
          <Button variant="primary">Confirm it’s you</Button>
        </>
      }
    >
      <p>Share the Q4 pricing brief with everyone at Nimbus.</p>
    </StatusCard>
  ),
};
