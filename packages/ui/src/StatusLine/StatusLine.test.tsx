/**
 * A state in one calm line: the dot and word, then quiet notes, with the
 * state in full in a tooltip and read with the line.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { StatusLine } from './StatusLine.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'StatusLine.css'), 'utf8');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('a running state is its dot and word, then each note after a middle dot', () => {
  const { container } = render(<StatusLine tone="info" pulse label="Working" notes={['3 waiting', 'pausing']} />);
  const line = container.querySelector('.crewlet-status-line')!;
  expect(line.querySelector('.crewlet-status-dot.crewlet-status-dot--info.is-pulsing')).not.toBeNull();
  expect(line.hasAttribute('data-quiet')).toBe(false);
  const notes = [...line.querySelectorAll('.crewlet-status-line__note')];
  expect(notes.map((note) => note.querySelector('[aria-hidden="true"]')?.textContent)).toEqual(['· ', '· ']);
  // Drawn as "Working · 3 waiting · pausing"; a reader hears a pause for each dot.
  expect(notes.map((note) => note.textContent)).toEqual(['· , 3 waiting', '· , pausing']);
});

test('a state with no dot is the word alone, in the quieter ink', () => {
  const { container } = render(<StatusLine label="Away" />);
  const line = container.querySelector('.crewlet-status-line')!;
  expect(line.querySelector('.crewlet-status-dot')).toBeNull();
  expect(line.hasAttribute('data-quiet')).toBe(true);
  expect(line.querySelector('.crewlet-status-line__notes')).toBeNull();
  expect(SHEET).toMatch(/\.crewlet-status-line\[data-quiet\] \.crewlet-status-line__main \{\s*color: var\(--color-text-secondary\);/);
  expect(SHEET).toMatch(/\.crewlet-status-line__note \{[^}]*color: var\(--color-text-secondary\);/);
});

test('empty notes are not drawn', () => {
  const { container } = render(<StatusLine tone="success" label="Idle" notes={['', null, undefined]} />);
  expect(container.querySelector('.crewlet-status-line__notes')).toBeNull();
});

test('the state in full is in the tooltip on the word, and read with the line', () => {
  vi.useFakeTimers();
  const { container } = render(
    <StatusLine tone="warning" label="Needs you" notes={['2 waiting']} detail="Asks to call deploy on production" />,
  );
  const main = container.querySelector<HTMLElement>('.crewlet-status-line__main')!;
  expect(screen.getByText('Asks to call deploy on production').closest('.crewlet-visually-hidden')).not.toBeNull();
  fireEvent.pointerEnter(main);
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  const tip = document.querySelector('[role="tooltip"]')!;
  expect(tip.textContent).toBe('Asks to call deploy on production');
  // Shown, not read twice: the line already says it.
  expect(tip.querySelector('[aria-hidden="true"]')).not.toBeNull();
});

test('a clipped line keeps one line and cuts its notes first', () => {
  const { container } = render(<StatusLine tone="info" label="Working" notes={['agent · @qa']} overflow="clip" />);
  expect(container.querySelector('.crewlet-status-line')!.className).toContain('crewlet-status-line--clip');
  expect(SHEET).toMatch(/\.crewlet-status-line--clip \{\s*flex-wrap: nowrap;/);
  expect(SHEET).toMatch(
    /\.crewlet-status-line--clip \.crewlet-status-line__notes \{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/,
  );
});

test('it has no violation', async () => {
  const { container } = render(
    <div>
      <StatusLine tone="info" pulse label="Working" notes={['3 waiting']} detail="Reviewing the release notes" />
      <StatusLine label="Away" />
    </div>,
  );
  const result = await axe.run(container, { runOnly: { type: 'tag', values: WCAG } });
  expect(result.violations.map((one) => one.id)).toEqual([]);
});
