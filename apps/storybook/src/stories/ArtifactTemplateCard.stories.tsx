import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ArtifactTemplateCard } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactTemplateCard> = {
  title: 'UI/ArtifactTemplateCard',
  component: ArtifactTemplateCard,
};

export default meta;
type Story = StoryObj<typeof ArtifactTemplateCard>;

const STARTS = [
  { id: 'blank', title: 'Blank', detail: 'An empty page under its title.' },
  {
    id: 'meeting',
    title: 'Meeting notes',
    detail: 'Who came, what was decided, and who does what next.',
  },
  {
    id: 'decision',
    title: 'Decision record',
    detail: 'The question, the options weighed, and the call made.',
  },
];

/** A row of starting points, one chosen; a host passes each one's live preview. */
export const Cards: Story = {
  render: function Render() {
    const [chosen, setChosen] = useState('blank');
    return (
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 12rem)',
          gap: 12,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {STARTS.map((s) => (
          <li key={s.id}>
            <ArtifactTemplateCard
              kind="doc"
              title={s.title}
              detail={s.detail}
              selected={chosen === s.id}
              onSelect={() => setChosen(s.id)}
            />
          </li>
        ))}
      </ul>
    );
  },
};

/** Rows, for a narrow rail beside an editor. */
export const Rows: Story = {
  render: function Render() {
    const [chosen, setChosen] = useState('meeting');
    return (
      <ul
        style={{
          display: 'grid',
          gap: 8,
          width: 272,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {STARTS.map((s) => (
          <li key={s.id}>
            <ArtifactTemplateCard
              layout="row"
              kind="sheet"
              title={s.title}
              detail={s.detail}
              selected={chosen === s.id}
              onSelect={() => setChosen(s.id)}
            />
          </li>
        ))}
      </ul>
    );
  },
};
