import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ListChecksGlyph } from '@crewlethq/icons/glyphs';
import { OpenInAppCard } from '@crewlethq/ui';

/**
 * A place the answer points to, opened only by the person's press: the
 * record's glyph on a neutral tile, its name and where it lives, Open in new
 * tab and Open here; once opened, a success Tag and a strip. The only way an
 * answer navigates.
 */
const meta: Meta<typeof OpenInAppCard> = {
  title: 'UI/OpenInAppCard',
  component: OpenInAppCard,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
  args: {
    icon: <ListChecksGlyph size="sm" />,
    title: 'Fix the flaky sign-in test',
    path: 'Tasks › ENG-156',
    href: '#/work/ENG-156',
    onOpenHere: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof OpenInAppCard>;

export const Ready: Story = {};

export const Opened: Story = { args: { state: 'opened' } };

function Opening() {
  const [opened, setOpened] = useState(false);
  return (
    <OpenInAppCard
      icon={<ListChecksGlyph size="sm" />}
      title="Fix the flaky sign-in test"
      path="Tasks › ENG-156"
      href="#/work/ENG-156"
      state={opened ? 'opened' : 'ready'}
      onOpenHere={() => setOpened(true)}
    />
  );
}

/** Press Open here. */
export const Interactive: Story = { render: () => <Opening /> };
