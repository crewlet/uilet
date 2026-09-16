/**
 * The two claims the tile makes that its stylesheet used not to keep: that a
 * tone shows on the value, and that a loading tile says the number has not
 * arrived rather than drawing something that looks like a measurement.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { TokenGlyph } from '@crewlethq/icons/glyphs';
import { StatCard } from './index.js';
import { StatGroup } from '../StatGroup/index.js';

afterEach(cleanup);

describe('StatCard', () => {
  test('a tone reaches the value, with or without an icon', () => {
    // 0.2.0 tinted the icon, so a caller who passed a tone and no icon got a
    // tile identical to a neutral one while the props said otherwise.
    const { container } = render(<StatCard label="Refusals" value="3" tone="danger" />);
    const tile = container.querySelector('.crewlet-statcard')!;
    expect(tile.className).toContain('crewlet-statcard--danger');
    expect(tile.querySelector('.crewlet-statcard__value')).toBeTruthy();
    expect(tile.querySelector('.crewlet-statcard__icon')).toBeNull();
  });

  test('the label comes first, which is the order a board is read and heard in', () => {
    const { container } = render(<StatCard label="Live nodes" value="4" sub="holding a lease" />);
    const tile = container.querySelector('.crewlet-statcard')!;
    const order = [...tile.children].map((child) => child.className);
    expect(order).toEqual(['crewlet-statcard__label', 'crewlet-statcard__value', 'crewlet-statcard__sub']);
    // The reading order is the point as much as the look: a screen reader says
    // "live nodes, four, holding a lease" rather than "four, live nodes".
    expect(tile.textContent).toBe('Live nodes4holding a lease');
  });

  test('a lone tile is the same object as the panel beside it', () => {
    // The engine's stat row lives inside a panel, so a tile that stands on its
    // own has to bring that panel's whole recipe rather than a flatter cousin
    // of it: the surface, the hairline, the corner AND the elevation.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'StatCard.css'), 'utf8');
    const rule = /\.crewlet-statcard\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/box-shadow:\s*var\(--shadow-xs\),\s*var\(--shadow-hairline\)/);
    // And gives it back when the row draws the card instead, or the tile casts
    // a shadow inside one.
    expect(/\.crewlet-statcard--flush\s*\{[^}]*box-shadow:\s*none/.test(css)).toBe(true);
  });

  test('a loading tile is busy and says so, rather than drawing two dashes', () => {
    render(<StatCard label="Total tokens" value="831.3K" loading />);
    const tile = screen.getByText('Total tokens').closest('.crewlet-statcard')!;
    expect(tile.getAttribute('aria-busy')).toBe('true');
    // "--" is read aloud as "dash dash" and looks like a measured nothing.
    expect(tile.textContent).not.toContain('--');
    expect(tile.textContent).toContain('Loading');
    expect(tile.textContent).not.toContain('831.3K');
  });

  test('the loading sentence is a prop', () => {
    render(<StatCard label="Total tokens" value="0" loading loadingLabel="Reading the event store" />);
    expect(screen.getByText('Reading the event store')).toBeTruthy();
  });

  test('a unit sits with the value rather than in the label', () => {
    const { container } = render(<StatCard label="Median turn" value="412" unit="ms" />);
    const value = container.querySelector('.crewlet-statcard__value')!;
    expect(value.textContent).toBe('412ms');
    expect(value.querySelector('.crewlet-statcard__unit')?.textContent).toBe('ms');
  });

  test('the second line keeps its space whether or not there is one', () => {
    const { container } = render(
      <>
        <StatCard label="Seats" value="7" sub="3 working, 4 idle" />
        <StatCard label="Units" value="2" />
      </>,
    );
    // Both tiles carry the element, so a row of them sits on one baseline.
    expect(container.querySelectorAll('.crewlet-statcard__sub')).toHaveLength(2);
  });

  test('flush drops the tile surface, for a row drawn as one card', () => {
    const { container } = render(<StatCard label="Seats" value="7" flush />);
    expect(container.querySelector('.crewlet-statcard')?.className).toContain('crewlet-statcard--flush');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Spend</h1>
        <StatGroup columns={3}>
          <StatCard flush label="Total tokens" value="831.3K" icon={<TokenGlyph />} sub="722.0K in" />
          <StatCard flush label="Refusals" value="3" tone="danger" />
          <StatCard flush label="Calls" value="48" loading />
        </StatGroup>
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('StatGroup', () => {
  test('its column count is what it was given, whatever it holds', () => {
    const { container } = render(
      <StatGroup columns={3}>
        <StatCard flush label="A" value="1" />
        <StatCard flush label="B" value="2" />
      </StatGroup>,
    );
    const group = container.querySelector<HTMLElement>('.crewlet-stat-group')!;
    // Two tiles in a three-column row leave a gap, which is the point: the
    // third tile appearing must not move the first two.
    expect(group.style.getPropertyValue('--crewlet-stat-group-cols')).toBe('3');
  });

  test("a tile inside the row brings no surface, flush or not", () => {
    // The group draws one card and the hairlines inside it. A tile that kept
    // its own border and radius would be a card inside a card, which is what
    // a caller who did not pass `flush` used to get.
    const here = dirname(fileURLToPath(import.meta.url));
    const group = readFileSync(resolve(here, "../StatGroup/StatGroup.css"), "utf8");
    const rule = /\.crewlet-stat-group > \.crewlet-statcard\s*\{([^}]*)\}/.exec(group)?.[1] ?? "";
    expect(rule).toMatch(/background:\s*transparent/);
    expect(rule).toMatch(/border:\s*0/);

    // AND IT WINS WITHOUT HELP FROM THE BUNDLER. The rule this replaced was
    // `> :where(.crewlet-statcard)`, which weighs exactly what the tile's own
    // rule weighs, so which one painted was settled by which stylesheet came
    // last. The tile's did, and every tile in every group drew its own border
    // and its own 12px corner inside the group's. Counting the classes is
    // what says order cannot decide it.
    const classes = (selector: string) => (selector.match(/\.[a-z][\w-]*/g) ?? []).length;
    expect(classes(".crewlet-stat-group > .crewlet-statcard")).toBeGreaterThan(
      classes(".crewlet-statcard"),
    );

    // AND THE HAIRLINE BETWEEN COLUMNS SURVIVES IT. Clearing the tile's
    // border with two classes also outweighed the one-class hairline rule,
    // so the row of numbers ran together with nothing between the columns.
    // Whatever draws the divider has to weigh at least as much as what
    // clears it, and come after it.
    const weight = (selector: string) =>
      (selector.match(/\.[a-z][\w-]*|:[a-z-]+\(/g) ?? []).length;
    const clears = ".crewlet-stat-group > .crewlet-statcard";
    const divider = /\n([^{}\n]*\+ \.crewlet-statcard)\s*\{[^}]*border-left:/.exec(group)?.[1]?.trim() ?? "";
    expect(divider).not.toBe("");
    expect(weight(divider)).toBeGreaterThanOrEqual(weight(clears));
    expect(group.indexOf(clears + " {")).toBeLessThan(group.indexOf(divider));
  });

  test('it drops to two columns where the engine drops its own row', () => {
    // 900px is the shell breakpoint: a 280px rail plus a 620px content column,
    // which is the width at which a four-up row of numbers stops having a
    // column each. A media query cannot read a custom property, so the number
    // is written out and this is what says it is still that number.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../StatGroup/StatGroup.css'), 'utf8');
    expect(css).toContain('@media (max-width: 900px)');
    const reduced = css.slice(css.indexOf('@media (max-width: 900px)'));
    expect(reduced).toMatch(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  });

  test('four columns by default', () => {
    const { container } = render(
      <StatGroup>
        <StatCard flush label="A" value="1" />
      </StatGroup>,
    );
    expect(container.querySelector<HTMLElement>('.crewlet-stat-group')!.style.getPropertyValue('--crewlet-stat-group-cols')).toBe('4');
  });
});
