import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusLine } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * UI / StatusLine.
 *
 * A state in one calm line: its dot and word, then what else is true of it as
 * quiet notes after a middle dot, such as "Working · 3 waiting". The state in
 * full (what it does, who waits, why it paused) is in the kit Tooltip on the
 * word and is read with the line. A state with no dot, such as a person's, is
 * the word alone in the quieter ink. It takes the surrounding text size.
 */
const meta: Meta<typeof StatusLine> = {
  title: 'UI/StatusLine',
  component: StatusLine,
};

export default meta;
type Story = StoryObj<typeof StatusLine>;

export const Playground: Story = {
  args: { tone: 'info', pulse: true, label: 'Working', notes: ['3 waiting'], detail: 'Reviewing the release notes' },
};

const cell = { width: 180, fontSize: 'var(--font-size-2xs)' } as const;

/** Every state a seat row says, in a narrow cell at a table value's size: a long line takes a second line whole. */
export const States: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
        <div style={cell}>
          <StatusLine tone="info" pulse label="Working" notes={['3 waiting']} detail="Reviewing the release notes · 2 people waiting · 1 agent waiting" />
        </div>
        <div style={cell}>
          <StatusLine tone="warning" label="Needs you" notes={['2 waiting']} detail="Asks to call deploy on production" />
        </div>
        <div style={cell}>
          <StatusLine tone="info" pulse label="Working" notes={['pausing', '4 waiting']} detail="Pauses when this turn finishes" />
        </div>
        <div style={cell}>
          <StatusLine tone="danger" label="Provider limit" notes={['paused']} detail="The model provider's rate limit is reached until 14:00" />
        </div>
        <div style={cell}>
          <StatusLine tone="danger" label="Failed" detail="The last turn failed: the tool returned an error" />
        </div>
        <div style={cell}>
          <StatusLine tone="neutral" label="Idle" />
        </div>
        <div style={cell}>
          <StatusLine label="Away" />
        </div>
      </div>
    </BothThemes>
  ),
};

/** One line for a chart card's caption (`overflow="clip"`): the notes give way first, cut with an ellipsis. */
export const ClippedCaption: Story = {
  render: () => (
    <BothThemes>
      <div style={{ width: 150, fontSize: 'var(--font-size-2xs)' }}>
        <StatusLine tone="info" pulse label="Working" notes={['agent · @release-manager']} overflow="clip" />
      </div>
    </BothThemes>
  ),
};
