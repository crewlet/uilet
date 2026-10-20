/**
 * A message written in place: the field is named without a visible label,
 * Command+Enter submits, and the counter appears only near the limit.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { installAtWidth } from '../../../../apps/ui-tests/src/cascade.js';
import { COMPOSER_COUNTER_AT, Composer } from './index.js';

afterEach(cleanup);

function Harness({ initial = '', onSubmit }: { initial?: string; onSubmit?: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <Composer
      label="Your reply"
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      maxLength={100}
      placeholder="Tell them what you want instead"
      actions={<button type="button">Submit</button>}
    />
  );
}

test('the field is named by its label and edits its value', () => {
  render(<Harness />);
  const field = screen.getByRole('textbox', { name: 'Your reply' }) as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: 'Greedy, but exact under five' } });
  expect(field.value).toBe('Greedy, but exact under five');
});

test('Command+Enter and Control+Enter submit; Enter alone adds a line', () => {
  const onSubmit = vi.fn();
  render(<Harness onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox');
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
  expect(onSubmit).toHaveBeenCalledTimes(2);
});

test('the shortcut hint is drawn only when there is something to submit', () => {
  const { container, rerender } = render(<Harness />);
  expect(container.querySelector('.crewlet-composer__hint')).toBeNull();
  rerender(<Harness onSubmit={() => {}} />);
  expect(container.querySelector('.crewlet-composer__hint')!.textContent).toMatch(/to send$/);
});

test('the counter appears only near the limit', () => {
  const { container } = render(<Harness initial={'x'.repeat(100 * COMPOSER_COUNTER_AT - 1)} />);
  expect(container.querySelector('.crewlet-composer__counter')).toBeNull();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(100 * COMPOSER_COUNTER_AT) } });
  expect(container.querySelector('.crewlet-composer__counter')!.textContent).toBe('80 / 100');
});

test('the footer is drawn only with something in it, and a phone drops one holding only the hint', () => {
  const footer = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-composer__footer');
  // Nothing to show: no strip at all.
  const { container, rerender } = render(<Composer label="Brief" value="" onChange={() => {}} />);
  expect(footer(container)).toBeNull();
  // Only the hint: drawn at a desk, gone on a phone with the hint it held.
  rerender(<Composer label="Brief" value="" onChange={() => {}} onSubmit={() => {}} />);
  let uninstall = installAtWidth(1024, 'light', 'Composer/Composer.css');
  expect(getComputedStyle(footer(container)!).display).toBe('flex');
  uninstall();
  uninstall = installAtWidth(390, 'light', 'Composer/Composer.css');
  expect(getComputedStyle(footer(container)!).display).toBe('none');
  // With actions beside the hint, a phone keeps the strip for them.
  rerender(
    <Composer label="Brief" value="" onChange={() => {}} onSubmit={() => {}} actions={<button type="button">Send</button>} />,
  );
  expect(getComputedStyle(footer(container)!).display).toBe('flex');
  expect(getComputedStyle(container.querySelector('.crewlet-composer__hint')!).display).toBe('none');
  // And the counter near the limit keeps it too.
  rerender(<Composer label="Brief" value={'x'.repeat(9)} maxLength={10} onChange={() => {}} onSubmit={() => {}} />);
  expect(getComputedStyle(footer(container)!).display).toBe('flex');
  uninstall();
});

test('the actions sit in the footer', () => {
  const { container } = render(<Harness />);
  expect(container.querySelector('.crewlet-composer__footer')!.textContent).toContain('Submit');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Reply</h1>
      <Harness onSubmit={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
