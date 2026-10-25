/**
 * The windows a screen offers as one row of radios, and a window of the
 * reader's own behind Custom: prefilled, refused with its own sentence for
 * each way it can be wrong, applied on Enter, and a dismissed dialog that
 * leaves the reader on a tab stop.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { LayerHost } from '../Layer/index.js';
import {
  TimeRangePicker,
  timeRangeFieldKey,
  timeRangeProblem,
  type TimeRangeCustom,
  type TimeRangeCustomMode,
} from './index.js';

afterEach(cleanup);

type Window = 'today' | '1h' | '1d' | '7d';

const OPTIONS = [
  { value: 'today' as const, label: 'Today', title: 'Since midnight on the company’s clock' },
  { value: '1h' as const, label: '1h', title: 'The last hour' },
  { value: '1d' as const, label: '1d', title: 'The last day' },
  { value: '7d' as const, label: '7d', title: 'The last seven days' },
];

function Picker({
  value = '1d',
  onChange = () => {},
  custom,
}: {
  value?: Window | 'custom';
  onChange?: (value: Window) => void;
  custom?: Partial<TimeRangeCustom> & { mode?: TimeRangeCustomMode };
}) {
  return (
    <LayerHost>
      <TimeRangePicker<Window>
        options={OPTIONS}
        value={value}
        onChange={onChange}
        custom={
          custom === undefined
            ? undefined
            : {
                mode: 'instants',
                title: 'Name two instants of your own',
                start: '2026-10-23T09:00',
                end: '2026-10-24T09:00',
                helper: 'In your time zone.',
                onApply: () => {},
                ...custom,
              }
        }
      />
    </LayerHost>
  );
}

function openCustom() {
  const radio = screen.getByRole('radio', { name: 'Custom' });
  act(() => radio.focus());
  fireEvent.click(radio);
  return radio;
}

test('draws the offered windows as radios in the order given, the current one checked', () => {
  render(<Picker value="7d" />);
  const radios = screen.getAllByRole('radio');
  expect(radios.map((radio) => radio.textContent)).toEqual(['Today', '1h', '1d', '7d']);
  expect(screen.getByRole('radio', { name: '7d' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('radiogroup', { name: 'Time range' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'Custom' })).toBeNull();
});

test('choosing a window hands back the screen’s own value', () => {
  const onChange = vi.fn();
  render(<Picker onChange={onChange} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Today' }));
  expect(onChange).toHaveBeenCalledWith('today');
});

test('Custom carries the chosen window as its tooltip, and opens the dialog prefilled with it', () => {
  render(<Picker value="custom" custom={{ title: 'Oct 23, 09:00 to Oct 24, 09:00' }} />);
  const radio = screen.getByRole('radio', { name: 'Custom' });
  expect(radio.getAttribute('title')).toBe('Oct 23, 09:00 to Oct 24, 09:00');
  expect(radio.getAttribute('aria-checked')).toBe('true');
  openCustom();
  expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2026-10-23T09:00');
  expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2026-10-24T09:00');
  expect(screen.getByText('In your time zone.')).toBeTruthy();
  const frame = document.querySelector<HTMLElement>('.crewlet-modal');
  expect(frame?.style.getPropertyValue('--crewlet-modal-width')).toBe('420px');
});

test('a window that ends where it begins is refused, and says why', () => {
  const onApply = vi.fn();
  render(<Picker custom={{ onApply }} />);
  openCustom();
  const from = screen.getByLabelText('From') as HTMLInputElement;
  fireEvent.change(screen.getByLabelText('To'), { target: { value: from.value } });
  expect(screen.getByRole('alert').textContent).toBe('The end must be after the start.');
  const apply = screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement;
  expect(apply.disabled).toBe(true);
  fireEvent.click(apply);
  expect(onApply).not.toHaveBeenCalled();
});

test('Apply is the form’s submit button, so Enter in a field applies, and the dialog closes', () => {
  const onApply = vi.fn();
  render(<Picker custom={{ onApply }} />);
  openCustom();
  const apply = screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement;
  const from = screen.getByLabelText('From') as HTMLInputElement;
  expect(apply.type).toBe('submit');
  expect(apply.form).toBe(from.form);
  fireEvent.submit(from.form!);
  expect(onApply).toHaveBeenCalledWith('2026-10-23T09:00', '2026-10-24T09:00');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('a dismissed custom window leaves the reader on Custom, the group’s one tab stop', async () => {
  render(<Picker custom={{}} />);
  const custom = openCustom();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(document.activeElement).toBe(custom);
  const stops = screen.getAllByRole('radio').filter((radio) => radio.getAttribute('tabindex') === '0');
  expect(stops).toEqual([custom]);
});

test('a screen of whole days picks two dates, the last on or after the first', () => {
  const onApply = vi.fn();
  render(
    <Picker
      custom={{ mode: 'days', start: '2026-10-01', end: '2026-10-07', helper: 'Company days, in Europe/Berlin.', onApply }}
    />,
  );
  openCustom();
  const first = screen.getByLabelText('First day') as HTMLInputElement;
  expect(first.type).toBe('date');
  expect(screen.getByText('Company days, in Europe/Berlin.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Last day'), { target: { value: '2026-09-30' } });
  expect(screen.getByRole('alert').textContent).toBe('The last day must be on or after the first.');
  fireEvent.change(screen.getByLabelText('Last day'), { target: { value: '2026-10-01' } });
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(onApply).toHaveBeenCalledWith('2026-10-01', '2026-10-01');
});

test('the screen’s own check runs once the fields are well formed and in order', () => {
  render(<Picker custom={{ validate: () => 'The store keeps thirty days.' }} />);
  openCustom();
  expect(screen.getByRole('alert').textContent).toBe('The store keeps thirty days.');
});

test('each way a field can be wrong is its own sentence', () => {
  expect(timeRangeProblem('', '2026-10-01T10:00', 'instants')).toBe('The start is not a date and time.');
  expect(timeRangeProblem('2026-10-01T10:00', '2026-02-30T10:00', 'instants')).toBe('The end is not a date and time.');
  expect(timeRangeProblem('2026-10-01T10:00', '2026-10-01T10:00:00', 'instants')).toBe('The end must be after the start.');
  expect(timeRangeProblem('2026-10-01T10:00', '2026-10-01T10:01', 'instants')).toBe('');
  expect(timeRangeProblem('2026-13-01', '2026-10-01', 'days')).toBe('The first day is not a date.');
  expect(timeRangeProblem('2026-10-01', 'soon', 'days')).toBe('The last day is not a date.');
  expect(timeRangeProblem('2026-10-02', '2026-10-01', 'days')).toBe('The last day must be on or after the first.');
  expect(timeRangeFieldKey('2026-10-01T24:00', 'instants')).toBeNull();
});

test('carries no violation, with the dialog open', async () => {
  render(<Picker custom={{}} />);
  openCustom();
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
