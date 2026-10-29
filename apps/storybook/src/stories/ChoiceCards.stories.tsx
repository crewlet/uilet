import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChoiceCards, type ChoiceCardOption } from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';
import { GlobeGlyph, PackageGlyph, ServerGlyph, SquareTerminalGlyph } from '@crewlethq/icons/glyphs';

/**
 * Choices a person compares, as cards of the same lines: a picture, the
 * choice's name and its tag; one line of description; and a few facts, one to
 * a line. Cards side by side share every line, so their facts stand level. A
 * disabled card says why and what fixes it, on a fact of its own (`reason`) or
 * on a reason line. Native radios, so the arrow keys move the choice.
 */
const meta: Meta<typeof ChoiceCards> = {
  title: 'UI/ChoiceCards',
  component: ChoiceCards,
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ChoiceCards>;

const PLACES: ChoiceCardOption[] = [
  {
    value: 'direct',
    label: 'On this engine’s host',
    media: <ServerGlyph size="xl" />,
    description: 'Runs beside the engine.',
    facts: [
      { label: 'Needs', value: 'Nothing more needed', tone: 'success' },
      { label: 'Isolation', value: 'Shares the host' },
    ],
  },
  {
    value: 'container',
    label: 'In a container',
    tag: 'Company default',
    media: <PackageGlyph size="xl" />,
    description: 'A fresh container for each run.',
    facts: [
      { label: 'Needs', value: 'Docker 24.0.7 found', tone: 'success' },
      { label: 'Isolation', value: 'Own filesystem and network' },
    ],
  },
  {
    value: 'e2b',
    label: 'In E2B',
    media: <GlobeGlyph size="xl" />,
    description: 'A cloud sandbox, off the host.',
    facts: [
      { label: 'Needs', value: 'E2B key not set. Add E2B_API_KEY under Settings, Secrets.', tone: 'warning', reason: true },
      { label: 'Isolation', value: 'A separate machine' },
    ],
    disabled: true,
  },
];

const CLIS: ChoiceCardOption[] = [
  {
    value: 'claude-code',
    label: 'Claude Code',
    media: <VendorMark vendor="claude" size={24} />,
    description: 'Anthropic’s coding CLI.',
    facts: [
      { label: 'Runs', value: 'Every job' },
      { label: 'Method', value: 'Key, token, login or cloud' },
    ],
  },
  {
    value: 'codex',
    label: 'Codex',
    // No mark of OpenAI's ships here, so Codex is drawn with the terminal glyph, as any CLI without one is.
    media: <SquareTerminalGlyph size="xl" />,
    description: 'OpenAI’s coding CLI.',
    facts: [
      { label: 'Runs', value: 'Every job but coding' },
      { label: 'Method', value: 'API key or ChatGPT' },
    ],
  },
  {
    value: 'opencode',
    label: 'OpenCode',
    media: <VendorMark vendor="opencode" size={24} />,
    description: 'Open CLI for many providers.',
    facts: [
      { label: 'Runs', value: 'Every job' },
      { label: 'Method', value: 'The provider’s API key' },
    ],
  },
];

function Chooser({ options, initial, size }: { options: ChoiceCardOption[]; initial: string; size?: 'md' | 'lg' }) {
  const [value, setValue] = useState<string | null>(initial);
  return <ChoiceCards label="Choose one" options={options} value={value} onChange={setValue} size={size} />;
}

/** Three places, the company default tagged, one unavailable: its Needs fact is the reason, read with its radio. */
export const WhereItRuns: Story = { render: () => <Chooser options={PLACES} initial="container" /> };

/** Three coding CLIs, each named by its vendor's mark, the same three lines in every card. */
export const CodingClis: Story = { render: () => <Chooser options={CLIS} initial="claude-code" /> };

/**
 * Side by side on a wider surface: every card spans the same rows, so a
 * description that wraps in one card moves the facts of all three alike.
 */
export const SideBySide: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 1080 }}>{Story()}</div>],
  render: () => (
    <Chooser
      initial="claude-code"
      options={CLIS.map((o) =>
        o.value === 'opencode' ? { ...o, description: 'An open CLI that runs models from many providers, chosen per model.' } : o,
      )}
    />
  ),
};

/** A disabled card whose reason is a line of its own, under its facts. */
export const WithReasonLine: Story = {
  render: () => (
    <Chooser
      initial="direct"
      options={PLACES.map((o) =>
        o.value === 'e2b'
          ? {
              ...o,
              facts: [
                { label: 'Needs', value: 'E2B key not set', tone: 'warning' },
                { label: 'Isolation', value: 'A separate machine' },
              ],
              disabledReason: 'Add E2B_API_KEY under Settings, Secrets, to use it.',
            }
          : o,
      )}
    />
  ),
};

/** Words only: a name and one line of description, no picture and no facts. */
export const Simple: Story = {
  render: () => (
    <Chooser
      initial="all"
      options={[
        { value: 'all', label: 'Everything', description: 'Use this model for every job.' },
        { value: 'coding', label: 'Coding', description: 'The seat’s own work.' },
        { value: 'none', label: 'Not yet', description: 'Set it up now, assign it later.' },
      ]}
    />
  ),
};
