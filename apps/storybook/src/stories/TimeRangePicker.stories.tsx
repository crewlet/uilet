import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stack, Text, TimeRangePicker, TIME_RANGE_CUSTOM, type TimeRangeCustomValue } from '@crewlethq/ui';

/*
 * The windows a screen offers as one row of choices, and a window of the
 * reader's own behind Custom. For a picker that opens a panel of presets
 * and a calendar instead, see TimeWindowPicker.
 */

const meta: Meta<typeof TimeRangePicker> = {
  title: 'UI/TimeRangePicker',
  component: TimeRangePicker,
};

export default meta;
type Story = StoryObj<typeof TimeRangePicker>;

type Window = 'today' | '1h' | '1d' | '7d' | '30d';

const OPTIONS: { value: Window; label: string; title: string }[] = [
  { value: 'today', label: 'Today', title: 'Since midnight on the company’s clock' },
  { value: '1h', label: '1h', title: 'The last hour' },
  { value: '1d', label: '1d', title: 'The last day' },
  { value: '7d', label: '7d', title: 'The last seven days' },
  { value: '30d', label: '30d', title: 'The last thirty days' },
];

function Demo({ mode }: { mode?: 'instants' | 'days' }) {
  const [value, setValue] = useState<Window | TimeRangeCustomValue>('1d');
  const [custom, setCustom] = useState({
    start: mode === 'days' ? '2026-10-01' : '2026-10-23T09:00',
    end: mode === 'days' ? '2026-10-07' : '2026-10-24T09:00',
  });
  const chosen = value === TIME_RANGE_CUSTOM;
  return (
    <Stack gap={3}>
      <TimeRangePicker<Window>
        options={OPTIONS}
        value={value}
        onChange={setValue}
        custom={
          mode
            ? {
                mode,
                title: chosen ? `${custom.start} to ${custom.end}` : mode === 'days' ? 'Pick two dates' : 'Name two instants of your own',
                start: custom.start,
                end: custom.end,
                helper: mode === 'days' ? 'Company days, in Europe/Berlin.' : 'In your time zone.',
                onApply: (start, end) => {
                  setCustom({ start, end });
                  setValue(TIME_RANGE_CUSTOM);
                },
              }
            : undefined
        }
      />
      <Text variant="caption">Showing: {chosen ? `${custom.start} to ${custom.end}` : value}</Text>
    </Stack>
  );
}

/** The screen's windows with a custom window to the minute. Enter in either field applies. */
export const Instants: Story = { render: () => <Demo mode="instants" /> };

/** A screen whose answer is whole days: the custom window is two dates, both inclusive. */
export const CompanyDays: Story = { render: () => <Demo mode="days" /> };

/** A screen that offers no window of the reader's own. */
export const OfferedWindowsOnly: Story = { render: () => <Demo /> };
