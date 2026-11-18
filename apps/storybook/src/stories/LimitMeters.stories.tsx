import type { Meta, StoryObj } from '@storybook/react-vite';
import { LimitMeters, type LimitWindow } from '@crewlethq/ui';

const FIVE_HOUR: LimitWindow = {
  id: 'session',
  label: '5-hour',
  state: 'ok',
  used: 0.05,
  note: 'resets 5am',
  name: '5-hour limit, 5% used, resets 05:00 UTC',
};
const WEEKLY: LimitWindow = {
  id: 'weekly',
  label: 'Weekly',
  state: 'ok',
  used: 0.57,
  note: 'resets Mon',
  name: 'Weekly limit, 57% used, resets Mon 09:00 UTC',
};
const OPUS: LimitWindow = {
  id: 'opus',
  label: 'Weekly Opus',
  state: 'near',
  used: 0.83,
  note: 'resets Mon',
  name: 'Weekly Opus limit, 83% used, resets Mon 09:00 UTC',
};

const meta: Meta<typeof LimitMeters> = {
  title: 'UI/LimitMeters',
  component: LimitMeters,
  args: { label: 'Limits of opus-main', windows: [FIVE_HOUR, WEEKLY, OPUS] },
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof LimitMeters>;

/** Three windows, one line each: an ordinary reading is quiet, and one near its limit is the warning. */
export const Basic: Story = {};

/** No window, one, two, and three. */
export const Counts: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 20 }}>
      <LimitMeters label="None" windows={[]} />
      <LimitMeters label="One" windows={[FIVE_HOUR]} />
      <LimitMeters label="Two" windows={[FIVE_HOUR, WEEKLY]} />
      <LimitMeters label="Three" windows={[FIVE_HOUR, WEEKLY, OPUS]} />
    </div>
  ),
};

/**
 * A window known only by its state is a hatched segment, not a length: the
 * vendor said it is reached, or near, and never how much is used.
 */
export const StateOnly: Story = {
  args: {
    windows: [
      { id: 'session', label: '5-hour', state: 'refusing', figure: 'Reached', note: 'until 5am', name: '5-hour limit, reached, sitting out until 05:00 UTC' },
      { id: 'weekly', label: 'Weekly', state: 'near', figure: 'Near', note: 'resets Mon', name: 'Weekly limit, near its limit, resets Mon 09:00 UTC' },
      { id: 'model', label: 'Model', state: 'ok', figure: 'OK', name: 'Model limit, within its limit' },
    ],
  },
};

/** A reading that has not been refreshed for a while says how old it is. */
export const Stale: Story = {
  args: { windows: [FIVE_HOUR, WEEKLY], caption: 'as of 2h ago' },
};

/** Below 16rem the note moves under its bar rather than squeezing the bar away. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ width: 200 }}>{Story()}</div>],
  args: {
    windows: [FIVE_HOUR, { ...WEEKLY, state: 'refusing', used: 1, note: 'until Mon 9am' }, OPUS],
  },
};
