/**
 * The trail: ancestors that lead back out, the page's own heading last, a
 * control in that heading where the page's subject can be switched, and a
 * floor and a tab stop measured from what it holds.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { Breadcrumb, type BreadcrumbCrumb } from './index.js';

afterEach(cleanup);

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Breadcrumb.css'), 'utf8');

const crumbs: BreadcrumbCrumb[] = [
  { label: 'Live', href: '#/live', icon: <svg data-testid="glyph" /> },
  { label: 'Turns', href: '#/live/turns' },
  { label: 'Replied in the thread about the observability pipeline.' },
];

const trail = () => screen.getByRole('navigation', { name: 'Breadcrumb' });

test('ancestors lead back out and the page is the heading, with no link to itself', () => {
  render(<Breadcrumb crumbs={crumbs} />);
  const links = screen.getAllByRole('link');
  expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['Live', '#/live'],
    ['Turns', '#/live/turns'],
  ]);
  const h1 = screen.getByRole('heading', { level: 1 });
  expect(h1.textContent).toBe(crumbs[2]!.label);
  expect(h1.getAttribute('aria-current')).toBe('page');
  expect(h1.querySelector('a')).toBeNull();
  // The glyph and the separators are decoration: the words carry the trail.
  expect(screen.getByTestId('glyph').closest('[aria-hidden="true"]')).not.toBeNull();
  expect(trail().querySelectorAll('svg.crewlet-breadcrumb__separator[aria-hidden="true"]')).toHaveLength(2);
});

test('an ancestor with no page of its own is words, not a link', () => {
  render(<Breadcrumb crumbs={[{ label: 'Work', icon: <svg /> }, { label: 'All projects' }]} />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(trail().querySelector('span.crewlet-breadcrumb__crumb')?.textContent).toBe('Work');
});

test("a project's crumb carries its key as a chip before its name, and an identifier is mono", () => {
  render(
    <Breadcrumb
      crumbs={[{ label: 'Work', href: '#/work' }, { label: 'Product and Engineering', keyChip: 'FAIR', href: '#/work/FAIR' }, { label: 'FAIR-12', mono: true }]}
    />,
  );
  const project = screen.getByRole('link', { name: 'FAIR Product and Engineering' });
  expect(project.querySelector('.crewlet-key-chip')?.textContent).toBe('FAIR');
  expect(screen.getByRole('heading', { level: 1 }).classList.contains('is-mono')).toBe(true);
});

test("a control drawn as the heading's words keeps the heading and the trail", () => {
  render(
    <Breadcrumb
      crumbs={[{ label: 'Work', href: '#/work' }, { label: 'Product and Engineering' }]}
      current={
        <button type="button" aria-haspopup="dialog" aria-expanded={false}>
          FAIR Product and Engineering
        </button>
      }
    />,
  );
  const h1 = screen.getByRole('heading', { level: 1, name: 'FAIR Product and Engineering' });
  expect(h1.querySelector(':scope > button')).not.toBeNull();
  expect(h1.classList.contains('crewlet-breadcrumb__here--control')).toBe(true);
  // The control replaces the words; it is not drawn beside them.
  expect(h1.querySelector('.crewlet-breadcrumb__text')).toBeNull();
});

// EACH LABEL IS ITS OWN BOX, the one that ellipsises: text straight inside the
// flex part is an anonymous flex item no ellipsis reaches.
test("every crumb's words sit in the box that ellipsises, the page's h1 included", () => {
  render(<Breadcrumb crumbs={crumbs} />);
  const h1 = screen.getByRole('heading', { level: 1 });
  expect(h1.querySelector(':scope > .crewlet-breadcrumb__text')?.textContent).toBe(crumbs[2]!.label);
  for (const link of trail().querySelectorAll('a.crewlet-breadcrumb__crumb')) {
    expect(link.querySelector(':scope > .crewlet-breadcrumb__text')).not.toBeNull();
  }
  const text = /\.crewlet-breadcrumb__text\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(text).toMatch(/min-width:\s*0/);
  expect(text).toMatch(/text-overflow:\s*ellipsis/);
});

describe('measured from what it holds', () => {
  const had = {
    scroll: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth'),
    client: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
    rect: HTMLElement.prototype.getBoundingClientRect,
  };
  function widths(scroll: number, client: number): void {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => scroll });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => client });
  }
  function boxes(leftOf: (el: HTMLElement) => number, widthOf: (el: HTMLElement) => number = () => 0): void {
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const left = leftOf(this);
      const width = widthOf(this);
      return { width, height: 20, top: 0, left, right: left + width, bottom: 20, x: left, y: 0 } as DOMRect;
    };
  }
  afterEach(() => {
    for (const [key, d] of [
      ['scrollWidth', had.scroll],
      ['clientWidth', had.client],
    ] as const) {
      if (d) Object.defineProperty(HTMLElement.prototype, key, d);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
    }
    HTMLElement.prototype.getBoundingClientRect = had.rect;
  });

  // THE TRAIL IS A TAB STOP ONLY WHILE IT HAS SOMEWHERE TO SCROLL: a trail
  // that fits took a Tab press that did nothing.
  test('a trail that fits takes no tab stop', () => {
    widths(400, 400);
    render(<Breadcrumb crumbs={crumbs} />);
    expect(trail().hasAttribute('tabindex')).toBe(false);
  });

  test('a trail wider than its box is a tab stop, so the keyboard can scroll it', () => {
    widths(697, 494);
    render(<Breadcrumb crumbs={crumbs} />);
    expect(trail().getAttribute('tabindex')).toBe('0');
  });

  // THE FLOOR IS THE WAY BACK OUT: where the last crumb starts, so a trail that
  // cannot show its ancestry beside the controls breaks the bar's line rather
  // than sharing it at 20ch.
  test("the floor is where the last crumb starts, measured from the trail's own start", async () => {
    widths(400, 400);
    boxes((el) => (el.classList.contains('crewlet-breadcrumb') ? 12 : el.classList.contains('crewlet-breadcrumb__here') ? 262 : 0));
    render(<Breadcrumb crumbs={crumbs} />);
    await waitFor(() => expect(trail().style.getPropertyValue('--crewlet-breadcrumb-floor')).toBe('250px'));
  });

  // BUT NEVER WIDER THAN THE ROOM BESIDE WHAT LEADS THE BAR: a floor past it put
  // the trail on a line under the drawer toggle.
  test("the floor is capped at the room the bar's leading control leaves", async () => {
    widths(366, 366);
    boxes(
      (el) => (el.classList.contains('crewlet-breadcrumb') ? 12 : el.classList.contains('crewlet-breadcrumb__here') ? 362 : 0),
      (el) => (el.classList.contains('toggle') ? 30 : 0),
    );
    render(
      <div className="bar">
        <button type="button" className="toggle">
          menu
        </button>
        <Breadcrumb crumbs={crumbs} />
      </div>,
    );
    // 350 wanted; 366 of bar less the 30 toggle leaves 336.
    await waitFor(() => expect(trail().style.getPropertyValue('--crewlet-breadcrumb-floor')).toBe('336px'));
  });
});

test('the stylesheet floors the trail, keeps the ancestors whole and gives the cut to the page', () => {
  const trailRule = /\.crewlet-breadcrumb\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(trailRule).toMatch(/flex:\s*1 100 0/);
  expect(trailRule).toMatch(/min-width:\s*min\(100%,\s*max\(20ch,\s*var\(--crewlet-breadcrumb-floor,\s*0px\)\)\)/);
  expect(trailRule).toMatch(/overflow-x:\s*auto/);
  expect(css).toMatch(/\.crewlet-breadcrumb__part:not\(:last-child\)\s*\{[^}]*flex:\s*0 0 auto/);
  expect(css).toMatch(/\.crewlet-breadcrumb__part:last-child > \.crewlet-breadcrumb__here\s*\{[^}]*min-width:\s*5ch/);
});

// ON A PHONE THE WORKSPACE'S CRUMB IS ITS GLYPH, and its word stays for a
// screen reader rather than going with the picture.
test('on a phone an ancestor with a glyph keeps its word out of sight, not out of the tree', () => {
  const phone = /@media \(width < 640px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  expect(phone).toContain('.crewlet-breadcrumb__crumb:has(> .crewlet-breadcrumb__icon) > .crewlet-breadcrumb__text');
  expect(phone).toMatch(/clip-path:\s*inset\(50%\)/);
  expect(phone).not.toMatch(/display:\s*none/);
});

test('passes axe, with a control as the heading', async () => {
  const { container } = render(
    <Breadcrumb
      crumbs={[{ label: 'Work', href: '#/work', icon: <svg /> }, { label: 'Product and Engineering' }]}
      current={
        <button type="button" aria-haspopup="dialog" aria-expanded={false}>
          FAIR Product and Engineering
        </button>
      }
    />,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
