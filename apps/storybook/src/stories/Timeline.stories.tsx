import type { Meta, StoryObj } from '@storybook/react-vite';
import { Disclosure, Prose, Text, Timeline } from '@crewlethq/ui';

const meta: Meta<typeof Timeline> = {
  title: 'UI/Timeline',
  component: Timeline,
  args: { itemLabel: 'Round', alternating: true },
  argTypes: { alternating: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof Timeline>;

/**
 * The round ledger of a turn. Each item carries its own bracket, so a ledger
 * of ONE round is delimited too, and appending a round changes nothing about
 * the rounds already drawn.
 */
export const ARoundLedger: Story = {
  render: (args) => (
    <div style={{ maxWidth: 560 }}>
      <Timeline {...args}>
        <Timeline.Item>
          <Prose tone="muted">I need the company document before I can answer this.</Prose>
          <Disclosure title="read_config" mono size="compact" headingLevel="none">
            <Text variant="caption">Returned 4.1 KB.</Text>
          </Disclosure>
        </Timeline.Item>
        <Timeline.Item state="danger">
          <Prose tone="muted">The unit lead is the CTO, so the brief goes there.</Prose>
          <Disclosure title="publish_event" mono size="compact" headingLevel="none">
            <Text variant="caption">Refused: the stream was not reachable.</Text>
          </Disclosure>
        </Timeline.Item>
        <Timeline.Item state="active">
          <Prose streaming>Retrying the publish</Prose>
        </Timeline.Item>
      </Timeline>
    </div>
  ),
};

/** One step still gets its bracket, which is the case that used to get none. */
export const ASingleStep: Story = {
  render: (args) => (
    <div style={{ maxWidth: 560 }}>
      <Timeline {...args}>
        <Timeline.Item>
          <Prose>The answer was already in the brief, so nothing was called.</Prose>
        </Timeline.Item>
      </Timeline>
    </div>
  ),
};
