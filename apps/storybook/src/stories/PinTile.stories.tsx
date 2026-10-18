import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, PinTile, Tag } from '@crewlethq/ui';
import { FolderGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof PinTile> = {
  title: 'UI/PinTile',
  component: PinTile,
  args: { title: 'FairSplit MVP', href: '#/work/FAIR', kind: 'Project', meta: '1 done · 2 active · 4 to do', figure: '14%' },
};

export default meta;
type Story = StoryObj<typeof PinTile>;

export const Project: Story = {
  args: { leading: <FolderGlyph size="md" />, onUnpin: () => undefined },
};

/** A state where a project's figure goes, so the name keeps its width. */
export const Agent: Story = {
  args: {
    title: 'Crewlet-PM',
    href: '#/agents/pm',
    kind: 'Agent',
    meta: 'Product and Engineering',
    leading: <Avatar name="Crewlet-PM" kind="agent" size="sm" />,
    figure: (
      <Tag variant="danger" dot>
        stopped
      </Tag>
    ),
    onUnpin: () => undefined,
  },
};

/** On a shelf the reader arranges, the handle comes first. */
export const InAShelf: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))', gap: 8 }}>
      <PinTile title="Crewlet-PM" href="#" kind="Agent" meta="Product and Engineering" onUnpin={() => undefined} />
      <PinTile title="FairSplit MVP" href="#" kind="Project" meta="1 done · 2 active" figure="14%" onUnpin={() => undefined} />
      <PinTile title="Decision log" href="#" kind="Page" onUnpin={() => undefined} />
    </div>
  ),
};
