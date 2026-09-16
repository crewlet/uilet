import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TimeWindowPicker, describeTimeWindow, resolveTimeWindow, type TimeWindowValue } from '@crewlethq/ui';

const meta: Meta<typeof TimeWindowPicker> = {
  title: 'UI/TimeWindowPicker',
  component: TimeWindowPicker,
};

export default meta;
type Story = StoryObj<typeof TimeWindowPicker>;

const DEFAULT: TimeWindowValue = { kind: 'relative', duration: '7d' };

function Demo(props: Partial<React.ComponentProps<typeof TimeWindowPicker>>) {
  const [value, setValue] = useState<TimeWindowValue>(DEFAULT);
  return (
    <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TimeWindowPicker value={value} onChange={setValue} defaultValue={DEFAULT} {...props} />
      <pre style={{ fontSize: 12, margin: 0 }}>
        {JSON.stringify(
          { value, spoken: describeTimeWindow(value).spoken, resolved: resolveTimeWindow(value) },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

/**
 * One panel, not two tabs: the windows a reader picks by name run down the
 * rail, and the absolute range sits beside them. Take a named window and the
 * calendar shades what it means and the boxes fill with the moments it
 * resolves to; edit a box or take a day and the window becomes that range and
 * the rail lets go. The line along the bottom says what is selected, and it is
 * the same sentence the trigger's accessible name carries.
 */
export const Named: Story = { render: () => <Demo /> };

export const Small: Story = { render: () => <Demo size="sm" /> };

/**
 * A caller offers only the windows it can answer. The engine's spend rollup
 * reaches thirty days, so nothing here offers a quarter that comes back empty
 * with no explanation, and the row for a window the rail does not name is
 * suppressed with it.
 */
export const OwnWindows: Story = {
  render: () => (
    <Demo
      allowAbsolute={false}
      allowCustom={false}
      presets={[
        { label: 'Last 24 hours', duration: '24h' },
        { label: 'Last 7 days', duration: '7d' },
        { label: 'Last 30 days', duration: '30d' },
      ]}
    />
  ),
};

/** Bounded: nothing before the company existed, and nothing in the future. */
export const Bounded: Story = {
  render: () => <Demo allowRelative={false} bounds={{ min: '2026-01-01' }} />,
};

/**
 * Every string is a prop with an English default, the phrases included: what a
 * window is called, how two moments are joined, and how the trigger's own name
 * is built from its label and the window it holds.
 */
export const OwnWords: Story = {
  render: () => (
    <Demo
      labels={{
        presetsLabel: 'Fenêtres relatives',
        absoluteLabel: 'Plage absolue',
        applyLabel: 'Appliquer',
        cancelLabel: 'Annuler',
        resetLabel: 'Revenir au défaut',
        customLabel: 'Ou les derniers',
        nowLabel: "maintenant",
        range: (from, to) => `${from} jusqu'à ${to}`,
        summary: (window, range) => `${window} (${range})`,
      }}
    />
  ),
};
