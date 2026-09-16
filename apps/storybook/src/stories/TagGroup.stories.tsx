import type { Meta, StoryObj } from '@storybook/react-vite';
import { Announcer, Tag, TagGroup } from '@crewlethq/ui';

const meta: Meta<typeof TagGroup> = {
  title: 'UI/TagGroup',
  component: TagGroup,
  args: { label: 'what this is about', max: 6 },
  argTypes: { max: { control: { type: 'number', min: 1, max: 12 } } },
  decorators: [
    (Story) => (
      <>
        {/* The sentence the overflow says goes through the shared announcer,
            which an application mounts once in its shell. */}
        <Announcer />
        <Story />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TagGroup>;

const handles = ['sre-lead', 'cs-lead', 'swe', 'pm', 'analyst', 'qa-lead', 'designer', 'cto', 'ceo'];

export const Basic: Story = {
  render: (args) => (
    <TagGroup {...args}>
      {handles.slice(0, 4).map((handle) => (
        <Tag key={handle}>{handle}</Tag>
      ))}
    </TagGroup>
  ),
};

/**
 * The measured long case: thirty-six Datadog service accounts. The tail is
 * folded for WIDTH, not secrecy, so the count expands the list where it stands
 * rather than sending the reader somewhere else to read it.
 */
export const Overflowing: Story = {
  render: (args) => (
    <TagGroup {...args}>
      {Array.from({ length: 36 }, (_, i) => (
        <Tag key={i} monospace size="sm">
          {`agent-${i}@agents.example.com`}
        </Tag>
      ))}
    </TagGroup>
  ),
};

/** One subject is shown, never hidden behind a count that says "all 1". */
export const One: Story = {
  render: (args) => (
    <TagGroup {...args}>
      <Tag>sre-lead</Tag>
    </TagGroup>
  ),
};
