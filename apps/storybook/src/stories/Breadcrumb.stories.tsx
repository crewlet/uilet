import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Breadcrumb, Switcher } from '@crewlethq/ui';
import { ActivityGlyph, SquareKanbanGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / Breadcrumb.
 *
 * The trail in a top bar: the ancestors lead back out, and the last crumb is
 * the page's heading. A page whose subject can be switched draws a switcher's
 * button as that heading's words. Narrow the frame to see the page's name take
 * the cut while the ancestors keep their width, and the trail scroll once its
 * ancestry alone is wider than the bar.
 */
const meta: Meta<typeof Breadcrumb> = {
  title: 'UI/Breadcrumb',
  component: Breadcrumb,
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 52, maxWidth: 640, resize: 'horizontal', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {
    crumbs: [
      { label: 'Live', href: '#live', icon: <ActivityGlyph size="sm" /> },
      { label: 'Turns', href: '#turns' },
      { label: 'Replied in the thread about the observability pipeline.' },
    ],
  },
};

/** A project's key as a chip before its name; a task's key, still unnamed, in the mono face. */
export const AProject: Story = {
  args: {
    crumbs: [
      { label: 'Worklet', href: '#worklet', icon: <SquareKanbanGlyph size="sm" /> },
      { label: 'Product and Engineering', keyChip: 'FAIR', href: '#fair' },
      { label: 'FAIR-12', mono: true },
    ],
  },
};

/** An ancestor with nothing to press, such as a workspace on its own landing page. */
export const AnAncestorWithNoPage: Story = {
  args: {
    crumbs: [{ label: 'Worklet', icon: <SquareKanbanGlyph size="sm" /> }, { label: 'All projects' }],
  },
};

function SwitcherInTrail() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  return (
    <Breadcrumb
      crumbs={[{ label: 'Worklet', href: '#worklet', icon: <SquareKanbanGlyph size="sm" /> }, { label: 'Product and Engineering' }]}
      current={
        <Switcher
          label="Switch project"
          open={open}
          onOpenChange={setOpen}
          trigger={{ label: 'Product and Engineering', keyChip: 'FAIR', title: 'Switch project (G then P)' }}
          query={query}
          onQueryChange={setQuery}
          placeholder="Find a project"
          listLabel="Projects"
          groups={[
            {
              id: 'projects',
              label: 'Projects',
              count: 1,
              options: [
                {
                  id: 'FAIR',
                  label: 'Product and Engineering',
                  keyChip: 'FAIR',
                  meta: 2,
                  accessibleLabel: 'Product and Engineering, FAIR, 2 open',
                  href: '#fair',
                  current: true,
                },
              ],
            },
          ]}
        />
      }
    />
  );
}

/** The page's subject as a switcher's button: the heading is the control. */
export const WithASwitcher: Story = {
  render: () => <SwitcherInTrail />,
};
