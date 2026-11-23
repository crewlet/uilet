import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListOverflow, Tag, TagGroup } from '@crewlethq/ui';

const meta: Meta<typeof ListOverflow> = {
  title: 'UI/ListOverflow',
  component: ListOverflow,
};

export default meta;
type Story = StoryObj<typeof ListOverflow>;

const PROBLEM = { one: 'problem', other: 'problems' };

/** The chip says what it hides and opens a list of it: never a bare "+2". */
export const Basic: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <Tag variant="danger">Rate limited</Tag>
      <ListOverflow
        noun={PROBLEM}
        items={[
          <Tag key="a" variant="danger">
            Timed out
          </Tag>,
          <Tag key="b" variant="warning">
            Out of budget
          </Tag>,
        ]}
      />
    </span>
  ),
};

/** A table cell's one line: what does not fit is named and listed on demand, and a cut tag shows its words on hover. */
export const InACell: Story = {
  render: () => (
    <div style={{ width: 220, border: '1px dashed var(--color-border-default)', padding: 4 }}>
      <TagGroup label="Problems" overflow="fit" noun={PROBLEM}>
        <Tag variant="danger">Rate limited by the provider</Tag>
        <Tag variant="danger">Timed out</Tag>
        <Tag variant="warning">Out of budget</Tag>
      </TagGroup>
    </div>
  ),
};

/** A packed row of 18px pills: the chip takes their step and keeps a 24px target. */
export const Packed: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <Tag size="xs" appearance="outline">
        data
      </Tag>
      <ListOverflow size="xs" noun={{ one: 'role', other: 'roles' }} items={['api', 'scheduler', 'worker']} />
    </span>
  ),
};
