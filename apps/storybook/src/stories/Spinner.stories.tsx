import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, RunChip, Spinner, StepList, type StepListStep } from '@crewlethq/ui';

/**
 * The package's one ring: a button's pending state, a request's state column
 * and a status tag all draw it. It turns once a second
 * (`--motion-duration-turn`) while its arc breathes between a quarter and three
 * quarters of the ring on a slower cycle (`--motion-duration-sweep`). It takes
 * the ink of the words beside it, and under reduced motion it stops and stays
 * open (switch the motion preference in your system settings to see it, or see
 * the Reduced motion story).
 */
const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  args: { size: 'sm' },
  argTypes: { size: { control: 'inline-radio', options: ['em', 'xs', 'sm', 'md'] } },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Basic: Story = {};

const ROW = { display: 'flex', gap: 24, alignItems: 'center', color: 'var(--color-text-secondary)' } as const;
const CAPTION = { display: 'grid', justifyItems: 'center', gap: 8, fontSize: 'var(--font-size-xs)' } as const;
const SIZES = ['xs', 'sm', 'md', 'em'] as const;

/**
 * The glyph scale, side by side: 12, 14 and 16px, the size of the glyph it
 * stands in for, and `em`, which follows the text around it. The stroke is 2px
 * at every size.
 */
export const Sizes: Story = {
  render: () => (
    <div style={ROW}>
      {SIZES.map((size) => (
        <span key={size} style={CAPTION}>
          <Spinner size={size} />
          {size}
        </span>
      ))}
    </div>
  ),
};

/**
 * What a reader who asked for less motion sees: the ring holds still at three
 * quarters, open on the right, so it still reads as pending rather than as an
 * empty status circle. The story stops the motion itself so the state can be
 * seen without changing a system setting.
 */
export const ReducedMotion: Story = {
  name: 'Reduced motion',
  render: () => (
    <div style={ROW}>
      {SIZES.map((size) => (
        <span key={size} style={CAPTION}>
          <Spinner size={size} style={{ animation: 'none' }} />
          {size}
        </span>
      ))}
    </div>
  ),
};

const STEPS: StepListStep[] = [
  { id: 'read', label: 'Read token spend by agent', state: 'done', duration: '0.4s' },
  { id: 'chart', label: 'Draw the weekly chart', state: 'running' },
];

/**
 * Where a person meets it most: a request's state while it works, and the step
 * running inside it. Both marks are this ring, so they turn together.
 */
export const InARunChip: Story = {
  name: 'In a RunChip and a StepList',
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <RunChip state="thinking" title="Thinking" />
      <RunChip state="working" title="Working" meta="3s">
        <StepList label="Steps" summary="1 of 2 done" steps={STEPS} />
      </RunChip>
    </div>
  ),
};

/** In a pending button, in the leading icon's place, with the label kept. */
export const InAButton: Story = {
  render: () => (
    <Button variant="primary" loading>
      Apply to this list
    </Button>
  ),
};
