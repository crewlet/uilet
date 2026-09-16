import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from '@crewlethq/ui';

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Basic: Story = {
  args: {
    headers: ['Name', 'Email', 'Role'],
    data: [
      ['Jane Cooper', 'jane@example.com', 'Owner'],
      ['Alex Park',  'alex@example.com', 'Admin'],
      ['Sam Lin',    'sam@example.com',  'Member'],
    ],
  },
};

export const Empty: Story = {
  args: {
    headers: ['Name', 'Email'],
    data: [],
    emptyMessage: 'No people yet. Invite teammates to populate this list.',
  },
};

export const WithActionButton: Story = {
  args: {
    headers: ['Project', 'Status'],
    data: [
      ['Website refresh', 'Active'],
      ['Mobile app',      'Planning'],
    ],
    actionButton: { label: 'View all projects', onClick: () => alert('Routing to /projects') },
  },
};

/*
 * A caption names the table for a reader who cannot see the heading above it.
 * Keep it visible where the table stands alone, and hide it where the words
 * would be said twice.
 */
export const WithCaption: Story = {
  args: {
    caption: 'What changed while the draft was open',
    headers: ['What', 'When you started', 'Saved now', 'Yours'],
    data: [
      ['Role', 'Planner', 'Reviewer', 'Planner'],
      ['Model', 'sonnet', 'opus', 'opus'],
      ['Reports to', 'Founder', 'Founder', 'Head of Engineering'],
    ],
  },
};

/* Cells are nodes, so a cell holds whatever the row is really about. */
export const NodeCells: Story = {
  args: {
    caption: 'Seats and where they lead',
    captionHidden: true,
    headers: ['Seat', 'Phase', 'Last run'],
    data: [
      [<a key="a" href="#/seats/planner">planner</a>, <code key="b">execute</code>, '2 minutes ago'],
      [<a key="c" href="#/seats/reviewer">reviewer</a>, <code key="d">review</code>, '18 minutes ago'],
    ],
  },
};

/*
 * THE TABLE REGISTER, on one screen: a micro-label header on the panel's own
 * ground, hairline rows, cells at the compact step and a row as tall as the
 * row token every other list in the system uses. Switch the toolbar's density
 * between compact, normal and comfortable to see the rows move with it: the
 * insets and the row height are on the scale, so a table tightens with the
 * rest of a screen rather than against it.
 *
 * Nothing in these rows lights up under the pointer, and that is the point. A
 * hover tint says "press me", and none of these rows can be pressed; the
 * tables whose rows ARE controls are DataTable's.
 */
export const TheRegister: Story = {
  args: {
    caption: 'Seats, and what each of them is running',
    headers: ['Seat', 'Role', 'Model', 'Last turn'],
    data: [
      ['planner', 'Planning', 'claude-sonnet', '4 minutes ago'],
      ['reviewer', 'Review', 'claude-opus', '11 minutes ago'],
      ['scribe', 'Documentation', 'claude-haiku', '2 hours ago'],
    ],
  },
};

/*
 * A table given a height becomes its own scroller and its header STICKS, so a
 * reader who has scrolled past the top still knows what the columns are. It is
 * the one thing that makes a long table readable, and without a height there
 * is no scroller for the header to stick inside.
 */
export const Bounded: Story = {
  args: {
    maxHeight: '12rem',
    headers: ['Seat', 'Turns', 'Tokens'],
    data: Array.from({ length: 24 }, (_, index) => [
      `seat-${String(index + 1).padStart(2, '0')}`,
      String((index * 7) % 23),
      `${(index * 3.1).toFixed(1)}k`,
    ]),
  },
};
