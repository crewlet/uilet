import type { Meta, StoryObj } from '@storybook/react-vite';
import { DICTATION_SCENARIOS, DictationStage, type DictationLayout } from '../fixtures/dictation';

/**
 * Dictation in a Composer, every state of the session, driven by the fake
 * transport and microphone. Each story presses its way into its state on
 * load; press Replay in the toolbar to see it again.
 */
const meta: Meta<typeof DictationStage> = {
  title: 'UI/Composer/Dictation',
  component: DictationStage,
  argTypes: { layout: { control: 'inline-radio', options: ['chat', 'inline'] }, autoplay: { control: 'boolean' } },
  args: { layout: 'chat', autoplay: true },
};

export default meta;
type Story = StoryObj<typeof DictationStage>;

function story(id: string, layout: DictationLayout = 'chat'): Story {
  const scenario = DICTATION_SCENARIOS.find((s) => s.id === id)!;
  return {
    name: scenario.title,
    args: { layout, autoplay: true },
    parameters: { docs: { description: { story: scenario.note } } },
    render: (args) => (
      <div style={{ maxWidth: 640, paddingTop: 220 }}>
        <DictationStage key={`${id}-${args.layout}`} scenario={scenario} layout={args.layout} autoplay={args.autoplay !== false} />
      </div>
    ),
  };
}

export const Idle: Story = story('idle');
export const Unsupported: Story = story('unsupported');
export const Insecure: Story = story('insecure');
export const NotSetUp: Story = story('not-set-up');
export const NotSetUpAdmin: Story = story('not-set-up-admin');
export const NotAsked: Story = story('not-asked');
export const Pending: Story = story('pending');
export const Denied: Story = story('denied');
export const Policy: Story = story('policy');
export const NoDevice: Story = story('no-device');
export const Busy: Story = story('busy');
export const Menu: Story = story('menu');
export const Dictating: Story = story('dictating');
export const Unplugged: Story = story('unplugged');
export const Switched: Story = story('switched');
export const Dropped: Story = story('dropped');
export const Refused: Story = story('refused');
export const Quota: Story = story('quota');
export const Quiet: Story = story('quiet');
export const Silence: Story = story('silence');
export const Length: Story = story('length');
export const Paused: Story = story('paused');
export const OverBudget: Story = story('over-budget');
export const Closed: Story = story('closed');
export const Two: Story = story('two');
export const HoldsText: Story = story('holds-text');
export const Proposal: Story = story('proposal');
export const Preparing: Story = story('preparing');
export const Starting: Story = story('starting');
export const StartingCold: Story = story('starting-cold');
export const Fallback: Story = story('fallback');
export const ServiceBusy: Story = story('service-busy');
export const NoRoute: Story = story('no-route');
export const Accepting: Story = story('accepting');
export const Accepted: Story = story('accepted');

/** The Ask layout: the mic, Cancel and Accept share the field's row with Send. */
export const DictatingInline: Story = { ...story('dictating', 'inline'), name: 'Dictating, inline' };

/** Preparing beside an inline field: the mic waits and the line runs under the row. */
export const PreparingInline: Story = { ...story('preparing', 'inline'), name: 'Preparing dictation, inline' };

/** Starting beside an inline field: Send holds its place until the level comes. */
export const StartingInline: Story = { ...story('starting', 'inline'), name: 'Starting, inline' };
