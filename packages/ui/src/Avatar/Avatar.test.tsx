/**
 * What the badge says, and what it deliberately does not.
 *
 * The initials rule is the one with the most call sites behind it: half the
 * names this draws are handles, so a split on whitespace alone turns a roster
 * of `backend-engineer`, `sre_lead` and `cs-lead` into a column of single
 * letters.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { AVATAR_SIZES, Avatar, avatarSquareCorner, avatarTint, getInitials } from './index.js';

afterEach(cleanup);

describe('getInitials', () => {
  test('splits on whitespace, hyphen, underscore and dot', () => {
    expect(getInitials('Carlos Diaz')).toBe('CD');
    expect(getInitials('backend-engineer')).toBe('BE');
    expect(getInitials('sre_lead')).toBe('SL');
    expect(getInitials('carlos.diaz')).toBe('CD');
    expect(getInitials('Acme')).toBe('A');
  });

  test('answers a question mark rather than nothing at all', () => {
    expect(getInitials()).toBe('?');
    expect(getInitials('   ')).toBe('?');
    expect(getInitials('_._')).toBe('?');
  });

  test('keeps an astral character whole', () => {
    // charAt would hand back half a surrogate pair, which renders as U+FFFD.
    expect(getInitials('𝒜cme team')).toBe('𝒜T');
  });
});

describe('Avatar', () => {
  test('is neutral by default: no identity hue is spent without being asked for', () => {
    render(<Avatar name="Carlos Diaz" />);
    const badge = screen.getByRole('img', { name: 'Carlos Diaz avatar' });
    expect(badge.className).toContain('crewlet-avatar--neutral');
    expect(badge.className).not.toContain('tint-');
  });

  test('a seeded badge is stable for one seed and spread across seeds', () => {
    const seeds = ['ceo', 'cto', 'swe', 'sre-lead', 'pm'];
    for (const seed of seeds) expect(avatarTint(seed)).toBe(avatarTint(seed));
    expect(new Set(seeds.map(avatarTint)).size).toBeGreaterThan(1);
    render(<Avatar name="Carlos Diaz" tone="seeded" colorSeed="ceo" />);
    expect(screen.getByRole('img').className).toContain(`crewlet-avatar--tint-${avatarTint('ceo')}`);
  });

  test('decorative is hidden, because the name is already printed beside it', () => {
    const { container } = render(
      <span>
        <Avatar name="Carlos Diaz" decorative />
        Carlos Diaz
      </span>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    const badge = container.querySelector('.crewlet-avatar')!;
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.getAttribute('aria-label')).toBeNull();
  });

  test('a human seat is drawn rather than tinted, photograph or not', () => {
    const { container } = render(
      <>
        <Avatar name="Ada Byron" variant="dashed" />
        <Avatar name="Ada Byron" variant="dashed" src="https://example.com/ada.png" />
      </>,
    );
    // Whether somebody has uploaded a photo says nothing about whether the
    // engine runs their seat, so the edge travels with the image too.
    const drawn = [...container.querySelectorAll('.crewlet-avatar')];
    expect(drawn).toHaveLength(2);
    for (const badge of drawn) expect(badge.className).toContain('crewlet-avatar--dashed');
  });

  test('the identity mark is a rounded square, and its corner moves with the box', () => {
    // One look: the engine's mark is a rounded square, so this is what a seat
    // chip, a list row and a header all draw unless a member list asks for the
    // round platform convention by name.
    const { container } = render(
      <>
        <Avatar name="Carlos Diaz" />
        <Avatar name="Carlos Diaz" shape="circle" />
      </>,
    );
    const [square, circle] = [...container.querySelectorAll<HTMLElement>('.crewlet-avatar')];
    expect(square?.className).toContain('crewlet-avatar--square');
    expect(circle?.className).toContain('crewlet-avatar--circle');

    // A single radius across four boxes reads as a pill at 20px and as a plain
    // box at 40px, so the two outer steps carry their own.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Avatar.css'), 'utf8');
    expect(css).toMatch(/\.crewlet-avatar--square\s*\{[^}]*--radius-md/);
    expect(css).toMatch(/\.crewlet-avatar--square\.crewlet-avatar--xs\s*\{[^}]*--radius-xs/);
    expect(css).toMatch(/\.crewlet-avatar--square\.crewlet-avatar--lg\s*\{[^}]*--radius-lg/);
  });

  test('the initials are set on the line every other word is, and still fit the box', () => {
    /*
     * THE BADGE IS A BOX THAT CENTRES ONE LINE, so a leading of its own bought
     * nothing a reader can see: the ink lands in the same place whichever step
     * it takes, and the step it takes now is the document's, read off the
     * document's own rule rather than named here.
     *
     * What DOES have to hold is that the line still fits: each step pairs its
     * box with a type step so two initials sit inside the badge, and a leading
     * that outgrew the square would push them out of it.
     */
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(resolve(here, 'Avatar.css'), 'utf8');
    const base = readFileSync(resolve(here, '../../../tokens/dist/css/base.css'), 'utf8');
    const tokens = readFileSync(resolve(here, '../../../tokens/dist/css/tokens.css'), 'utf8');
    const documentLeading = /(?:^|\})\s*body\s*\{[^}]*line-height:\s*var\((--[\w-]+)\)/.exec(base)?.[1];
    expect(documentLeading).toBeTruthy();
    const root = /\.crewlet-avatar\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(root).toContain(`line-height: var(${documentLeading ?? ''})`);

    const leading = Number(new RegExp(`${documentLeading ?? ''}:\\s*([\\d.]+)`).exec(tokens)?.[1] ?? '0');
    expect(leading).toBeGreaterThan(0);
    /** The type step a size rule names, in pixels. */
    const typeStep = (step: string) => {
      const rule = new RegExp(`\\.crewlet-avatar--${step}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      const named = /font-size:\s*var\((--[\w-]+)\)/.exec(rule)?.[1];
      if (named === undefined) throw new Error(`the ${step} step names no font size`);
      // Type is emitted in `rem` against the browser's own root, which neither
      // the tokens' baseline nor this package resets.
      const value = new RegExp(`${named}:\\s*(\\d*\\.?\\d+)rem`).exec(tokens)?.[1];
      if (value === undefined) throw new Error(`@crewlethq/tokens emits no ${named}`);
      return Number(value) * 16;
    };
    for (const [step, box] of Object.entries(AVATAR_SIZES)) {
      expect(typeStep(step) * leading).toBeLessThanOrEqual(box);
    }
  });

  test('a numeric box takes the corner of the step nearest it, so the ladder never doubles back', () => {
    // The regression this refuses: every arbitrary box took the middle step,
    // so `size={80}` drew an 8px corner where `size="lg"` at HALF its width
    // draws 12px, a bigger badge rendered squarer than a smaller one. The
    // steps' own corners are the fixed points the ladder has to pass through.
    const corners = ['var(--radius-xs)', 'var(--radius-md)', 'var(--radius-lg)'];
    const rank = (pixels: number) => corners.indexOf(avatarSquareCorner(pixels));

    // The four steps land on the corner their stylesheet rule gives them.
    expect(avatarSquareCorner(AVATAR_SIZES.xs)).toBe('var(--radius-xs)');
    expect(avatarSquareCorner(AVATAR_SIZES.sm)).toBe('var(--radius-md)');
    expect(avatarSquareCorner(AVATAR_SIZES.md)).toBe('var(--radius-md)');
    expect(avatarSquareCorner(AVATAR_SIZES.lg)).toBe('var(--radius-lg)');

    // And nothing between or beyond them goes backwards.
    for (let pixels = 12; pixels <= 200; pixels += 1) {
      expect(rank(pixels)).toBeGreaterThanOrEqual(rank(pixels - 1));
      expect(rank(pixels)).toBeGreaterThanOrEqual(0);
    }
    expect(rank(200)).toBeGreaterThanOrEqual(rank(AVATAR_SIZES.lg));
  });

  test('a numeric square carries that corner, and a numeric circle carries none', () => {
    const { container } = render(
      <>
        <Avatar name="Acme" size={80} />
        <Avatar name="Acme" size={80} shape="circle" />
      </>,
    );
    const [square, circle] = [...container.querySelectorAll<HTMLElement>('.crewlet-avatar')];
    expect(square?.style.borderRadius).toBe('var(--radius-lg)');
    // A circle is already round from its class; an inline corner there would
    // be a second answer to a question the stylesheet has settled.
    expect(circle?.style.borderRadius).toBe('');
  });

  test('a step takes its size from the scale, a number brings its own', () => {
    const { container } = render(
      <>
        <Avatar name="A" size="xs" />
        <Avatar name="B" size={64} />
      </>,
    );
    const [step, measured] = [...container.querySelectorAll<HTMLElement>('.crewlet-avatar')];
    expect(step?.className).toContain('crewlet-avatar--xs');
    expect(step?.style.width).toBe('');
    expect(measured?.style.width).toBe('64px');
    // 0.36 of the box, so two initials stay inside it.
    expect(measured?.style.fontSize).toBe('23px');
  });

  test('a broken image degrades to the initials rather than to a broken glyph', () => {
    render(<Avatar name="Carlos Diaz" src="https://example.com/gone.png" />);
    const image = screen.getByRole('img', { name: 'Carlos Diaz' });
    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Carlos Diaz avatar' }).textContent).toBe('CD');
  });

  test('a decorative image carries no alt text to read', () => {
    const { container } = render(<Avatar name="Carlos Diaz" src="https://example.com/c.png" decorative />);
    const image = container.querySelector('img')!;
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('aria-hidden')).toBe('true');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>People</h1>
        <Avatar name="Carlos Diaz" />
        <Avatar name="Ada Byron" variant="dashed" tone="brand" />
        <p>
          <Avatar name="Carlos Diaz" decorative /> Carlos Diaz
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
