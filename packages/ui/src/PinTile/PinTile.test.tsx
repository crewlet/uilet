/**
 * Something a reader pinned: one link named by its title over the whole tile,
 * with the facts that make opening it unnecessary, and unpin and move as
 * buttons beside the link rather than inside it.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { ReorderHandleProps } from '../Reorder/index.js';
import { PinTile } from './index.js';

afterEach(cleanup);

const sheet = () => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'PinTile.css'), 'utf8');

test('is one link, named by its title', () => {
  const { container } = render(<PinTile title="FairSplit MVP" href="#/work/FAIR" />);
  const links = container.querySelectorAll('a');
  expect(links).toHaveLength(1);
  const link = screen.getByRole('link', { name: 'FairSplit MVP' });
  expect(link.getAttribute('href')).toBe('#/work/FAIR');
});

test('the link’s target is the whole tile, and the buttons sit above it', () => {
  const css = sheet();
  expect(css).toMatch(/\.crewlet-pin-tile\s*\{[^}]*position:\s*relative;/);
  expect(css).toMatch(/\.crewlet-pin-tile__link::after\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/);
  for (const part of ['handle', 'unpin']) {
    expect(css, part).toMatch(new RegExp(`\\.crewlet-pin-tile__${part}\\s*\\{[^}]*z-index:\\s*var\\(--z-index-raised\\);`));
  }
});

test('says its kind, one line of what is true now, its state and a figure', () => {
  const { container } = render(
    <PinTile
      title="Crewlet-PM"
      href="#/agents/pm"
      kind="Agent"
      meta="Working on FAIR-1"
      status={<span>Working</span>}
      figure="14%"
    />,
  );
  expect(container.querySelector('.crewlet-pin-tile__meta')!.textContent).toBe('Agent · Working on FAIR-1');
  expect(container.querySelector('.crewlet-pin-tile__status')!.textContent).toBe('Working');
  expect(container.querySelector('.crewlet-pin-tile__figure')!.textContent).toBe('14%');
});

test('draws no meta line, state or figure it was not given, and a zero figure still shows', () => {
  const { container, rerender } = render(<PinTile title="Inbox" href="#/inbox" />);
  expect(container.querySelector('.crewlet-pin-tile__meta')).toBeNull();
  expect(container.querySelector('.crewlet-pin-tile__status')).toBeNull();
  expect(container.querySelector('.crewlet-pin-tile__figure')).toBeNull();
  rerender(<PinTile title="Inbox" href="#/inbox" figure={0} />);
  expect(container.querySelector('.crewlet-pin-tile__figure')!.textContent).toBe('0');
});

test('unpins from a button named for what it unpins, drawn only when it can', () => {
  const onUnpin = vi.fn();
  const { rerender } = render(<PinTile title="FairSplit MVP" href="#/work/FAIR" onUnpin={onUnpin} />);
  fireEvent.click(screen.getByRole('button', { name: 'Unpin FairSplit MVP' }));
  expect(onUnpin).toHaveBeenCalledTimes(1);
  rerender(<PinTile title="FairSplit MVP" href="#/work/FAIR" />);
  expect(screen.queryByRole('button', { name: 'Unpin FairSplit MVP' })).toBeNull();
});

test('moves by a handle only when it is given one, named by the handle', () => {
  const handle: ReorderHandleProps = {
    draggable: true,
    'aria-label': 'Move FairSplit MVP',
    'aria-describedby': 'hint',
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onKeyDown: vi.fn(),
  };
  const { rerender } = render(<PinTile title="FairSplit MVP" href="#/work/FAIR" handle={handle} />);
  const grip = screen.getByRole('button', { name: 'Move FairSplit MVP' });
  fireEvent.keyDown(grip, { key: 'ArrowDown' });
  expect(handle.onKeyDown).toHaveBeenCalledTimes(1);
  rerender(<PinTile title="FairSplit MVP" href="#/work/FAIR" />);
  expect(screen.queryByRole('button', { name: 'Move FairSplit MVP' })).toBeNull();
});

test('passes axe', async () => {
  const { container } = render(
    <div>
      <p id="hint">Drag to move, or press the arrow keys.</p>
      <PinTile
        title="FairSplit MVP"
        href="#/work/FAIR"
        kind="Project"
        meta="6 open"
        figure="14%"
        onUnpin={() => {}}
        handle={{
          draggable: true,
          'aria-label': 'Move FairSplit MVP',
          'aria-describedby': 'hint',
          onDragStart: () => {},
          onDragEnd: () => {},
          onKeyDown: () => {},
        }}
      />
    </div>,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
