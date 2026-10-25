import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { BanGlyph, ClockGlyph, LockGlyph } from '@crewlethq/icons/glyphs';
import { Button, Card, ReceiptStrip, RefusalStrip } from '@crewlethq/ui';

/**
 * What happened, at a card's foot: the card's hairline above it, a tint under
 * the words, the mark on the first line. An outcome is a polite status; a
 * refusal or failure is an alert. `RefusalStrip` is the one drawing of a
 * refusal, inline under the control that caused it or at a card's foot.
 */
const meta: Meta<typeof ReceiptStrip> = {
  title: 'UI/ReceiptStrip',
  component: ReceiptStrip,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ReceiptStrip>;

function OnACard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <Card.Header>Filter this list</Card.Header>
      <Card.Body>
        <p style={{ margin: 0 }}>Show only blocked tasks in Core.</p>
      </Card.Body>
      {children}
    </Card>
  );
}

export const Applied: Story = {
  render: () => (
    <OnACard>
      <ReceiptStrip>Applied to Work › Tasks · 3 of 8 tasks shown</ReceiptStrip>
    </OnACard>
  ),
};

export const SavedWithRevision: Story = {
  render: () => (
    <OnACard>
      <ReceiptStrip>Saved as version 15 of the on-call runbook</ReceiptStrip>
    </OnACard>
  ),
};

export const Declined: Story = {
  render: () => (
    <OnACard>
      <ReceiptStrip tone="neutral" icon={<BanGlyph size="md" />}>
        You declined this. Nothing changed.
      </ReceiptStrip>
    </OnACard>
  ),
};

export const Expired: Story = {
  render: () => (
    <OnACard>
      <ReceiptStrip tone="neutral" icon={<ClockGlyph size="md" />}>
        It was prepared 12 min ago and expired before it was applied. Nothing changed.
      </ReceiptStrip>
    </OnACard>
  ),
};

export const StepUp: Story = {
  render: () => (
    <OnACard>
      <ReceiptStrip tone="neutral" icon={<LockGlyph size="md" />}>
        This approval asks you to sign in again. Nothing changed yet.
      </ReceiptStrip>
    </OnACard>
  ),
};

/** A failure at the foot, with Try again. */
export const FailedWithTryAgain: Story = {
  render: () => (
    <OnACard>
      <RefusalStrip placement="foot" onRetry={() => {}}>
        Token spend could not be read. The engine did not answer in time. Nothing changed.
      </RefusalStrip>
    </OnACard>
  ),
};

/** Inline, under the control that caused it, as the dashboard's write buttons draw a refusal. */
export const InlineRefusal: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <Button variant="secondary">Pause agent</Button>
      <RefusalStrip hint="Ask an admin." onRetry={() => {}} onDismiss={() => {}}>
        You need Operator access for this.
      </RefusalStrip>
    </div>
  ),
};
