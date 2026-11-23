import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ConsequenceList, ResourceName, type ConsequenceItem } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * What confirming will do, as typed lines: a `choice` is a checkbox with a short label and what it does under it, a
 * `fact` a muted line that simply happens or stays, its glyph where a box would be so every line starts on the labels'
 * edge. Names are chips (`name` or `ResourceName`). Inside a dialog, pass these to `ConfirmModal`'s `consequences`.
 */
const meta: Meta<typeof ConsequenceList> = {
  title: 'UI/ConsequenceList',
  component: ConsequenceList,
  decorators: [(Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ConsequenceList>;

function Removal({ longNames = false }: { longNames?: boolean }) {
  const [leave, setLeave] = useState(true);
  const [secret, setSecret] = useState(true);
  const items: ConsequenceItem[] = [
    {
      kind: 'choice',
      key: 'leave',
      label: 'Leave 9 seats with no model',
      description: 'Ask Crewlet turns off and the Advisor runs with no model until one is added.',
      tone: 'danger',
      checked: leave,
      onCheckedChange: setLeave,
    },
    {
      kind: 'choice',
      key: 'secret',
      label: 'Delete its secret',
      name: longNames ? 'MODEL_TOKEN_PLATFORM_OPUS_LONG_CONTEXT_EXTENDED_THINKING_FOURTEEN' : 'MODEL_TOKEN_TEAM_SONNET',
      description: 'Removed from the secret store with the model.',
      checked: secret,
      onCheckedChange: setSecret,
    },
    {
      kind: 'fact',
      key: 'shared',
      tone: 'kept',
      text: (
        <>
          <ResourceName>{longNames ? 'MODEL_TOKEN_SHARED_ACROSS_EVERY_REGION_AND_WORKSPACE' : 'MODEL_TOKEN_SHARED'}</ResourceName>{' '}
          stays: another model still uses it.
        </>
      ),
    },
    { kind: 'fact', key: 'turn', tone: 'follows', text: 'A running turn finishes first.' },
    { kind: 'fact', key: 'slack', tone: 'warning', text: 'Its Slack account stays behind; remove it at Slack.' },
    { kind: 'fact', key: 'plain', text: 'A plain fact keeps the same text edge.' },
  ];
  return <ConsequenceList heading="When you remove it" items={items} />;
}

/** Choices and every tone of fact, light over dark. */
export const ChoicesAndFacts: Story = {
  render: () => (
    <BothThemes>
      <Removal />
    </BothThemes>
  ),
};

/** Long names end in an ellipsis with the whole name on hover. */
export const LongNames: Story = {
  render: () => (
    <BothThemes>
      <Removal longNames />
    </BothThemes>
  ),
};

/** At a phone's width. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 300 }}>{Story()}</div>],
  render: () => <Removal longNames />,
};
