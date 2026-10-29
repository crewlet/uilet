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
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
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
  const found = /crewlet-stepper__step--(done|current|upcoming|optional|attention)/.exec(step.className)?.[1];
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
    expect(steps(container).map(stateOf)).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  });

  test('a finished sequence has every step done and none current', () => {
    // The task timeline's finished turn: "Execute ✓, Review ✓", nothing current.
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
    // 6px between two lines, and 6px either side of the 10px rule, which
    // stands in the gap between two pills rather than inside the second.
    expect(px(list, 'row-gap')).toBe(6);
    expect(px(list, 'column-gap')).toBe(6 + 10 + 6);
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
        // Out of the step's box, in the gap before it, so the step that opens
        // a wrapped line takes no rule with it: the list cuts that one off.
        expect(rule.position, theme).toBe('absolute');
      }
      expect(getComputedStyle(container.querySelector('ol')!).overflowX, theme).toBe('clip');
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

/** The brand setup wizard's six steps, part way through: on Colours, with a low pair standing. */
const SETUP: StepperStep[] = [
  { id: 'identity', label: 'Identity', description: 'Name and tagline' },
  { id: 'logos', label: 'Logos', status: 'attention' },
  { id: 'colours', label: 'Colours' },
  { id: 'typography', label: 'Typography', status: 'optional' },
  { id: 'voice', label: 'Voice', status: 'optional' },
  { id: 'review', label: 'Review' },
];

describe('statuses', () => {
  test('a step’s status draws it, and a step without one follows its position', () => {
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" />);
    expect(steps(container).map(stateOf)).toEqual(['done', 'attention', 'current', 'optional', 'optional', 'upcoming']);
  });

  test('the current step stays current with a status, and carries the warning glyph when it needs attention', () => {
    const marked = SETUP.map((step) => (step.id === 'colours' ? { ...step, status: 'attention' as const } : step));
    const { container } = render(<Stepper label="Setup steps" steps={marked} current="colours" />);
    const current = steps(container)[2]!;
    expect(current.getAttribute('aria-current')).toBe('step');
    expect(current.classList.contains('crewlet-stepper__step--current')).toBe(true);
    expect(current.classList.contains('crewlet-stepper__step--attention')).toBe(true);
    expect(current.querySelector('.crewlet-stepper__warning')).not.toBeNull();
    expect(current.querySelector('.crewlet-stepper__dot')).toBeNull();
    expect(current.textContent).toBe('Colours, Needs attention');
  });

  test('in a row the status words are said after the label, since the pill has no room to show them', () => {
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" />);
    const [, logos, , typography] = steps(container);
    expect(logos!.textContent).toBe('Logos, Needs attention');
    expect(logos!.querySelector('.crewlet-stepper__warning')!.getAttribute('aria-hidden')).toBe('true');
    expect(typography!.textContent).toBe('Typography, Optional');
    // A row draws no description: the pill carries the label alone.
    expect(steps(container)[0]!.textContent).toBe('Done Identity');
  });

  test('the words are the caller’s to translate', () => {
    const { container } = render(
      <Stepper
        label="Schritte"
        steps={SETUP}
        current="colours"
        optionalLabel="Optional, kann übersprungen werden"
        attentionLabel="Bitte prüfen"
      />,
    );
    expect(steps(container)[1]!.textContent).toBe('Logos, Bitte prüfen');
    expect(steps(container)[3]!.textContent).toBe('Typography, Optional, kann übersprungen werden');
  });

  test('refuses "current" on a step that is not current, and a reached step that is none of its steps', () => {
    const wrong = SETUP.map((step) => (step.id === 'voice' ? { ...step, status: 'current' as const } : step));
    expect(() => render(<Stepper label="Setup steps" steps={wrong} current="colours" />)).toThrow(
      /"voice" says it is current, but current is "colours"/,
    );
    expect(() =>
      render(<Stepper label="Setup steps" steps={SETUP} current="colours" reached="launch" onSelect={() => {}} />),
    ).toThrow(/reached must be the id of one of its steps; "launch"/);
  });
});

describe('the column', () => {
  test('draws a mark, the label, the description and the status words for each step', () => {
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" />);
    expect(container.querySelector('ol')!.classList.contains('crewlet-stepper--vertical')).toBe(true);
    const [identity, logos, colours, typography, , review] = steps(container);
    expect(identity!.querySelector('.crewlet-stepper__description')!.textContent).toBe('Name and tagline');
    expect(identity!.querySelector('.crewlet-stepper__mark .crewlet-stepper__check')).not.toBeNull();
    expect(logos!.querySelector('.crewlet-stepper__note')!.textContent).toBe('Needs attention');
    expect(logos!.querySelector('.crewlet-stepper__mark .crewlet-stepper__warning')).not.toBeNull();
    expect(colours!.querySelector('.crewlet-stepper__mark .crewlet-stepper__dot')).not.toBeNull();
    expect(typography!.querySelector('.crewlet-stepper__note')!.textContent).toBe('Optional');
    // A step still to come shows its number, which the list position already
    // says to a screen reader.
    const number = review!.querySelector('.crewlet-stepper__number')!;
    expect(number.textContent).toBe('6');
    expect(number.getAttribute('aria-hidden')).toBe('true');
  });

  test('the marks are 20px pills on a hairline the step it leaves draws, so nothing trails the last', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Stepper/Stepper.css');
      cleanup();
      const palette = themeColours(theme);
      const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" />);
      const all = steps(container);
      for (const step of all) {
        // The row's pill rule never draws in a column.
        expect(getComputedStyle(pseudoElement(step, 'before')).content, theme).not.toBe('""');
      }
      for (const step of all.slice(0, -1)) {
        const rule = getComputedStyle(pseudoElement(step, 'after'));
        expect(rule.content, theme).toBe('""');
        expect(rule.width, theme).toBe('1px');
        expect(channels(rule.backgroundColor), theme).toEqual(parseHex(palette.get(token('color-border-strong')) ?? ''));
      }
      expect(getComputedStyle(pseudoElement(all.at(-1)!, 'after')).content, theme).not.toBe('""');
    }
    // The geometry, with the density resolved.
    uninstall?.();
    uninstall = installSheets('Stepper/Stepper.css');
    cleanup();
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" />);
    for (const step of steps(container)) {
      const mark = step.querySelector('.crewlet-stepper__mark')!;
      expect(px(mark, 'width'), stateOf(step)).toBe(20);
      expect(px(mark, 'height'), stateOf(step)).toBe(20);
      expect(getComputedStyle(mark).borderRadius, stateOf(step)).toBe('999px');
      expect(getComputedStyle(step.querySelector('.crewlet-stepper__title')!).lineHeight, stateOf(step)).toBe('20px');
    }
  });

  test('the current mark is its tone’s pair, a mark needing attention the warning pair, and the words follow the three inks', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'StatusDot/StatusDot.css', 'Stepper/Stepper.css');
      cleanup();
      const palette = themeColours(theme);
      const { container } = render(
        <Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" tone="brand" />,
      );
      const [identity, logos, colours, , , review] = steps(container);
      const mark = (step: HTMLElement) => getComputedStyle(step.querySelector('.crewlet-stepper__mark')!);
      const row = (step: HTMLElement) => getComputedStyle(step.querySelector('.crewlet-stepper__row')!);
      const hex = (name: string) => parseHex(palette.get(token(name)) ?? '');
      expect(mark(colours!).backgroundColor, theme).toBe(normalised(palette.get(token('color-brand-accent-soft')) ?? ''));
      expect(channels(mark(colours!).color), theme).toEqual(hex('color-brand-accent-ink'));
      expect(mark(logos!).backgroundColor, theme).toBe(normalised(palette.get(token('color-feedback-warning-soft')) ?? ''));
      expect(channels(mark(logos!).color), theme).toEqual(hex('color-feedback-warning-ink'));
      expect(channels(row(colours!).color), theme).toEqual(hex('color-text-primary'));
      expect(channels(row(identity!).color), theme).toEqual(hex('color-text-secondary'));
      expect(channels(row(review!).color), theme).toEqual(hex('color-text-tertiary'));
    }
  });
});

describe('picking a step', () => {
  test('visited steps are buttons, and a step not reached yet stays words', () => {
    render(<Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" onSelect={() => {}} />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Done IdentityName and tagline',
      'LogosNeeds attention',
      'Colours',
    ]);
  });

  test('every step up to the furthest reached stays a button after walking back', () => {
    render(
      <Stepper label="Setup steps" steps={SETUP} current="logos" reached="voice" orientation="vertical" onSelect={() => {}} />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /Review/ })).toBeNull();
  });

  test('the current step’s button carries aria-current, and the item it stands in does not', () => {
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" onSelect={() => {}} />);
    const current = container.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(current[0]!.tagName).toBe('BUTTON');
    expect(current[0]!.getAttribute('aria-current')).toBe('step');
    expect(current[0]!.getAttribute('type')).toBe('button');
  });

  test('a press, Enter or Space picks the step by its id', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Identity/ }));
    expect(onSelect).toHaveBeenLastCalledWith('identity');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Logos/ }));
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('logos');
    await user.tab();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenLastCalledWith('colours');
    // The next tab leaves the stepper: no stop on a step not reached.
    await user.tab();
    expect(document.activeElement).toBe(document.body);
  });

  test('in a row a picked pill keeps the design’s geometry, and every step rings inside its own box', () => {
    uninstall = installSheets('Stepper/Stepper.css');
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" onSelect={() => {}} />);
    for (const button of container.querySelectorAll<HTMLElement>('.crewlet-stepper__target')) {
      expect(button.classList.contains('crewlet-stepper__chip')).toBe(true);
      expect(px(button, 'height')).toBe(20);
      expect(getComputedStyle(button).fontSize).toBe('11px');
    }
  });

  test('a picked pill takes a press through the 24px target floor without growing past 20px', () => {
    uninstall = installSheets('Stepper/Stepper.css');
    const { container } = render(<Stepper label="Setup steps" steps={SETUP} current="colours" onSelect={() => {}} />);
    const button = container.querySelector<HTMLElement>('.crewlet-stepper__target')!;
    expect(px(button, 'height')).toBe(20);
    expect(getComputedStyle(button).position).toBe('relative');
    const band = getComputedStyle(pseudoElement(button, 'after'));
    expect(band.position).toBe('absolute');
    // Sized to the floor and centred on the pill, not inset from inside its hairline.
    expect(band.height).toBe('24px');
    expect(band.top).toBe('50%');
    expect(band.translate).toBe('0 -50%');
  });

  test('carries no axe violation as a rail of buttons and as a row of them', async () => {
    const { container } = render(
      <main>
        <h1>Set up your brand</h1>
        <nav aria-label="Setup steps">
          <Stepper label="Setup steps" steps={SETUP} current="colours" orientation="vertical" onSelect={() => {}} />
        </nav>
        <Stepper label="Setup progress" steps={SETUP} current="colours" reached="voice" onSelect={() => {}} />
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

/** A colour as jsdom serialises a computed one: `rgba(r, g, b, a)` for a translucent value. */
function normalised(value: string): string {
  const probe = document.createElement('i');
  probe.style.backgroundColor = value;
  document.body.append(probe);
  const out = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return out;
}
