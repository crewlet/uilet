/**
 * A row that folds what does not fit into "More", and keeps every tab
 * reachable without scrolling.
 *
 * THE PHONE CASE IS THE CASE. Six tabs at 390px ran past a scrolling row's
 * edge with its bar hidden, and nothing said the last one was there. Measured
 * here the way the row measures (every tab 100 wide, "More" 70), so the fold
 * is the arithmetic a page runs rather than a guess about it.
 */

import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { foldTabs, noteFits } from './fold.js';
import { Tabs, type TabsItem } from './index.js';

describe('the arithmetic', () => {
  // Seven tabs of 100, 20 apart: 820 in all.
  const widths = [100, 100, 100, 100, 100, 100, 100];

  test('a row that fits folds nothing', () => {
    expect(foldTabs({ widths, current: 0, space: 820, gap: 20, more: 60 })).toEqual([]);
    expect(foldTabs({ widths, current: 0, space: 819, gap: 20, more: 60 })).not.toEqual([]);
  });

  test('past the space, the last tabs fold and More takes their room', () => {
    // 700 of room: More (60) and five tabs with their gaps (600) are 660; a
    // sixth would be 780.
    expect(foldTabs({ widths, current: 0, space: 700, gap: 20, more: 60 })).toEqual([5, 6]);
  });

  test('the tab the reader is on is drawn, taking the last place that fits', () => {
    expect(foldTabs({ widths, current: 6, space: 700, gap: 20, more: 60 })).toEqual([4, 5]);
  });

  test('a narrower tab further along does not skip ahead of a wider one', () => {
    // A RUN FROM THE START, never a pick, or the order would change with the width.
    expect(foldTabs({ widths: [100, 100, 300, 20], current: 0, space: 400, gap: 20, more: 60 })).toEqual([2, 3]);
  });

  test('a note is drawn only where every tab fits beside it', () => {
    const three = [100, 100, 100];
    // Three tabs and two gaps are 320; a gap and a 200 note make 530.
    expect(noteFits({ widths: three, space: 530, gap: 10, note: 200 })).toBe(true);
    expect(noteFits({ widths: three, space: 529, gap: 10, note: 200 })).toBe(false);
    expect(noteFits({ widths: three, space: 2000, gap: 10, note: 0 })).toBe(false);
  });
});

const TABS: TabsItem[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'work', label: 'Work', count: 1200 },
  { value: 'turns', label: 'Turns' },
  { value: 'memory', label: 'Memory' },
  { value: 'schedules', label: 'Schedules' },
  { value: 'settings', label: 'Settings' },
];

const had = {
  rect: HTMLElement.prototype.getBoundingClientRect,
  client: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
};

/** Every tab 100 wide, "More" 70, a note 150, and the row's box `space` wide; no gaps. */
function lay(space: number): void {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const w = this.classList.contains('crewlet-tabs__tab')
      ? 100
      : this.hasAttribute('data-tabs-more')
        ? 70
        : this.hasAttribute('data-tabs-note')
          ? 150
          : 0;
    return { width: w, height: 20, top: 0, left: 0, right: w, bottom: 20, x: 0, y: 0 } as DOMRect;
  };
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.matches('.crewlet-tabs-fold, nav.crewlet-tabs--fold') ? space : 0;
    },
  });
}

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = had.rect;
  if (had.client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', had.client);
  else delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
});

function Harness({ items = TABS, start = 'overview' }: { items?: TabsItem[]; start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <Tabs
        overflow="menu"
        variant="underline"
        ariaLabel="Sections"
        items={items}
        value={value}
        onValueChange={setValue}
      />
      <output data-testid="chosen">{value}</output>
    </>
  );
}

const drawn = () =>
  within(screen.getByRole('tablist', { name: 'Sections' }))
    .getAllByRole('tab')
    .map((tab) => tab.textContent?.replace(/[\d,]+$/, ''));

async function openMore(): Promise<string[]> {
  fireEvent.click(screen.getByRole('button', { name: 'More of Sections' }));
  const items = await screen.findAllByRole('menuitem');
  return items.map((item) => item.textContent?.replace(/[\d,]+$/, '') ?? '');
}

describe('a tab list that folds', () => {
  // 280 of room: More (70) and two tabs (200) are 270; a third would be 370.
  test('draws the tabs that fit, and every other tab is one press away', async () => {
    lay(280);
    render(<Harness />);
    await waitFor(() => expect(drawn()).toEqual(['Overview', 'Work']));
    const rest = await openMore();
    expect(rest).toEqual(['Turns', 'Memory', 'Schedules', 'Settings']);
    expect([...drawn(), ...rest].sort()).toEqual(TABS.map((tab) => tab.label as string).sort());
  });

  test('a folded tab stays in the document, out of reach, and the arrows step over it', async () => {
    lay(280);
    render(<Harness />);
    await waitFor(() => expect(drawn()).toHaveLength(2));
    const folded = document.querySelectorAll('.crewlet-tabs__tab.is-folded');
    expect(folded).toHaveLength(4);
    for (const tab of folded) {
      expect(tab.getAttribute('aria-hidden')).toBe('true');
      expect(tab.hasAttribute('inert')).toBe(true);
    }
    const [overview, work] = within(screen.getByRole('tablist')).getAllByRole('tab');
    overview!.focus();
    fireEvent.keyDown(overview!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(work);
    // Past the last drawn tab the arrow wraps to the first, not into the fold.
    fireEvent.keyDown(work!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(overview);
  });

  test('a tab picked from More is chosen, and drawn in the last place that fits', async () => {
    lay(280);
    render(<Harness />);
    await waitFor(() => expect(drawn()).toHaveLength(2));
    await openMore();
    fireEvent.click(screen.getByRole('menuitem', { name: /Settings/ }));
    expect(screen.getByTestId('chosen').textContent).toBe('settings');
    await waitFor(() => expect(drawn()).toEqual(['Overview', 'Settings']));
  });

  test('a figure folded into More reads in the reader grouping', async () => {
    lay(180);
    render(<Harness />);
    await waitFor(() => expect(drawn()).toEqual(['Overview']));
    await openMore();
    expect(screen.getByRole('menuitem', { name: /Work/ }).textContent).toContain((1200).toLocaleString());
  });

  test('a row with room for every tab draws no More', async () => {
    lay(2000);
    render(<Harness />);
    await waitFor(() => expect(drawn()).toHaveLength(6));
    expect(screen.queryByRole('button', { name: 'More of Sections' })).toBeNull();
  });

  test('a live tab says what is happening, on the row and folded into More', async () => {
    const live = TABS.map((tab) => (tab.value === 'turns' ? { ...tab, live: 'running now' } : tab));
    lay(2000);
    render(<Harness items={live} />);
    const tab = screen.getByRole('tab', { name: 'Turns, running now' });
    expect(tab.querySelector('.crewlet-status-dot')).not.toBeNull();
    cleanup();

    lay(280);
    render(<Harness items={live} />);
    await waitFor(() => expect(drawn()).toHaveLength(2));
    await openMore();
    const item = screen.getByRole('menuitem', { name: /Turns/ });
    expect(item.textContent).toContain('running now');
    expect(item.querySelector('.crewlet-status-dot')).not.toBeNull();
  });
});

describe('a row of links that folds', () => {
  function Links({ value = 'overview', note }: { value?: string; note?: string }) {
    const [chosen, setChosen] = useState('');
    return (
      <>
        <Tabs
          overflow="menu"
          variant="underline"
          ariaLabel="Sections"
          moreMenuLabel="More sections"
          note={note}
          value={value}
          onValueChange={setChosen}
          items={TABS.map((tab) =>
            tab.value === 'memory' ? { ...tab, label: <span>Memory</span>, menuLabel: 'Memory' } : tab,
          )}
          renderItem={({ item, className, isActive, children, foldProps }) => (
            <a
              href={`#/${item.value}`}
              className={className}
              aria-current={isActive ? 'page' : undefined}
              {...foldProps}
            >
              {children}
            </a>
          )}
        />
        <output data-testid="chosen">{chosen}</output>
      </>
    );
  }

  const links = () =>
    within(screen.getByRole('navigation', { name: 'Sections' }))
      .queryAllByRole('link')
      .map((link) => link.getAttribute('href'));

  test('draws the links that fit, folds the rest out of reach, and More navigates', async () => {
    lay(380);
    render(<Links />);
    // More (70) and three links (300) are 370.
    await waitFor(() => expect(links()).toEqual(['#/overview', '#/work', '#/turns']));
    const folded = document.querySelectorAll('a.is-folded');
    expect(folded).toHaveLength(3);
    for (const link of folded) expect(link.hasAttribute('inert')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'More sections' }));
    // A node label reads in the menu as its `menuLabel`.
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Memory' }));
    expect(screen.getByTestId('chosen').textContent).toBe('memory');
  });

  test('the note gives way to the tabs, before a single one folds', async () => {
    // Six links are 600, the note 150: 750 holds both, 700 holds the links alone.
    lay(750);
    render(<Links note="Counts are over the last 30 days" />);
    await waitFor(() => expect(links()).toHaveLength(6));
    const note = () => document.querySelector('[data-tabs-note]')!;
    expect(note().getAttribute('aria-hidden')).toBeNull();
    cleanup();

    lay(700);
    render(<Links note="Counts are over the last 30 days" />);
    await waitFor(() => expect(note().getAttribute('aria-hidden')).toBe('true'));
    expect(links()).toHaveLength(6);
    expect(note().classList.contains('is-folded')).toBe(true);
  });
});
