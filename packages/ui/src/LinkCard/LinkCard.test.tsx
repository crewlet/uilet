/**
 * A link unfurled under its message: one link, the title, named by the words
 * it shows and stretched over the preview, described by where it is from and
 * what state it is in, followed only when its address is safe, and opening a
 * new tab only when it leaves the application.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
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
      owner={{ face: <span data-testid="face" />, name: 'Mira' }}
    />,
  );
  const link = screen.getByRole('link', { name: 'WRK-41 Fix the login redirect' });
  expect(link.getAttribute('href')).toBe('#/worklet/WRK-41');
  const description = (link.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .join(' | ');
  expect(description).toBe('Worklet | Due Friday | In progress | Mira');
  // An in-app route opens in place.
  expect(link.getAttribute('target')).toBeNull();
  expect(link.closest('.crewlet-link-card')!.classList.contains('crewlet-link-card--info')).toBe(true);
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

/*
 * LABEL IN NAME (WCAG 2.5.3). The whole preview was the link, named by its
 * title while it showed the source first, then the title, the details and
 * the owner: "Example Domain" as a name for a link reading "example.com
 * Example Domain Read 16:42". A person speaking what they see could not
 * reach it, and a label-in-name check failed it on every source card. Now
 * the link is the title alone, named by exactly the words it shows.
 */
test('the link is the title, named by the words it shows, and stretched over the whole preview', () => {
  const uninstall = installSheets('LinkCard/LinkCard.css');
  try {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const { container } = render(
      <LinkCard
        href="https://example.com/"
        external
        address="https://example.com/"
        source={{ name: 'example.com', mark: <svg /> }}
        title="Example Domain"
        meta="Read 16:42"
        className="host-class"
        style={{ maxWidth: 300 }}
        data-source="one"
        onClick={onClick}
      />,
    );
    const link = screen.getByRole('link', { name: 'Example Domain (opens in a new tab)' });
    // Named by its content, never by a label laid over it.
    expect(link.hasAttribute('aria-label')).toBe(false);
    expect(link.hasAttribute('aria-labelledby')).toBe(false);
    // What it shows is its title, and nothing of the source or the details.
    const shown = [...link.querySelectorAll('*'), link]
      .filter((element) => !element.closest('.crewlet-visually-hidden'))
      .flatMap((element) => [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE))
      .map((node) => node.textContent)
      .join('')
      .trim();
    expect(shown).toBe('Example Domain');
    const description = (link.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' | ');
    expect(description).toBe('example.com | Read 16:42');
    // The preview is the card; the link's layer covers it, so a press anywhere follows it.
    const card = container.firstElementChild as HTMLElement;
    expect(card.tagName).toBe('DIV');
    expect(card.classList.contains('host-class')).toBe(true);
    expect(card.style.maxWidth).toBe('300px');
    expect(link.getAttribute('data-source')).toBe('one');
    expect(getComputedStyle(card).position).toBe('relative');
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  } finally {
    uninstall();
  }
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'LinkCard.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');
  expect(css).toContain(".crewlet-link-card__link::after { content: ''; position: absolute; inset: 0; border-radius: inherit; }");
  // The ring rings the whole preview, which is what the link covers.
  expect(css).toContain('.crewlet-link-card:has(> .crewlet-link-card__link:focus-visible) { outline: 2px solid var(--color-focus); outline-offset: 2px; }');
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
