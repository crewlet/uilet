import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffList } from '@crewlethq/ui';

/*
 * The difference between two documents, as a list of paths.
 *
 * Colour is the third carrier here, never the first: every row draws its
 * glyph and says its word, so the three kinds are told apart by somebody who
 * cannot tell green from red.
 */
const meta: Meta<typeof DiffList> = {
  title: 'UI/DiffList',
  component: DiffList,
};

export default meta;
type Story = StoryObj<typeof DiffList>;

export const Basic: Story = {
  args: {
    rows: [
      { kind: 'added', path: 'roles.scribe', to: '{"reports_to": "founder"}' },
      { kind: 'changed', path: 'roles.planner.model', from: '"sonnet"', to: '"opus"' },
      { kind: 'changed', path: 'roles.planner.budget.daily_tokens', from: '250000', to: '400000' },
      { kind: 'removed', path: 'roles.greeter', from: '{"reports_to": "planner"}' },
    ],
  },
};

/*
 * Re-activating an unchanged revision is the credential rotation gesture, so
 * "no differences" is a thing an operator does on purpose and the list says
 * so rather than rendering nothing at all.
 */
export const NoDifferences: Story = {
  args: {
    rows: [],
    emptyMessage: 'This revision is byte-identical to the active one.',
  },
};

/* Long values truncate per column, so one long line cannot push the paths off
   the surface. */
export const LongValues: Story = {
  args: {
    rows: [
      {
        kind: 'changed',
        path: 'roles.planner.prompt.system',
        from: '"You are the planner for a small company. Break the brief into tasks."',
        to: '"You are the planner. Break the brief into tasks, and hand each to the seat that owns it."',
      },
      { kind: 'added', path: 'mcp_servers.github.env.GITHUB_TOKEN', to: '"${GITHUB_TOKEN}"' },
    ],
  },
};
