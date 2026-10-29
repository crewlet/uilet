import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, CheckGrid, type CheckGridColumn, type CheckGridState } from '@crewlethq/ui';
import { CodeGlyph, ListChecksGlyph, RefreshCwGlyph } from '@crewlethq/icons/glyphs';

/**
 * Checkboxes where rows meet columns: which seats run which jobs on a model.
 * Every box is named by its row and its column. Where every column fits, a
 * header names them once; where they do not (a phone, a narrow column), each
 * row stacks with its column's name beside every box, and no column is cut
 * off. A column can refuse new ticks and say why, once, under the grid.
 */
const meta: Meta<typeof CheckGrid> = {
  title: 'UI/CheckGrid',
  component: CheckGrid,
  // A form's wide column by default. A story narrower or wider sets `frameWidth`.
  decorators: [(Story, { parameters }) => <div style={{ maxWidth: parameters.frameWidth ?? 760 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof CheckGrid>;

const SEATS = ['Backend Engineer', 'Quality Lead', 'Product Manager', 'Designer'].map((name) => ({
  value: name.toLowerCase().replace(/ /g, '-'),
  label: name,
  media: <Avatar name={name} kind="agent" size="xs" decorative />,
}));

const JOBS: CheckGridColumn[] = [
  { value: 'coding', label: 'Coding', media: <CodeGlyph size="sm" /> },
  { value: 'reviews', label: 'Reviewing and delegations', media: <ListChecksGlyph size="sm" /> },
  { value: 'routines', label: 'Routines and evaluations', media: <RefreshCwGlyph size="sm" /> },
];

function Seats({ columns = JOBS }: { columns?: CheckGridColumn[] }) {
  const [on, setOn] = useState<Record<string, CheckGridState>>({
    'backend-engineer:coding': 'checked',
    'backend-engineer:reviews': 'checked',
    'backend-engineer:routines': 'checked',
    'quality-lead:coding': 'checked',
    'quality-lead:reviews': 'mixed',
  });
  return (
    <CheckGrid
      label="Jobs per seat"
      rows={SEATS}
      columns={columns}
      stateOf={(row, column) => on[`${row}:${column}`] ?? 'unchecked'}
      onChange={(row, column, checked) =>
        setOn((was) => ({ ...was, [`${row}:${column}`]: checked ? 'checked' : 'unchecked' }))
      }
    />
  );
}

/** Four seats and three jobs side by side: one job partly on (one of its two kinds of work, set by hand). */
export const SideBySide: Story = { render: () => <Seats /> };

/**
 * The same grid in a phone's column: each seat stacks, its jobs wrap under
 * its name, and each box says its job. Nothing scrolls sideways.
 */
export const Stacked: Story = { parameters: { frameWidth: 358 }, render: () => <Seats /> };

/**
 * A column that refuses new ticks, with its reason under the grid: a CLI that
 * runs no coding. A seat already coding on it can still be taken off.
 */
export const ColumnRefused: Story = {
  render: () => (
    <Seats columns={JOBS.map((j) => (j.value === 'coding' ? { ...j, disabledReason: 'Codex runs no coding.' } : j))} />
  ),
};

/** Refused and stacked, at a phone's width. */
export const ColumnRefusedStacked: Story = {
  parameters: { frameWidth: 358 },
  render: () => (
    <Seats columns={JOBS.map((j) => (j.value === 'coding' ? { ...j, disabledReason: 'Codex runs no coding.' } : j))} />
  ),
};
