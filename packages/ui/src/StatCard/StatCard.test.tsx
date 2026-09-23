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
import { breakpoint, font, themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { CoinsGlyph } from '@crewlethq/icons/glyphs';
import { channels, installSheets, installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { StatCard } from './index.js';
import { StatGroup } from '../StatGroup/index.js';
import { Sparkline } from '../Charts/index.js';
import { Meter } from '../Meter/index.js';
import { ButtonLink } from '../Button/index.js';

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
    const { container } = render(
      <StatCard label="Tasks in progress" value="18" delta={{ value: '+4', polarity: 'neutral' }} sub="vs last week" />,
    );
    const tile = container.querySelector('.crewlet-statcard')!;
    const order = [...tile.children].map((child) => child.className);
    expect(order).toEqual(['crewlet-statcard__label', 'crewlet-statcard__reading', 'crewlet-statcard__sub']);
    // The reading order is the point as much as the look: a screen reader says
    // "tasks in progress, 18, +4 vs last week" rather than "18, tasks in
    // progress", and the change and the words after it are one sentence.
    expect(tile.textContent).toBe('Tasks in progress18+4 vs last week');
  });

  test('a lone tile is the same object as the card beside it: flat, on the card rung, inside the hairline', () => {
    /*
     * THE CARD IS FLAT, and a lone tile is one: the card's ground, its default
     * hairline and its 12px corner, and no shadow or rim of its own. It used to
     * carry `var(--shadow-xs), var(--shadow-hairline)`, a list that is INVALID
     * in the light palette, where the rim is `none`, so the light tile drew no
     * shadow at all while the dark one drew two.
     */
    for (const theme of ['dark', 'light'] as const) {
      const uninstall = installThemed(theme, 'StatCard/StatCard.css');
      const { container, unmount } = render(<StatCard label="Seats" value="7" />);
      const style = getComputedStyle(container.querySelector('.crewlet-statcard')!);
      const palette = themes[theme].color;
      expect(channels(style.backgroundColor), theme).toEqual(parseHex(palette.surface.subtle));
      expect(style.borderTopStyle, theme).toBe('solid');
      expect(channels(style.borderTopColor), theme).toEqual(parseHex(palette.border.default));
      expect(style.borderRadius, theme).toBe('12px');
      expect(['', 'none'], `${theme}: ${style.boxShadow}`).toContain(style.boxShadow);
      unmount();
      uninstall();
    }
  });

  test('the label is set as it is written, and the value is the display step in tabular figures', () => {
    /*
     * Sentence case at the caption step: the uppercased, tracked-open register
     * is a table's column head, and five of them over five numbers put a
     * heading on every tile. The value is the screen's one display number, and
     * a number that ticks up must not move anything beside it.
     */
    const uninstall = installThemed('dark', 'StatCard/StatCard.css');
    try {
      const { container } = render(<StatCard label="Tasks in progress" value="18" />);
      const label = getComputedStyle(container.querySelector('.crewlet-statcard__label')!);
      expect(['', 'none']).toContain(label.textTransform);
      expect(label.fontSize).toBe(font.size.xs);
      expect(['', '0', '0px', 'normal']).toContain(label.letterSpacing);
      const value = getComputedStyle(container.querySelector('.crewlet-statcard__value')!);
      expect(value.fontSize).toBe(font.size.display);
      expect(value.fontVariantNumeric).toBe('tabular-nums');
      const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'StatCard.css'), 'utf8');
      expect(css).not.toMatch(/text-transform:\s*uppercase/);
    } finally {
      uninstall();
    }
  });

  test('a change is drawn in the ink of whether it was wanted, never of its direction', () => {
    // The sign says which way the number moved; whether that was good news is
    // the caller's to say, because more work completed is good and more
    // tokens spent may not be.
    const { container } = render(
      <>
        <StatCard label="Completed" value="41" delta={{ value: '+12%', polarity: 'good' }} sub="vs previous 7 days" />
        <StatCard label="Tokens" value="12.6M" delta={{ value: '+30%', polarity: 'bad' }} />
        <StatCard label="In progress" value="18" delta={{ value: '+4', polarity: 'neutral' }} sub="vs last week" />
      </>,
    );
    const deltas = [...container.querySelectorAll('.crewlet-statcard__delta')];
    expect(deltas.map((delta) => [delta.textContent, delta.className])).toEqual([
      ['+12%', 'crewlet-statcard__delta crewlet-statcard__delta--good'],
      ['+30%', 'crewlet-statcard__delta crewlet-statcard__delta--bad'],
      ['+4', 'crewlet-statcard__delta crewlet-statcard__delta--neutral'],
    ]);
    // With nothing after it, the change is the whole line and takes no space.
    expect(deltas[1]!.parentElement!.textContent).toBe('+30%');

    for (const theme of ['dark', 'light'] as const) {
      const uninstall = installThemed(theme, 'StatCard/StatCard.css');
      const palette = themes[theme].color;
      const ink = (index: number) => channels(getComputedStyle(deltas[index]!).color);
      expect(ink(0), `${theme}: good`).toEqual(parseHex(palette.feedback.successInk));
      expect(ink(1), `${theme}: bad`).toEqual(parseHex(palette.feedback.dangerInk));
      expect(ink(2), `${theme}: neutral`).toEqual(parseHex(palette.text.secondary));
      uninstall();
    }
  });

  test('the trend stands at the end of the value line, and waits with the value while it loads', () => {
    const { container, rerender } = render(
      <StatCard label="Tasks in progress" value="18" trend={<Sparkline values={[3, 5, 4, 8]} current />} />,
    );
    const reading = container.querySelector('.crewlet-statcard__reading')!;
    expect([...reading.children].map((child) => child.className)).toEqual([
      'crewlet-statcard__value',
      'crewlet-statcard__trend',
    ]);
    expect(reading.querySelector('.crewlet-statcard__trend .crewlet-spark')).toBeTruthy();

    // A trend and a change are readings of the number, so neither is drawn
    // before the number has arrived.
    rerender(
      <StatCard
        label="Tasks in progress"
        value="18"
        loading
        delta={{ value: '+4', polarity: 'neutral' }}
        trend={<Sparkline values={[3, 5, 4, 8]} current />}
      />,
    );
    expect(container.querySelector('.crewlet-statcard__trend')).toBeNull();
    expect(container.querySelector('.crewlet-statcard__delta')).toBeNull();
  });

  test('a figure fills the trend slot and a control keeps its own width, at the slot end', () => {
    // A sparkline or a meter has no width to offer and fills the slot; a
    // small button is a button beside the number it acts on, not a bar.
    const uninstall = installSheets('StatCard/StatCard.css');
    try {
      const { container } = render(
        <>
          <StatCard label="Tokens" value="12.6M" trend={<Meter value={63} max={100} label="Weekly budget" hideLabel />} />
          <StatCard
            label="Waiting on your decision"
            value="3"
            trend={
              <ButtonLink href="#/inbox" size="small" variant="secondary">
                Review
              </ButtonLink>
            }
          />
        </>,
      );
      const [figure, control] = [...container.querySelectorAll('.crewlet-statcard__trend > *')];
      expect(getComputedStyle(figure!).alignSelf).not.toBe('flex-end');
      expect(getComputedStyle(control!).alignSelf).toBe('flex-end');
      expect(getComputedStyle(container.querySelector('.crewlet-statcard__trend')!).width).toBe('96px');
    } finally {
      uninstall();
    }
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
          <StatCard flush label="Total tokens" value="831.3K" icon={<CoinsGlyph />} sub="722.0K in" />
          <StatCard
            flush
            label="Completed"
            value="41"
            delta={{ value: '+12%', polarity: 'good' }}
            sub="vs previous 7 days"
            trend={<Sparkline values={[3, 5, 4, 8]} current />}
          />
          <StatCard flush label="Refusals" value="3" tone="danger" />
          <StatCard
            flush
            label="Tokens"
            value="12.6M"
            trend={<Meter value={63} max={100} label="Weekly budget" hideLabel />}
            sub="63% of the weekly budget"
          />
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
    // Under the shell breakpoint, strictly, which is where the rail becomes a
    // drawer and where the engine drops its own stat row. A media query cannot
    // read a custom property, so the number is written out and this is what
    // says it is still the shell's number, asked the shell's way.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../StatGroup/StatGroup.css'), 'utf8');
    const query = `@media (width < ${breakpoint.shell})`;
    expect(css).toContain(query);
    const reduced = css.slice(css.indexOf(query));
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
