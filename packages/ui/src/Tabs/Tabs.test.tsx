/**
 * Keyboard semantics of a row of sections.
 *
 * Ported from the engine dashboard's `ui/controls.a11y.test.tsx` ("a tab
 * row"), which was written for two defects neither of them visible with a
 * mouse: a row that selected on every arrow press, where a tab is a section
 * that pushes a history entry, so Back walked through keypresses; and a row
 * of eight tab stops where there should be one.
 *
 * Enter and Space are not driven here: on a real button the browser turns
 * both into the click this suite does drive, and jsdom does not synthesise it.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DENSITIES, installSheetsAtDensity } from '../../../../apps/ui-tests/src/density.js';
import { afterEach, expect, test, vi } from 'vitest';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { TabPanel, Tabs, tabId } from './Tabs.js';

afterEach(cleanup);

const lenses = [
  { value: 'chart', label: 'Chart' },
  { value: 'directory', label: 'Directory' },
  { value: 'charter', label: 'Charter' },
];

function mount(row: 'tabs' | 'segmented') {
  const onChange = vi.fn();
  render(
    <>
      {row === 'tabs' ? (
        <Tabs
          ariaLabel="View"
          value="chart"
          items={lenses}
          onValueChange={onChange}
          panelId="panel"
        />
      ) : (
        <SegmentedControl
          label="View"
          semantics="tabs"
          panelId="panel"
          value="chart"
          options={lenses}
          onValueChange={onChange}
        />
      )}
      <TabPanel id="panel" value="chart">
        content
      </TabPanel>
    </>,
  );
  return onChange;
}

test.each(['tabs', 'segmented'] as const)('%s: arrows move focus and select nothing', (row) => {
  const onChange = mount(row);
  const tabs = screen.getAllByRole('tab');
  tabs[0]!.focus();
  fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(tabs[1]);
  fireEvent.keyDown(tabs[1]!, { key: 'End' });
  expect(document.activeElement).toBe(tabs[2]);
  fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(tabs[0]);
  fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(tabs[2]);
  // A horizontal row of tabs does not move on Up and Down.
  fireEvent.keyDown(tabs[2]!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(tabs[2]);
  // NOTHING SELECTED: each of those would have pushed a history entry.
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(tabs[2]!);
  expect(onChange).toHaveBeenCalledWith('charter');
});

test.each(['tabs', 'segmented'] as const)('%s: one tab stop, and the panel it controls', (row) => {
  mount(row);
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  for (const tab of tabs) expect(tab.getAttribute('aria-controls')).toBe('panel');
  const panel = screen.getByRole('tabpanel');
  expect(panel.getAttribute('aria-labelledby')).toBe(tabId('panel', 'chart'));
  expect(document.getElementById(tabId('panel', 'chart'))).toBe(tabs[0]);
  expect(screen.getByRole('tabpanel', { name: 'Chart' })).toBe(panel);
});

test('a tab says it is selected and never that it is the page', () => {
  mount('tabs');
  // `aria-current="page"` on top of `aria-selected` told a screen reader the
  // tab was the page the reader was on, which is what a navigation link says.
  for (const tab of screen.getAllByRole('tab')) expect(tab.getAttribute('aria-current')).toBeNull();
});

test('a disabled tab is stepped over rather than focused', () => {
  render(
    <Tabs
      ariaLabel="View"
      value="chart"
      items={[
        { value: 'chart', label: 'Chart' },
        { value: 'directory', label: 'Directory', disabled: true },
        { value: 'charter', label: 'Charter' },
      ]}
      onValueChange={() => {}}
      panelId="panel"
    />,
  );
  const tabs = screen.getAllByRole('tab');
  tabs[0]!.focus();
  fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(tabs[2]);
});

test('a row whose chosen tab is disabled still has a tab stop somebody can reach', () => {
  render(
    <Tabs
      ariaLabel="View"
      value="chart"
      items={[
        { value: 'chart', label: 'Chart', disabled: true },
        { value: 'directory', label: 'Directory' },
      ]}
      onValueChange={() => {}}
      panelId="panel"
    />,
  );
  const tabs = screen.getAllByRole('tab') as HTMLButtonElement[];
  // A browser refuses a disabled button focus, so the one stop sitting on it
  // was no stop at all and the keyboard could not enter the row.
  expect(tabs.filter((tab) => tab.tabIndex === 0 && !tab.disabled)).toHaveLength(1);
  expect(tabs[1]!.tabIndex).toBe(0);
  // And the chosen one still says it is chosen.
  expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
});

test('a count rides beside the label, and an icon is a node', () => {
  render(
    <Tabs
      ariaLabel="Sections"
      value="turns"
      items={[
        { value: 'turns', label: 'Turns', count: 12, icon: <svg aria-hidden="true" /> },
        { value: 'tools', label: 'Tools', count: 0 },
      ]}
      onValueChange={() => {}}
    />,
  );
  expect(screen.getByRole('tab', { name: /Turns/ }).textContent).toContain('12');
});

test('a router row is a nav of links, with no tab roles at all', () => {
  render(
    <Tabs
      ariaLabel="Wallet sections"
      variant="underline"
      value="/wallet/overview"
      items={[
        { value: '/wallet/overview', label: 'Overview' },
        { value: '/wallet/referrals', label: 'Referrals' },
      ]}
      renderItem={({ item, className, isActive, children }) => (
        <a href={item.value} className={className} aria-current={isActive ? 'page' : undefined}>
          {children}
        </a>
      )}
    />,
  );
  const nav = screen.getByRole('navigation', { name: 'Wallet sections' });
  expect(screen.queryByRole('tablist')).toBeNull();
  expect(screen.queryAllByRole('tab')).toEqual([]);
  expect(screen.getByRole('link', { name: 'Overview', current: 'page' })).toBeTruthy();
  // Every link is its own tab stop, as navigation is.
  expect(nav.querySelectorAll('a')).toHaveLength(2);
});

test('the sliding bar is measured without a ResizeObserver, where there is none', () => {
  const held = globalThis.ResizeObserver;
  // @ts-expect-error the suite is removing it on purpose, which is the case.
  delete globalThis.ResizeObserver;
  try {
    expect(() =>
      render(
        <Tabs
          ariaLabel="Sections"
          variant="underline"
          value="turns"
          items={[{ value: 'turns', label: 'Turns' }]}
          onValueChange={() => {}}
        />,
      ),
    ).not.toThrow();
  } finally {
    globalThis.ResizeObserver = held;
  }
});

/*
 * THE SCROLLING ROW, and the two things it costs.
 *
 * jsdom lays nothing out, so both cases hand the row and its tabs the
 * rectangles a scrolled row actually has. The rectangles are the only input
 * either behaviour has, and neither has any other symptom: the bar simply
 * draws in the wrong place, or the current section is never shown.
 */
function laidOut(row: DOMRect, tab: DOMRect) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains('crewlet-tabs')) return row;
    if (this.classList.contains('is-active')) return tab;
    return new DOMRect(0, 0, 0, 0);
  });
}

function scrollable(start: number) {
  const held = { at: start };
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(() => held.at);
  vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation((next: number) => {
    held.at = next;
  });
  return held;
}

function underline(value: string) {
  render(
    <Tabs
      ariaLabel="View"
      variant="underline"
      value={value}
      items={lenses}
      onValueChange={() => {}}
      panelId="panel"
    />,
  );
  return document.querySelector<HTMLElement>('.crewlet-tabs--underline') as HTMLElement;
}

test('the accent bar is placed past the row scroll, so it stays under its tab', () => {
  // A row scrolled 120px whose active tab is painted 80px from its left edge:
  // the tab sits 200px into the CONTENT, and that is where the bar belongs.
  // A viewport difference alone writes 80px, and the scroll then carries the
  // bar another 120px left of the word it underlines.
  scrollable(120);
  laidOut(new DOMRect(0, 0, 300, 36), new DOMRect(80, 0, 90, 36));
  const nav = underline('charter');
  expect(nav.style.getPropertyValue('--crewlet-tabs-slider-left')).toBe('200px');
  expect(nav.style.getPropertyValue('--crewlet-tabs-slider-width')).toBe('90px');
  vi.restoreAllMocks();
});

test('a current section past the end of the row is scrolled into it, and no further', () => {
  // The active tab runs from 340 to 430 on a row that ends at 300: the row
  // moves by exactly the overhang, and nothing asks an ancestor to move.
  const scroll = scrollable(0);
  laidOut(new DOMRect(0, 0, 300, 36), new DOMRect(340, 0, 90, 36));
  underline('charter');
  expect(scroll.at).toBe(130);
  vi.restoreAllMocks();

  // A tab already inside the row leaves the reader's own scroll alone.
  cleanup();
  const settled = scrollable(64);
  laidOut(new DOMRect(0, 0, 300, 36), new DOMRect(80, 0, 90, 36));
  underline('charter');
  expect(settled.at).toBe(64);
  vi.restoreAllMocks();
});

/**
 * WHAT A CHIP ACTUALLY DRAWS, at each of the three densities.
 *
 * The guards below used to match this stylesheet's own text with a regular
 * expression, and one of them read a `min-height` out of a rule while the
 * defect it was written to catch sat in the dimension NEXT to it: the width
 * was floored by nothing, and a row of one-letter chips stood 22px wide at
 * the reader's default density while a green test said the register was safe.
 * A guard that reads a declaration cannot see the rule that wins, the property
 * nobody wrote, or the density the reader is on.
 *
 * So the sheets go into the document and jsdom cascades them, at each of the
 * three density settings, and what is read back is the box model the cascade
 * decided. `apps/ui-tests/src/density.ts` says how, and why `cascade.ts` is
 * not what installs them.
 */
const SHEETS = ['SegmentedControl/SegmentedControl.css', 'Tabs/Tabs.css'];

const drawAt = (density: number) => installSheetsAtDensity(density, ...SHEETS);

/**
 * The first length in a computed value, in px, with a property nothing set
 * read as 0 so a rule that stops matching fails an assertion rather than
 * disappearing from it. It is read off the COMPUTED value: jsdom leaves a
 * resolved `calc()` wearing its own wrapper on a shorthand it does not expand
 * (`calc(7px)`), and the number inside it is what the sheet resolved to.
 */
const length = (element: Element, property: string): number => {
  const found = /-?\d*\.?\d+/.exec(getComputedStyle(element).getPropertyValue(property));
  return found === null ? 0 : Number(found[0]);
};

/** The two shapes the rail's foot draws: a bare glyph, and a one-letter mark. */
function railFoot(size: 'sm' | 'md') {
  return (
    <>
      <SegmentedControl
        label="Theme"
        semantics="radio"
        size={size}
        value="system"
        onValueChange={() => {}}
        options={[
          { value: 'light', icon: <svg aria-hidden="true" />, srLabel: 'Light' },
          { value: 'system', icon: <svg aria-hidden="true" />, srLabel: 'Follow the system' },
          { value: 'dark', icon: <svg aria-hidden="true" />, srLabel: 'Dark' },
        ]}
      />
      <SegmentedControl
        label="Density"
        semantics="radio"
        size={size}
        value="normal"
        onValueChange={() => {}}
        options={[
          { value: 'compact', label: 'S', srLabel: 'Compact' },
          { value: 'normal', label: 'M', srLabel: 'Normal' },
          { value: 'comfortable', label: 'L', srLabel: 'Comfortable' },
        ]}
      />
    </>
  );
}

/*
 * A chip's height is DERIVED from a control step, and a derived height loses
 * the step's own floor: --size-control-sm is `max(24px, calc(28px * density))`
 * and subtracting four from it subtracts from the floor too, which is 20px at
 * the compact setting. Its WIDTH was derived from nothing at all, which is
 * worse: a pad around a glyph or a letter, floored by no rule, measured at
 * 19.3px on the engine's own rail.
 */
test.each(DENSITIES)('%s: a pill chip clears the target floor in both directions', (_name, density) => {
  const remove = drawAt(density);
  try {
    for (const size of ['sm', 'md'] as const) {
      cleanup();
      render(railFoot(size));
      const chips = screen.getAllByRole('radio');
      expect(chips).toHaveLength(6);
      for (const chip of chips) {
        expect(length(chip, 'min-height')).toBeGreaterThanOrEqual(24);
        expect(length(chip, 'min-width')).toBeGreaterThanOrEqual(24);
      }
    }
  } finally {
    remove();
  }
});

test('the register each chip size draws, at the setting it was drawn for', () => {
  const remove = drawAt(1);
  try {
    render(railFoot('sm'));
    const small = screen.getAllByRole('radio')[0]!;
    // The quiet step: the first pad on the scale, the smallest type step, and
    // a glyph one step under the label register's. The chip is square on the
    // floor, so the theme row and the density row draw one cell.
    expect(length(small, 'min-height')).toBe(24);
    expect(length(small, 'min-width')).toBe(24);
    expect([length(small, 'padding-left'), length(small, 'padding-right')]).toEqual([4, 4]);
    expect(length(small, 'font-size')).toBe(11);
    expect(length(small.querySelector('.crewlet-tabs__icon')!, 'font-size')).toBe(12);

    cleanup();
    render(railFoot('md'));
    const medium = screen.getAllByRole('radio')[0]!;
    expect(length(medium, 'min-height')).toBe(26);
    expect([length(medium, 'padding-left'), length(medium, 'padding-right')]).toEqual([12, 12]);
    expect(length(medium, 'font-size')).toBe(12);
    expect(length(medium.querySelector('.crewlet-tabs__icon')!, 'font-size')).toBe(14);
  } finally {
    remove();
  }
});

test.each(DENSITIES)('%s: the theme row and the density row draw one cell', (_name, density) => {
  const remove = drawAt(density);
  try {
    render(railFoot('sm'));
    const chips = screen.getAllByRole('radio');
    expect(chips).toHaveLength(6);
    for (const chip of chips) {
      /*
       * WHAT EITHER ROW CAN PUT INSIDE THE CHIP, at its widest. A glyph is an
       * em square by construction (`@crewlethq/icons` draws at `1em` unless a
       * size says otherwise) and a capital letter's advance is under an em in
       * any face this ships with, so an em of the larger of the two type steps
       * bounds the content of both rows. jsdom lays nothing out, and this is
       * the quantity it would have had to lay out to answer.
       *
       * Held under the floor, every cell in both rows is the floor, which is
       * what makes a glyph row and a letter row read as one row of controls.
       * At the 8px pad this chip used to carry it is 28px against a 24px
       * floor, and the rows measured 98px and 79px wide with no two cells in
       * them the same.
       */
      const glyph = chip.querySelector('.crewlet-tabs__icon');
      const content = Math.max(length(chip, 'font-size'), glyph ? length(glyph, 'font-size') : 0);
      const pad = length(chip, 'padding-left') + length(chip, 'padding-right');
      expect(pad + content).toBeLessThanOrEqual(length(chip, 'min-width'));
    }
    // And one rule draws every one of them, so they cannot drift apart.
    const boxes = chips.map((chip) =>
      ['min-width', 'min-height', 'padding-left', 'padding-right']
        .map((property) => length(chip, property))
        .join('x'),
    );
    expect(new Set(boxes).size).toBe(1);
  } finally {
    remove();
  }
});

test('a chip standing on the floor centres what it draws', () => {
  const remove = drawAt(1);
  try {
    render(railFoot('sm'));
    // The chip is wider than its glyph by the floor, so where the content sits
    // is now visible: aligned to the start it stood 4px from one edge and 8px
    // from the other.
    expect(getComputedStyle(screen.getAllByRole('radio')[0]!).justifyContent).toBe('center');

    // A CARD row is the stretched one, and it keeps its common inner edge.
    cleanup();
    render(
      <SegmentedControl
        label="Template"
        semantics="radio"
        value="startup"
        onValueChange={() => {}}
        options={[{ value: 'startup', label: 'Startup', description: 'One unit, three seats.' }]}
      />,
    );
    expect(getComputedStyle(screen.getAllByRole('radio')[0]!).justifyContent).toBe('flex-start');
  } finally {
    remove();
  }
});

test('a chip takes the corner that nests in its well, from the token', () => {
  // 6px is the sm step, which is what a chip in an 8px well reads as when it
  // is drawn concentric with the inset rather than tighter than the well.
  const remove = drawAt(1);
  try {
    render(railFoot('sm'));
    expect(length(screen.getAllByRole('radio')[0]!, 'border-radius')).toBe(7);
  } finally {
    remove();
  }
});
