/**
 * The meter's contract, which is almost all about what it is CALLED.
 *
 * The bar this replaces drew its legend as a sibling of the track and linked
 * nothing, so a screen reader announced "meter, 62 percent" with no idea of
 * what was at 62 percent. Every case below fails without the link.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { contrast, deltaE, flatten, OPAQUE_SURFACES, paletteStates, parseHex, RUNG_STEPS } from '@crewlethq/tokens/test/palette';
import { installForcedColors, installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import {
  DEFAULT_METER_THRESHOLDS,
  METER_STATES,
  Meter,
  meterState,
  meterStateTone,
  meterTone,
  progressTone,
  type MeterState,
} from './index.js';

afterEach(cleanup);

describe('meterTone', () => {
  test('is derived from the fill, so a bar that is nearly full says so', () => {
    expect(meterTone(0)).toBe('quantity');
    expect(meterTone(74.9)).toBe('quantity');
    expect(meterTone(75)).toBe('warning');
    expect(meterTone(99.9)).toBe('warning');
    expect(meterTone(100)).toBe('danger');
    expect(meterTone(140)).toBe('danger');
  });
});

describe('meterState', () => {
  test('is ok below near, near from it, and refusing from the limit itself', () => {
    expect(meterState(0)).toBe('ok');
    expect(meterState(0.749)).toBe('ok');
    expect(meterState(0.75)).toBe('near');
    expect(meterState(0.999)).toBe('near');
    expect(meterState(1)).toBe('refusing');
    expect(meterState(1.4)).toBe('refusing');
  });

  test('the default is the ramp every caller already had, three quarters of the limit', () => {
    expect(DEFAULT_METER_THRESHOLDS).toEqual({ near: 0.75 });
    // meterTone IS this ramp over a percentage, painted: the two can not drift.
    for (const percent of [0, 74.9, 75, 99.9, 100, 140]) {
      expect(meterTone(percent), `${percent}`).toBe(meterStateTone(meterState(percent / 100)));
    }
  });

  test('a caller threshold flips at exactly its fraction, inclusively', () => {
    expect(meterState(0.8999, { near: 0.9 })).toBe('ok');
    expect(meterState(9 / 10, { near: 0.9 })).toBe('near');
    // The default step is not consulted once a caller names its own.
    expect(meterState(0.8, { near: 0.9 })).toBe('ok');
  });

  test('near at the limit leaves no middle step, because the limit is refusing', () => {
    expect(meterState(0.999, { near: 1 })).toBe('ok');
    expect(meterState(1, { near: 1 })).toBe('refusing');
  });

  test.each([0, -0.1, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses near=%s, a rule no bar can draw, by name',
    (near) => {
      expect(() => meterState(0.5, { near })).toThrow(RangeError);
      expect(() => meterState(0.5, { near })).toThrow(/thresholds\.near/);
    },
  );
});

describe('meterStateTone', () => {
  test('near is the warning, refusing the danger, and ok the ordinary quantity', () => {
    expect(METER_STATES.map((state) => meterStateTone(state))).toEqual(['quantity', 'warning', 'danger']);
  });

  test('refuses a state it does not know, including a key every object inherits', () => {
    for (const state of ['over', 'toString', '']) {
      expect(() => meterStateTone(state as MeterState), state).toThrow(/Meter state must be one of ok, near, refusing/);
    }
  });
});

describe('progressTone', () => {
  test('reads a finished bar as finished rather than as a fault', () => {
    // The whole reason the polarity exists: this percent is `danger` on the
    // spent ramp and a completed goal on this one.
    expect(progressTone(100)).toBe('success');
    expect(progressTone(140)).toBe('success');
  });

  test('has no middle step, because a goal has no fact between started and done', () => {
    // 75 is where the spent ramp turns, and there is deliberately nothing here:
    // "nearly done" is not a warning, and "barely started" is only a fault
    // against a deadline this component is never told.
    expect(progressTone(0)).toBe('quantity');
    expect(progressTone(74.9)).toBe('quantity');
    expect(progressTone(75)).toBe('quantity');
    expect(progressTone(99.9)).toBe('quantity');
  });
});

describe('Meter', () => {
  test('is named by its label and reports its value in words', () => {
    render(<Meter label="Token budget" value={12_400} max={20_000} valueText="12.4K of 20K tokens" />);
    const meter = screen.getByRole('meter', { name: 'Token budget' });
    expect(meter.getAttribute('aria-valuenow')).toBe('12400');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('20000');
    expect(meter.getAttribute('aria-valuetext')).toBe('12.4K of 20K tokens');
  });

  test('a hidden label still names it', () => {
    render(<Meter label="Token budget" value={1} max={4} hideLabel />);
    expect(screen.getByRole('meter', { name: 'Token budget' })).toBeTruthy();
  });

  test('without words to read it leaves the platform to read the number', () => {
    render(<Meter label="Seats" value={3} max={4} />);
    expect(screen.getByRole('meter').getAttribute('aria-valuetext')).toBeNull();
  });

  test('the fill is clamped, so a value past the maximum does not overrun the track', () => {
    const { container } = render(<Meter label="Spend" value={140} max={100} />);
    const fill = container.querySelector<HTMLElement>('.crewlet-meter__fill')!;
    expect(fill.style.width).toBe('100%');
    expect(fill.dataset['tone']).toBe('danger');
  });

  test('a value past the maximum is REPORTED inside the scale and stated in words', () => {
    // A budget lowered under a counter that has already passed it is ordinary,
    // and aria-valuenow outside [min,max] is not something ARIA allows or
    // assistive technology resolves the same way twice. The clamp makes the
    // pair valid; the words are what stop the clamp becoming a second lie,
    // because "100" alone says the counter is exactly at the limit it overran.
    render(<Meter label="Spend" value={140} max={100} />);
    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('100');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-valuetext')).toBe('140 of 100');
  });

  test('a value under the floor is clamped at the other end for the same reason', () => {
    render(<Meter label="Drift" value={-5} max={100} />);
    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('0');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuetext')).toBe('-5 of 100');
  });

  test("the caller's own words win over the ones the clamp would write", () => {
    render(<Meter label="Spend" value={140} max={100} valueText="$140 against a $100 cap" />);
    expect(screen.getByRole('meter').getAttribute('aria-valuetext')).toBe('$140 against a $100 cap');
  });

  test('a maximum of zero is nothing rather than a division', () => {
    const { container } = render(<Meter label="Spend" value={5} max={0} />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.style.width).toBe('0%');
  });

  test('a caller can override the derived tone', () => {
    const { container } = render(<Meter label="Quiet" value={90} max={100} tone="neutral" />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('neutral');
  });

  test('a non-positive maximum claims no scale, because the meter role cannot say there is none', () => {
    // ARIA gives the meter role no way to say "no ceiling". max={0} states a
    // range of zero width, where the fraction is 0/0 and any value but 0
    // breaks "aria-valuenow MUST NOT fall below or exceed the computed values
    // of aria-valuemin and aria-valuemax"; leaving the attribute off is worse,
    // because missing is exactly when the role's implicit 100 takes over and
    // the bar announces a ceiling nobody set. So it stops being a meter.
    const { container } = render(<Meter label="Tokens used" value={12_400} max={0} />);
    const track = container.querySelector<HTMLElement>('.crewlet-meter__track')!;
    expect(track.getAttribute('role')).toBeNull();
    expect(track.getAttribute('aria-valuenow')).toBeNull();
    expect(track.getAttribute('aria-valuemin')).toBeNull();
    expect(track.getAttribute('aria-valuemax')).toBeNull();
    expect(track.getAttribute('aria-valuetext')).toBeNull();
    expect(track.getAttribute('aria-labelledby')).toBeNull();
    // Decoration, and hidden as decoration: an empty bar beside a figure would
    // otherwise be read out as an unexplained blank.
    expect(track.getAttribute('aria-hidden')).toBe('true');
    // The legend is untouched -- the name and the figure are still on the page.
    expect(screen.getByText('Tokens used')).toBeTruthy();
    expect(screen.queryByRole('meter')).toBeNull();
  });

  test('a negative maximum is the same non-answer as a zero one', () => {
    const { container } = render(<Meter label="Tokens used" value={12_400} max={-1} />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__track')!.getAttribute('role')).toBeNull();
  });

  test('a real maximum is still a meter, so the scale is claimed exactly where there is one', () => {
    // The floor under the case above: this is what has to keep working.
    render(<Meter label="Seats" value={3} max={4} />);
    expect(screen.getByRole('meter', { name: 'Seats' }).getAttribute('aria-valuemax')).toBe('4');
  });

  test('with no scale and no legend, the figure is spoken instead of lost', () => {
    // aria-valuetext went with the role, and hideLabel means the legend draws
    // nothing -- so without this the reader gets a name and no number at all.
    render(<Meter label="Tokens used" value={12_400} max={0} valueText="12.4K tokens, no limit" hideLabel />);
    expect(screen.getByText('12.4K tokens, no limit')).toBeTruthy();
  });

  test('with no scale and a hint in the way, the figure is spoken too', () => {
    // `hint` displaces valueText in the legend, so the words meant for a reader
    // are on the page nowhere.
    const { container } = render(
      <Meter label="Tokens used" value={12_400} max={0} valueText="12.4K tokens, no limit" hint={<b>12.4K</b>} />,
    );
    expect(container.querySelector('.crewlet-visually-hidden')!.textContent).toBe('12.4K tokens, no limit');
  });

  test('a scaled meter says it once, on the meter, and not twice', () => {
    const { container } = render(
      <Meter label="Token budget" value={12_400} max={20_000} valueText="12.4K of 20K tokens" hideLabel />,
    );
    expect(container.querySelectorAll('.crewlet-visually-hidden').length).toBe(1);
    expect(screen.getByRole('meter').getAttribute('aria-valuetext')).toBe('12.4K of 20K tokens');
  });

  test('the polarity picks the ramp, and a finished goal is not a crisis', () => {
    // The one finding that kept a consumer on its own Meter: the spent ramp
    // paints a completed goal `danger`.
    const { container } = render(<Meter label="Onboarding" value={100} max={100} polarity="progress" />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('success');
  });

  test('the progress ramp stays quiet where the spent ramp warns', () => {
    const { container } = render(<Meter label="Onboarding" value={82} max={100} polarity="progress" />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('quantity');
  });

  test('the ordinary reading is the quantity, painted in the first data series rather than the accent', () => {
    // The accent means "act here", and a bar is not an action: the reading a
    // meter shows when it is in no state is a figure of one quantity, which
    // its label names, and that is what the first data series is for.
    const { container } = render(<Meter label="Spend" value={40} max={100} />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('quantity');
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Meter.css'), 'utf8');
    const bare = /\.crewlet-meter__fill\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''));
    expect(bare?.[1]).toMatch(/background:\s*var\(--color-data-1\);/);
    expect(css).not.toMatch(/--color-brand-accent/);
  });

  test('spent is the default, so no existing caller moves', () => {
    const { container } = render(<Meter label="Spend" value={100} max={100} />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('danger');
    const warn = render(<Meter label="Spend" value={82} max={100} />);
    expect(warn.container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('warning');
  });

  test('an explicit tone still beats the ramp the polarity chose', () => {
    const { container } = render(<Meter label="Onboarding" value={100} max={100} polarity="progress" tone="neutral" />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('neutral');
  });

  test('a given state wins over any fraction, so the meter derives nothing', () => {
    // The consumer owns the rule: an empty bar it says is refusing is
    // refusing, and a full one it says is ok is ok.
    const cases: [MeterState, number, string][] = [
      ['refusing', 0, 'danger'],
      ['near', 10, 'warning'],
      ['ok', 100, 'quantity'],
      ['ok', 140, 'quantity'],
      ['near', 0, 'warning'],
    ];
    for (const [state, value, tone] of cases) {
      const { container } = render(<Meter label="Budget" value={value} max={100} state={state} />);
      const fill = container.querySelector<HTMLElement>('.crewlet-meter__fill')!;
      expect(fill.dataset['tone'], `${state} at ${value}`).toBe(tone);
      // The verdict paints the fill; it does not move it.
      expect(fill.style.width, `${state} at ${value}`).toBe(`${Math.min(100, value)}%`);
      cleanup();
    }
  });

  test('a state is drawn on an unbounded bar too, since the verdict needs no ceiling', () => {
    const { container } = render(<Meter label="Budget" value={5} max={0} state="refusing" />);
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('danger');
  });

  test('an unknown state is refused rather than drawn as the ordinary reading', () => {
    expect(() => render(<Meter label="Budget" value={5} max={10} state={'over' as MeterState} />)).toThrow(RangeError);
  });

  test('thresholds.near replaces the built-in step and flips at it exactly', () => {
    const tone = (value: number) => {
      const { container } = render(<Meter label="Budget" value={value} max={100} thresholds={{ near: 0.9 }} />);
      const drawn = container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone'];
      cleanup();
      return drawn;
    };
    // 82 is `warning` on the default ramp and ordinary under this rule.
    expect(tone(82)).toBe('quantity');
    expect(tone(89)).toBe('quantity');
    expect(tone(90)).toBe('warning');
    expect(tone(99)).toBe('warning');
    expect(tone(100)).toBe('danger');
    expect(tone(140)).toBe('danger');
  });

  test('a threshold outside the limit is refused by name', () => {
    expect(() => render(<Meter label="Budget" value={5} max={10} thresholds={{ near: 1.5 }} />)).toThrow(
      /thresholds\.near must be a fraction of the limit above 0 and at most 1; it was 1\.5/,
    );
  });

  test('with neither a state nor thresholds the built-in ramp is unchanged', () => {
    const tone = (value: number) => {
      const { container } = render(<Meter label="Budget" value={value} max={100} />);
      const drawn = container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone'];
      cleanup();
      return drawn;
    };
    expect([0, 74, 75, 99, 100, 140].map(tone)).toEqual([
      'quantity',
      'quantity',
      'warning',
      'warning',
      'danger',
      'danger',
    ]);
  });

  test('the types refuse a second opinion beside a verdict or a threshold', () => {
    // @ts-expect-error a verdict and a hand-picked tone would disagree about one reading
    void (<Meter label="Budget" value={1} max={2} state="near" tone="neutral" />);
    // @ts-expect-error a verdict takes no ramp
    void (<Meter label="Budget" value={1} max={2} state="near" polarity="spent" />);
    // @ts-expect-error a verdict derives nothing, so a threshold would be read by nobody
    void (<Meter label="Budget" value={1} max={2} state="near" thresholds={{ near: 0.9 }} />);
    // @ts-expect-error a hand-picked tone ignores the ramp a threshold moves
    void (<Meter label="Budget" value={1} max={2} tone="neutral" thresholds={{ near: 0.9 }} />);
    // @ts-expect-error the progress ramp has no middle step to move
    void (<Meter label="Budget" value={1} max={2} polarity="progress" thresholds={{ near: 0.9 }} />);
    // Each on its own is a reading, and optional values still pass through.
    const maybe = undefined as MeterState | undefined;
    void (<Meter label="Budget" value={1} max={2} state={maybe} />);
    void (<Meter label="Budget" value={1} max={2} polarity="spent" thresholds={{ near: 0.9 }} />);
    void (<Meter label="Budget" value={1} max={2} polarity="progress" tone="neutral" />);
  });

  test('every fill clears 3:1 against the track it sits in, on every rung', () => {
    // MEASURED ON THE TRACK, not on the card. The fill's adjacent colour is
    // the unfilled remainder, and a bar a reader cannot separate from its own
    // track is a bar with no reading. That also refuses the engine's neutral,
    // which is the decoration step and measures 2.33:1 on a light page.
    //
    // THE TRACK IS READ FROM THE STYLESHEET, and composited over every rung, so
    // a track that became translucent again would be measured as the composite
    // a reader sees. It is the raised rung now, opaque, so it is the same
    // colour on every ground and the palette suite's own mark rule covers every
    // pair: the inset well it used to be darkened the light warning and success
    // fills to 2.84:1 and 2.86:1 over the frame once the states took the
    // approved hues. The tightest pair is now the light warning on the raised
    // track, at 3.17:1. A fill that falls under the floor again fails here
    // rather than joining a list.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Meter.css'), 'utf8');
    const tokensCss = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tokens/dist/css');
    const states = paletteStates({
      tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
      themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
    });
    // Spelled without the leading dashes and prefixed at use: the package's
    // variable check reads a quoted `--name` in a .tsx file as a declaration.
    const token = (name: string) => `--${name}`;

    const fills = [...css.matchAll(/\.crewlet-meter__fill[^{]*\{[^}]*background:\s*var\((--[\w-]+)\)/g)].map(
      (match) => match[1] ?? '',
    );
    expect(fills.length).toBe(5);
    const track = /\.crewlet-meter__track\s*\{[^}]*background:\s*var\((--[\w-]+)\)/.exec(css)?.[1] ?? '';
    expect(track).toBe(token('color-surface-elevated'));

    let measured = 0;
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      const read = (name: string, ground = page) => {
        const raw = values.get(name);
        if (raw === undefined) throw new Error(`the suite reads ${name}, which @crewlethq/tokens does not emit`);
        return parseHex(raw) ?? flatten(raw, ground);
      };
      for (const fill of fills) {
        for (const surface of OPAQUE_SURFACES) {
          const ratio = contrast(read(fill), read(track, read(surface)));
          measured += 1;
          if (ratio < 3) failures.push(`${state}: ${fill} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    // Three theme states, five fills, four rungs: a reading that found no
    // fill or no rung would pass for any palette at all.
    expect(measured).toBe(3 * 5 * 4);
    expect(failures).toEqual([]);
  });

  test('the track is a visible step on the card a meter is drawn on', () => {
    // THE UNFILLED REMAINDER IS HALF THE READING: forty percent is forty
    // percent of something, and a reader has to see where that something
    // ends. The track is the raised rung, and an opaque rung has an edge only
    // against a ground that is not itself: a meter is drawn on a CARD, which
    // is where the design puts every one, and the palette holds raised a
    // visible step above the card (RUNG_STEPS). So the track is read from the
    // stylesheet and measured against the card in every theme state, at that
    // same floor: a track moved onto a step that shares the card's value, or
    // a card that came to share the track's, fails here. On the raised rung
    // itself the track has no edge at all, which is why the README says a
    // meter is never drawn there.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Meter.css'), 'utf8');
    const tokensCss = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tokens/dist/css');
    const states = paletteStates({
      tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
      themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
    });
    const token = (name: string) => `--${name}`;
    const card = token('color-surface-subtle');
    const step = RUNG_STEPS.find(([, upper, lower]) => upper === token('color-surface-elevated') && lower === card);
    if (step === undefined) throw new Error('the palette no longer holds raised a step above the card');
    const floor = step[3];
    const track = /\.crewlet-meter__track\s*\{[^}]*background:\s*var\((--[\w-]+)\)/.exec(css)?.[1] ?? '';

    const measured: string[] = [];
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const ground = parseHex(values.get(card) ?? '');
      const raw = values.get(track);
      if (ground === null || raw === undefined) throw new Error(`${state} has no opaque card or no ${track}`);
      const separation = deltaE(flatten(raw, ground), ground);
      measured.push(state);
      if (separation < floor) failures.push(`${state}: ${track} on ${card}: dE ${separation.toFixed(2)} < ${floor}`);
    }
    expect(measured.length).toBe(3);
    expect(failures).toEqual([]);
  });

  test('the track is the design six pixels with round ends, at both sizes', () => {
    /*
     * The approved design draws every meter at 6px: at the end of a stat
     * tile's value line beside a 28px number and a 28px sparkline, and under a
     * line of caption text in a card. The compact size drops a type step in
     * its legend and never a pixel of its track. Read as the cascade decides
     * it, so a size rule that overrode the track is caught too.
     */
    const uninstall = installSheets('Meter/Meter.css');
    try {
      const { container } = render(
        <>
          <Meter label="Weekly budget" value={63} max={100} />
          <Meter label="Seats" value={4} max={7} size="compact" />
        </>,
      );
      const tracks = [...container.querySelectorAll('.crewlet-meter__track')];
      expect(tracks.map((track) => px(track, 'height'))).toEqual([6, 6]);
      expect(tracks.map((track) => getComputedStyle(track).borderRadius)).toEqual(['999px', '999px']);
    } finally {
      uninstall();
    }
  });

  test('in forced colors the fill is CanvasText and the track GrayText, so the length survives', () => {
    /*
     * The mode repaints every author background to Canvas, and a meter is
     * nothing but backgrounds: the bar used to vanish whole, track and reading
     * together, for the reader who asked for more contrast. A system colour an
     * author writes is the one thing the mode keeps. jsdom resolves one to a
     * fixed value of its own, so each reading is compared with the same
     * keyword resolved here, and every tone is drawn, since a tone rule is
     * the one that has to be beaten.
     */
    const system = (keyword: string) => {
      const probe = document.createElement('i');
      probe.style.backgroundColor = keyword;
      document.body.append(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    };
    expect(system('CanvasText')).not.toBe(system('GrayText'));
    // In both palettes, with every token resolved, so each tone rule is a
    // real colour the block has to beat rather than a declaration jsdom drops.
    for (const theme of ['dark', 'light'] as const) {
      const uninstall = installForcedColors('active', theme, 'Meter/Meter.css');
      try {
        const tones = ['quantity', 'success', 'warning', 'danger', 'neutral'] as const;
        const { container } = render(
          <>
            {tones.map((tone) => (
              <Meter key={tone} label={tone} value={40} max={100} tone={tone} />
            ))}
          </>,
        );
        for (const fill of container.querySelectorAll<HTMLElement>('.crewlet-meter__fill')) {
          expect(getComputedStyle(fill).backgroundColor, `${theme} ${fill.dataset['tone']}`).toBe(system('CanvasText'));
        }
        for (const track of container.querySelectorAll('.crewlet-meter__track')) {
          expect(getComputedStyle(track).backgroundColor, theme).toBe(system('GrayText'));
        }
      } finally {
        uninstall();
      }
      cleanup();
    }
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Spend</h1>
        <Meter label="Token budget" value={12_400} max={20_000} valueText="12.4K of 20K tokens" />
        <Meter label="Seats" value={4} max={4} size="compact" hideLabel />
        <Meter label="Tokens used" value={12_400} max={0} valueText="12.4K tokens, no limit" />
        <Meter label="Onboarding" value={100} max={100} polarity="progress" valueText="100 of 100 steps" />
        <Meter label="Daily tokens" value={96} max={100} state="refusing" valueText="96K of 100K, refusing" />
        <Meter label="Weekly tokens" value={91} max={100} thresholds={{ near: 0.9 }} valueText="91K of 100K" />
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
