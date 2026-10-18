/**
 * Follow mode's strip: what is happening, how to stop it, and Escape from
 * anywhere.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { FollowBanner } from './index.js';

afterEach(cleanup);

test('says who is followed and how to stop, politely, with a Stop control', () => {
  const onStop = vi.fn();
  const { container } = render(<FollowBanner name="Maya Ortiz" onStop={onStop} />);
  expect(container.textContent).toContain('Following Maya Ortiz. Press Esc or scroll to stop.');
  expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Stop following' }));
  expect(onStop).toHaveBeenCalledTimes(1);
});

test('Escape anywhere stops following, unless a nearer surface already took it', () => {
  const onStop = vi.fn();
  render(<FollowBanner name="Maya Ortiz" onStop={onStop} />);
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(onStop).toHaveBeenCalledTimes(1);
  const taken = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  taken.preventDefault();
  document.body.dispatchEvent(taken);
  expect(onStop).toHaveBeenCalledTimes(1);
});

test('once the followed person left it says so, listens for no key, and can be dismissed', () => {
  const onStop = vi.fn();
  const onDismiss = vi.fn();
  const { container } = render(<FollowBanner name="Maya" state="left" onStop={onStop} onDismiss={onDismiss} />);
  expect(container.textContent).toContain('Maya left. You stopped following.');
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(onStop).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(onDismiss).toHaveBeenCalled();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <FollowBanner name="Maya Ortiz" onStop={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
