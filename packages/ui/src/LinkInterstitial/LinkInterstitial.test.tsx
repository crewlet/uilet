/**
 * The stop between an artifact's link and the open web: it names where the
 * link goes before anything is opened, and opens it so it cannot reach back.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { LinkInterstitial } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('names the host and the whole address before anything is opened', () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<LinkInterstitial url={new URL('https://reports.example.com/q3?tab=2')} source="Vendor scorecard" onClose={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'Open an external link?' })).toBeDefined();
  expect(screen.getByText('reports.example.com')).toBeDefined();
  expect(screen.getByText('https://reports.example.com/q3?tab=2')).toBeDefined();
  expect(screen.getByText(/Vendor scorecard wants to open a page outside Crewlet/)).toBeDefined();
  expect(open).not.toHaveBeenCalled();
});

test('opens the link with noopener and noreferrer, then closes', () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  const onClose = vi.fn();
  const onOpened = vi.fn();
  render(<LinkInterstitial url={new URL('https://example.com/a')} onClose={onClose} onOpened={onOpened} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open link' }));
  expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer');
  expect(onOpened).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('declining opens nothing', () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  const onClose = vi.fn();
  render(<LinkInterstitial url={new URL('https://example.com/a')} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(open).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a look-alike host shows as the ASCII form it really is', () => {
  // The first letter is Cyrillic. Drawn as Unicode it reads as a familiar name.
  render(<LinkInterstitial url={new URL('https://аpple.com/login')} onClose={() => {}} />);
  expect(screen.getByText('xn--pple-43d.com')).toBeDefined();
});

test('warns on a link without a secure connection, and only then', () => {
  const { rerender } = render(<LinkInterstitial url={new URL('http://example.com/')} onClose={() => {}} />);
  expect(screen.getByText(/does not use a secure connection/)).toBeDefined();
  rerender(<LinkInterstitial url={new URL('https://example.com/')} onClose={() => {}} />);
  expect(screen.queryByText(/does not use a secure connection/)).toBeNull();
});

test('a mail link names the address', () => {
  render(<LinkInterstitial url={new URL('mailto:ops@example.com')} onClose={() => {}} />);
  expect(screen.getByText('ops@example.com')).toBeDefined();
});

test('is closed with no link', () => {
  render(<LinkInterstitial url={null} onClose={() => {}} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('carries no axe violation', async () => {
  render(<LinkInterstitial url={new URL('http://example.com/a')} source="Vendor scorecard" onClose={() => {}} />);
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
