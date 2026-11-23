/**
 * An assignment list: groups named by their eyebrows, a row a subject with
 * its picker right after the name, and a pending row that says what it was.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { AssignmentList, AssignmentPicker } from './index.js';

afterEach(cleanup);

function Card() {
  return (
    <AssignmentList
      groups={[
        {
          key: 'seats',
          label: 'Seats',
          rows: [
            {
              key: 'pm',
              name: 'Product Manager',
              value: <AssignmentPicker primary="platform-sonnet-8" secondary="Claude Sonnet 4.5" aria-label="Model for Product Manager: platform-sonnet-8" />,
            },
            {
              key: 'qa',
              name: 'QA Engineer',
              was: 'platform-sonnet-8',
              value: <AssignmentPicker primary="platform-opus-14" aria-label="Model for QA Engineer: platform-opus-14" />,
            },
          ],
        },
      ]}
      footer={<span>1 change not saved</span>}
    />
  );
}

test('each group is a region named by its eyebrow, with a list item per row', () => {
  render(<Card />);
  const seats = screen.getByRole('region', { name: 'Seats' });
  expect(seats.querySelectorAll('li')).toHaveLength(2);
});

test('a pending row says what it was and is marked not saved', () => {
  render(<Card />);
  const row = screen.getByText('QA Engineer').closest('li')!;
  expect(row.className).toContain('is-pending');
  expect(row.textContent).toContain('Was platform-sonnet-8');
  expect(row.textContent).toContain('Not saved');
  const other = screen.getByText('Product Manager').closest('li')!;
  expect(other.className).not.toContain('is-pending');
});

test('the picker is a button that shows its whole value on hover only while cut', () => {
  render(<AssignmentPicker primary="platform-opus-long-context-14" secondary="Claude Opus" />);
  const button = screen.getByRole('button');
  expect(button.getAttribute('type')).toBe('button');
  // jsdom lays nothing out, so nothing is cut and no title is set.
  fireEvent.mouseEnter(button);
  expect(button.hasAttribute('title')).toBe(false);
  const primary = button.querySelector<HTMLElement>('.crewlet-assignment-picker__primary')!;
  Object.defineProperty(primary, 'scrollWidth', { value: 300 });
  Object.defineProperty(primary, 'clientWidth', { value: 120 });
  fireEvent.mouseEnter(button);
  expect(button.getAttribute('title')).toBe('platform-opus-long-context-14 · Claude Opus');
});

test('has no axe violations', async () => {
  render(<Card />);
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
