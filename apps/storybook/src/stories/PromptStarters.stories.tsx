import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Composer, PromptStarters, type PromptStarter } from '@crewlethq/ui';

const meta: Meta<typeof PromptStarters> = {
  title: 'UI/PromptStarters',
  component: PromptStarters,
};

export default meta;
type Story = StoryObj<typeof PromptStarters>;

const STARTERS: PromptStarter[] = [
  {
    id: 'spend',
    label: 'Weekly spend by agent',
    prompt: "Build a dashboard of this week's model spend by agent, with the daily total as a line.",
  },
  {
    id: 'beta',
    label: 'Beta health at a glance',
    prompt: 'Build a dashboard for the beta: sign-ups per day, active groups and open bugs.',
  },
  {
    id: 'work',
    label: 'Open work by owner',
    prompt: 'Build a dashboard of open work: counts by status, by owner, and what has waited longest.',
  },
];

/** Under a composer: a chip fills the field with its whole brief, and the person sends it. */
export const UnderAComposer: Story = {
  render: function Render() {
    const [prompt, setPrompt] = useState('');
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
        <Composer
          label="What should the dashboard show?"
          value={prompt}
          onChange={(v) => {
            setPrompt(v);
            setPicked(null);
          }}
        />
        <PromptStarters
          label="Starting points"
          starters={STARTERS}
          picked={picked}
          onPick={(s) => {
            setPrompt(s.prompt);
            setPicked(s.id);
          }}
        />
      </div>
    );
  },
};
