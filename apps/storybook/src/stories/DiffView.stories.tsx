import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffView, compareLines, firstChangedLines, MAX_COMPARE_LINES, type DiffLine, type DiffSection } from '@crewlethq/ui';

const meta: Meta<typeof DiffView> = {
  title: 'UI/DiffView',
  component: DiffView,
};

export default meta;
type Story = StoryObj<typeof DiffView>;

const BEFORE = [
  '# Onboarding',
  '',
  'Every new seat starts with read access to the knowledge base.',
  'The planner assigns a first task within one working day.',
  '',
  '## Accounts',
  '',
  'Ask an operator for a token.',
  'Tokens expire after thirty days.',
  '',
  '## Escalation',
  '',
  'Raise a blocker in the team channel.',
  'If nobody answers within an hour, page the on-call lead.',
].join('\n');

const AFTER = BEFORE.replace('Ask an operator for a token.', 'Sign in with your company account; no token is needed.')
  .replace('Tokens expire after thirty days.\n', '')
  .replace('within an hour', 'within thirty minutes');

const frame = { display: 'grid', gap: 8, maxWidth: 960 } as const;

/**
 * Two texts compared: added lines on the green tint, removed on the red, each
 * with its glyph and the word read in its place, and the run an edited line
 * changed underlined on its word tint. A gap says how many lines it stands for.
 */
export const Document: Story = {
  render: () => (
    <div style={frame}>
      <DiffView before={BEFORE} after={AFTER} against="version 4" />
    </div>
  ),
};

/** Split: each removed line beside the line that replaced it, unified under the phone breakpoint. */
export const Split: Story = {
  render: () => (
    <div style={frame}>
      <DiffView before={BEFORE} after={AFTER} layout="split" against="version 4" />
    </div>
  ),
};

const SETTINGS: DiffSection[] = [
  {
    skipped: 0,
    lines: [
      { kind: 'remove', text: 'claude-sonnet', before: null, after: null, path: 'roles.planner.model' },
      { kind: 'add', text: 'claude-opus', before: null, after: null, path: 'roles.planner.model' },
      { kind: 'add', text: '{', before: null, after: null, path: 'roles.reviewer' },
      { kind: 'add', text: '  "model": "claude-haiku"', before: null, after: null, path: 'roles.reviewer' },
      { kind: 'add', text: '}', before: null, after: null, path: 'roles.reviewer' },
      { kind: 'remove', text: '30', before: null, after: null, path: 'budgets.daily_tokens' },
    ],
  },
];

/** Keyed: each line names its setting where a text carries numbers; a value of several lines names it once. */
export const Settings: Story = {
  render: () => (
    <div style={frame}>
      <DiffView sections={SETTINGS} aria-label="Configuration changes" />
    </div>
  ),
};

/** A host writes on it: notes under a line, and each line's own number picks it. */
export const Review: Story = {
  render: function Render() {
    const [picked, setPicked] = useState<DiffLine | null>(null);
    return (
      <div style={frame}>
        <DiffView
          before={BEFORE}
          after={AFTER}
          onPick={(line) => setPicked(line)}
          picked={(line) => line === picked}
          notes={(line) => (line.after === 13 ? <p style={{ margin: 0 }}>Is thirty minutes the on-call target?</p> : null)}
        />
      </div>
    );
  },
};

/** Past its bounds a comparison is not made, and a sentence says so in place of every row. */
export const NotCompared: Story = {
  render: () => {
    const long = Array.from({ length: MAX_COMPARE_LINES + 1 }, (_, i) => `line ${i}`).join('\n');
    return (
      <div style={frame}>
        <DiffView before="" after={long} />
      </div>
    );
  },
};

/** A preview: the first changed lines only, and the count of the rest. */
export const Preview: Story = {
  render: () => {
    const compared = compareLines(BEFORE, AFTER, 0);
    const preview = firstChangedLines(compared.kind === 'compared' ? compared.sections : [], 2);
    return (
      <div style={frame}>
        <DiffView sections={preview.sections} aria-label="Preview of the save" />
        <p>{preview.more} more changed lines</p>
      </div>
    );
  },
};
