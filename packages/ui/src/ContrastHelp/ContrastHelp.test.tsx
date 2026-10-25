/**
 * ContrastHelp: an info button, reachable by keyboard and by touch, that opens
 * a named panel explaining AA, AAA and Low or Fails in the badge's own words
 * and tones.
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ContrastHelp } from './index.js';

afterEach(cleanup);

const trigger = () => screen.getByRole('button', { name: 'About contrast levels' });

test('a named button that says it opens a dialog, closed until pressed', () => {
  render(<ContrastHelp />);
  expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
  expect(trigger().getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('a press opens the panel with what each level means, in the badge’s tones', async () => {
  const user = userEvent.setup();
  render(<ContrastHelp />);
  await user.click(trigger());
  const panel = screen.getByRole('dialog', { name: 'Contrast levels' });
  expect(trigger().getAttribute('aria-expanded')).toBe('true');
  expect(panel.textContent).toContain('Contrast compares two colours, from 1:1 to 21:1.');
  const terms = within(panel).getAllByRole('term').map((term) => term.textContent);
  const meanings = within(panel).getAllByRole('definition').map((definition) => definition.textContent);
  expect(terms).toEqual(['AA', 'AAA', 'Low or Fails']);
  expect(meanings).toEqual([
    'At least 4.5:1 for text, 3:1 for large text, icons and buttons.',
    'At least 7:1 for text, 4.5:1 for large text.',
    'Below AA.',
  ]);
  const tags = [...panel.querySelectorAll('.crewlet-tag')].map((tag) => tag.className);
  expect(tags[0]).toContain('success');
  expect(tags[1]).toContain('success');
  expect(tags[2]).toContain('warning');
});

test('opens from the keyboard and Escape closes it, handing focus back to the button', async () => {
  const user = userEvent.setup();
  render(<ContrastHelp />);
  await user.tab();
  expect(document.activeElement).toBe(trigger());
  await user.keyboard('{Enter}');
  expect(screen.getByRole('dialog', { name: 'Contrast levels' })).toBeTruthy();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger());
});

test('its words are the caller’s', async () => {
  const user = userEvent.setup();
  render(<ContrastHelp labels={{ trigger: 'Kontrast erklärt', title: 'Kontraststufen', low: { term: 'Niedrig', meaning: 'Unter AA.' } }} />);
  await user.click(screen.getByRole('button', { name: 'Kontrast erklärt' }));
  const panel = screen.getByRole('dialog', { name: 'Kontraststufen' });
  expect(panel.textContent).toContain('Niedrig');
  expect(panel.textContent).toContain('Unter AA.');
});

test('carries no axe violation, closed and open', async () => {
  const user = userEvent.setup();
  const { container } = render(
    <main>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <h2>Contrast</h2>
        <ContrastHelp />
      </div>
    </main>,
  );
  const run = () =>
    axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
  expect((await run()).violations.map((violation) => violation.id)).toEqual([]);
  await user.click(within(container).getByRole('button'));
  expect((await run()).violations.map((violation) => violation.id)).toEqual([]);
});
