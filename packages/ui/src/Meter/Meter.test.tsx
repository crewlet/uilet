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
import { contrast, flatten, paletteStates, parseHex } from '@crewlethq/tokens/test/palette';
import { Meter, meterTone, progressTone } from './index.js';

afterEach(cleanup);

describe('meterTone', () => {
  test('is derived from the fill, so a bar that is nearly full says so', () => {
    expect(meterTone(0)).toBe('brand');
    expect(meterTone(74.9)).toBe('brand');
    expect(meterTone(75)).toBe('warning');
    expect(meterTone(99.9)).toBe('warning');
    expect(meterTone(100)).toBe('danger');
    expect(meterTone(140)).toBe('danger');
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
    expect(progressTone(0)).toBe('brand');
    expect(progressTone(74.9)).toBe('brand');
    expect(progressTone(75)).toBe('brand');
    expect(progressTone(99.9)).toBe('brand');
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
    expect(container.querySelector<HTMLElement>('.crewlet-meter__fill')!.dataset['tone']).toBe('brand');
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

  test('every fill clears 3:1 against the track it sits in, with one named shortfall', () => {
    // MEASURED ON THE TRACK, not on the card. The fill's adjacent colour is
    // the unfilled remainder, and a bar a reader cannot separate from its own
    // well is a bar with no reading. That also refuses the engine's neutral,
    // which is the decoration step and measures 2.33:1 on a light page.
    //
    // THE ONE SHORTFALL IS NAMED HERE RATHER THAN MEASURED AWAY. Two
    // mid-luminance hues, the accent and the danger red, land at 2.74:1
    // against a track on the two deepest dark grounds: the inset well
    // LIGHTENS in the dark palette, which moves it towards exactly those two.
    // Neither colour is this component's to change, and every other token
    // tried as a track is worse: a border step measures 1.07:1 against its own
    // surface, so the well itself vanishes. Closing it needs a recessed
    // surface step that darkens in the dark palette, or a lift to those two
    // fills, and both are @crewlethq/tokens decisions. The set is asserted
    // EXACTLY, so a third composite falling under, one of these two getting
    // worse, or the palette fixing them all fails this case and brings
    // somebody back to read this paragraph.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Meter.css'), 'utf8');
    const tokensCss = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tokens/dist/css');
    const states = paletteStates({
      tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
      themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
    });
    // Spelled without the leading dashes and prefixed at use: the package's
    // variable check reads a quoted `--name` in a .tsx file as a declaration.
    const token = (name: string) => `--${name}`;
    const SURFACES = [
      'surface-background',
      'surface-subtle',
      'surface-muted',
      'surface-elevated',
      'surface-topbar',
      'surface-topbar-lift',
      'surface-topbar-active',
    ].map((name) => token(`color-${name}`));

    const fills = [...css.matchAll(/\.crewlet-meter__fill[^{]*\{[^}]*background:\s*var\((--[\w-]+)\)/g)].map(
      (match) => match[1] ?? '',
    );
    expect(fills.length).toBe(5);

    const short: string[] = [];
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      const read = (name: string) => {
        const raw = values.get(name);
        if (raw === undefined) throw new Error(`the suite reads ${name}, which @crewlethq/tokens does not emit`);
        return parseHex(raw) ?? flatten(raw, page);
      };
      for (const fill of fills) {
        for (const surface of SURFACES) {
          const track = flatten(values.get(token('color-surface-inset')) ?? '', read(surface));
          const ratio = contrast(read(fill), track);
          if (ratio >= 3) continue;
          short.push(`${state}: ${fill} on ${surface}`);
          // A floor under the floor: the two known composites may not get any
          // worse than they are while the palette carries them.
          if (ratio < 2.7) failures.push(`${state}: ${fill} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
    expect(short.sort()).toEqual([
      'dark (attribute): --color-brand-accent on --color-surface-elevated',
      'dark (attribute): --color-brand-accent on --color-surface-topbar-active',
      'dark (attribute): --color-feedback-danger on --color-surface-elevated',
      'dark (attribute): --color-feedback-danger on --color-surface-topbar-active',
      'dark (media query): --color-brand-accent on --color-surface-elevated',
      'dark (media query): --color-brand-accent on --color-surface-topbar-active',
      'dark (media query): --color-feedback-danger on --color-surface-elevated',
      'dark (media query): --color-feedback-danger on --color-surface-topbar-active',
    ]);
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Spend</h1>
        <Meter label="Token budget" value={12_400} max={20_000} valueText="12.4K of 20K tokens" />
        <Meter label="Seats" value={4} max={4} size="compact" hideLabel />
        <Meter label="Tokens used" value={12_400} max={0} valueText="12.4K tokens, no limit" />
        <Meter label="Onboarding" value={100} max={100} polarity="progress" valueText="100 of 100 steps" />
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
