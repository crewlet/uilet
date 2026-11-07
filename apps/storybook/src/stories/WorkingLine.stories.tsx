import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ActivityLine, WorkingLine, type WorkingAgent } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * Every agent at work on a request, on one line: their faces in a small
 * stack, each in its own character's colour, then one sentence naming them.
 * A lighter band sweeps across the names, a single agent's phrase fades in as
 * it changes, and three dots bounce after the verb. With more than one agent,
 * the chevron at the line's end (its target the whole line) opens one compact
 * line per agent. One polite region names who starts and stops, never a
 * phrase.
 *
 * Ask your system for reduced motion and every part holds still: the names in
 * the primary ink without the band, the phrases without their fade and the
 * dots at full strength.
 */
const meta: Meta<typeof WorkingLine> = {
  title: 'UI/WorkingLine',
  component: WorkingLine,
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof WorkingLine>;

const CREW: WorkingAgent[] = [
  { id: 'swe', name: 'Backend Engineer', character: 'gemlet', hue: 'cyan', status: 'is mulling it over...' },
  { id: 'app', name: 'App Engineer', character: 'hexlet', hue: 'purple', status: 'is crewleting...' },
  { id: 'pm', name: 'Product Manager', character: 'peaklet', hue: 'green', status: 'is thinking...' },
  { id: 'qa', name: 'QA Engineer', character: 'prismlet', hue: 'amber', status: 'is working on it...' },
  { id: 'ux', name: 'Designer', character: 'towerlet', hue: 'rose', status: 'is scheming...' },
  { id: 'sre', name: 'Site Reliability Engineer', character: 'crewlet', hue: 'blue', status: 'is on it...' },
];

/** One agent keeps its own phrase, so the variety of what it says shows. */
export const OneAgent: Story = { args: { agents: CREW.slice(0, 1) } };

/** Two share one verb. */
export const TwoAgents: Story = { args: { agents: CREW.slice(0, 2) } };

/** Three or more: the first two named, the rest counted, and every face named for a screen reader. */
export const ThreeAgents: Story = { args: { agents: CREW.slice(0, 3) } };

/** Six agents, still one line. */
export const SixAgents: Story = { args: { agents: CREW } };

/** Opened: one 22px line per agent, its face, name and own phrase. */
export const SixAgentsOpen: Story = { args: { agents: CREW, defaultExpanded: true } };

/**
 * Queued agents wait behind something they are already doing: counted after
 * the agents at work, and still in their own lines.
 */
export const WithQueued: Story = {
  args: {
    agents: [...CREW.slice(0, 2), { ...CREW[2]!, queued: true, status: 'is queued behind its current task' }],
    defaultExpanded: true,
  },
};

/** Nothing has started: nothing moves. */
export const AllQueued: Story = {
  args: { agents: [{ ...CREW[2]!, queued: true, status: 'is queued behind its current task' }] },
};

/**
 * A phone's message column: only the names give way, so the count of the
 * rest, the verb and the dots read whole.
 */
export const Narrow: Story = {
  args: { agents: CREW },
  decorators: [(Story) => <div style={{ maxWidth: 300 }}>{Story()}</div>],
};

/**
 * Under a composer, beside somebody typing: people are words and dots with no
 * face, agents are faces and names under the band. A narrow column wraps them
 * to two lines.
 */
export const WithTyping: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
      <ActivityLine agents={CREW.slice(0, 3)} typing="Jane Founder is typing" />
      <div style={{ maxWidth: 300 }}>
        <ActivityLine agents={CREW.slice(0, 2)} typing="Jane Founder is typing" />
      </div>
    </div>
  ),
};

/** One, two, three and six agents, and a queued one, light over dark. */
export const BothThemesAtOnce: Story = {
  name: 'Both themes',
  render: () => (
    <BothThemes gap="var(--spacing-3)">
      <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
        <WorkingLine agents={CREW.slice(0, 1)} announce={false} />
        <WorkingLine agents={CREW.slice(0, 2)} announce={false} />
        <WorkingLine agents={CREW.slice(0, 3)} announce={false} />
        <WorkingLine agents={CREW} announce={false} defaultExpanded />
        <WorkingLine agents={[{ ...CREW[2]!, queued: true, status: undefined }]} announce={false} />
        <ActivityLine agents={CREW.slice(0, 2)} typing="Jane Founder is typing" />
      </div>
    </BothThemes>
  ),
};

const PHRASES = ['is crewleting...', 'is thinking it through...', 'is putting the pieces together...', 'is mulling it over...'];

function Live() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => (value + 1) % 16), 1800);
    return () => window.clearInterval(id);
  }, []);
  // Agents join one by one, change their phrases, and leave again.
  const count = tick < 8 ? Math.min(6, tick + 1) : Math.max(0, 14 - tick);
  const agents = CREW.slice(0, count).map((agent, index) => ({ ...agent, status: PHRASES[(tick + index) % PHRASES.length] }));
  return <WorkingLine agents={agents} />;
}

/** Agents starting, changing phrase and stopping, on a loop: one line throughout, however many are at work. */
export const StartAndStop: Story = { render: () => <Live /> };
