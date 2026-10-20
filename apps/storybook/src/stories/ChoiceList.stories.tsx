import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Avatar, Button, ChoiceList, Composer } from '@crewlethq/ui';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';

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

/**
 * Who builds it: each agent drawn as its Crewlet character beside its name and
 * role (`media`), the suggested one first and tagged, as a create page offers
 * the seats that can make an artifact.
 */
function WhoBuildsIt() {
  const agents = [
    { handle: 'designer', name: 'Agent Designer', role: 'Design · Product', character: CREWLET_CHARACTERS[3] },
    { handle: 'frontend', name: 'Agent Frontend', role: 'Engineering · Web', character: CREWLET_CHARACTERS[7] },
    { handle: 'pm', name: 'Agent PM', role: 'Product', character: CREWLET_CHARACTERS[12] },
  ];
  const [value, setValue] = useState<string | null>('designer');
  return (
    <div style={{ maxWidth: 420 }}>
      <ChoiceList
        label="Who builds it"
        value={value}
        onChange={setValue}
        options={agents.map((agent, i) => ({
          value: agent.handle,
          label: agent.name,
          detail: agent.role,
          media: <Avatar name={agent.name} kind="agent" character={agent.character} size="sm" />,
          tag: i === 0 ? 'Suggested' : undefined,
        }))}
      />
    </div>
  );
}

export const WithPictures: Story = { render: () => <WhoBuildsIt /> };
