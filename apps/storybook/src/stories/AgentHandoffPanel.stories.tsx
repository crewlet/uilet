import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BotGlyph, FileTextGlyph, LayoutGridGlyph } from '@crewlethq/icons/glyphs';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import {
  AgentHandoffPanel,
  ArtifactBar,
  ArtifactWorkspace,
  Avatar,
  Callout,
  ChoiceList,
  Prose,
  type ArtifactBarTool,
} from '@crewlethq/ui';

/**
 * Handing the work to an agent from a create page: an "Ask an agent" control
 * in the bar, carrying the suggested agent's character, opens this panel at
 * the side of what the reader is making. The page stays the direct way to
 * make it; the panel holds the brief, briefs to start from, who builds it,
 * what goes with it, the task as filed and what happens next.
 */
const meta: Meta<typeof AgentHandoffPanel> = {
  title: 'UI/AgentHandoffPanel',
  component: AgentHandoffPanel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AgentHandoffPanel>;

const AGENTS = [
  {
    handle: 'sre',
    name: 'SRE Lead',
    unit: 'Engineering',
    character: CREWLET_CHARACTERS[3],
  },
  {
    handle: 'analyst',
    name: 'Analyst',
    unit: 'Engineering',
    character: CREWLET_CHARACTERS[9],
  },
];

const STARTERS = [
  {
    key: 'guide',
    label: 'Onboarding guide',
    brief: 'A one-page guide for new engineers on how we review incidents.',
  },
  {
    key: 'brief',
    label: 'Project brief',
    brief: 'A project brief: the problem, the goal, the plan and the open questions.',
  },
  {
    key: 'update',
    label: 'Weekly update',
    brief: 'A weekly update: what shipped, what slipped, and what is next.',
  },
];

function Page({ held = false, refused = false }: { held?: boolean; refused?: boolean }) {
  const [open, setOpen] = useState(true);
  const [brief, setBrief] = useState('');
  const [seat, setSeat] = useState<string | null>('sre');
  const agent = AGENTS.find((a) => a.handle === seat) ?? AGENTS[0]!;
  const face = (size: 'xs' | 'sm', a = agent) => (
    <Avatar name={a.name} kind="agent" character={a.character} size={size} />
  );
  const tools: ArtifactBarTool[] = [
    {
      key: 'ask',
      label: 'Ask an agent',
      icon: face('xs', AGENTS[0]),
      onSelect: () => setOpen((o) => !o),
      pressed: open,
      labelled: true,
    },
    {
      key: 'create',
      label: 'Create doc',
      icon: <FileTextGlyph size="sm" />,
      onSelect: () => {},
      emphasis: 'primary',
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ArtifactBar title="New doc" kind="doc" kindLabel="Doc" headingLevel={1} kindTools={tools} />
      {/* A GRID CELL, as the ArtifactBar stories host the workspace: the
          workspace measures its own width (a size container), so as the item
          of a flex row it shrank to nothing and crushed the panel to 25px. */}
      <div style={{ display: 'grid', flex: '1 1 auto', minHeight: 0 }}>
        <ArtifactWorkspace
          bodyLabel="New doc"
          panel={
            open ? (
              <AgentHandoffPanel
                icon={<BotGlyph size="sm" />}
                onClose={() => setOpen(false)}
                intro={`${agent.name} gets a task with your brief, drafts the doc and publishes it on the task.`}
                brief={brief}
                onBriefChange={setBrief}
                briefLabel="What should the doc cover?"
                briefPlaceholder="Who reads it, what it covers and what to draw on."
                briefHelper="Name the readers, the outline you have in mind and the pages to draw on."
                starters={STARTERS}
                onStarter={(key) => setBrief(STARTERS.find((s) => s.key === key)?.brief ?? '')}
                agent={
                  <ChoiceList
                    label="Agent"
                    value={seat}
                    onChange={setSeat}
                    options={AGENTS.map((a, i) => ({
                      value: a.handle,
                      label: a.name,
                      detail: a.unit,
                      media: face('sm', a),
                      tag: i === 0 ? 'Suggested' : undefined,
                    }))}
                  />
                }
                carried={[
                  {
                    key: 'title',
                    icon: <FileTextGlyph size="sm" />,
                    label: 'Incident reviews, explained',
                  },
                  {
                    key: 'draft',
                    icon: <LayoutGridGlyph size="sm" />,
                    label: 'Your draft',
                    detail: '214 words, for the agent to build on',
                  },
                ]}
                task={{
                  title: 'Incident reviews, explained',
                  body: `${brief || 'Your brief'}\n\nBuild on this first draft:\n\n# Incident reviews\n\nPublish it as a Doc artifact (kind \`doc\`) for this task.`,
                }}
                steps={[
                  `A task is filed to ${agent.name} in ENG, with your brief.`,
                  `${agent.name} drafts the doc and publishes it on the task.`,
                  'You review it, edit it in place and share it.',
                ]}
                notice={
                  refused ? (
                    <Callout variant="danger" title="The task was not filed">
                      You need the tracker app to file a task. Ask an admin.
                    </Callout>
                  ) : null
                }
                send={{
                  label: `Ask ${agent.name}`,
                  media: face('xs'),
                  onSend: () => {},
                  ...(held || brief.trim() === '' ? { disabledReason: 'Say what the doc should cover.' } : {}),
                }}
              />
            ) : null
          }
        >
          <div style={{ maxWidth: 680, margin: '48px auto', padding: '0 24px' }}>
            <Prose>
              <h1>Incident reviews, explained</h1>
              <p>We review every incident within a week. This page is the first draft of how.</p>
            </Prose>
          </div>
        </ArtifactWorkspace>
      </div>
    </div>
  );
}

export const Default: Story = { render: () => <Page /> };

/** The send is held until the brief says something, and says so beside the button. */
export const Held: Story = { render: () => <Page held /> };

/** The engine refused the task: said above the commit, where the reader looks after the press. */
export const Refused: Story = { render: () => <Page refused /> };
