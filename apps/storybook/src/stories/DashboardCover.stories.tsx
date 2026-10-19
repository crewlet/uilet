import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardCover } from '@crewlethq/ui';

/*
 * A dashboard artifact's gallery cover, drawn natively at card size. It is
 * passed as ArtifactCard's `preview`; here it sits in a frame of the card's
 * preview size (16:9) so its fit can be judged on its own.
 */
const meta: Meta<typeof DashboardCover> = {
  title: 'UI/DashboardCover',
  component: DashboardCover,
  decorators: [
    (Story) => (
      <div
        style={{
          width: 300,
          aspectRatio: '16 / 9',
          display: 'flex',
          overflow: 'hidden',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-inset)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DashboardCover>;

/** The reader's own headline figures, at most three. */
export const Stats: Story = {
  args: {
    stats: [
      { label: 'Open tasks', value: '12' },
      { label: 'Spend today', value: '$4.20' },
      { label: 'Agents working', value: '3' },
    ],
  },
};

/** Figures the gallery does not hold draw their label and dataset, never a placeholder number. */
export const StatsWithoutValues: Story = {
  args: {
    stats: [
      { label: 'Open tasks', source: 'My open work' },
      { label: 'Spend today', source: 'Spend by day' },
    ],
  },
};

/** No stats: a schematic of the board's first widgets on its twelve columns. */
export const Schematic: Story = {
  args: {
    layout: [
      { w: 4, kind: 'stat' },
      { w: 4, kind: 'stat' },
      { w: 4, kind: 'stat' },
      { w: 8, kind: 'chart' },
      { w: 4, kind: 'table' },
    ],
  },
};

/** Nothing to draw: the kind's glyph. */
export const Empty: Story = {};
