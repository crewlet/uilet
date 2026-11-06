/**
 * What a placeholder is, and what it must not claim to be.
 *
 * The `aria-busy` rule is the one worth a test: the engine's own skeleton put
 * it on the placeholder, which says the PLACEHOLDER is loading. The thing a
 * reader is waiting on is the panel whose content has not arrived, and that is
 * the caller's element.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { Skeleton } from './index.js';

afterEach(cleanup);

describe('Skeleton', () => {
  test('the drawing is decoration and is not read', () => {
    const { container } = render(<Skeleton variant="text" rows={3} />);
    const root = container.querySelector('.crewlet-skeleton')!;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    // And it does not claim to be the busy region: that belongs to whatever
    // is loading.
    expect(root.getAttribute('aria-busy')).toBeNull();
  });

  test('the text variant draws the rows it is asked for, at the height it is given', () => {
    const { container } = render(<Skeleton variant="text" rows={4} rowHeight={20} />);
    const lines = [...container.querySelectorAll<HTMLElement>('.crewlet-skeleton__line')];
    expect(lines).toHaveLength(4);
    for (const line of lines) expect(line.style.height).toBe('20px');
  });

  test('a label is said once, politely, for a reader who cannot see the shape', () => {
    render(<Skeleton variant="list" rows={3} label="Loading seats" />);
    expect(screen.getByRole('status').textContent).toBe('Loading seats');
  });

  test('without a label it says nothing at all', () => {
    render(<Skeleton variant="list" rows={3} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('every animation has a reduced-motion rule', () => {
    // The sweep is decoration on an element that is already hidden, so a
    // reader who asked for less motion loses nothing by it stopping, and gains
    // not having three dozen placeholders travelling.
    //
    // The selectors are READ OUT of the stylesheet rather than listed here. A
    // list goes stale in both directions: a block that stops animating leaves
    // a name nothing paints, and a block that starts is caught by nobody.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Skeleton.css'), 'utf8');
    const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThan(-1);
    const [moving, reduced] = [css.slice(0, at), css.slice(at)];
    expect(reduced).toContain('animation: none');

    const animated = new Set<string>();
    for (const match of moving.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/(^|;|\s)animation:/.test(match[2] ?? '')) continue;
      for (const selector of (match[1] ?? '').split(',')) {
        const name = /\.crewlet-skeleton(__[\w-]+)/.exec(selector.trim());
        if (name) animated.add(name[1] ?? '');
      }
    }
    expect(animated.size).toBeGreaterThan(3);
    for (const name of animated) expect(reduced).toContain(name);
  });

  test('every block loads the same way: one sweep, not a sweep beside a fade', () => {
    // A block that fades in place beside one that travels reads as two things
    // loading in two different ways. The engine draws one skeleton and it is a
    // band of light crossing the row, which is also the honest shape: it moves
    // the way the text will arrive.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Skeleton.css'), 'utf8');
    const names = new Set([...css.matchAll(/animation:\s*(crewlet-[\w-]+)/g)].map((match) => match[1]));
    expect([...names].sort()).toEqual(['crewlet-skeleton-sweep', 'crewlet-skeleton-wave']);
    // And at one rhythm, so a page of placeholders does not beat against
    // itself.
    const periods = new Set(
      [...css.matchAll(/animation:\s*crewlet-[\w-]+\s+(calc\(var\([^)]*\)[^)]*\))/g)].map((match) => match[1]),
    );
    expect([...periods]).toEqual(['calc(var(--motion-duration-slow) * 5)']);
  });

  test('no animation moves a layout property', () => {
    // A keyframe on left laid the box out on every frame and recorded a layout
    // shift each time, for as long as anything was loading.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Skeleton.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const frames = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)];
    expect(frames.length).toBeGreaterThan(0);
    for (const [, name, body] of frames) {
      const properties = [...body!.matchAll(/([\w-]+)\s*:/g)].map((match) => match[1]);
      for (const property of properties)
        expect(property, name).not.toMatch(/^(left|right|top|bottom|inset.*|width|height|margin.*|padding.*)$/);
    }
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Seats</h1>
        <section aria-busy="true">
          <Skeleton variant="list" rows={3} label="Loading seats" />
        </section>
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

describe('a skeleton sized for its value', () => {
  // Size was honoured by the box alone, so a card placeholder sized for one
  // line stood a card's height and the layout jumped when the value landed;
  // and a box stood 32px under whatever was above it unless told otherwise.
  test('every shape is cut to the size it is given', () => {
    const { container } = render(<Skeleton variant="card" width={120} height={16} />);
    const root = container.querySelector<HTMLElement>('.crewlet-skeleton')!;
    expect(root.style.width).toBe('120px');
    expect(root.style.height).toBe('16px');
    expect(root.style.overflow).toBe('hidden');
  });

  test('an unsized shape keeps its own size, and a box stands flush', () => {
    const { container } = render(
      <>
        <Skeleton variant="text" rows={2} />
        <Skeleton variant="box" height={24} />
      </>,
    );
    const [text, box] = [...container.querySelectorAll<HTMLElement>('.crewlet-skeleton')];
    expect(text!.style.height).toBe('');
    expect(box!.style.marginTop).toBe('0px');
    expect(box!.querySelector<HTMLElement>('.crewlet-skeleton__glow-box')!.style.height).toBe('24px');
  });
});
