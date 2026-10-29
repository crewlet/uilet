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

test('a picture is drawn between the radio and the words, hidden from the name', () => {
  render(
    <ChoiceList
      label="Who builds it"
      value="ada"
      onChange={() => {}}
      options={[
        { value: 'ada', label: 'Ada', detail: 'Designer', media: <span data-testid="face">A</span> },
        { value: 'lin', label: 'Lin' },
      ]}
    />,
  );
  const row = screen.getByRole('radio', { name: /Ada\s*Designer/ }).closest('label')!;
  expect(row.classList.contains('has-media')).toBe(true);
  expect([...row.children].map((c) => c.className)).toEqual([
    'crewlet-choice-list__radio',
    'crewlet-choice-list__media',
    'crewlet-choice-list__text',
  ]);
  expect(screen.getByTestId('face').parentElement!.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByRole('radio', { name: 'Lin' }).closest('label')!.classList.contains('has-media')).toBe(false);
});

test('a disabled list takes no choice', () => {
  render(<ChoiceList label="Settlement" options={OPTIONS} value={null} onChange={() => {}} disabled />);
  expect((screen.getAllByRole('radio') as HTMLInputElement[]).every((r) => r.disabled)).toBe(true);
});

test('a disabled choice cannot be chosen, and its radio is described by why', () => {
  const onChange = vi.fn();
  render(
    <ChoiceList
      label="Where it runs"
      value="host"
      onChange={onChange}
      options={[
        { value: 'host', label: 'On the host' },
        { value: 'e2b', label: 'In E2B', detail: 'A separate machine', disabled: true, disabledReason: 'Add E2B_API_KEY first.' },
      ]}
    />,
  );
  // Named by its label and detail, the reason left to its description, so it is read once.
  const e2b = screen.getByRole('radio', { name: 'In E2B A separate machine' }) as HTMLInputElement;
  expect(e2b.disabled).toBe(true);
  expect(screen.getByRole('radio', { name: /On the host/ })).not.toHaveProperty('disabled', true);
  fireEvent.click(screen.getByText('In E2B'));
  expect(onChange).not.toHaveBeenCalled();
  const described = document.getElementById(e2b.getAttribute('aria-describedby') ?? '');
  expect(described?.textContent).toBe('Add E2B_API_KEY first.');
});

test('a value with a space still names its radio and describes its reason', () => {
  render(
    <ChoiceList
      label="Model"
      value={null}
      onChange={() => {}}
      options={[
        { value: 'claude opus', label: 'Opus', detail: 'The strongest.', disabled: true, disabledReason: 'Sign in first.' },
      ]}
    />,
  );
  // An id built from the value split on its space, and the radio lost its name and its reason.
  const opus = screen.getByRole('radio', { name: 'Opus The strongest.' });
  expect(document.getElementById(opus.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Sign in first.');
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

test('carries no axe violation with a choice unavailable and its reason', async () => {
  const { container } = render(
    <main>
      <h1>Where it runs</h1>
      <ChoiceList
        label="Where it runs"
        value="host"
        onChange={() => {}}
        options={[
          { value: 'host', label: 'On the host', detail: 'Shares the host' },
          { value: 'e2b', label: 'In E2B', detail: 'A separate machine', disabled: true, disabledReason: 'Add E2B_API_KEY first.' },
        ]}
      />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
