/**
 * One answer from a short list: native radios a whole row selects, a panel
 * drawn only under the selected choice, and a footer after every choice.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { ChoiceList, type ChoiceListOption } from './index.js';

afterEach(cleanup);

const OPTIONS: ChoiceListOption[] = [
  { value: 'greedy', label: 'Greedy only', detail: 'Simple and fast.', tag: 'Recommended' },
  { value: 'exact', label: 'Exact search', detail: 'Fewest transfers.' },
  { value: 'other', label: 'Something else', separated: true, panel: <p>Write it here</p> },
];

function Harness({ initial = 'greedy' }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return <ChoiceList label="Settlement" options={OPTIONS} value={value} onChange={setValue} footer={<button type="button">Submit</button>} />;
}

test('is a named radio group with one radio per choice, the selected one checked', () => {
  render(<Harness />);
  const group = screen.getByRole('radiogroup', { name: 'Settlement' });
  const radios = screen.getAllByRole('radio') as HTMLInputElement[];
  expect(group).toBeTruthy();
  expect(radios.map((r) => r.checked)).toEqual([true, false, false]);
  expect(new Set(radios.map((r) => r.name)).size).toBe(1);
});

test('a choice is named by its label and its detail', () => {
  render(<Harness />);
  expect(screen.getByRole('radio', { name: /Exact search\s*Fewest transfers\./ })).toBeTruthy();
});

test('pressing anywhere on a row selects it', () => {
  const onChange = vi.fn();
  const { container } = render(<ChoiceList label="Settlement" options={OPTIONS} value={null} onChange={onChange} />);
  fireEvent.click(container.querySelectorAll('.crewlet-choice-list__detail')[1]!);
  expect(onChange).toHaveBeenCalledWith('exact');
});

test('a panel is drawn only under the selected choice', () => {
  render(<Harness />);
  expect(screen.queryByText('Write it here')).toBeNull();
  fireEvent.click(screen.getByRole('radio', { name: /Something else/ }));
  expect(screen.getByText('Write it here')).toBeTruthy();
});

test('the tag and the separating rule are drawn where asked, and the footer after every choice', () => {
  const { container } = render(<Harness />);
  const items = [...container.querySelectorAll('.crewlet-choice-list__item')];
  expect(items.map((i) => i.classList.contains('is-separated'))).toEqual([false, false, true]);
  expect(container.querySelector('.crewlet-choice-list__tag')!.textContent).toBe('Recommended');
  expect(container.querySelector('.crewlet-choice-list__footer')!.textContent).toBe('Submit');
});

test('a disabled list takes no choice', () => {
  render(<ChoiceList label="Settlement" options={OPTIONS} value={null} onChange={() => {}} disabled />);
  expect((screen.getAllByRole('radio') as HTMLInputElement[]).every((r) => r.disabled)).toBe(true);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Decision</h1>
      <Harness />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
