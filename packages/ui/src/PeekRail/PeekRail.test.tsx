/**
 * The peek: a named rail with a bar, a grip the keyboard moves as a column,
 * a veil a press on which closes it as a drawer; the order a list publishes
 * and the step through it; a body keyed on its object; and the one rule for
 * which presses on a row peek and which open elsewhere.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { AppShell } from '../AppShell/index.js';
import {
  PeekHost,
  PeekNeighbours,
  PeekRail,
  isPlainPress,
  peekClickHandler,
  peekRowActivation,
  usePeekNeighbours,
  usePeekOrder,
} from './index.js';

afterEach(cleanup);

test('is a region named for what it shows, with Close, and no stepper or Open unless given', () => {
  const onClose = vi.fn();
  render(
    <PeekRail label="Task detail" onClose={onClose}>
      <p>ENG-12</p>
    </PeekRail>,
  );
  expect(screen.getByRole('complementary', { name: 'Task detail' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Open' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the stepper steps, Open goes to the page, and the hints are the tooltips', () => {
  const onStep = vi.fn();
  render(
    <PeekRail
      label="Task detail"
      onClose={() => {}}
      onStep={onStep}
      openHref="#/work/ENG-12"
      labels={{ previousHint: 'Previous ([)', nextHint: 'Next (])', closeHint: 'Close (esc)' }}
    >
      <p>ENG-12</p>
    </PeekRail>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(onStep.mock.calls).toEqual([[-1], [1]]);
  expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe('#/work/ENG-12');
  expect(screen.getByRole('button', { name: 'Previous' }).getAttribute('title')).toBe('Previous ([)');
  expect(screen.getByRole('button', { name: 'Close' }).getAttribute('title')).toBe('Close (esc)');
});

test('as a column the grip is a separator the keyboard moves, and the width and floor are on the rail', () => {
  function Sized() {
    const [width, setWidth] = useState(420);
    return (
      <PeekRail label="Task detail" onClose={() => {}} width={width} reserve={444} onWidthChange={setWidth}>
        <p>ENG-12</p>
      </PeekRail>
    );
  }
  render(<Sized />);
  const grip = screen.getByRole('separator', { name: 'Resize the detail panel' });
  expect(grip.getAttribute('aria-valuemin')).toBe('330');
  fireEvent.keyDown(grip, { key: 'ArrowLeft' });
  const rail = screen.getByRole('complementary', { name: 'Task detail' });
  expect(rail.style.getPropertyValue('--crewlet-peek-rail-width')).toBe('436px');
  expect(rail.style.getPropertyValue('--crewlet-peek-rail-reserve')).toBe('444px');
  expect(rail.getAttribute('data-shape')).toBe('column');
});

test('as a drawer there is no grip, and a press on the veil closes it', () => {
  const onClose = vi.fn();
  render(
    <PeekRail label="Task detail" shape="drawer" onClose={onClose} onWidthChange={() => {}}>
      <p>ENG-12</p>
    </PeekRail>,
  );
  expect(screen.queryByRole('separator')).toBeNull();
  fireEvent.click(document.querySelector('.crewlet-peek-rail__veil')!);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('in the shell its shape is the shell’s, and it stands beside the scroller', () => {
  render(
    <AppShell
      peekShape="drawer"
      peek={
        <PeekRail label="Task detail" onClose={() => {}}>
          <p>ENG-12</p>
        </PeekRail>
      }
    >
      <p>List</p>
    </AppShell>,
  );
  const rail = screen.getByRole('complementary', { name: 'Task detail' });
  expect(rail.getAttribute('data-shape')).toBe('drawer');
  expect(rail.parentElement).toBe(document.querySelector('.crewlet-app-shell__body'));
});

test('Escape closes it from a field inside, unless the field answered first', () => {
  const onClose = vi.fn();
  render(
    <PeekRail label="Task detail" onClose={onClose}>
      <input aria-label="Comment" />
      <input aria-label="Filter" onKeyDown={(event) => event.key === 'Escape' && event.preventDefault()} />
    </PeekRail>,
  );
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Filter' }), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Comment' }), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

/* ── the host and the order a list publishes ─────────────────────────── */

function List({ tokens, query }: { tokens: string[]; query?: Record<string, string> }) {
  usePeekNeighbours(tokens, query);
  return null;
}

function Counter({ token }: { token: string }) {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((n) => n + 1)}>
      {token} pressed {count}
    </button>
  );
}

function Host({ start, list = true, children }: { start: string | null; list?: boolean; children?: ReactNode }) {
  const [current, setCurrent] = useState<string | null>(start);
  return (
    <PeekNeighbours>
      {list ? <List tokens={['task:1', 'task:2', 'task:3']} query={{ list: 'mine' }} /> : null}
      {children}
      <PeekHost
        current={current}
        label={(token) => `${token} detail`}
        render={(token) => (token.startsWith('task:') ? <Counter token={token} /> : undefined)}
        onClose={() => setCurrent(null)}
        onMove={setCurrent}
        openHref={(token, query) => `#/work/${token}${query ? `?${new URLSearchParams(query as Record<string, string>)}` : ''}`}
        boundary={(token, body) => <div data-testid="boundary" data-token={token}>{body}</div>}
      />
    </PeekNeighbours>
  );
}

test('the host steps through the order the list published, and the body starts fresh on each object', () => {
  render(<Host start="task:2" />);
  fireEvent.click(screen.getByRole('button', { name: 'task:2 pressed 0' }));
  expect(screen.getByRole('button', { name: 'task:2 pressed 1' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('complementary', { name: 'task:3 detail' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'task:3 pressed 0' })).toBeTruthy();
  expect(screen.getByTestId('boundary').getAttribute('data-token')).toBe('task:3');
  // The last row steps nowhere further.
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('complementary', { name: 'task:3 detail' })).toBeTruthy();
});

test('Open carries the list’s query only for an object in the list', () => {
  render(<Host start="task:2" />);
  expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe('#/work/task:2?list=mine');
  cleanup();
  render(<Host start="task:9" />);
  expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe('#/work/task:9');
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
});

test('with no list published there is no stepper', () => {
  render(<Host start="task:2" list={false} />);
  expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
});

test('an object this build has no body for closes the rail rather than opening it empty', () => {
  render(<Host start="seat:4" />);
  expect(screen.queryByRole('complementary')).toBeNull();
});

test('a list that unmounts takes its order with it', () => {
  function Probe() {
    return <span data-testid="order">{usePeekOrder().tokens.join(',')}</span>;
  }
  function Toggle() {
    const [shown, setShown] = useState(true);
    return (
      <PeekNeighbours>
        {shown ? <List tokens={['a', 'b']} /> : null}
        <Probe />
        <button type="button" onClick={() => setShown(false)}>
          Leave
        </button>
      </PeekNeighbours>
    );
  }
  render(<Toggle />);
  expect(screen.getByTestId('order').textContent).toBe('a,b');
  fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
  expect(screen.getByTestId('order').textContent).toBe('');
});

/* ── which presses peek ─────────────────────────────────────────────── */

const press = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };

test('a plain primary press peeks; every way of opening a tab is left to the browser', () => {
  expect(isPlainPress(press)).toBe(true);
  for (const change of [{ button: 1 }, { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) {
    expect(isPlainPress({ ...press, ...change })).toBe(false);
  }
  const open = vi.fn();
  render(
    <a href="#/work/ENG-12" onClick={peekClickHandler(open)}>
      ENG-12
    </a>,
  );
  const link = screen.getByRole('link', { name: 'ENG-12' });
  fireEvent.click(link, { button: 0, metaKey: true });
  expect(open).not.toHaveBeenCalled();
  const plain = fireEvent.click(link, { button: 0 });
  expect(open).toHaveBeenCalledTimes(1);
  expect(plain).toBe(false); // the navigation was prevented
  expect(peekClickHandler(undefined)).toBeUndefined();
});

test('a grid row activated from the keyboard peeks, with no button to read', () => {
  const open = vi.fn();
  const activate = peekRowActivation<string>(open);
  activate('ENG-12', new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(open).toHaveBeenCalledWith('ENG-12');
});

test('carries no violation as a column with every control', async () => {
  const { container } = render(
    <PeekRail label="Task detail" onClose={() => {}} onStep={() => {}} openHref="#/work/1" onWidthChange={() => {}}>
      <p>ENG-12</p>
    </PeekRail>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
