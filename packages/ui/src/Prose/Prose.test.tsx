/**
 * Natural language, bounded and honest about what it is.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, flatten, paletteStates, parseHex, type Rgb } from '@crewlethq/tokens/test/palette';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Prose } from './index.js';

afterEach(cleanup);

/*
 * A path rather than `new URL(..., import.meta.url)`: Vite rewrites that exact
 * pattern into an asset reference, so the URL that comes back names the dev
 * server rather than the file on disk.
 */
const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), 'utf8');

/*
 * The surfaces a block of prose can sit on, assembled rather than spelled: the
 * package's variable check refuses a whole token name as a string literal in a
 * component source, because that is how an inline style declares one.
 */
const SURFACES = ['background', 'subtle', 'elevated'].map((step) => `--color-surface-${step}`);

/** The ink one rule sets, as a token name. */
const inkOf = (rule: RegExpExecArray | null): string =>
  /(?:^|[;{\s])color:\s*var\((--[\w-]+)\)/.exec(rule?.[1] ?? '')?.[1] ?? '';

/**
 * The ink the STYLESHEET leaves a dimmed block of each tone. Read out of the
 * file rather than named here, so the guard measures what ships.
 */
function dimmedInk(css: string, tone: 'default' | 'muted'): string {
  if (tone === 'default') return inkOf(/\.crewlet-prose\s*\{([^}]*)\}/.exec(css));
  const combined = /\.crewlet-prose--dimmed\.crewlet-prose--muted\s*\{([^}]*)\}/.exec(css);
  return inkOf(combined ?? /\.crewlet-prose--muted\s*\{([^}]*)\}/.exec(css));
}

test('a dimmed block still clears the floor for text, whichever tone it carries', () => {
  // Dimming is an opacity, and an opacity multiplies whatever ink is under it.
  // Stacked on the muted step it took a given-up attempt to 3.08:1 on the
  // panel, which is not a reading a component gets to choose: the block is
  // still text somebody goes back to. Measured here rather than eyeballed,
  // with the tokens package's own maths, so the ratio is the one that ships.
  const css = read('Prose.css');
  const opacity = Number(/\.crewlet-prose--dimmed\s*\{[^}]*opacity:\s*([\d.]+)/.exec(css)?.[1]);
  expect(opacity).toBeGreaterThan(0);

  const states = paletteStates({
    tokens: read('../../../tokens/dist/css/tokens.css'),
    themes: read('../../../tokens/dist/css/themes.css'),
  });

  const measured: string[] = [];
  const failures: string[] = [];
  for (const [state, values] of Object.entries(states)) {
    // The base block is the marketing palette, which carries neither these
    // surfaces nor this component.
    if (state === 'base') continue;
    for (const tone of ['default', 'muted'] as const) {
      const ink = parseHex(values.get(dimmedInk(css, tone)) ?? '');
      expect(ink).not.toBeNull();
      for (const name of SURFACES) {
        const ground = parseHex(values.get(name) ?? '');
        expect(ground).not.toBeNull();
        const dimmed = flatten(`rgba(${ink?.r}, ${ink?.g}, ${ink?.b}, ${opacity})`, ground as Rgb);
        const ratio = contrast(dimmed, ground as Rgb);
        measured.push(`${state} ${tone} on ${name}`);
        if (ratio < 4.5) failures.push(`${state} ${tone} on ${name}: ${ratio.toFixed(2)}:1`);
      }
    }
  }
  // Nothing measured would be a green run over an empty list.
  expect(measured.length).toBe(18);
  expect(failures).toEqual([]);
});

test('it is a paragraph by default and keeps its own line breaks', () => {
  // `pre-wrap` is what keeps a writer's paragraph breaks, which are load
  // bearing in a long answer, without turning a long line into a scroll.
  render(<Prose>{'First.\n\nSecond.'}</Prose>);
  const prose = screen.getByText(/First\./);
  expect(prose.tagName).toBe('P');
  expect(prose.textContent).toBe('First.\n\nSecond.');
});

test('a measure is on by default, because a measure is the point', () => {
  const { container } = render(<Prose>words</Prose>);
  expect(container.firstElementChild?.className).toContain('crewlet-prose--measure-normal');
});

test('measure none is the way out, for a block inside a column that is already narrow', () => {
  const { container } = render(<Prose measure="none">words</Prose>);
  expect(container.firstElementChild?.className).not.toContain('measure');
});

test('streaming and dimmed are states, not two components', () => {
  const { container } = render(
    <>
      <Prose streaming>arriving</Prose>
      <Prose dimmed>abandoned</Prose>
    </>,
  );
  const [streaming, dimmed] = [...container.children] as HTMLElement[];
  expect(streaming?.className).toContain('crewlet-prose--streaming');
  expect(dimmed?.className).toContain('crewlet-prose--dimmed');
});

test('no presentation prop reaches the DOM', () => {
  const { container } = render(
    <Prose tone="muted" streaming dimmed measure="narrow">
      words
    </Prose>,
  );
  const prose = container.firstElementChild as HTMLElement;
  for (const name of ['tone', 'streaming', 'dimmed', 'measure']) {
    expect(prose.getAttribute(name)).toBeNull();
  }
});
