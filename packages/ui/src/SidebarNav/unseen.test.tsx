/**
 * The unread pills: which rows count as out of view, how far the list moves to bring the
 * nearest in, where focus goes, and that the pills float without moving a row.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { NavGroup, NavItem, SidebarNav } from './index.js';
import { nearestUnseen, unseenIn, type ViewSpan } from './unseen.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Makes `el` report a box from `top` to `top + height` on screen. */
function boxed<T extends Element>(el: T, top: number, height: number): T {
  el.getBoundingClientRect = () =>
    ({ top, bottom: top + height, height, left: 0, right: 240, width: 240, x: 0, y: top }) as DOMRect;
  return el;
}

/** A row element at a screen top, 28px tall. */
const row = (top: number) => boxed(document.createElement('a'), top, 28);

const VIEW: ViewSpan = { top: 100, bottom: 400 };

describe('the rows with news the reader cannot see', () => {
  test('are those wholly above or below the view; a row partly in view is seen', () => {
    const rows = [row(20), row(72), row(90), row(200), row(380), row(400)];
    // 20 and 72 end at or above the view's top; 90 and 380 are partly in view; 400 starts at its foot.
    expect(unseenIn(rows, VIEW)).toEqual({ above: 2, below: 1 });
    expect(unseenIn([row(200)], VIEW)).toEqual({ above: 0, below: 0 });
  });

  test('below, the list moves the least that brings the nearest row in, clear of the pill', () => {
    const rows = [row(420), row(460)];
    const next = nearestUnseen(rows, VIEW, 500, 'below', 42);
    expect(next?.row).toBe(rows[0]);
    // Its bottom (448) lands 42px inside the view's bottom (400).
    expect(next?.top).toBe(500 + (448 - 400) + 42);
  });

  test('above, the nearest is the last row above the view, and lands clear of the top', () => {
    const rows = [row(-200), row(30), row(200)];
    const next = nearestUnseen(rows, VIEW, 500, 'above', 42);
    expect(next?.row).toBe(rows[1]);
    expect(next?.top).toBe(500 - (100 - 30) - 42);
    // Never past the start of the list.
    expect(nearestUnseen([row(-200)], VIEW, 50, 'above', 42)?.top).toBe(0);
  });

  test('with nothing hidden on a side there is nowhere to go', () => {
    expect(nearestUnseen([row(200)], VIEW, 0, 'below', 0)).toBeNull();
    expect(nearestUnseen([row(200)], VIEW, 0, 'above', 0)).toBeNull();
  });
});

/** A long room list in a scroller viewed from 100 to 400, scrolled 500 down. */
function Rooms({ pills = true, mutedStandup = false }: { pills?: boolean; mutedStandup?: boolean }) {
  return (
    <div data-testid="scroller" style={{ overflowY: 'auto' }}>
      <SidebarNav label="Rooms" dense unreadPills={pills}>
        <NavGroup label="Rooms">
          <NavItem href="#/design" label="design" unread />
          <NavItem href="#/general" label="general" current />
          <NavItem href="#/ops" label="ops" unread />
          <NavItem href="#/release" label="release" unread />
          <NavItem href="#/standup" label="standup" unread muted={mutedStandup} />
          <NavItem href="#/support" label="support" unread />
        </NavGroup>
      </SidebarNav>
    </div>
  );
}

/** Lays the rooms out at these screen tops and lets the list measure them. */
async function layOut(tops: Record<string, number>): Promise<HTMLElement> {
  const scroller = boxed(screen.getByTestId('scroller'), 100, 300);
  Object.defineProperty(scroller, 'scrollTop', { value: 500, writable: true, configurable: true });
  for (const [name, top] of Object.entries(tops)) boxed(screen.getByRole('link', { name: new RegExp(`^${name}`) }), top, 28);
  await act(async () => {
    fireEvent.scroll(scroller);
    await new Promise((done) => requestAnimationFrame(() => done(undefined)));
  });
  return scroller;
}

const TOPS = { design: 40, general: 200, ops: 230, release: 420, standup: 460, support: 520 };

describe('the unread pills', () => {
  test('are off unless asked for', async () => {
    render(<Rooms pills={false} />);
    await layOut(TOPS);
    expect(screen.queryByRole('button', { name: /unread/ })).toBeNull();
  });

  test('say how many rows with news lie past each edge, and only while some do', async () => {
    render(<Rooms />);
    expect(screen.queryByRole('button', { name: /unread/ })).toBeNull();
    await layOut(TOPS);
    expect(screen.getByRole('button', { name: '1 unread above' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '3 unread below' })).toBeTruthy();
    // Scrolled so every row with news is at least partly in view: both pills go.
    await layOut({ design: 120, general: 150, ops: 180, release: 210, standup: 240, support: 380 });
    expect(screen.queryByRole('button', { name: /unread/ })).toBeNull();
  });

  test('a muted row is not news', async () => {
    render(<Rooms mutedStandup />);
    await layOut(TOPS);
    expect(screen.getByRole('button', { name: '2 unread below' })).toBeTruthy();
  });

  test('a row that is not drawn (no height, as in a closed parent) is not counted', async () => {
    render(<Rooms />);
    await layOut({ general: 200, release: 420 });
    expect(screen.getByRole('button', { name: '1 unread below' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /unread above/ })).toBeNull();
  });

  test('pressed, the list scrolls the least that reveals the nearest row clear of the pill, and focus moves to it', async () => {
    render(<Rooms />);
    const scroller = await layOut(TOPS);
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
    const below = boxed(screen.getByRole('button', { name: '3 unread below' }), 366, 26);
    await userEvent.click(below);
    // release ends at 448; the pill reaches 34px into the view, plus 8px of air.
    expect(scrollTo).toHaveBeenCalledWith({ top: 500 + (448 - 400) + 34 + 8, behavior: 'smooth' });
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /^release/ }));
  });

  test('upward, it reveals the last row above the view, and from the keyboard too', async () => {
    render(<Rooms />);
    const scroller = await layOut(TOPS);
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
    const above = boxed(screen.getByRole('button', { name: '1 unread above' }), 108, 26);
    above.focus();
    await userEvent.keyboard('{Enter}');
    expect(scrollTo).toHaveBeenCalledWith({ top: 500 - (100 - 40) - (134 - 100) - 8, behavior: 'smooth' });
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /^design/ }));
  });

  test('under reduced motion the list jumps rather than glides', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)', media: query }) as MediaQueryList,
    );
    render(<Rooms />);
    const scroller = await layOut(TOPS);
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
    await userEvent.click(screen.getByRole('button', { name: '3 unread below' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  test('the arrow is decoration: the words name the pill', async () => {
    render(<Rooms />);
    await layOut(TOPS);
    const pill = screen.getByRole('button', { name: '3 unread below' });
    expect(pill.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('the words can be the caller\'s', async () => {
    render(
      <div data-testid="scroller" style={{ overflowY: 'auto' }}>
        <SidebarNav label="Rooms" unreadPills unreadPillLabel={(count, side) => `${count} more ${side === 'below' ? 'down' : 'up'}`}>
          <NavItem href="#/ops" label="ops" unread />
        </SidebarNav>
      </div>,
    );
    await layOut({ ops: 600 });
    expect(screen.getByRole('button', { name: '1 more down' })).toBeTruthy();
  });
});

describe('the pills float', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SidebarNav.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const rule = (selector: string) => /\{([^}]*)\}/.exec(css.slice(css.indexOf(`${selector} {`)))?.[1] ?? '';

  test('from a sticky anchor of no height whose margin cancels the list gap, so no row moves', () => {
    expect(rule('.crewlet-sidebar-nav__unseen')).toMatch(/position: sticky;[\s\S]*height: 0;/);
    // The gap the list draws between its children is the one the anchors cancel, in both densities.
    const gap = /gap: ([^;]+);/.exec(rule('.crewlet-sidebar-nav'))?.[1];
    expect(rule('.crewlet-sidebar-nav__unseen--above')).toContain(`margin-bottom: calc(${gap} * -1)`);
    expect(rule('.crewlet-sidebar-nav__unseen--below')).toContain(`margin-top: calc(${gap} * -1)`);
    expect(rule('.crewlet-sidebar-nav--dense')).toContain('gap: 0;');
    expect(rule('.crewlet-sidebar-nav--dense > .crewlet-sidebar-nav__unseen')).toContain('margin: 0;');
    expect(rule('.crewlet-sidebar-nav__unseen-pill')).toContain('position: absolute');
  });
});
