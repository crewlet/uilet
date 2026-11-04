/**
 * A ledger that only grows at the end, and never redraws what is already
 * there.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { installCss, installSheets, pseudoElement, px, themeColour } from '../../../../apps/ui-tests/src/cascade.js';
import { NODE_HUES, type NodeHue } from '../utils/nodeHue.js';
import { Timeline } from './index.js';

let uninstall: (() => void) | null = null;

afterEach(() => {
  cleanup();
  uninstall?.();
  uninstall = null;
});

/** A token's custom property name, built so the stylesheet check does not read the suite as declaring it. */
const token = (name: string) => `--${name}`;

const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Timeline.css'), 'utf8');

/**
 * The sheet as one theme paints it for one hue. jsdom resolves no custom
 * property, so the hue's own are read from ITS block, which is the mapping
 * under test, and every colour token from the theme.
 */
function installHue(theme: 'light' | 'dark', hue: NodeHue): () => void {
  const block = new RegExp(`\\.crewlet-timeline--hue-${hue}\\s*\\{([^}]*)\\}`).exec(sheet)?.[1] ?? '';
  const own = new Map([...block.matchAll(/(--crewlet-timeline-hue-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()]));
  return installCss(
    sheet
      .replace(/var\((--crewlet-timeline-hue-[\w-]+)\)/g, (whole, name: string) => own.get(name) ?? whole)
      .replace(/var\((--color-[\w-]+)\)/g, (_, name: string) => themeColour(theme, name)),
  );
}

/** A colour as jsdom serialises it, so a fill and a line of one hue, which differ only in alpha, are told apart. */
function painted(value: string): string {
  const probe = document.createElement('i');
  probe.style.color = value;
  return probe.style.color;
}

function plan(hue?: NodeHue) {
  return render(
    <Timeline itemLabel="Step" hue={hue} density="compact">
      <Timeline.Item>Create the application</Timeline.Item>
      <Timeline.Item state="danger">Delete its keys</Timeline.Item>
      <Timeline.Item state="active">Mint a key</Timeline.Item>
    </Timeline>,
  );
}

function steps(container: HTMLElement) {
  const [plain, danger, active] = [...container.querySelectorAll('.crewlet-timeline__item')].map((item) => ({
    node: getComputedStyle(item.querySelector('.crewlet-timeline__node')!),
    rail: getComputedStyle(pseudoElement(item.querySelector('.crewlet-timeline__rail')!, 'after')),
  }));
  return { plain: plain!, danger: danger!, active: active! };
}

function rounds(count: number) {
  return (
    <Timeline itemLabel="Round">
      {Array.from({ length: count }, (_, index) => (
        <Timeline.Item key={index} state={index === count - 1 ? 'active' : 'default'}>
          round {index + 1} said something
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

test('appending an item moves no earlier one', () => {
  // The rail used to be drawn with `:not(:last-child)`, so appending a round
  // changed the APPEARANCE of the round before it: the previously last one
  // suddenly grew a bracket. Every item carries its own rail, on every render.
  const { container, rerender } = render(rounds(2));
  const before = [...container.querySelectorAll('.crewlet-timeline__item')].map((item) => ({
    className: item.className,
    rails: item.querySelectorAll('.crewlet-timeline__rail').length,
    node: item.querySelector('.crewlet-timeline__node')?.textContent,
  }));

  rerender(rounds(3));
  const after = [...container.querySelectorAll('.crewlet-timeline__item')].map((item) => ({
    className: item.className,
    rails: item.querySelectorAll('.crewlet-timeline__rail').length,
    node: item.querySelector('.crewlet-timeline__node')?.textContent,
  }));

  expect(after).toHaveLength(3);
  expect(after.slice(0, 1)).toEqual(before.slice(0, 1));
  // Every item has a rail, the last one included: a ledger of ONE step is the
  // common case, and it used to get no bracket at all.
  expect(after.every((item) => item.rails === 1)).toBe(true);
});

test('the number is drawn once and read once', () => {
  render(rounds(3));
  // The drawn number is decoration beside the spoken label; a reader handed
  // both hears "3 Round 3".
  expect(screen.getByText('Round 3')).toBeDefined();
  const node = screen.getByText('Round 3').closest('.crewlet-timeline__item')?.querySelector('.crewlet-timeline__node');
  expect(node?.getAttribute('aria-hidden')).toBe('true');
  expect(node?.textContent).toBe('3');
});

test('it is an ordered list, because the order is the meaning', () => {
  const { container } = render(rounds(2));
  expect(container.querySelector('ol')).not.toBeNull();
  expect(container.querySelectorAll('li')).toHaveLength(2);
});

test('a marker replaces the number where the step has an identity of its own', () => {
  render(
    <Timeline itemLabel="Step">
      <Timeline.Item marker={<span>A</span>} label="Plan">
        body
      </Timeline.Item>
    </Timeline>,
  );
  expect(screen.getByText('A')).toBeDefined();
  expect(screen.getByText('Plan')).toBeDefined();
});

test('an item outside a Timeline says so rather than drawing a wrong number', () => {
  expect(() => render(<Timeline.Item>orphan</Timeline.Item>)).toThrow(/inside a Timeline/);
});

test('an item whose content names it draws no hidden label to be read twice', () => {
  const { container } = render(
    <Timeline itemLabel="Version">
      <Timeline.Item label={false}>Version 12</Timeline.Item>
    </Timeline>,
  );
  expect(container.querySelector('.crewlet-visually-hidden')).toBeNull();
  expect(screen.getByText('Version 12')).toBeDefined();
});

test('a hue draws every default step in that hue, in both themes', () => {
  // An agent's steps in its own colour, as its avatar wears it: the hue's fill
  // under its own ink, which the palette suite measures as a pair.
  for (const theme of ['light', 'dark'] as const) {
    for (const hue of NODE_HUES) {
      uninstall = installHue(theme, hue);
      const { container, unmount } = plan(hue);
      const { plain } = steps(container);
      const where = `${theme} ${hue}`;
      expect(plain.node.backgroundColor, where).toBe(painted(themeColour(theme, token(`color-node-${hue}-fill`))));
      expect(plain.node.borderTopColor, where).toBe(painted(themeColour(theme, token(`color-node-${hue}-line`))));
      expect(plain.node.color, where).toBe(painted(themeColour(theme, token(`color-node-${hue}-ink`))));
      expect(plain.rail.backgroundColor, where).toBe(painted(themeColour(theme, token(`color-node-${hue}-line`))));
      unmount();
      uninstall();
      uninstall = null;
    }
  }
});

test('a danger step and the step in flight keep their own node in a hued ledger', () => {
  // The step that takes access away is the one a reader scans an agent's plan
  // for, so the agent's colour never reaches it, and its rail is marked too.
  for (const theme of ['light', 'dark'] as const) {
    uninstall = installHue(theme, 'green');
    const { container, unmount } = plan('green');
    const { danger, active } = steps(container);
    expect(danger.node.backgroundColor, theme).toBe(painted(themeColour(theme, token('color-feedback-danger-soft'))));
    expect(danger.node.borderTopColor, theme).toBe(painted(themeColour(theme, token('color-feedback-danger-line'))));
    expect(danger.node.color, theme).toBe(painted(themeColour(theme, token('color-feedback-danger-ink'))));
    expect(danger.rail.backgroundColor, theme).toBe(painted(themeColour(theme, token('color-feedback-danger-line'))));
    expect(active.node.borderTopColor, theme).toBe(painted(themeColour(theme, token('color-brand-accent'))));
    expect(active.node.color, theme).toBe(painted(themeColour(theme, token('color-brand-accent-ink'))));
    unmount();
    uninstall();
    uninstall = null;
  }
});

test('a ledger with no hue is drawn exactly as before', () => {
  for (const theme of ['light', 'dark'] as const) {
    uninstall = installHue(theme, 'green');
    const { container, unmount } = plan();
    const { plain, danger } = steps(container);
    expect(container.querySelector('ol')?.className).toBe('crewlet-timeline crewlet-timeline--compact');
    expect(plain.node.backgroundColor, theme).toBe(painted(themeColour(theme, token('color-surface-inset'))));
    expect(plain.node.borderTopColor, theme).toBe(painted(themeColour(theme, token('color-border-default'))));
    expect(plain.node.color, theme).toBe(painted(themeColour(theme, token('color-text-tertiary'))));
    expect(plain.rail.backgroundColor, theme).toBe(painted(themeColour(theme, token('color-border-default'))));
    expect(danger.rail.backgroundColor, theme).toBe(painted(themeColour(theme, token('color-border-default'))));
    unmount();
    uninstall();
    uninstall = null;
  }
});

test('compact tightens a step and still parts one step from the next', () => {
  // A dialog lists a handful of short sentences, not a run's blocks. The pad
  // between two steps has to stay wider than the gap inside one, or a step's
  // note reads as the start of the next step.
  uninstall = installSheets('Timeline/Timeline.css');
  const measure = (density: 'comfortable' | 'compact') => {
    const { container, unmount } = render(
      <Timeline density={density}>
        <Timeline.Item>one</Timeline.Item>
      </Timeline>,
    );
    const item = container.querySelector('.crewlet-timeline__item')!;
    const body = container.querySelector('.crewlet-timeline__body')!;
    // jsdom keeps the logical shorthand apart from the physical sides it sets.
    const side = density === 'compact' ? px(item, 'padding-block') : px(item, 'padding-top');
    const sizes = { pad: side * 2, gap: px(body, 'gap') };
    unmount();
    return sizes;
  };
  const comfortable = measure('comfortable');
  const compact = measure('compact');
  expect(compact.pad).toBeGreaterThan(0);
  expect(compact.pad).toBeLessThan(comfortable.pad);
  expect(compact.gap).toBeGreaterThan(0);
  expect(compact.gap).toBeLessThan(comfortable.gap);
  expect(compact.pad).toBeGreaterThan(compact.gap);
});

test('no presentation prop reaches the DOM', () => {
  const { container } = plan('rose');
  const list = container.querySelector('ol')!;
  for (const name of ['hue', 'density']) expect(list.getAttribute(name)).toBeNull();
  expect(list.className).toContain('crewlet-timeline--hue-rose');
});
