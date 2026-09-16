import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Count, PageHeader, StatusDot } from '@crewlethq/ui';

/*
 * The head of a screen, in the operator's register: the 20px title over the
 * compact sentence, which is the head every screen in the product wears. It
 * was the 32px display step over a 16px sentence, the type a landing page
 * opens with, and on a screen whose job is to show a table that took a third
 * of the first fold before a reader reached a row.
 *
 * Switch the toolbar's density and the three bands of the head move with the
 * page: the gaps are spacing tokens, the type is not, so a title stays the
 * same size while the screen tightens around it.
 */
const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
  args: { title: 'Coding runs' },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const TitleOnly: Story = {};

export const WithADescription: Story = {
  args: {
    description: 'Every run the company has started, including the ones whose box has been reclaimed.',
  },
};

export const WithBadgesAndActions: Story = {
  args: {
    description: 'Every run the company has started, including the ones whose box has been reclaimed.',
    badges: (
      <>
        <Count value={42} label="runs" />
        <StatusDot tone="success" />
      </>
    ),
    actions: (
      <>
        <Button variant="secondary" size="small">
          Export
        </Button>
        <Button size="small">Start a run</Button>
      </>
    ),
  },
};

export const ALongTitle: Story = {
  args: {
    title: 'Agent-to-agent conversations',
    description:
      'Who asked whom, how many messages each exchange carried, and when the last one was answered.',
    actions: <Button size="small">Refresh</Button>,
  },
};
