/**
 * The step row's contract: that exactly one step is current while a sequence
 * runs and none once it has finished, that every step's state is said as well
 * as drawn, and that every ink it draws is a pair the palette measures.
 *
 * The states are read off the list the component renders, the colours and
 * the geometry off the CASCADE (the stylesheet goes into the document with
 * its tokens resolved for a palette, and the rule that wins is the rule that
 * is read back), so a selector one class short of the rule it has to beat
 * fails here instead of reading as right.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { contrast, flatten, OPAQUE_SURFACES, parseHex, TEXT_STEPS } from '@crewlethq/tokens/test/palette';
import {
  channels,
  installForcedColors,
  installSheets,
  installThemed,
  pseudoElement,
  px,
  themeColours,
} from '../../../../apps/ui-tests/src/cascade.js';
import { Stepper, type StepperStep, type StepperTone } from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/*
 * Spelled without the leading dashes and prefixed at use: the package's
 * variable check reads a quoted `--name` in a .tsx file as a declaration.
 */
const token = (name: string) => `--${name}`;

/** A turn's four phases, as the Agent screen draws them. */
const TURN: StepperStep[] = [
  { id: 'context', label: 'Context 0.8s' },
  { id: 'execute', label: 'Execute · round 7 of 25' },
  { id: 'review', label: 'Review' },
  { id: 'deliver', label: 'Deliver' },
];

const TONES: StepperTone[] = ['info', 'success', 'warning', 'danger', 'brand'];

/** The token pair each tone draws its current pill in: [soft, ink]. */
const PAIR: Record<StepperTone, [string, string]> = {
  info: ['color-feedback-info-soft', 'color-feedback-info-ink'],
  success: ['color-feedback-success-soft', 'color-feedback-success-ink'],
  warning: ['color-feedback-warning-soft', 'color-feedback-warning-ink'],
  danger: ['color-feedback-danger-soft', 'color-feedback-danger-ink'],
  brand: ['color-brand-accent-soft', 'color-brand-accent-ink'],
};

function steps(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('.crewlet-stepper__step')];
}

function stateOf(step: HTMLElement): string {
  const found = /crewlet-stepper__step--(done|current|later)/.exec(step.className)?.[1];
  if (found === undefined) throw new Error(`a step carries no state: "${step.className}"`);
  return found;
}

describe('where the sequence has got to', () => {
  test('exactly one step is current while it runs, and it is the one named', () => {
    for (const [index, step] of TURN.entries()) {
      cleanup();
      const { container } = render(<Stepper label="Turn progress" steps={TURN} current={step.id} />);
      const current = container.querySelectorAll('[aria-current]');
      expect(current, step.id).toHaveLength(1);
      expect(current[0]!.getAttribute('aria-current')).toBe('step');
      expect(current[0]).toBe(steps(container)[index]);
      expect(current[0]!.textContent).toContain(String(step.label));
    }
  });

  test('every step before the current one is done and every step after it is still to come', () => {
    const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
    expect(steps(container).map(stateOf)).toEqual(['done', 'current', 'later', 'later']);
  });

  test('a finished sequence has every step done and none current', () => {
    // The task timeline's finished turn: "Execute ✓ — Review ✓", nothing current.
    const { container } = render(<Stepper label="Turn 1" steps={TURN.slice(1, 3)} current={null} />);
    expect(steps(container).map(stateOf)).toEqual(['done', 'done']);
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  test('refuses a current step that is none of its steps, and two steps with one id, by name', () => {
    // Drawn as nothing started, a running turn would read as not begun; drawn
    // as all done, it would read as finished. Neither is true.
    expect(() => render(<Stepper label="Turn progress" steps={TURN} current="plan" />)).toThrow(
      /"plan" is not one of "context", "execute", "review", "deliver"/,
    );
    expect(() => render(<Stepper label="Turn progress" steps={[...TURN, TURN[0]!]} current="execute" />)).toThrow(
      /"context" is used twice/,
    );
  });

  test('a sequence with no steps is not drawn at all', () => {
    const { container } = render(<Stepper label="Turn progress" steps={[]} current={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('what each step says', () => {
  test('is an ordered list, named for what it is the steps of', () => {
    render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
    const list = screen.getByRole('list', { name: 'Turn progress' });
    expect(list.tagName).toBe('OL');
    // Declared, not left implicit: the stylesheet takes the markers off, and
    // WebKit drops the list role with them. The ATTRIBUTE is what is asserted,
    // since jsdom would find the role on a bare ol either way.
    expect(list.getAttribute('role')).toBe('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  test('a finished step says "Done" before its words, where the check stands for a reader who sees it', () => {
    const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
    const [done, current, later] = steps(container);
    // The words run together as a reader hears them, with the space between.
    expect(done!.textContent).toBe('Done Context 0.8s');
    const check = done!.querySelector('svg')!;
    expect(check.getAttribute('aria-hidden')).toBe('true');
    expect(check.classList.contains('crewlet-stepper__check')).toBe(true);
    // Nothing but a finished step carries either.
    for (const step of [current!, later!]) {
      expect(step.querySelector('svg'), stateOf(step)).toBeNull();
      expect(step.textContent, stateOf(step)).not.toContain('Done');
    }
  });

  test('a caller says "Done" in its own language', () => {
    const { container } = render(<Stepper label="Fortschritt" steps={TURN} current="review" doneLabel="Erledigt" />);
    expect(steps(container)[0]!.textContent).toBe('Erledigt Context 0.8s');
  });

  test('the current step carries its tone’s dot, which is hidden and breathes only when asked', () => {
    const { container, rerender } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
    const dots = container.querySelectorAll('.crewlet-stepper__dot');
    expect(dots).toHaveLength(1);
    expect(dots[0]!.closest('.crewlet-stepper__step')).toBe(steps(container)[1]);
    expect(dots[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(dots[0]!.classList.contains('crewlet-status-dot--info')).toBe(true);
    expect(dots[0]!.classList.contains('is-pulsing')).toBe(false);
    rerender(<Stepper label="Turn progress" steps={TURN} current="execute" tone="warning" pulse />);
    const dot = container.querySelector('.crewlet-stepper__dot')!;
    expect(dot.classList.contains('crewlet-status-dot--warning')).toBe(true);
    expect(dot.classList.contains('is-pulsing')).toBe(true);
  });

  test('the tone is info unless it is given, and it is drawn on the stepper', () => {
    const { container, rerender } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
    expect(container.querySelector('ol')!.classList.contains('crewlet-stepper--info')).toBe(true);
    rerender(<Stepper label="Turn progress" steps={TURN} current="execute" tone="danger" />);
    expect(container.querySelector('ol')!.classList.contains('crewlet-stepper--danger')).toBe(true);
    expect(container.querySelector('ol')!.classList.contains('crewlet-stepper--info')).toBe(false);
  });

  test('carries no axe violation, running and finished', async () => {
    const { container } = render(
      <main>
        <h1>Agent</h1>
        <Stepper label="Turn 2 progress" steps={TURN} current="execute" pulse />
        <Stepper label="Turn 1 progress" steps={TURN.slice(1, 3)} current={null} />
        <Stepper label="Turn 3 progress" steps={TURN} current="review" tone="warning" />
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

describe('what each step is drawn in', () => {
  test('done is the secondary ink, still to come the tertiary, and neither has a ground of its own', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Stepper/Stepper.css');
      cleanup();
      const palette = themeColours(theme);
      const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
      const [done, , later] = steps(container).map((step) =>
        getComputedStyle(step.querySelector('.crewlet-stepper__chip')!),
      );
      expect(channels(done!.color), theme).toEqual(parseHex(palette.get(token('color-text-secondary')) ?? ''));
      expect(channels(later!.color), theme).toEqual(parseHex(palette.get(token('color-text-tertiary')) ?? ''));
      for (const chip of [done!, later!]) {
        expect(chip.backgroundColor, theme).toBe('rgba(0, 0, 0, 0)');
        expect(chip.borderTopColor, theme).toBe(normalised(palette.get(token('color-border-default')) ?? ''));
      }
    }
  });

  test('the current step is its tone’s soft tint under its ink, with no hairline, in every tone and palette', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'StatusDot/StatusDot.css', 'Stepper/Stepper.css');
      const palette = themeColours(theme);
      for (const tone of TONES) {
        cleanup();
        const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" tone={tone} />);
        const current = container.querySelector('[aria-current="step"]')!;
        const chip = getComputedStyle(current.querySelector('.crewlet-stepper__chip')!);
        const [soft, ink] = PAIR[tone];
        expect(chip.backgroundColor, `${theme} ${tone}`).toBe(normalised(palette.get(token(soft)) ?? ''));
        expect(channels(chip.color), `${theme} ${tone}`).toEqual(parseHex(palette.get(token(ink)) ?? ''));
        expect(chip.borderTopColor, `${theme} ${tone}`).toBe('rgba(0, 0, 0, 0)');
        // The dot is the pill's own ink, not the tone's fill: two classes deep,
        // it beats StatusDot's own tone rule whichever file comes first.
        expect(
          channels(getComputedStyle(current.querySelector('.crewlet-stepper__dot')!).backgroundColor),
          `${theme} ${tone}`,
        ).toEqual(parseHex(palette.get(token(ink)) ?? ''));
      }
    }
  });

  test('every ink the row draws clears 4.5:1 on the ground it draws it on, on every rung', () => {
    // Read back from the cascade, so what is measured is what the stylesheet
    // paints: the current pill's ink on its soft tint over each rung, and the
    // done and later inks on each rung bare. A pill that took the tone's fill
    // step for its ground, or the decoration step for its words, fails here.
    let measured = 0;
    const failures: string[] = [];
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Stepper/Stepper.css');
      const palette = themeColours(theme);
      for (const tone of TONES) {
        cleanup();
        const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" tone={tone} />);
        for (const step of steps(container)) {
          const chip = getComputedStyle(step.querySelector('.crewlet-stepper__chip')!);
          for (const surface of OPAQUE_SURFACES) {
            const rung = parseHex(palette.get(surface) ?? '');
            if (rung === null) throw new Error(`${theme}: ${surface} is not opaque`);
            const ground = flatten(chip.backgroundColor, rung);
            const ratio = contrast(channels(chip.color), ground);
            measured += 1;
            if (ratio < 4.5) failures.push(`${theme} ${tone} ${stateOf(step)} on ${surface}: ${ratio.toFixed(2)}:1`);
          }
        }
      }
    }
    // Two palettes, five tones, four steps, four rungs.
    expect(measured).toBe(2 * 5 * 4 * 4);
    expect(failures).toEqual([]);
    // The floor is the palette's own for the two neutral steps.
    expect(TEXT_STEPS.find(([name]) => name === token('color-text-tertiary'))?.[1]).toBe(4.5);
  });

  test('the design’s pill: 20px, 8px inside each end, 5px to the word, the 11px step, a pill corner', () => {
    // The hairline's colour is read in the palettes above; its WIDTH is not
    // read here, because jsdom answers 16px for every border width there is.
    uninstall = installSheets('Stepper/Stepper.css');
    const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
    for (const step of steps(container)) {
      const chip = step.querySelector('.crewlet-stepper__chip')!;
      expect(px(chip, 'height'), stateOf(step)).toBe(20);
      expect(px(chip, 'padding-left'), stateOf(step)).toBe(8);
      expect(px(chip, 'padding-right'), stateOf(step)).toBe(8);
      expect(px(chip, 'gap'), stateOf(step)).toBe(5);
      expect(getComputedStyle(chip).fontSize, stateOf(step)).toBe('11px');
      expect(getComputedStyle(chip).borderRadius, stateOf(step)).toBe('999px');
      expect(getComputedStyle(chip).boxSizing, stateOf(step)).toBe('border-box');
    }
    const list = container.querySelector('ol')!;
    expect(px(list, 'gap')).toBe(6);
    expect(getComputedStyle(list).listStyle).toBe('none');
    expect(px(list, 'padding-left')).toBe(0);
  });

  test('a 10px rule in the strong hairline joins two steps, drawn by the second, so none leads or trails', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Stepper/Stepper.css');
      cleanup();
      const palette = themeColours(theme);
      const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" />);
      const rules = steps(container).map((step) => getComputedStyle(pseudoElement(step, 'before')));
      expect(rules[0]!.content, theme).not.toBe('""');
      for (const rule of rules.slice(1)) {
        expect(rule.content, theme).toBe('""');
        expect(rule.width, theme).toBe('10px');
        expect(rule.height, theme).toBe('1px');
        expect(channels(rule.backgroundColor), theme).toEqual(
          parseHex(palette.get(token('color-border-strong')) ?? ''),
        );
      }
    }
  });

  test('in forced colors the current step is drawn as a selection, and the rule in GrayText', () => {
    // The mode repaints every background to Canvas, which takes the tint and
    // the dot, so the one step the row is about would read like the others.
    const system = (property: 'backgroundColor' | 'color', keyword: string) => {
      const probe = document.createElement('i');
      probe.style[property] = keyword;
      document.body.append(probe);
      const value = getComputedStyle(probe)[property];
      probe.remove();
      return value;
    };
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installForcedColors('active', theme, 'StatusDot/StatusDot.css', 'Stepper/Stepper.css');
      for (const tone of TONES) {
        cleanup();
        const { container } = render(
          <Stepper label="Turn progress" steps={TURN} current="execute" tone={tone} pulse />,
        );
        const current = container.querySelector('[aria-current="step"]')!;
        const chip = getComputedStyle(current.querySelector('.crewlet-stepper__chip')!);
        // Out of the adjustment, since every colour it draws there is a system
        // colour: left in it, Chromium paints a Canvas backplate behind the
        // words, and HighlightText on Canvas is black on black in a dark theme.
        expect(chip.getPropertyValue('forced-color-adjust'), tone).toBe('none');
        // Which keeps shadows, so the halo, the tone's soft tint and no system
        // colour, is held still inside the pill.
        const halo = pseudoElement(current.querySelector('.crewlet-stepper__dot')!, 'after');
        expect(getComputedStyle(halo).animation, tone).toBe('none');
        expect(chip.backgroundColor, tone).toBe(system('backgroundColor', 'Highlight'));
        expect(chip.color, tone).toBe(system('color', 'HighlightText'));
        expect(chip.borderTopColor, tone).toBe(system('color', 'Highlight'));
        expect(getComputedStyle(current.querySelector('.crewlet-stepper__dot')!).backgroundColor, tone).toBe(
          system('backgroundColor', 'HighlightText'),
        );
        const rule = getComputedStyle(pseudoElement(steps(container)[2]!, 'before'));
        expect(rule.backgroundColor, tone).toBe(system('backgroundColor', 'GrayText'));
        // A step that is not current stays in the adjustment, drawn by the mode.
        expect(
          getComputedStyle(steps(container)[0]!.querySelector('.crewlet-stepper__chip')!).getPropertyValue(
            'forced-color-adjust',
          ),
          tone,
        ).not.toBe('none');
      }
    }
    // Outside the mode none of it is in the cascade: the pulse runs.
    uninstall?.();
    uninstall = installForcedColors('none', 'dark', 'StatusDot/StatusDot.css', 'Stepper/Stepper.css');
    cleanup();
    const { container } = render(<Stepper label="Turn progress" steps={TURN} current="execute" pulse />);
    const halo = pseudoElement(container.querySelector('.crewlet-stepper__dot')!, 'after');
    expect(getComputedStyle(halo).animation).toContain('crewlet-status-dot-pulse');
  });
});

/** A colour as jsdom serialises a computed one: `rgba(r, g, b, a)` for a translucent value. */
function normalised(value: string): string {
  const probe = document.createElement('i');
  probe.style.backgroundColor = value;
  document.body.append(probe);
  const out = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return out;
}
