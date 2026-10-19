/**
 * The two things a callout must get right: it never announces itself unless
 * asked, and it never renders without the glyph that survives a hue collapse.
 *
 * The first is the probe from the 0.2.0 audit, inverted. Every static banner
 * in the package carried `role="status"`, so a screen reader arriving at a
 * screen read out each of them in turn and one that had been up for an hour
 * was announced as news.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { Button } from '../Button/index.js';
import { Callout } from './index.js';

afterEach(cleanup);

/** The stylesheet, read where a claim about the drawing has to be checked. */
const calloutCss = () => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Callout.css'), 'utf8');

const TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

describe('Callout', () => {
  test('has no role and no live region until one is asked for', () => {
    const { container } = render(<Callout>The engine is not reachable.</Callout>);
    const callout = container.querySelector('.crewlet-callout')!;
    expect(callout.getAttribute('role')).toBeNull();
    expect(callout.getAttribute('aria-live')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('announces itself when it is asked to, either way', () => {
    render(
      <>
        <Callout live="polite">Saved.</Callout>
        <Callout variant="danger" role="alert">
          The write was refused.
        </Callout>
      </>,
    );
    expect(screen.getByText('Saved.').closest('.crewlet-callout')?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  test('every tone draws a glyph, because the hue alone is not the carrier', () => {
    const { container } = render(
      <>
        {TONES.map((variant) => (
          <Callout key={variant} variant={variant}>
            {variant}
          </Callout>
        ))}
      </>,
    );
    const callouts = [...container.querySelectorAll('.crewlet-callout')];
    expect(callouts).toHaveLength(TONES.length);
    for (const callout of callouts) {
      const glyph = callout.querySelector('.crewlet-callout__icon svg');
      expect(glyph).toBeTruthy();
    }
  });

  test('a caller can replace the glyph but not remove it', () => {
    const { container } = render(
      <Callout variant="warning" icon={<svg data-mine="true" />}>
        Mine
      </Callout>,
    );
    expect(container.querySelector('.crewlet-callout__icon svg')?.getAttribute('data-mine')).toBe('true');
  });

  test('the glyph is not read: the sentence already says which state this is', () => {
    const { container } = render(<Callout variant="danger">The write was refused.</Callout>);
    expect(container.querySelector('.crewlet-callout__icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('the banner layout is full bleed with only a bottom border', () => {
    const { container } = render(<Callout layout="banner">Reconnecting.</Callout>);
    expect(container.querySelector('.crewlet-callout')?.className).toContain('crewlet-callout--banner');
    // And the class does something. A shell puts a banner against both edges,
    // where a rounded card leaves a gutter of page colour down each side and
    // reads as content rather than as chrome; the class alone is a claim.
    const rule = /\.crewlet-callout--banner\s*\{([^}]*)\}/.exec(calloutCss())?.[1] ?? '';
    expect(rule).toMatch(/border-radius:\s*var\(--radius-none\)/);
    expect(rule).toMatch(/border-width:\s*0 0 1px/);
  });

  test('the tint is the boundary, so no tone draws a rule in its own hue', () => {
    // The engine's banner is a block of the tone's soft step with nothing
    // around it. A 1px line in the same hue as the fill behind it adds a
    // second edge a reader reads as a card, and this component is a sentence
    // the screen is saying rather than a card the screen contains. The pixel
    // is still spent, so a consumer that puts the line back moves no box.
    const css = calloutCss().replace(/\/\*[\s\S]*?\*\//g, ' ');
    const lines = [...css.matchAll(/--crewlet-callout-line:\s*([^;]+);/g)].map((match) => match[1]?.trim());
    expect(lines).toEqual(['transparent']);
    expect(css).toMatch(/border:\s*1px solid var\(--crewlet-callout-line\)/);
    // The banner layout is the exception, and it names its own step: full
    // bleed, there is no tint boundary at the sides for the eye to stop on.
    const banner = /\.crewlet-callout--banner\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(banner).toMatch(/border-bottom-color:\s*var\(--color-border-default\)/);
  });

  test('draws its title on a line of its own above the message', () => {
    // Run on the same line, a title and the body's first sentence read as one
    // run-on sentence: "You were signed out Your session ended".
    const css = calloutCss().replace(/\/\*[\s\S]*?\*\//g, ' ');
    const title = /\.crewlet-callout__title\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(title).toMatch(/display:\s*block/);
    expect(title).not.toMatch(/margin-right/);
    render(<Callout title="You were signed out">Your session ended.</Callout>);
    const heading = screen.getByText('You were signed out');
    expect(heading.className).toBe('crewlet-callout__title');
    expect(heading.parentElement?.className).toBe('crewlet-callout__content');
  });

  test('the action sits outside the sentence, so it is reachable and not read as part of it', () => {
    render(
      <Callout variant="danger" title="Disconnected" action={<Button size="small">Reconnect</Button>}>
        The socket closed.
      </Callout>,
    );
    const action = screen.getByRole('button', { name: 'Reconnect' });
    expect(action.closest('.crewlet-callout__content')).toBeNull();
  });

  test('a narrow callout puts its action under the text, in the text\'s column, and a wide one beside it', () => {
    // Beside the text, a phone's width left the message a column of a word or
    // two a line. Measured by its own width, a callout with an action moves it
    // to a row of its own under the text once it is narrower than 28rem.
    const css = calloutCss().replace(/\/\*[\s\S]*?\*\//g, ' ');
    const callout = /\.crewlet-callout\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(callout).toMatch(/display:\s*grid/);
    expect(callout).toMatch(/grid-template-columns:\s*auto minmax\(0, 1fr\)/);
    const withAction = /\.crewlet-callout:has\(> \.crewlet-callout__action\)\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(withAction).toMatch(/container:\s*crewlet-callout\s*\/\s*inline-size/);
    const wide = /\n\.crewlet-callout__action\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(wide).toMatch(/grid-column:\s*3/);
    const narrow = /@container crewlet-callout \(width < 28rem\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const action = /\.crewlet-callout__action\s*\{([^}]*)\}/.exec(narrow)?.[1] ?? '';
    expect(action).toMatch(/grid-column:\s*2/);
    expect(action).toMatch(/grid-row:\s*2/);
    expect(action).toMatch(/justify-self:\s*start/);
    // Under the text there is no button for one line to centre on.
    expect(narrow).toMatch(/--crewlet-callout-lead:\s*0px/);
    // A callout with no action is no container: its width is never its own to measure.
    const { container } = render(<Callout>Saved.</Callout>);
    expect(container.querySelector('.crewlet-callout__action')).toBeNull();
  });

  test('every ink comes from a declared step rather than from a mix nobody measured', () => {
    // `color-mix(in srgb, <fill> 55%, var(--color-text-primary))` is what this
    // replaced, at every one of the four tones. It makes a colour nothing
    // measures: the light warning it produced reached 4.41:1 on its own tint.
    const css = calloutCss()
      // Comments out: this file's own header says what color-mix cost.
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(css).not.toContain('color-mix(');
    const inks = [...css.matchAll(/--crewlet-callout-ink:\s*([^;]+);/g)].map((match) => match[1]?.trim());
    expect(inks.length).toBeGreaterThan(4);
    for (const ink of inks) expect(ink).toMatch(/^var\(--color-(text-secondary|[\w-]+-ink)\)$/);
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Seats</h1>
        {TONES.map((variant) => (
          <Callout key={variant} variant={variant} title="Heads up">
            {variant}
          </Callout>
        ))}
        <Callout variant="danger" role="alert" action={<Button size="small">Reconnect</Button>}>
          The socket closed.
        </Callout>
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
