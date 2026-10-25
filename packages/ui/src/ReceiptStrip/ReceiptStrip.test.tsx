/**
 * A card's foot strip and the refusal drawn on it or under a control: a
 * polite status for an outcome, an alert for a refusal, a mark for each tone,
 * and the refusal's actions only where they were offered.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { ReceiptStrip, RefusalStrip } from './index.js';

afterEach(cleanup);

test('an outcome is a polite status and a refusal an alert, each with its mark', () => {
  const { container } = render(
    <>
      <ReceiptStrip>Created ENG-156 · assigned to Agent SWE</ReceiptStrip>
      <ReceiptStrip tone="neutral">You declined this. Nothing changed.</ReceiptStrip>
      <ReceiptStrip tone="danger">You no longer have access to share this artifact. Nothing changed.</ReceiptStrip>
    </>,
  );
  expect(screen.getAllByRole('status').map((strip) => strip.textContent)).toEqual([
    'Created ENG-156 · assigned to Agent SWE',
    'You declined this. Nothing changed.',
  ]);
  expect(screen.getByRole('alert').textContent).toContain('no longer have access');
  for (const icon of container.querySelectorAll('.crewlet-receipt-strip__icon')) {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('svg')).not.toBeNull();
  }
});

test('a refusal offers Try again and Dismiss only when asked, inline or at a foot', () => {
  const onRetry = vi.fn();
  const onDismiss = vi.fn();
  const { rerender, container } = render(
    <RefusalStrip hint="Ask an admin." onRetry={onRetry} onDismiss={onDismiss}>
      You need Tracker access for this.
    </RefusalStrip>,
  );
  const inline = screen.getByRole('alert');
  expect(inline.className).toContain('crewlet-refusal-strip');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
  rerender(<RefusalStrip placement="foot">It is not there any more.</RefusalStrip>);
  expect(screen.queryByRole('button')).toBeNull();
  expect(container.querySelector('.crewlet-receipt-strip--danger')).not.toBeNull();
  expect(screen.getByRole('alert').textContent).toBe('It is not there any more.');
});

test('a retry under way keeps its label with the spinner', () => {
  render(
    <RefusalStrip onRetry={() => {}} retrying>
      The engine did not answer in time.
    </RefusalStrip>,
  );
  const retry = screen.getByRole('button', { name: 'Try again' });
  expect(retry.getAttribute('aria-busy')).toBe('true');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ReceiptStrip>Applied to Work › Tasks · 3 of 8 tasks shown</ReceiptStrip>
      <RefusalStrip onRetry={() => {}} onDismiss={() => {}}>
        You need Tracker access for this.
      </RefusalStrip>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('announce={false} leaves the announcement to the host: no role of its own, inline or at the foot', () => {
  const { rerender } = render(<RefusalStrip announce={false}>It is not there any more.</RefusalStrip>);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('It is not there any more.')).toBeTruthy();
  rerender(
    <RefusalStrip announce={false} placement="foot">
      It is not there any more.
    </RefusalStrip>,
  );
  expect(screen.queryByRole('alert')).toBeNull();
  rerender(
    <ReceiptStrip tone="success" announce={false}>
      Saved.
    </ReceiptStrip>,
  );
  expect(screen.queryByRole('status')).toBeNull();
});
