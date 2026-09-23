/**
 * The state bar's contract: that its parts are their shares of the whole and
 * nothing else, that it says in words exactly what it draws, and that every
 * part can be SEEN on whatever ground the bar is put on.
 *
 * The widths are read off the elements the component renders, the colours
 * and the geometry off the CASCADE (the stylesheet goes into the document and
 * the rule that wins is the rule that is read back), and the measurements
 * off the palette the tokens build ships, so a tone added to the stylesheet
 * without a measurement fails here rather than joining a list.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import {
  contrast,
  deltaE,
  flatten,
  HAIRLINE_DE,
  OPAQUE_SURFACES,
  paletteStates,
  parseHex,
} from '@crewlethq/tokens/test/palette';
import {
  channels,
  installForcedColors,
  installSheets,
  installThemed,
  px,
  themeColours,
} from '../../../../apps/ui-tests/src/cascade.js';
import { SegmentedMeter, segmentedMeterLabel, type SegmentedMeterSegment } from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, 'SegmentedMeter.css'), 'utf8');
/** The stylesheet with its comments blanked, so prose about a rule is never read as the rule. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
const tokensCss = resolve(here, '../../../tokens/dist/css');
const states = paletteStates({
  tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
  themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
});

/*
 * Spelled without the leading dashes and prefixed at use: the package's
 * variable check reads a quoted `--name` in a .tsx file as a declaration.
 */
const token = (name: string) => `--${name}`;

/** The Home screen's first tile: four of seven seats working. */
const CREW: SegmentedMeterSegment[] = [
  { id: 'working', value: 4, tone: 'info', label: 'working' },
  { id: 'waiting', value: 1, tone: 'warning', label: 'waiting' },
  { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
];

/** A project row: 38 done, 12 active, 11 still to do. */
const PROJECT: SegmentedMeterSegment[] = [
  { id: 'done', value: 38, tone: 'success', label: 'done' },
  { id: 'active', value: 12, tone: 'info', label: 'active' },
];

/** Every drawn part, the remainder included, in the order drawn. */
function drawn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('.crewlet-segmented-meter__segment')];
}

/** A part's share of the bar, as the component set it. */
function share(part: HTMLElement): number {
  const basis = part.style.flexBasis;
  if (!basis.endsWith('%')) throw new Error(`a part's basis is "${basis}", not a share in percent`);
  return Number.parseFloat(basis);
}

describe('what the bar says', () => {
  test('every part it draws with its word, the remainder with its own, then the whole', () => {
    // The approved design's own tile, worded as the plan words it.
    expect(segmentedMeterLabel(CREW, 7, 'idle')).toBe('4 working, 1 waiting, 1 stopped, 1 idle of 7');
    expect(segmentedMeterLabel(PROJECT, 61, 'to do')).toBe('38 done, 12 active, 11 to do of 61');
  });

  test('a part of nothing is not spoken, because it is not drawn', () => {
    const calm = CREW.map((segment) => (segment.id === 'stopped' ? { ...segment, value: 0 } : segment));
    expect(segmentedMeterLabel(calm, 7, 'idle')).toBe('4 working, 1 waiting, 2 idle of 7');
  });

  test('an empty bar says so, and names its remainder when it has a word for it', () => {
    const none = CREW.map((segment) => ({ ...segment, value: 0 }));
    expect(segmentedMeterLabel(none, 7)).toBe('0 of 7');
    expect(segmentedMeterLabel(none, 7, 'idle')).toBe('7 idle of 7');
    expect(segmentedMeterLabel(none)).toBe('0 of 0');
  });

  test('a remainder with no word is drawn and not named, and the whole still says there is more', () => {
    expect(segmentedMeterLabel(CREW, 7)).toBe('4 working, 1 waiting, 1 stopped of 7');
  });

  test('without a total the whole is the parts, and there is no remainder to name', () => {
    expect(segmentedMeterLabel(CREW, undefined, 'idle')).toBe('4 working, 1 waiting, 1 stopped of 6');
  });

  test('a total under its parts keeps the figures it was given, as a Meter keeps "140 of 100"', () => {
    const more = CREW.map((segment) => (segment.id === 'waiting' ? { ...segment, value: 3 } : segment));
    expect(segmentedMeterLabel(more, 6, 'idle')).toBe('4 working, 3 waiting, 1 stopped of 6');
  });

  test('a remainder is settled to what a double carries, so no float residue is drawn or read', () => {
    const shares: SegmentedMeterSegment[] = [
      { id: 'a', value: 0.1, tone: 'info', label: 'a' },
      { id: 'b', value: 0.2, tone: 'success', label: 'b' },
    ];
    // 0.3 - (0.1 + 0.2) is -5.6e-17 and 1 - (0.1 + 0.2) is 0.7000000000000001.
    expect(segmentedMeterLabel(shares, 0.3, 'rest')).toBe('0.1 a, 0.2 b of 0.3');
    expect(segmentedMeterLabel(shares, 1, 'rest')).toBe('0.1 a, 0.2 b, 0.7 rest of 1');
    const { container } = render(<SegmentedMeter segments={shares} total={0.3} />);
    expect(container.querySelector('.crewlet-segmented-meter__remainder')).toBeNull();
  });

  test('is one image, named in those words, and its parts are drawing', () => {
    render(<SegmentedMeter segments={CREW} total={7} remainderLabel="idle" />);
    const bar = screen.getByRole('img', {
      name: '4 working, 1 waiting, 1 stopped, 1 idle of 7',
    });
    expect(screen.getAllByRole('img')).toHaveLength(1);
    // Spans with no text and no role: nothing in them is read twice.
    for (const part of drawn(bar)) {
      expect(part.textContent).toBe('');
      expect(part.getAttribute('role')).toBeNull();
    }
  });

  test('a caller can name it for a figure with a unit', () => {
    render(<SegmentedMeter segments={PROJECT} total={61} label="62% done: 38 of 61 tasks" />);
    expect(screen.getByRole('img', { name: '62% done: 38 of 61 tasks' })).toBeTruthy();
  });

  test('a decorative bar says nothing, because the words beside it already do', () => {
    const { container } = render(
      <p>
        <SegmentedMeter segments={CREW} total={7} decorative /> 1 waiting · 1 stopped · 1 idle
      </p>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    const bar = container.querySelector('.crewlet-segmented-meter')!;
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.getAttribute('aria-label')).toBeNull();
  });

  test('refuses a count that is not one, and two parts with one id, by name', () => {
    const bad = (value: number) => [{ id: 'working', value, tone: 'info', label: 'working' } as const];
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => render(<SegmentedMeter segments={bad(value)} />), String(value)).toThrow(
        /segment "working" must be a finite count/,
      );
    }
    for (const total of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => render(<SegmentedMeter segments={CREW} total={total} />), String(total)).toThrow(RangeError);
    }
    expect(() => render(<SegmentedMeter segments={[...CREW, { ...CREW[0]!, value: 2 }]} />)).toThrow(
      /"working" is used twice/,
    );
  });
});

describe('what the bar draws', () => {
  test('each part is its share of the whole, and the shares add to the whole bar', () => {
    const { container } = render(<SegmentedMeter segments={CREW} total={7} remainderLabel="idle" />);
    const parts = drawn(container);
    expect(parts.map((part) => part.dataset['tone'] ?? 'remainder')).toEqual([
      'info',
      'warning',
      'danger',
      'remainder',
    ]);
    expect(parts.map(share).map((percent) => percent.toFixed(4))).toEqual(
      [4, 1, 1, 1].map((value) => ((value / 7) * 100).toFixed(4)),
    );
    expect(parts.map(share).reduce((sum, percent) => sum + percent, 0)).toBeCloseTo(100, 10);
    // The remainder is last, so the quiet end of the bar is always the same end.
    expect(parts.at(-1)!.classList.contains('crewlet-segmented-meter__remainder')).toBe(true);
  });

  test('the shares add to the whole bar in every shape a whole can take', () => {
    const shapes: Array<[string, SegmentedMeterSegment[], number | undefined]> = [
      ['no total', CREW, undefined],
      ['a remainder', PROJECT, 61],
      ['a total under its parts', CREW, 3],
      ['a part of nothing', [...CREW, { id: 'done', value: 0, tone: 'success', label: 'done' }], 9],
      ['nothing of something', CREW.map((segment) => ({ ...segment, value: 0 })), 7],
      ['nothing of nothing', CREW.map((segment) => ({ ...segment, value: 0 })), undefined],
      [
        'fractions',
        [
          { id: 'a', value: 0.1, tone: 'info', label: 'a' },
          { id: 'b', value: 0.2, tone: 'danger', label: 'b' },
        ],
        1,
      ],
    ];
    for (const [name, segments, total] of shapes) {
      cleanup();
      const { container } = render(<SegmentedMeter segments={segments} total={total} />);
      const sum = drawn(container)
        .map(share)
        .reduce((running, percent) => running + percent, 0);
      expect(sum, name).toBeCloseTo(100, 10);
    }
  });

  test('a part of nothing is not drawn at all, so no two neighbours stand a double gap apart', () => {
    // Drawn at no width, the empty part would still be a flex item with a gap
    // on each side, and the parts either side of it would stand 4px apart where
    // every other pair stands 2px.
    const calm = CREW.map((segment) => (segment.id === 'waiting' ? { ...segment, value: 0 } : segment));
    const { container } = render(<SegmentedMeter segments={calm} total={7} />);
    const parts = drawn(container);
    expect(parts.map((part) => part.dataset['tone'] ?? 'remainder')).toEqual(['info', 'danger', 'remainder']);
    for (const part of parts) expect(share(part)).toBeGreaterThan(0);
    // And the space between two drawn neighbours is ONE gap, the container's:
    // no part carries a margin that would add to it.
    uninstall = installSheets('SegmentedMeter/SegmentedMeter.css');
    expect(px(container.querySelector('.crewlet-segmented-meter')!, 'gap')).toBe(2);
    for (const part of parts) {
      expect(px(part, 'margin-left')).toBe(0);
      expect(px(part, 'margin-right')).toBe(0);
    }
    // The floor that keeps a small part visible counts the parts drawn, not
    // the parts given, so an omitted one takes no share of it either.
    const bar = container.querySelector<HTMLElement>('.crewlet-segmented-meter')!;
    expect(bar.style.getPropertyValue(token('crewlet-segmented-meter-count'))).toBe(String(parts.length));
  });

  test('an empty whole is still the full length of the bar, in the remainder', () => {
    // As an empty Meter still draws its track: the length is half the reading.
    const { container } = render(<SegmentedMeter segments={[]} />);
    const parts = drawn(container);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.classList.contains('crewlet-segmented-meter__remainder')).toBe(true);
    expect(share(parts[0]!)).toBe(100);
    expect(screen.getByRole('img', { name: '0 of 0' })).toBeTruthy();
  });

  test('a total under its parts draws the parts against their own sum, with no remainder', () => {
    const { container } = render(<SegmentedMeter segments={CREW} total={3} />);
    expect(container.querySelector('.crewlet-segmented-meter__remainder')).toBeNull();
    expect(drawn(container).map(share)[0]).toBeCloseTo((4 / 6) * 100, 10);
  });

  test('the design’s bar: 8px, 6px compact, 2px between the parts, round at the ends only', () => {
    uninstall = installSheets('SegmentedMeter/SegmentedMeter.css');
    const { container, rerender } = render(<SegmentedMeter segments={CREW} total={7} />);
    const bar = container.querySelector('.crewlet-segmented-meter')!;
    expect(px(bar, 'height')).toBe(8);
    expect(px(bar, 'gap')).toBe(2);
    // The corner is the BAR's, clipped, so a part in the middle is a plain
    // block and the ends are round whichever parts stand there.
    expect(getComputedStyle(bar).borderRadius).toBe('4px');
    expect(getComputedStyle(bar).overflow).toBe('hidden');
    for (const part of drawn(container)) {
      expect(getComputedStyle(part).borderRadius).toBe('');
      expect(getComputedStyle(part).flexShrink).toBe('1');
      expect(getComputedStyle(part).flexGrow).toBe('0');
    }
    rerender(<SegmentedMeter segments={CREW} total={7} size="compact" />);
    expect(px(bar, 'height')).toBe(6);
  });

  test('no part is narrower than the kit’s status dot, or than an equal share where that would not fit', () => {
    // jsdom lays nothing out, so the floor is read as the declaration it is:
    // min(the dot, an equal share of the bar less its gaps), with the dot's
    // size read from StatusDot.css, so the two marks a reader tells by hue
    // cannot drift apart.
    const dot = /\.crewlet-status-dot\s*\{[^}]*?\bwidth:\s*(\d+px)/.exec(
      readFileSync(resolve(here, '../StatusDot/StatusDot.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
    )?.[1];
    expect(dot).toBe('7px');
    const floor = /\.crewlet-segmented-meter__segment\s*\{[^}]*?min-width:\s*([^;]+);/
      .exec(code)?.[1]
      ?.replace(/\s+/g, ' ');
    const count = `var(${token('crewlet-segmented-meter-count')})`;
    const gap = `var(${token('crewlet-segmented-meter-gap')})`;
    expect(floor).toBe(`min( ${dot}, calc( (100% - (${count} - 1) * ${gap}) / ${count} ) )`);
    // The gap in that share is the gap the bar draws.
    expect(code).toMatch(new RegExp(`gap:\\s*var\\(${token('crewlet-segmented-meter-gap')}\\)`));
    expect(code).toMatch(new RegExp(`${token('crewlet-segmented-meter-gap')}:\\s*2px`));
  });
});

describe('what the bar is drawn in', () => {
  const TONES = ['info', 'success', 'warning', 'danger'] as const;

  test('each part is its tone’s fill step and the remainder the strong hairline, in both palettes', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'SegmentedMeter/SegmentedMeter.css');
      cleanup();
      const palette = themeColours(theme);
      const segments = TONES.map((tone) => ({
        id: tone,
        value: 1,
        tone,
        label: tone,
      }));
      const { container } = render(<SegmentedMeter segments={segments} total={5} />);
      const parts = drawn(container);
      for (const [index, tone] of TONES.entries()) {
        expect(channels(getComputedStyle(parts[index]!).backgroundColor), `${theme} ${tone}`).toEqual(
          parseHex(palette.get(token(`color-feedback-${tone}`)) ?? ''),
        );
      }
      expect(channels(getComputedStyle(parts.at(-1)!).backgroundColor), `${theme} remainder`).toEqual(
        parseHex(palette.get(token('color-border-strong')) ?? ''),
      );
    }
  });

  test('every fill clears 3:1 as a mark on every opaque rung', () => {
    // Read from the stylesheet, so a tone added without a measurement is
    // measured here rather than skipped. The ground shows on both sides of
    // every part, through the gap, so the rung IS what a fill stands against.
    const fills = [
      ...code.matchAll(
        /\.crewlet-segmented-meter__segment\[data-tone='(\w+)'\]\s*\{\s*background:\s*var\((--[\w-]+)\)/g,
      ),
    ];
    expect(fills.map((match) => match[1])).toEqual(['info', 'success', 'warning', 'danger']);
    let measured = 0;
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      for (const [, tone, fill] of fills) {
        const colour = parseHex(values.get(fill!) ?? '');
        if (colour === null) throw new Error(`${state}: ${fill} is not an opaque colour`);
        for (const surface of OPAQUE_SURFACES) {
          const ground = parseHex(values.get(surface) ?? '');
          if (ground === null) throw new Error(`${state}: ${surface} is not opaque`);
          const ratio = contrast(colour, ground);
          measured += 1;
          if (ratio < 3) failures.push(`${state}: ${tone} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    // Three palette states, four fills, four rungs: a reading that found no
    // fill or no rung would pass for any palette at all.
    expect(measured).toBe(3 * 4 * 4);
    expect(failures).toEqual([]);
  });

  test('the remainder is a visible step off every opaque rung, so the whole bar is always seen', () => {
    // It is the extent of the bar rather than a reading, as a Meter's track is,
    // so it is held to the "can a reader notice it" floor the palette holds a
    // card's hairline to, rather than to a mark's 3:1.
    const remainder = /\.crewlet-segmented-meter__remainder\s*\{\s*background:\s*var\((--[\w-]+)\)/.exec(code)?.[1];
    expect(remainder).toBe(token('color-border-strong'));
    let measured = 0;
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      for (const surface of OPAQUE_SURFACES) {
        const ground = parseHex(values.get(surface) ?? '');
        const raw = values.get(remainder!);
        if (ground === null || raw === undefined) throw new Error(`${state}: ${surface} or ${remainder} is missing`);
        const separation = deltaE(flatten(raw, ground), ground);
        measured += 1;
        if (separation < HAIRLINE_DE) failures.push(`${state}: on ${surface}: dE ${separation.toFixed(2)}`);
      }
    }
    expect(measured).toBe(3 * 4);
    expect(failures).toEqual([]);
  });

  test('in forced colors the parts are CanvasText and the remainder GrayText, so the lengths survive', () => {
    // The mode repaints every author background to Canvas, and a system
    // colour an author writes is the one thing it keeps. jsdom resolves a
    // system colour to a fixed value of its own, so each reading is compared
    // with the same keyword resolved here.
    const system = (keyword: string) => {
      const probe = document.createElement('i');
      probe.style.backgroundColor = keyword;
      document.body.append(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    };
    expect(system('CanvasText')).not.toBe(system('GrayText'));
    const segments = TONES.map((tone) => ({
      id: tone,
      value: 1,
      tone,
      label: tone,
    }));
    // In both palettes, with every token resolved, so each tone rule is a
    // real colour the block has to beat rather than a declaration jsdom drops.
    for (const theme of ['dark', 'light'] as const) {
      cleanup();
      uninstall?.();
      uninstall = installForcedColors('active', theme, 'SegmentedMeter/SegmentedMeter.css');
      const { container } = render(<SegmentedMeter segments={segments} total={5} />);
      const parts = drawn(container);
      for (const part of parts.slice(0, -1)) {
        expect(getComputedStyle(part).backgroundColor, `${theme} ${part.dataset['tone']}`).toBe(system('CanvasText'));
      }
      expect(getComputedStyle(parts.at(-1)!).backgroundColor, theme).toBe(system('GrayText'));
      // And only in that mode: outside it the block is not in the cascade.
      uninstall();
      uninstall = installForcedColors('none', theme, 'SegmentedMeter/SegmentedMeter.css');
      for (const part of parts) {
        expect(getComputedStyle(part).backgroundColor, theme).not.toBe(system('CanvasText'));
        expect(getComputedStyle(part).backgroundColor, theme).not.toBe(system('GrayText'));
      }
    }
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Home</h1>
        <SegmentedMeter segments={CREW} total={7} remainderLabel="idle" />
        <SegmentedMeter segments={PROJECT} total={61} remainderLabel="to do" size="compact" />
        <p>
          <SegmentedMeter segments={CREW} total={7} decorative /> 1 waiting · 1 stopped · 1 idle
        </p>
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
