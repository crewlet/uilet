/**
 * A document's outline: what it lists, how the current entry is told apart,
 * where a press goes, and which heading the reader is in as they scroll.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { Outline, scrollToHeading, useActiveHeading, type OutlineItem } from './index.js';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const ITEMS: OutlineItem[] = [
  { id: 'net-balances', label: 'Net balances', level: 2 },
  { id: 'greedy', label: 'Greedy simplification', level: 2 },
  { id: 'comparison', label: 'Comparison on test groups', level: 3 },
];

/** Lets a measurement scheduled for the next frame run. */
const nextFrame = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 40)));

test('it is a named navigation landmark listing every heading as a button, in order', () => {
  render(<Outline label="On this page" items={ITEMS} onSelect={() => {}} />);
  const nav = screen.getByRole('navigation', { name: 'On this page' });
  const entries = screen.getAllByRole('button');
  expect(entries.map((entry) => entry.textContent)).toEqual([
    'Net balances',
    'Greedy simplification',
    'Comparison on test groups',
  ]);
  for (const entry of entries) expect(nav.contains(entry)).toBe(true);
});

test('an entry deeper than the shallowest is indented one step per level', () => {
  render(<Outline label="On this page" items={ITEMS} onSelect={() => {}} />);
  const [first, , third] = screen.getAllByRole('button');
  expect(first?.style.getPropertyValue('--crewlet-outline-depth')).toBe('0');
  expect(third?.style.getPropertyValue('--crewlet-outline-depth')).toBe('1');
});

test('the current entry says it is where the reader is, and no other entry does', () => {
  render(<Outline label="On this page" items={ITEMS} activeId="greedy" onSelect={() => {}} />);
  const [first, second, third] = screen.getAllByRole('button');
  expect(second?.getAttribute('aria-current')).toBe('location');
  expect(second?.className).toContain('crewlet-outline__item--current');
  for (const other of [first, third]) {
    expect(other?.hasAttribute('aria-current')).toBe(false);
    expect(other?.className).not.toContain('current');
  }
});

test('a press hands the entry id to the caller', () => {
  const onSelect = vi.fn();
  render(<Outline label="On this page" items={ITEMS} onSelect={onSelect} />);
  fireEvent.click(screen.getByRole('button', { name: 'Comparison on test groups' }));
  expect(onSelect).toHaveBeenCalledWith('comparison');
});

test('by default a press moves focus to the heading itself, so a keyboard reads on from it', () => {
  document.body.insertAdjacentHTML('beforeend', '<h2 id="greedy">Greedy simplification</h2>');
  const heading = document.getElementById('greedy') as HTMLElement;
  const scrolled = vi.fn();
  heading.scrollIntoView = scrolled;
  render(<Outline label="On this page" items={ITEMS} />);
  fireEvent.click(screen.getByRole('button', { name: 'Greedy simplification' }));
  expect(document.activeElement).toBe(heading);
  // Focusable by script, never a tab stop.
  expect(heading.getAttribute('tabindex')).toBe('-1');
  expect(scrolled).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
});

test('a reader who asked for less motion is moved there without the smooth scroll', () => {
  document.body.insertAdjacentHTML('beforeend', '<h2 id="greedy">Greedy simplification</h2>');
  const heading = document.getElementById('greedy') as HTMLElement;
  const scrolled = vi.fn();
  heading.scrollIntoView = scrolled;
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: query.includes('reduce'), media: query }) as MediaQueryList,
  );
  expect(scrollToHeading('greedy')).toBe(true);
  expect(scrolled).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
});

test('a heading the document does not hold is reported rather than thrown on', () => {
  expect(scrollToHeading('nowhere')).toBe(false);
});

test('the outline carries no axe violation', async () => {
  const { container } = render(<Outline label="On this page" items={ITEMS} activeId="net-balances" onSelect={() => {}} />);
  const result = await axe.run(container, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

/* ---- which heading the reader is in ------------------------------------------ */

/** A scroller holding the three headings, each placed at `tops` below its top. */
function scroller(tops: number[], { scrollTop = 0, clientHeight = 400, scrollHeight = 2000 } = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  root.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
  ITEMS.forEach((item, index) => {
    const heading = document.createElement('h2');
    heading.id = item.id;
    heading.getBoundingClientRect = () => ({ top: 100 + (tops[index] ?? 0) }) as DOMRect;
    root.append(heading);
  });
  const place = (next: { tops: number[]; scrollTop: number }) => {
    ITEMS.forEach((item, index) => {
      const heading = document.getElementById(item.id) as HTMLElement;
      heading.getBoundingClientRect = () => ({ top: 100 + (next.tops[index] ?? 0) }) as DOMRect;
    });
    Object.defineProperty(root, 'scrollTop', { configurable: true, value: next.scrollTop });
  };
  Object.defineProperty(root, 'scrollTop', { configurable: true, value: scrollTop });
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(root, 'scrollHeight', { configurable: true, value: scrollHeight });
  return { root, place };
}

function Probe({ root }: { root: HTMLElement }) {
  const active = useActiveHeading(
    ITEMS.map((item) => item.id),
    { root, offset: 8 },
  );
  return <output>{active ?? 'none'}</output>;
}

test('before any heading is reached, the first one is current', async () => {
  const { root } = scroller([40, 600, 900]);
  render(<Probe root={root} />);
  await nextFrame();
  expect(screen.getByRole('status').textContent).toBe('net-balances');
});

test('the heading scrolled past last is current, measured on the next frame after a scroll', async () => {
  const { root, place } = scroller([40, 600, 900]);
  render(<Probe root={root} />);
  await nextFrame();
  place({ tops: [-500, 4, 300], scrollTop: 540 });
  fireEvent.scroll(root);
  await nextFrame();
  expect(screen.getByRole('status').textContent).toBe('greedy');
});

test('at the end of the scroll the last heading is current, however short its section', async () => {
  // Its top never reaches the line: the section is shorter than the view.
  const { root, place } = scroller([40, 600, 900], { clientHeight: 400, scrollHeight: 1600 });
  render(<Probe root={root} />);
  await nextFrame();
  place({ tops: [-1100, -540, 200], scrollTop: 1200 });
  fireEvent.scroll(root);
  await nextFrame();
  expect(screen.getByRole('status').textContent).toBe('comparison');
});

test('no headings at all is no current heading', async () => {
  function Empty() {
    const active = useActiveHeading([]);
    return <output>{active ?? 'none'}</output>;
  }
  render(<Empty />);
  await nextFrame();
  expect(screen.getByRole('status').textContent).toBe('none');
});
