import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DateTimePicker, FormField } from '@crewlethq/ui';

const meta: Meta<typeof DateTimePicker> = {
  title: 'UI/DateTimePicker',
  component: DateTimePicker,
};

export default meta;
type Story = StoryObj<typeof DateTimePicker>;

/**
 * The month is a real grid: one tab stop, the arrows moving a day and a week,
 * Page a month and Shift+Page a year, and every day named by its full date.
 *
 * The trigger is named by the moment it holds ("Starts at: Mar 10, 2026,
 * 09:30"), not by the question it answers, and Now takes this moment in one
 * press, clamped to the bounds rather than refused.
 */
export const DateAndTime: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('2026-03-10T09:30:00');
      return (
        <div style={{ width: 320 }}>
          <FormField label="Starts at" helper="In the company's own time zone.">
            <DateTimePicker ariaLabel="Starts at" value={value} onChange={setValue} />
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};

export const DateOnly: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      return (
        <div style={{ width: 280 }}>
          <DateTimePicker ariaLabel="Day" showTime={false} value={value} onChange={setValue} />
        </div>
      );
    }
    return <Demo />;
  },
};

/** Bounded: a day outside the range is drawn as refused, and says so. */
export const Bounded: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('2026-03-10T00:00:00');
      return (
        <div style={{ width: 280 }}>
          <DateTimePicker
            ariaLabel="Day"
            showTime={false}
            minDate="2026-03-05"
            maxDate="2026-03-25"
            value={value}
            onChange={setValue}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const Small: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      return (
        <div style={{ width: 240 }}>
          <DateTimePicker ariaLabel="Day" size="sm" value={value} onChange={setValue} />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * Every string is a prop with an English default, held in one `labels` bag as
 * `DataView` holds its own, and how the trigger's name is built from its label
 * and its value is one of them.
 */
export const OwnWords: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('2026-03-10T09:30:00');
      return (
        <div style={{ width: 320 }}>
          <DateTimePicker
            ariaLabel="Commence"
            value={value}
            onChange={setValue}
            labels={{
              timeLabel: 'Heure',
              nowLabel: 'Maintenant',
              clearLabel: 'Effacer',
              doneLabel: 'Terminé',
              triggerName: (name, held) => `${name} / ${held}`,
            }}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
