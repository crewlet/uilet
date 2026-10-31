/**
 * A link unfurled under its message: one link named by its title, described
 * by where it is from and what state it is in, followed only when its
 * address is safe, and opening a new tab only when it leaves the application.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { LinkCard } from './index.js';

afterEach(cleanup);

const source = { name: 'Worklet', mark: <svg data-testid="mark" /> };

test('the preview is one link named by its code and title, described by the rest', () => {
  render(
    <LinkCard
      href="#/worklet/WRK-41"
      source={source}
      code="WRK-41"
      title="Fix the login redirect"
      meta="Due Friday"
      status="In progress"
      statusTone="info"
      owner={{ face: <span data-testid="face" />, name: 'Miles' }}
    />,
  );
  const link = screen.getByRole('link', { name: 'WRK-41 Fix the login redirect' });
  expect(link.getAttribute('href')).toBe('#/worklet/WRK-41');
  const description = (link.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .join(' | ');
  expect(description).toBe('Worklet | Due Friday | In progress | Miles');
  // An in-app route opens in place.
  expect(link.getAttribute('target')).toBeNull();
  expect(link.classList.contains('crewlet-link-card--info')).toBe(true);
  // The mark and the face are decoration: the words say what they show.
  expect(screen.getByTestId('mark').parentElement?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByTestId('face').parentElement?.getAttribute('aria-hidden')).toBe('true');
});

test('an external link opens a new tab without the referrer or the opener, and says so', () => {
  render(
    <LinkCard
      href="https://github.com/crewlet/uilet/pull/212"
      external
      address="https://github.com/crewlet/uilet/pull/212"
      source={{ name: 'GitHub', mark: null }}
      code="#212"
      title="Add the day pill"
    />,
  );
  const link = screen.getByRole('link', { name: '#212 Add the day pill (opens in a new tab)' });
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.getAttribute('title')).toBe('https://github.com/crewlet/uilet/pull/212');
});

test('an address safeHref refuses, or none, draws the preview with no link in it', () => {
  const { rerender } = render(<LinkCard href="javascript:alert(1)" source={source} title="Refused" />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('Refused').closest('.crewlet-link-card')?.classList.contains('crewlet-link-card--inert')).toBe(true);
  expect(document.querySelector('[href]')).toBeNull();
  rerender(<LinkCard source={source} title="No address" />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('No address')).toBeDefined();
});

test('every tone is a class, and neutral is the default', () => {
  const { container, rerender } = render(<LinkCard href="#/a" source={source} title="A" />);
  expect(container.firstElementChild?.classList.contains('crewlet-link-card--neutral')).toBe(true);
  for (const tone of ['info', 'success', 'warning', 'danger'] as const) {
    rerender(<LinkCard href="#/a" source={source} title="A" statusTone={tone} status="State" />);
    expect(container.firstElementChild?.classList.contains(`crewlet-link-card--${tone}`)).toBe(true);
  }
});

test('a stack of previews carries no axe violation', async () => {
  const { container } = render(
    <main>
      <LinkCard href="#/worklet/WRK-41" source={source} code="WRK-41" title="Fix the login redirect" status="In progress" statusTone="info" />
      <LinkCard href="https://github.com/crewlet/uilet/pull/212" external source={{ name: 'GitHub', mark: null }} title="Add the day pill" />
      <LinkCard source={source} title="No address" meta="A page" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
