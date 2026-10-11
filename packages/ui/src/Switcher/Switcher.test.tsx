/**
 * The switcher: its button, the panel's three places, the keys, the rows that
 * are links, the held rows, the states a list can be in, and how a screen
 * reader hears it.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { Switcher, type SwitcherGroup, type SwitcherOption, type SwitcherProps } from './index.js';

afterEach(cleanup);

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Switcher.css'), 'utf8');

const PROJECTS = [
  { key: 'FAIR', name: 'Product and Engineering', open: 2 },
  { key: 'SPLIT', name: 'Split engine', open: 4 },
  { key: 'SETL', name: 'Settle up', open: 0 },
];

function projectRows(query: string, current: string, onSelect: (key: string) => void): SwitcherOption[] {
  const q = query.trim().toLowerCase();
  return PROJECTS.filter((p) => !q || p.key.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).map((p) => ({
    id: p.key,
    label: p.name,
    keyChip: p.key,
    meta: p.open,
    accessibleLabel: `${p.name}, ${p.key}, ${p.open} open`,
    href: `#/work/${p.key}`,
    current: p.key === current,
    onSelect: () => onSelect(p.key),
  }));
}

/** A switcher whose open state and query are its own, as a page would hold them. */
function Harness({
  onSelect = () => {},
  held,
  trigger = { label: 'Product and Engineering', keyChip: 'FAIR', title: 'Switch project (G then P)' },
  after,
  ...props
}: Partial<SwitcherProps> & { onSelect?: (key: string) => void; held?: string; after?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rows = projectRows(query, 'FAIR', onSelect);
  const groups: SwitcherGroup[] = rows.length ? [{ id: 'projects', label: 'Projects', count: rows.length, options: rows }] : [];
  return (
    <>
      <Announcer />
      <Switcher
        label="Switch project"
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        query={query}
        onQueryChange={setQuery}
        placeholder="Find a project"
        listLabel="Projects"
        pinned={{ id: 'all', label: 'All projects', meta: 6, href: '#/work', onSelect: () => onSelect('all') }}
        groups={groups}
        footer={[
          { id: 'browse', label: 'Browse all projects', href: '#/work' },
          { id: 'new', label: 'New project…', held, onSelect: () => onSelect('new') },
        ]}
        announcement={query ? `${rows.length} projects` : undefined}
        {...props}
      />
      {after}
    </>
  );
}

const button = () => screen.getByRole('button', { name: /Product and Engineering/ });
const field = () => screen.getByRole('combobox', { name: 'Find a project' });
const activeRow = () => document.getElementById(field().getAttribute('aria-activedescendant') ?? '');
/** A row's words as a reader sees them: the spaces between its parts are for its name. */
const words = (el: Element | null | undefined) => el?.textContent?.trim();

function openPanel() {
  fireEvent.click(button());
  return screen.getByRole('dialog', { name: 'Switch project' });
}

describe('the button', () => {
  test("is the page's name: its key, its name, a chevron, and the panel it opens", () => {
    render(<Harness />);
    const b = button();
    expect(b.textContent).toBe('FAIR Product and Engineering');
    expect(b.getAttribute('aria-haspopup')).toBe('dialog');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.getAttribute('title')).toBe('Switch project (G then P)');
    expect(b.querySelector('svg.crewlet-switcher-trigger__chevron[aria-hidden="true"]')).not.toBeNull();
    openPanel();
    expect(b.getAttribute('aria-expanded')).toBe('true');
  });

  test('Down opens it, with the arrows on the first row', async () => {
    render(<Harness />);
    fireEvent.keyDown(button(), { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(field()));
    expect(activeRow()?.textContent).toContain('All projects');
  });

  test('a tag follows the name, and an identifier waiting for its name is mono', () => {
    render(<Harness trigger={{ label: 'OLD', mono: true, tag: <span>Archived</span> }} />);
    const b = screen.getByRole('button', { name: 'OLD Archived' });
    expect(b.classList.contains('is-mono')).toBe(true);
  });
});

describe('the panel', () => {
  test('is a named dialog holding a combobox that drives one listbox', async () => {
    render(<Harness />);
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    const list = screen.getByRole('listbox', { name: 'Projects' });
    expect(field().getAttribute('aria-controls')).toBe(list.id);
    expect(field().getAttribute('aria-expanded')).toBe('true');
    // The footer's actions are the listbox's too, in their own band.
    const footer = document.getElementById(list.getAttribute('aria-owns') ?? '')!;
    expect(within(footer).getAllByRole('option').map(words)).toEqual([
      'Browse all projects',
      'New project…',
    ]);
    expect(within(list).getByRole('group', { name: 'Projects' })).toBeTruthy();
  });

  test('the current subject carries aria-current and its own outline, and every row reads its name, key and count', () => {
    render(<Harness />);
    openPanel();
    const fair = screen.getByRole('option', { name: 'Product and Engineering, FAIR, 2 open' });
    expect(fair.getAttribute('aria-current')).toBe('page');
    expect(fair.classList.contains('is-current')).toBe(true);
    expect(screen.getByRole('option', { name: 'Split engine, SPLIT, 4 open' }).getAttribute('aria-current')).toBeNull();
    const current = /\.crewlet-switcher__option\.is-current\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(current).toMatch(/outline:\s*1px solid var\(--color-brand-accent\)/);
    expect(current).not.toMatch(/box-shadow/);
  });

  test('the arrows wrap, and Enter takes the row, closes, and puts focus back on the button', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    fireEvent.keyDown(field(), { key: 'ArrowUp' });
    expect(words(activeRow())).toBe('New project…');
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(activeRow()?.textContent).toContain('All projects');
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(activeRow()?.getAttribute('aria-label')).toBe('Split engine, SPLIT, 4 open');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('SPLIT');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  test('a held row says why, takes no press, and the arrows pass over it', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} held="Needs an operator credential" />);
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    const held = screen.getByRole('option', { name: /New project/ });
    expect(held.getAttribute('aria-disabled')).toBe('true');
    expect(held.textContent).toContain('Needs an operator credential');
    expect(held.tagName).toBe('DIV');
    fireEvent.click(held);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Up from the first row wraps to the last row that can be taken.
    fireEvent.keyDown(field(), { key: 'ArrowUp' });
    expect(words(activeRow())).toBe('Browse all projects');
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(activeRow()?.textContent).toContain('All projects');
  });

  test('Home and End are the field caret’s, as in every editable combobox', async () => {
    render(<Harness />);
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    const before = activeRow();
    fireEvent.keyDown(field(), { key: 'End' });
    expect(activeRow()).toBe(before);
  });

  test('a row that goes somewhere is a link; Command with Enter opens it in a new tab and the panel stays', async () => {
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onSelect = vi.fn();
    try {
      render(<Harness onSelect={onSelect} />);
      openPanel();
      await waitFor(() => expect(document.activeElement).toBe(field()));
      const split = screen.getByRole('option', { name: 'Split engine, SPLIT, 4 open' });
      expect(split.tagName).toBe('A');
      expect(split.getAttribute('href')).toBe('#/work/SPLIT');
      expect(split.getAttribute('tabindex')).toBe('-1');
      fireEvent.keyDown(field(), { key: 'ArrowDown' });
      fireEvent.keyDown(field(), { key: 'ArrowDown' });
      fireEvent.keyDown(field(), { key: 'Enter', metaKey: true });
      expect(opened).toHaveBeenCalledWith('#/work/SPLIT', '_blank', 'noopener');
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeTruthy();
    } finally {
      opened.mockRestore();
    }
  });

  test('a Command click is left to the browser and keeps the panel; a plain click takes the row', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    openPanel();
    const split = screen.getByRole('option', { name: 'Split engine, SPLIT, 4 open' });
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    split.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(split);
    expect(onSelect).toHaveBeenCalledWith('SPLIT');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a press keeps focus in the field, and a middle press is left alone', () => {
    render(<Harness />);
    openPanel();
    const split = screen.getByRole('option', { name: 'Split engine, SPLIT, 4 open' });
    expect(fireEvent.mouseDown(split, { button: 0 })).toBe(false);
    expect(fireEvent.mouseDown(split, { button: 1 })).toBe(true);
  });

  test("typing searches, draws the matched letters bold in the key and the name, and says how many", async () => {
    render(<Harness />);
    openPanel();
    fireEvent.change(field(), { target: { value: 'sp' } });
    const split = screen.getByRole('option', { name: 'Split engine, SPLIT, 4 open' });
    expect(split.querySelector('.crewlet-key-chip__match')?.textContent).toBe('SP');
    expect(split.querySelector('b.crewlet-switcher__match')?.textContent).toBe('Sp');
    await waitFor(() => expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('1 projects'));
    // The pinned row and the footer are never matched.
    expect(screen.getByRole('option', { name: /All projects/ }).querySelector('b')).toBeNull();
  });

  test('Escape closes it and puts focus back on the button', async () => {
    render(<Harness />);
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  test('Tab closes it and carries on past the button; Shift+Tab comes back to the button', async () => {
    render(<Harness after={<a href="#/work/FAIR?lens=about">About</a>} />);
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    fireEvent.keyDown(field(), { key: 'Tab' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About' }));

    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    fireEvent.keyDown(field(), { key: 'Tab', shiftKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button());
  });
});

describe('the states a list is in', () => {
  test('loading draws placeholder rows, says so once, and marks the list busy', () => {
    render(<Harness loading groups={[]} pinned={undefined} loadingLabel="Loading projects" />);
    const dialog = openPanel();
    expect(screen.getByRole('listbox').getAttribute('aria-busy')).toBe('true');
    expect(within(dialog).getByRole('status').textContent).toBe('Loading projects');
    expect(document.querySelectorAll('.crewlet-switcher__skeleton-row')).toHaveLength(6);
    expect(document.querySelector('.crewlet-switcher__skeleton')?.getAttribute('aria-hidden')).toBe('true');
    // Nothing is highlighted while the rows are on their way, so Enter takes
    // nothing; the arrows still reach the footer.
    expect(field().hasAttribute('aria-activedescendant')).toBe(false);
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(words(activeRow())).toBe('Browse all projects');
  });

  test("a message names what can be done about it, and its actions are rows the arrows reach", async () => {
    const retry = vi.fn();
    render(
      <Harness
        pinned={undefined}
        groups={[]}
        message={{
          title: 'The project list did not load',
          body: 'The page behind it is unchanged.',
          actions: [{ id: 'retry', label: 'Try again', onSelect: retry }],
        }}
      />,
    );
    openPanel();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    const group = screen.getByRole('group', { name: 'The project list did not load' });
    expect(within(group).getByRole('option', { name: 'Try again' })).toBeTruthy();
    // The field is described by it, so it is heard where focus is.
    const described = (field().getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['The project list did not load', 'The page behind it is unchanged.']);
    expect(activeRow()?.textContent).toContain('Try again');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(retry).toHaveBeenCalled();
  });

  test('a note about the list sits under the pinned row and describes the field', () => {
    render(<Harness note="200 of 340 listed. Type to search all of them." />);
    openPanel();
    const note = document.querySelector('.crewlet-switcher__note')!;
    expect(note.textContent).toBe('200 of 340 listed. Type to search all of them.');
    expect(field().getAttribute('aria-describedby')).toBe(note.id);
    // After the pinned row and its rule, before the first group.
    const list = screen.getByRole('listbox');
    const order = [...list.children].map((el) => el.className || el.getAttribute('role'));
    expect(order.slice(0, 3)).toEqual([
      'crewlet-listbox__option crewlet-switcher__option',
      'crewlet-listbox__separator',
      'crewlet-switcher__note',
    ]);
  });
});

describe('where it opens', () => {
  function phone(matches: (query: string) => boolean) {
    const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: matches(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    return () => {
      if (had) Object.defineProperty(globalThis, 'matchMedia', had);
      else delete (globalThis as Record<string, unknown>).matchMedia;
    };
  }

  test('without a button it opens centred, named by its label, with no close control', () => {
    render(
      <Switcher label="Switch project" open onOpenChange={() => {}} query="" onQueryChange={() => {}} placeholder="Find a project" groups={[]} />,
    );
    expect(screen.queryByRole('button', { name: /Product and Engineering/ })).toBeNull();
    const dialog = screen.getByRole('dialog', { name: 'Switch project' });
    expect(dialog.classList.contains('crewlet-switcher--centered')).toBe(true);
    expect(document.querySelector('.crewlet-modal-overlay--top')).not.toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
  });

  test('on a phone it is a sheet from the bottom with its title and a close control', () => {
    const restore = phone((query) => query === '(width < 640px)');
    try {
      render(<Harness />);
      const dialog = openPanel();
      expect(dialog.classList.contains('crewlet-switcher--sheet')).toBe(true);
      expect(document.querySelector('.crewlet-modal-overlay--bottom')).not.toBeNull();
      expect(within(dialog).getByText('Switch project')).toBeTruthy();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    } finally {
      restore();
    }
  });

  test('on a touch screen the panel starts on itself, so no keyboard covers the list', async () => {
    const restore = phone((query) => query === '(width < 640px)' || query === '(pointer: coarse)');
    try {
      render(<Harness />);
      openPanel();
      await waitFor(() => expect(document.activeElement?.classList.contains('crewlet-switcher__panel')).toBe(true));
    } finally {
      restore();
    }
  });

  test("anchored, every row's key lines up under the button's own", () => {
    const real = Element.prototype.getBoundingClientRect;
    const box = (left: number, width = 100) =>
      ({ left, right: left + width, top: 40, bottom: 68, width, height: 28, x: left, y: 40 }) as DOMRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.classList.contains('crewlet-switcher-trigger')) return box(200, 220);
      if (this.closest('.crewlet-switcher-trigger') && this.classList.contains('crewlet-key-chip')) return box(206, 40);
      if (this.classList.contains('crewlet-popover')) return box(0, 360);
      if (this.classList.contains('crewlet-switcher__lead')) return box(17, 52);
      return real.call(this);
    };
    try {
      render(<Harness />);
      const dialog = openPanel();
      // The button's key is 6px in; the panel's lead column is 17px in.
      expect(Number.parseFloat(dialog.style.left)).toBe(189);
    } finally {
      Element.prototype.getBoundingClientRect = real;
    }
  });
});

test('every motion it starts is stopped for a reader who asked for less', () => {
  const stops = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/.exec(css)?.[1] ?? '';
  expect(stops).toMatch(/\.crewlet-switcher-trigger\s*\{\s*transition:\s*none/);
  expect(stops).toMatch(/svg\.crewlet-switcher-trigger__chevron\s*\{\s*transition:\s*none/);
});

test('passes axe, closed and open, with every state a list can be in', async () => {
  const { container } = render(<Harness note="200 of 340 listed. Type to search all of them." held="Needs an operator credential" />);
  expect((await axe.run(container)).violations).toEqual([]);
  openPanel();
  await act(async () => {
    fireEvent.change(field(), { target: { value: 'zz' } });
  });
  expect((await axe.run(document.body)).violations).toEqual([]);
  cleanup();
  render(
    <Harness
      pinned={undefined}
      groups={[]}
      loading
      loadingLabel="Loading projects"
      message={{ title: 'No project matches “zz”', body: 'Archived projects are listed under Projects.', actions: [{ id: 's', label: 'Search tasks for “zz”', onSelect: () => {} }] }}
    />,
  );
  openPanel();
  expect((await axe.run(document.body)).violations).toEqual([]);
});
