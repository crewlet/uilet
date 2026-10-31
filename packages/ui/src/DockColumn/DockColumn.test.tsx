/**
 * A column docked beside the content: what it draws open and shut, how it
 * leaves, and the motion its stylesheet gives it.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { driveMotion, preferReducedMotion, settleMotion } from '../../../../apps/ui-tests/src/motion.js';
import { DockColumn } from './index.js';

const restorers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  while (restorers.length > 0) restorers.pop()?.();
});

function reduced(reduce: boolean): void {
  restorers.push(preferReducedMotion(reduce));
}

function Rooms({ open, width = 280 }: { open: boolean; width?: number | string }) {
  return (
    <DockColumn open={open} width={width} data-testid="dock">
      <nav aria-label="Rooms">
        <a href="#/general">general</a>
      </nav>
    </DockColumn>
  );
}

const column = () => screen.getByTestId('dock');
const panel = () => column().querySelector<HTMLElement>('.crewlet-dock-column__panel');

describe('open and shut', () => {
  test('open, it draws its panel at its width; shut, the column is empty', () => {
    reduced(false);
    const { rerender } = render(<Rooms open />);
    expect(column().hasAttribute('data-open')).toBe(true);
    expect(column().getAttribute('data-side')).toBe('start');
    expect(column().style.getPropertyValue('--crewlet-dock-column-width')).toBe('280px');
    expect(screen.getByRole('navigation', { name: 'Rooms' }).parentElement).toBe(panel());
    rerender(<Rooms open={false} />);
    expect(column().hasAttribute('data-open')).toBe(false);
    expect(panel()).toBeNull();
  });

  test('its width is a number of px or any length the host already keeps', () => {
    reduced(false);
    render(<Rooms open width="var(--size-shell-rail)" />);
    expect(column().style.getPropertyValue('--crewlet-dock-column-width')).toBe('var(--size-shell-rail)');
  });

  test('it is a plain column, not a landmark: what it holds names itself', () => {
    reduced(false);
    render(<Rooms open />);
    expect(column().getAttribute('role')).toBeNull();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });

  test('it has no accessibility violations, open or on its way out', async () => {
    reduced(false);
    const { rerender, container } = render(<Rooms open />);
    const options = {
      runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations' as const],
    };
    expect((await axe.run(container, options)).violations.map((v) => v.id)).toEqual([]);
    driveMotion(column()).start();
    rerender(<Rooms open={false} />);
    expect((await axe.run(container, options)).violations.map((v) => v.id)).toEqual([]);
  });
});

describe('the way out', () => {
  test("shut, the panel stays drawn and inert until the column's own motion ends", async () => {
    reduced(false);
    const { rerender } = render(<Rooms open />);
    const easing = driveMotion(column()).start();
    rerender(<Rooms open={false} />);
    expect(panel()).not.toBeNull();
    expect(panel()?.hasAttribute('inert')).toBe(true);
    // The column eases shut over it.
    expect(column().hasAttribute('data-open')).toBe(false);
    easing.finish();
    await settleMotion();
    expect(panel()).toBeNull();
  });

  test('opened again on the way out, the panel is live again where it is', async () => {
    reduced(false);
    const { rerender } = render(<Rooms open />);
    const driver = driveMotion(column());
    const shutting = driver.start();
    rerender(<Rooms open={false} />);
    const drawn = panel();
    const opening = driver.start();
    shutting.cancel();
    rerender(<Rooms open />);
    expect(panel()).toBe(drawn);
    expect(panel()?.hasAttribute('inert')).toBe(false);
    opening.finish();
    await settleMotion();
    expect(panel()).toBe(drawn);
  });

  test('where nothing moves the panel goes at once', () => {
    reduced(false);
    const { rerender } = render(<Rooms open />);
    rerender(<Rooms open={false} />);
    expect(panel()).toBeNull();
  });

  test('under reduced motion it simply is or is not, whatever is running', () => {
    reduced(true);
    const { rerender } = render(<Rooms open />);
    driveMotion(column()).start();
    rerender(<Rooms open={false} />);
    expect(panel()).toBeNull();
  });
});

describe('the stylesheet', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'DockColumn.css'), 'utf8');
  /** The declarations of the first rule written for exactly this selector. */
  const rule = (selector: string): string => {
    const at = css.indexOf(`\n${selector} {`);
    return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
  };

  test('the column eases its width on the moderate step with the emphasized curve, and clips', () => {
    const base = rule('.crewlet-dock-column');
    expect(base).toContain('transition: width var(--motion-duration-moderate) var(--motion-easing-emphasized);');
    expect(base).toContain('width: 0;');
    expect(base).toContain('overflow: clip;');
    expect(rule('.crewlet-dock-column[data-open]')).toContain('width: var(--crewlet-dock-column-width);');
  });

  test('under reduced motion the column does not ease', () => {
    const reducedBlock = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reducedBlock).toMatch(/\.crewlet-dock-column \{\s*transition: none;/);
  });

  test('the panel keeps its width and is held to the edge that faces the content', () => {
    expect(rule('.crewlet-dock-column__panel')).toContain('width: var(--crewlet-dock-column-width);');
    expect(rule('.crewlet-dock-column__panel')).toContain('flex: none;');
    // Before the content it is held to the column's end, so it slides in from
    // the start edge; after the content, the other way round.
    expect(rule('.crewlet-dock-column')).toContain('justify-content: flex-end;');
    expect(rule(".crewlet-dock-column[data-side='end']")).toContain('justify-content: flex-start;');
  });

  test('the hairline stands on the edge that faces the content', () => {
    expect(rule(".crewlet-dock-column--divider[data-side='start'] > .crewlet-dock-column__panel")).toContain(
      'border-inline-end: 1px solid var(--color-border-default);',
    );
    expect(rule(".crewlet-dock-column--divider[data-side='end'] > .crewlet-dock-column__panel")).toContain(
      'border-inline-start: 1px solid var(--color-border-default);',
    );
  });

  test('a panel with no divider draws none', () => {
    reduced(false);
    render(
      <DockColumn open width={280} divider={false} side="end" data-testid="dock">
        content
      </DockColumn>,
    );
    expect(column().classList.contains('crewlet-dock-column--divider')).toBe(false);
    expect(column().getAttribute('data-side')).toBe('end');
  });
});
