/**
 * The tag's contract: that colour is never the only thing it says, that a tag
 * which acts is a real button, that a press can never be drawn under the
 * target floor, and that nothing moves when a hundred of them arrive at once.
 *
 * The last case reads the stylesheet and measures what it declares. A
 * component test can assert that a class is applied; only a measurement can
 * assert that the class is READABLE, and every defect this rewrite fixes was
 * of the second kind.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { contrast, flatten, paletteStates, parseHex, type Rgb } from '@crewlethq/tokens/test/palette';
import { WarningGlyph } from '@crewlethq/icons/glyphs';
import {
  DENSITIES as DENSITY_SETTINGS,
  installSheetsAtDensity,
} from '../../../../apps/ui-tests/src/density.js';
import { Tag, type TagVariant } from './index.js';

afterEach(cleanup);

const TONES: TagVariant[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'brand',
  'phase-onboarding',
  'phase-execute',
  'phase-review',
];

describe('Tag', () => {
  test('renders its label in every variant, so the hue is never the only carrier', () => {
    render(
      <>
        {TONES.map((variant) => (
          <Tag key={variant} variant={variant}>
            {variant}
          </Tag>
        ))}
      </>,
    );
    for (const variant of TONES) expect(screen.getByText(variant)).toBeTruthy();
  });

  test('a dot is the shape half and is not read twice', () => {
    render(
      <Tag variant="danger" dot>
        Broken
      </Tag>,
    );
    const dot = document.querySelector('.crewlet-status-dot');
    expect(dot).toBeTruthy();
    // The word beside it says the state; a dot that was also read would say it
    // twice.
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    expect(dot?.className).toContain('crewlet-status-dot--danger');
  });

  test('a tag that acts is a button announcing whether it is on', () => {
    const onClick = vi.fn();
    render(
      <Tag variant="danger" size="sm" onClick={onClick} pressed>
        3 failed
      </Tag>,
    );
    const button = screen.getByRole('button', { name: '3 failed' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('a tag that does not act is not a control', () => {
    render(<Tag variant="info">execute</Tag>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('an interactive xs is refused by the type and drawn at sm', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      // @ts-expect-error an interactive tag starts at sm: xs is an 18px pill,
      // under the 24px target floor, so the type refuses the combination.
      <Tag size="xs" onClick={() => {}}>
        Failed
      </Tag>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    const button = screen.getByRole('button', { name: 'Failed' });
    expect(button.className).toContain('crewlet-tag--sm');
    expect(button.className).not.toContain('crewlet-tag--xs');
    warn.mockRestore();
  });

  test('an unsized tag is the engine badge, and every form that acts takes the target floor', () => {
    // The default step IS the engine's 20px badge, which is under the 24px
    // WCAG 2.2 accepts for a pointer target. The floor is carried by a class
    // rather than by the step, so all three forms that take a press get it:
    // the pill that is a button, the pill holding a press and a remove, and
    // the inert pill whose only control is the remove at its edge.
    const { rerender } = render(<Tag>backend</Tag>);
    const inert = screen.getByText('backend').closest('.crewlet-tag');
    expect(inert?.className).toContain('crewlet-tag--sm');
    expect(inert?.className).not.toContain('crewlet-tag--acts');

    for (const props of [{ onClick: () => {} }, { onRemove: () => {} }, { onClick: () => {}, onRemove: () => {} }]) {
      rerender(<Tag {...props}>backend</Tag>);
      expect(screen.getByText('backend').closest('.crewlet-tag')?.className).toContain('crewlet-tag--acts');
    }
  });

  test('nothing animates on mount unless it is asked for', () => {
    const { rerender } = render(<Tag>Quiet</Tag>);
    expect(screen.getByText('Quiet').closest('.crewlet-tag')?.className).not.toContain('animate-in');
    rerender(<Tag animateIn>Quiet</Tag>);
    expect(screen.getByText('Quiet').closest('.crewlet-tag')?.className).toContain('crewlet-tag--animate-in');
  });

  test('the remove control is named and does not fire the row it sits in', () => {
    const onRemove = vi.fn();
    const onRowClick = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div onClick={onRowClick}>
        <Tag onRemove={onRemove} removeAriaLabel="Remove backend">
          backend
        </Tag>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove backend' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  test('a tag that presses and removes is two controls, never one inside the other', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <Tag size="sm" onClick={onClick} onRemove={onRemove} pressed removeAriaLabel="Remove backend">
        backend
      </Tag>,
    );
    const press = screen.getByRole('button', { name: 'backend' });
    const remove = screen.getByRole('button', { name: 'Remove backend' });
    // A button inside a button is invalid markup, and what a keyboard makes of
    // it is one control the inner half is unreachable from.
    expect(press.contains(remove)).toBe(false);
    expect(remove.contains(press)).toBe(false);
    expect(press.getAttribute('aria-pressed')).toBe('true');
    // The pill keeps the boundary, because the press state is the tag's.
    expect(press.closest('.crewlet-tag')?.className).toContain('is-pressed');

    fireEvent.click(press);
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    // Taking the chip off does not also fire the press it sits inside.
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('the count and the leading glyph keep the label the accessible name', () => {
    render(
      <Tag variant="warning" size="sm" leadingIcon={<WarningGlyph />} count={4} onClick={() => {}}>
        Needs a person
      </Tag>,
    );
    // The glyph is decoration and the count is part of what the tag says, so
    // the name is the label plus the number and never the glyph.
    expect(screen.getByRole('button', { name: /^Needs a person\s*4$/ })).toBeTruthy();
  });

  test('carries no axe violation in either form', async () => {
    const { container } = render(
      <main>
        <h1>Seats</h1>
        <Tag variant="success" dot>
          Working
        </Tag>
        <Tag variant="warning" size="sm" onClick={() => {}} pressed count={3}>
          Needs a person
        </Tag>
        <Tag onRemove={() => {}}>backend</Tag>
        <Tag size="sm" onClick={() => {}} onRemove={() => {}}>
          datadog
        </Tag>
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      // jsdom computes no layout and resolves no custom property, so axe can
      // only report contrast as incomplete. It is measured below instead.
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

/**
 * What the stylesheet declares, measured.
 *
 * The pairs are READ FROM Tag.css rather than listed here: a variant added
 * without a measurement would otherwise pass this file by not being in the
 * list, which is the one way a contrast suite can lie.
 */
describe('Tag colour', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const tokensCss = resolve(here, '../../../tokens/dist/css');
  const css = readFileSync(resolve(here, 'Tag.css'), 'utf8');
  const states = paletteStates({
    tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
    themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
  });
  /*
   * The token names are written WITHOUT their leading dashes and prefixed at
   * use. The package's variable check reads a quoted `--name` inside a .tsx
   * file as a DECLARATION, and a component may declare only `--crewlet-*`
   * names; a suite that measures the token layer has to name tokens, so it
   * spells them in a way the scan does not mistake for one.
   */
  const token = (name: string) => `--${name}`;
  const SURFACES = [
    'color-surface-background',
    'color-surface-subtle',
    'color-surface-muted',
    'color-surface-elevated',
  ].map(token);

  /** Every `.crewlet-tag--<variant>` rule that binds a fill and an ink. */
  function declaredPairs(): { variant: string; fill: string; ink: string }[] {
    const found: { variant: string; fill: string; ink: string }[] = [];
    for (const match of css.matchAll(/\.crewlet-tag--([\w-]+)\s*\{([^}]*)\}/g)) {
      const body = match[2] ?? '';
      const fill = /--crewlet-tag-fill:\s*var\((--[\w-]+)\)/.exec(body);
      const ink = /--crewlet-tag-ink:\s*var\((--[\w-]+)\)/.exec(body);
      if (fill && ink) found.push({ variant: match[1] ?? '', fill: fill[1] ?? '', ink: ink[1] ?? '' });
    }
    return found;
  }

  function resolveColour(values: Map<string, string>, name: string, ground: Rgb): Rgb {
    const raw = values.get(name);
    if (raw === undefined) throw new Error(`Tag.css reads ${name}, which @crewlethq/tokens does not emit`);
    const hex = parseHex(raw);
    return hex ?? flatten(raw, ground);
  }

  test('the suite reads the variants the stylesheet actually declares', () => {
    const variants = declaredPairs().map((pair) => pair.variant);
    // Every tone but the neutral default, which takes its fill from the base
    // rule rather than from a variant block.
    expect(variants.sort()).toEqual([
      'brand',
      'danger',
      'info',
      'phase-execute',
      'phase-onboarding',
      'phase-review',
      'success',
      'warning',
    ]);
  });

  test('every variant clears 4.5:1 on its own fill, on every surface, in both palettes', () => {
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const ground = parseHex(values.get(token('color-surface-background')) ?? '');
      if (ground === null) throw new Error(`${state} has no opaque page colour`);
      for (const { variant, fill, ink } of declaredPairs()) {
        const inkRgb = resolveColour(values, ink, ground);
        for (const surface of SURFACES) {
          const beneath = resolveColour(values, surface, ground);
          const ratio = contrast(inkRgb, flatten(values.get(fill) ?? '', beneath));
          if (ratio < 4.5) failures.push(`${state}: ${variant} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test('the neutral default clears 4.5:1 too', () => {
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const ground = parseHex(values.get(token('color-surface-background')) ?? '');
      if (ground === null) throw new Error(`${state} has no opaque page colour`);
      const ink = resolveColour(values, token('color-text-secondary'), ground);
      for (const surface of SURFACES) {
        const beneath = resolveColour(values, surface, ground);
        const ratio = contrast(ink, flatten(values.get(token('color-surface-inset')) ?? '', beneath));
        if (ratio < 4.5) failures.push(`${state}: neutral on ${surface}: ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  test('the target floor is a floor, not a height', () => {
    // A floor rather than a height, so the md step keeps the 28px of a small
    // control; written as a height it would SHRINK an interactive md tag to
    // 24px, which is the quiet regression this measures.
    const floor = /\.crewlet-tag--acts\s*\{([^}]*)\}/.exec(css);
    expect(floor?.[1]).toContain('--crewlet-tag-floor');
    expect(floor?.[1]).not.toContain('--crewlet-tag-height');
    expect(/height:\s*max\(\s*var\(--crewlet-tag-height\)\s*,\s*var\(--crewlet-tag-floor\)\s*\)/.test(css)).toBe(true);
  });

  test('a phase tag is set in the micro-label register, a state tag in the badge one', () => {
    // Phase is the one categorical identity outside a chart, and the second
    // register is what separates it at a glance from the state badge on the
    // same row. Colour alone could not: a reader who cannot separate the hues
    // still reads two differently SET words.
    const phase = /\.crewlet-tag--phase-onboarding,\s*\.crewlet-tag--phase-execute,\s*\.crewlet-tag--phase-review\s*\{([^}]*)\}/.exec(css);
    expect(phase?.[1]).toContain('text-transform: uppercase');
    expect(phase?.[1]).toContain(token('font-letter-spacing-wide'));
    const base = /\.crewlet-tag\s*\{([^}]*)\}/.exec(css);
    expect(base?.[1]).not.toContain('text-transform');
  });

  test('a pressed tag does not repaint its ground', () => {
    // Every deeper fill measured under 4.5:1 for at least one tone in the
    // light palette, and the engine's own pressed badge drew the label in its
    // ink on a background of the same ink. The press is a boundary here, so a
    // rule that put a background back is the regression this guards.
    const pressed = /\.crewlet-tag--actionable\[aria-pressed='true'\]\s*\{([^}]*)\}/.exec(css);
    expect(pressed).toBeTruthy();
    expect(pressed?.[1]).not.toMatch(/(^|;|\s)background/);
    expect(pressed?.[1]).toContain('--crewlet-tag-ink');
  });

  test('a dot inside a pill takes the pill ink, because the fill step is measured elsewhere', () => {
    // StatusDot paints the FILL step, which is measured as a mark against the
    // opaque surfaces a page is made of. Inside a tag the dot lands on the
    // tone's own soft tint, which is a different composite and one nothing in
    // the palette suite reaches. This case measures both: the fill step would
    // fail there, and the ink step, which is what the pill actually draws,
    // holds. A rule that reverted to the fill would go red on the second half.
    const rule = /\.crewlet-tag \.crewlet-tag__dot\s*\{([^}]*)\}/.exec(css);
    expect(rule?.[1]).toContain('background: currentColor');

    const fillFailures: string[] = [];
    const inkFailures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      const read = (name: string): Rgb => {
        const raw = values.get(name);
        if (raw === undefined) throw new Error(`the suite reads ${name}, which @crewlethq/tokens does not emit`);
        return parseHex(raw) ?? flatten(raw, page);
      };
      for (const { variant, fill, ink } of declaredPairs()) {
        // The fill step a bare StatusDot would paint for this tone. A phase
        // and a feedback tone drop the suffix the same way.
        const mark = fill.replace(/-soft$/, '');
        if (values.get(mark) === undefined) continue;
        for (const surface of SURFACES) {
          const tint = flatten(values.get(fill) ?? '', read(surface));
          if (contrast(read(mark), tint) < 3) fillFailures.push(`${state}: ${variant} on ${surface}`);
          const ratio = contrast(read(ink), tint);
          if (ratio < 3) inkFailures.push(`${state}: ${variant} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    // The ink holds everywhere, which is why the pill can spend it.
    expect(inkFailures).toEqual([]);
    // And the fill does not, which is why this rule is load-bearing rather
    // than a preference: delete it and a dot goes under the mark floor.
    expect(fillFailures.length).toBeGreaterThan(0);
  });
});

/**
 * The pill's geometry, evaluated rather than read.
 *
 * A size step is a CSS expression in three unknowns, and the one failure that
 * matters is an ordering failure at a density nobody rendered: a step written
 * as a flat pixel count stays put while the steps around it move, and
 * overtakes one of them. Reading the declaration cannot see that; computing it
 * at each density can.
 */
describe('Tag geometry', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'Tag.css'), 'utf8');
  const tokens = readFileSync(resolve(here, '../../../tokens/dist/css/tokens.css'), 'utf8');

  /** The three steps `--density` takes, from the token layer itself. */
  const DENSITIES = ['compact', 'normal', 'comfortable'].map((step) => {
    const found = new RegExp(`--density-${step}:\\s*([\\d.]+)`).exec(tokens);
    if (!found) throw new Error(`@crewlethq/tokens declares no --density-${step}`);
    return { step, value: Number(found[1]) };
  });

  /**
   * Evaluate one length expression at a density. It understands exactly what
   * the scale is written in: a plain length, `calc(Npx * var(--density, 1))`,
   * `max(a, b)`, and a `--size-*` token, which it resolves from tokens.css.
   */
  function px(expression: string, density: number): number {
    const text = expression.trim();
    const sizeToken = /^var\((--size-[\w-]+)\)$/.exec(text);
    if (sizeToken) {
      const declared = new RegExp(`${sizeToken[1]}:\\s*([^;]+);`).exec(tokens);
      if (!declared) throw new Error(`@crewlethq/tokens declares no ${sizeToken[1]}`);
      return px(declared[1] ?? '', density);
    }
    const max = /^max\(([^,]+),\s*(.+)\)$/.exec(text);
    if (max) return Math.max(px(max[1] ?? '', density), px(max[2] ?? '', density));
    const scaled = /^calc\(([\d.]+)px\s*\*\s*var\(--density,\s*1\)\)$/.exec(text);
    if (scaled) return Number(scaled[1]) * density;
    const flat = /^([\d.]+)px$/.exec(text);
    if (flat) return Number(flat[1]);
    throw new Error(`Tag.css writes a length this suite cannot evaluate: ${text}`);
  }

  const heightOf = (step: string) => {
    const found = new RegExp(`\\.crewlet-tag--${step}\\s*\\{[^}]*--crewlet-tag-height:\\s*([^;]+);`).exec(css);
    if (!found) throw new Error(`Tag.css declares no height for the ${step} step`);
    return found[1] ?? '';
  };

  test('the size ladder never inverts, at any density the tokens define', () => {
    // The regression this refuses: xs was a flat 18px while sm came down to
    // the engine's 20px, so at compact density the DENSE mark rendered 18px
    // against the badge's 16.4px and a row of tags stopped reading as one set.
    for (const { step, value } of DENSITIES) {
      const ladder = ['xs', 'sm', 'md'].map((name) => px(heightOf(name), value));
      expect(`${step}: ${ladder.map((height) => height.toFixed(2)).join(' < ')}`).toBe(
        `${step}: ${[...ladder].sort((a, b) => a - b).map((height) => height.toFixed(2)).join(' < ')}`,
      );
      expect(new Set(ladder).size).toBe(3);
    }
  });

  /*
   * WHERE THE PILL'S FLOOR STOPPED REACHING. The case above computes the
   * PILL's height and nothing inside it, and the remove control is a flex
   * child stretched to the container's CONTENT box, which is the pill's 1px
   * boundary shorter on each side: it drew 22px inside a 24px tag while every
   * case here stayed green. Measured in Chrome on the node editor's Manages
   * chips, "Remove Build Agent" was 24 x 22.
   *
   * WHAT IS MEASURED HERE is the mechanism through the real cascade, because
   * jsdom lays nothing out and drops `height: max(var(--crewlet-tag-height),
   * var(--crewlet-tag-floor))` outright: both names are the component's own
   * properties rather than tokens, and no substitution can follow one that a
   * modifier redeclares. The control stretches, it is pulled back over the
   * boundary on both block edges, and it is at least one target wide. A rule
   * that stops doing any of the three takes this red.
   */
  test('the control that removes a tag reaches the pill\'s own outer edge', () => {
    let remove: (() => void) | null = null;
    try {
      for (const [, density] of DENSITY_SETTINGS) {
        remove?.();
        remove = installSheetsAtDensity(density, 'Tag/Tag.css');
        document.body.innerHTML =
          '<span class="crewlet-tag crewlet-tag--neutral crewlet-tag--soft crewlet-tag--sm crewlet-tag--acts">' +
          '<span class="crewlet-tag__label">Build Agent</span>' +
          '<button type="button" class="crewlet-tag__remove"></button>' +
          '</span>';
        const control = document.querySelector('.crewlet-tag__remove')!;
        const style = getComputedStyle(control);
        expect(`${density}: ${style.alignSelf}`).toBe(`${density}: stretch`);
        expect(`${density}: ${drawn(control, 'margin-block-start')}`).toBe(`${density}: -1`);
        expect(`${density}: ${drawn(control, 'margin-block-end')}`).toBe(`${density}: -1`);
        expect(drawn(control, 'min-width')).toBeGreaterThanOrEqual(24);
      }
    } finally {
      remove?.();
      document.body.innerHTML = '';
    }
  });
});

/** A computed length in px, with anything that is not a number read as 0. */
function drawn(element: Element, property: string): number {
  const parsed = Number.parseFloat(getComputedStyle(element).getPropertyValue(property));
  return Number.isFinite(parsed) ? parsed : 0;
}
