/**
 * A rule between parts of a page: a separator to a screen reader, and a named
 * one says its name.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { Divider } from './index.js';

afterEach(cleanup);

test('is a separator, unnamed and with no words when it has no label', () => {
  const { container } = render(<Divider />);
  const rule = screen.getByRole('separator');
  expect(rule.getAttribute('aria-label')).toBeNull();
  expect(container.querySelector('.crewlet-divider__label')).toBeNull();
  expect(rule.className).toBe('crewlet-divider');
});

test('a label names the separator and is drawn on the rule, at its start by default', () => {
  render(<Divider label="History" />);
  const rule = screen.getByRole('separator', { name: 'History' });
  expect(rule.querySelector('.crewlet-divider__label')!.textContent).toBe('History');
  expect(rule.classList.contains('crewlet-divider--labelled')).toBe(true);
  expect(rule.classList.contains('crewlet-divider--center')).toBe(false);
});

test('centres its label when asked, and only a label', () => {
  render(<Divider label="History" align="center" />);
  expect(screen.getByRole('separator').classList.contains('crewlet-divider--center')).toBe(true);
  cleanup();
  render(<Divider align="center" />);
  expect(screen.getByRole('separator').classList.contains('crewlet-divider--center')).toBe(false);
});

test('passes axe', async () => {
  const { container } = render(
    <div>
      <p>Today</p>
      <Divider label="History" />
      <p>Yesterday</p>
    </div>,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
