import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Avatar, Button, ChoiceList, Composer } from '@crewlethq/ui';

/**
 * One answer from a short list: each choice a row with a line of detail and an
 * optional tag. A choice's panel opens under it while it is selected, which is
 * how the list ends in "Something else" with a field of its own.
 */
const meta: Meta<typeof ChoiceList> = {
  title: 'UI/ChoiceList',
  component: ChoiceList,
};

export default meta;
type Story = StoryObj<typeof ChoiceList>;

function Decision() {
  const [value, setValue] = useState<string | null>('equal');
  const [text, setText] = useState('');
  return (
    <div style={{ maxWidth: 560 }}>
      <ChoiceList
        label="Should the MVP support unequal splits?"
        value={value}
        onChange={setValue}
        options={[
          { value: 'equal', label: 'Equal splits only', detail: 'Smallest scope for the MVP.', tag: 'Recommended' },
          { value: 'exact', label: 'Equal plus exact amounts per person', detail: 'Covers itemised receipts.' },
          { value: 'all', label: 'Equal, exact, percent and shares', detail: 'Full parity; roughly doubles the split UI.' },
          {
            value: 'other',
            label: 'Something else',
            detail: 'Reply in your own words instead.',
            separated: true,
            panel: (
              <Composer
                label="Something else"
                value={text}
                onChange={setText}
                onSubmit={() => {}}
                maxLength={2000}
                placeholder="Tell them what you want instead"
                actions={
                  <>
                    <Button size="small" variant="ghost">
                      Cancel
                    </Button>
                    <Button size="small" variant="primary" disabled={!text.trim()}>
                      Submit
                    </Button>
                  </>
                }
              />
            ),
          },
        ]}
        footer={
          value === 'other' ? undefined : (
            <>
              <Button size="small" variant="ghost">
                Cancel
              </Button>
              <Button size="small" variant="primary">
                Submit
              </Button>
            </>
          )
        }
      />
    </div>
  );
}

export const Default: Story = { render: () => <Decision /> };

/** A choice of who: each row led by the agent's own face, the suggested one tagged. */
export const WithLeading: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>('data');
    return (
      <div style={{ maxWidth: 360 }}>
        <ChoiceList
          label="Who builds it"
          value={value}
          onChange={setValue}
          options={[
            {
              value: 'data',
              label: 'Crewlet-Data',
              detail: 'Product and Engineering',
              tag: 'Suggested',
              leading: <Avatar name="Crewlet-Data" character="dashlet" hue="cyan" decorative />,
            },
            {
              value: 'design',
              label: 'Crewlet-Design',
              detail: 'Product and Engineering',
              leading: <Avatar name="Crewlet-Design" character="prismlet" hue="purple" decorative />,
            },
          ]}
        />
      </div>
    );
  },
};
