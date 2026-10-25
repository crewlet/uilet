/**
 * A place the answer points to, opened only by the person's press: a new-tab
 * link only for an address the grammar trusts, Open here as a button, and
 * once opened a success Tag and strip with nothing left to press.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { OpenInAppCard } from './index.js';

afterEach(cleanup);

const glyph = <svg />;

test('ready: a new-tab link that withholds the opener, and Open here as a button', () => {
  const onOpenHere = vi.fn();
  render(<OpenInAppCard icon={glyph} title="Fix the flaky sign-in test" path="Tasks › ENG-156" href="#/work/ENG-156" onOpenHere={onOpenHere} />);
  expect(screen.getByRole('region', { name: 'Open in app' })).toBeTruthy();
  const link = screen.getByRole('link', { name: /Open in new tab/ });
  expect(link.getAttribute('href')).toBe('#/work/ENG-156');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noreferrer');
  fireEvent.click(screen.getByRole('button', { name: 'Open here' }));
  expect(onOpenHere).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Tasks › ENG-156')).toBeTruthy();
});

test('an address the grammar does not trust draws no link at all', () => {
  render(<OpenInAppCard icon={glyph} title="Fix it" path="Tasks › ENG-156" href="javascript:alert(1)" onOpenHere={() => {}} />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByRole('button', { name: 'Open here' })).toBeTruthy();
});

test('opened: a success Tag in the head and a strip, with nothing to press', () => {
  render(<OpenInAppCard icon={glyph} title="Fix it" path="Tasks › ENG-156" href="#/work/ENG-156" onOpenHere={() => {}} state="opened" />);
  expect(screen.getByRole('region', { name: 'Open in app Opened' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Opened beside this conversation.');
  expect(screen.queryByRole('button')).toBeNull();
});

test('carries no axe violation in either state', async () => {
  const { container } = render(
    <main>
      <OpenInAppCard icon={glyph} title="Fix it" path="Tasks › ENG-156" href="#/work/ENG-156" onOpenHere={() => {}} />
      <OpenInAppCard icon={glyph} title="Fix it" path="Tasks › ENG-156" href="#/work/ENG-156" onOpenHere={() => {}} state="opened" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
