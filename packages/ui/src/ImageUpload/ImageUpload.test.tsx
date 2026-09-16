/**
 * The upload control: what it hands back, and the two things about it that
 * were wrong for a reader rather than for a caller.
 *
 * Its remove button was a 20px target, which fails WCAG 2.2 and is also the
 * only way to take a logo off; and its spinner turned whatever the reader's
 * system asked for.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { contrast, flatten, paletteStates, parseHex } from '@crewlethq/tokens/test/palette';
import { avatarSquareCorner } from '../Avatar/index.js';
import { ImageUpload } from './index.js';

afterEach(cleanup);

const css = () => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ImageUpload.css'), 'utf8');

describe('ImageUpload', () => {
  test('the trigger says which of upload and change it is', () => {
    const { rerender } = render(<ImageUpload name="Acme" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Upload image' })).toBeTruthy();
    rerender(<ImageUpload name="Acme" src="https://example.com/a.png" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Change image' })).toBeTruthy();
  });

  test('an upload in flight is announced as busy and takes no press', () => {
    const onSelect = vi.fn();
    render(<ImageUpload name="Acme" uploading onSelect={onSelect} />);
    const trigger = screen.getByRole('button', { name: 'Uploading image' });
    expect(trigger.getAttribute('aria-busy')).toBe('true');
    expect(trigger.hasAttribute('disabled')).toBe(true);
  });

  test('the remove control only exists where there is something to remove', () => {
    const onRemove = vi.fn();
    const { rerender } = render(<ImageUpload name="Acme" onSelect={() => {}} onRemove={onRemove} />);
    expect(screen.queryByRole('button', { name: 'Remove image' })).toBeNull();

    rerender(<ImageUpload name="Acme" src="https://example.com/a.png" onSelect={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('the remove target clears the 24px floor', () => {
    // 20px is under what WCAG 2.2 accepts, on the only control that takes a
    // logo off.
    const rule = /\.crewlet-image-upload__remove\s*\{([^}]*)\}/.exec(css())?.[1] ?? '';
    expect(rule).toMatch(/width:\s*24px/);
    expect(rule).toMatch(/height:\s*24px/);
  });

  test('the spinner stops under reduced motion', () => {
    const at = css().indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThan(-1);
    expect(css().slice(at)).toContain('crewlet-image-upload__spinner');
  });

  test('the overlay that IS the affordance is drawn at full strength', () => {
    // `opacity` fades the element, so a faded overlay fades the scrim AND the
    // word on it together. At 0.85 the composite measured 3.47:1 on a light
    // page; at full strength the same label on the same scrim measures 5.74:1.
    // What the fade bought was a hover that still answered, and there is
    // nothing for a hover to answer when the affordance is already up.
    const rule = /\.crewlet-image-upload\.is-uploading .crewlet-image-upload__overlay,\s*\.crewlet-image-upload\.is-empty .crewlet-image-upload__overlay\s*\{([^}]*)\}/.exec(
      css(),
    );
    expect(rule?.[1]).toContain('opacity: 1');
  });

  test('the trigger rounds exactly as the badge inside it does, at any size', () => {
    // Avatar moves a square badge's corner with its box, so a trigger pinned
    // to one radius step is rounder or squarer than the badge under it at
    // every size but the one the step was chosen for, and the badge's corners
    // show through the overlay. Both read the same ladder.
    for (const size of [20, 64, 120]) {
      const { container, unmount } = render(<ImageUpload name="Acme" size={size} onSelect={() => {}} />);
      const wrapper = container.querySelector<HTMLElement>('.crewlet-image-upload')!;
      const badge = container.querySelector<HTMLElement>('.crewlet-avatar')!;
      // Spelled without its leading dashes and prefixed at use: the package's
      // variable check reads a quoted `--name` in a .tsx file as a declaration.
      const corner = wrapper.style.getPropertyValue(`--${'crewlet-image-upload-corner'}`);
      expect(corner).toBe(avatarSquareCorner(size));
      expect(badge.style.borderRadius).toBe(corner);
      unmount();
    }
    // And the stylesheet reads it rather than naming a step of its own.
    const rule =
      /\.crewlet-image-upload--square \.crewlet-image-upload__trigger,\s*\.crewlet-image-upload--square \.crewlet-image-upload__overlay\s*\{([^}]*)\}/.exec(
        css(),
      )?.[1] ?? '';
    expect(rule).toContain('border-radius: var(--crewlet-image-upload-corner)');
  });

  test('its label clears 4.5:1 on the scrim, over every ground the picture can be', () => {
    // The scrim lands on whatever the badge under it is: the page, a card, the
    // accent fill of a brand badge, or any of the ten seeded identity tints.
    const here = dirname(fileURLToPath(import.meta.url));
    const tokensCss = resolve(here, '../../../tokens/dist/css');
    const states = paletteStates({
      tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
      themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
    });
    // Spelled without the leading dashes and prefixed at use: the package's
    // variable check reads a quoted `--name` in a .tsx file as a declaration.
    const token = (name: string) => `--${name}`;
    const grounds = [
      'surface-background',
      'surface-subtle',
      'surface-elevated',
      'brand-accent',
      ...Array.from({ length: 10 }, (_, index) => `avatar-tint-${index}`),
    ].map((name) => token(`color-${name}`));

    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      const label = parseHex(values.get(token('color-text-on-accent')) ?? '') ?? page;
      for (const ground of grounds) {
        const raw = values.get(ground);
        if (raw === undefined) throw new Error(`the suite reads ${ground}, which @crewlethq/tokens does not emit`);
        const scrim = flatten(values.get(token('color-surface-scrim')) ?? '', parseHex(raw) ?? flatten(raw, page));
        const ratio = contrast(label, scrim);
        if (ratio < 4.5) failures.push(`${state}: the overlay label over ${ground}: ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  test('the file input is the mechanism, not a second unnamed control', () => {
    const { container } = render(<ImageUpload name="Acme" onSelect={() => {}} />);
    const input = container.querySelector('input[type="file"]')!;
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.getAttribute('tabindex')).toBe('-1');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Company</h1>
        <ImageUpload name="Acme" shape="square" onSelect={() => {}} />
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
