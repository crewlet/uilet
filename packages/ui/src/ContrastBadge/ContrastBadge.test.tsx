/**
 * A contrast badge measures with the tokens package's own maths and floors,
 * never rounds a pair up past a floor it misses, says its level in words and
 * its ratio as "to 1", and puts nothing that is not a colour into a style.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { WCAG_CONTRAST, contrast, parseHex } from '@crewlethq/tokens';
import { afterEach, expect, test } from 'vitest';
import { ContrastBadge, contrastLevel, contrastRatio, formatContrastRatio } from './index.js';

afterEach(cleanup);

test('measures exactly as the tokens package does', () => {
  const ratio = contrastRatio('#5b3df5', '#ffffff');
  expect(ratio).toBe(contrast(parseHex('#5b3df5')!, parseHex('#ffffff')!));
  expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  expect(contrastRatio('#fff', '#000000')).toBeNull();
  expect(contrastRatio('#000000', 'white')).toBeNull();
});

test('places a ratio on the floors the tokens package exports, unrounded', () => {
  expect(contrastLevel(WCAG_CONTRAST.aaa)).toBe('aaa');
  expect(contrastLevel(WCAG_CONTRAST.aa)).toBe('aa');
  expect(contrastLevel(WCAG_CONTRAST.aa - 0.001)).toBe('aa-large');
  expect(contrastLevel(WCAG_CONTRAST.aaLarge - 0.001)).toBe('fail');
  expect(contrastLevel(WCAG_CONTRAST.aaaLarge, 'large')).toBe('aaa');
  expect(contrastLevel(WCAG_CONTRAST.aaLarge, 'large')).toBe('aa');
  expect(contrastLevel(WCAG_CONTRAST.aaLarge - 0.001, 'large')).toBe('fail');
});

test('prints a ratio cut down, so it never claims a floor the pair misses', () => {
  expect(formatContrastRatio(4.4999)).toBe('4.49');
  expect(formatContrastRatio(21)).toBe('21');
  expect(formatContrastRatio(7.2)).toBe('7.2');
});

test('says the pair, the ratio in words and the level in words', () => {
  render(<ContrastBadge foreground="#121625" background="#f6f7fb" label="Text on light ground" />);
  const badge = document.querySelector('.crewlet-contrast-badge')!;
  expect(badge.textContent).toContain('Text on light ground');
  expect(screen.getByText(/to 1$/).textContent).toMatch(/^\d+(\.\d+)? to 1$/);
  expect(badge.textContent).toContain('AAA');
  expect(badge.classList.contains('crewlet-contrast-badge--aaa')).toBe(true);
});

test('a pair under every floor says it fails, in a word and a glyph rather than a tint alone', () => {
  render(<ContrastBadge foreground="#777777" background="#888888" />);
  const badge = document.querySelector('.crewlet-contrast-badge')!;
  expect(badge.textContent).toContain('Fails');
  expect(badge.querySelector('.crewlet-tag svg')).not.toBeNull();
});

test('large text and marks are held to their own floors', () => {
  // #767676 on white is 4.54:1: AA for body text, AAA for large.
  const { rerender } = render(<ContrastBadge foreground="#767676" background="#ffffff" />);
  expect(document.querySelector('.crewlet-contrast-badge')?.textContent).toContain('AA');
  expect(document.querySelector('.crewlet-contrast-badge--aa')).not.toBeNull();
  rerender(<ContrastBadge foreground="#767676" background="#ffffff" scale="large" />);
  expect(document.querySelector('.crewlet-contrast-badge--aaa')).not.toBeNull();
});

test('an advisory pair under its AA floor reads "Low" in the warning tone, never "Fails"', () => {
  // #00baba on #f6f7fb is 2.33:1: under every floor for body text.
  const { rerender } = render(<ContrastBadge foreground="#00baba" background="#f6f7fb" advisory />);
  const badge = () => document.querySelector('.crewlet-contrast-badge')!;
  expect(badge().classList.contains('crewlet-contrast-badge--low')).toBe(true);
  expect(badge().textContent).toContain('Low');
  expect(badge().textContent).not.toContain('Fails');
  expect(badge().querySelector('.crewlet-tag')!.className).toContain('warning');
  expect(badge().querySelector('.crewlet-tag svg')).not.toBeNull();
  // Between 3:1 and 4.5:1 body text is under its floor too: "Low", not "AA large text".
  rerender(<ContrastBadge foreground="#00a0a0" background="#f6f7fb" advisory />);
  expect(badge().classList.contains('crewlet-contrast-badge--low')).toBe(true);
  // As a mark, 3:1 is the floor, so the same pair passes.
  rerender(<ContrastBadge foreground="#00a0a0" background="#f6f7fb" advisory scale="large" />);
  expect(badge().classList.contains('crewlet-contrast-badge--aa')).toBe(true);
  // A pair that clears its floor reads its level whether advisory or not.
  rerender(<ContrastBadge foreground="#007f7f" background="#f6f7fb" advisory />);
  expect(badge().classList.contains('crewlet-contrast-badge--aa')).toBe(true);
  // Without it, the same low pair blocks: "Fails" in the danger tone.
  rerender(<ContrastBadge foreground="#00baba" background="#f6f7fb" />);
  expect(badge().classList.contains('crewlet-contrast-badge--fail')).toBe(true);
  expect(badge().querySelector('.crewlet-tag')!.className).toContain('danger');
});

test('the advisory word is the caller’s, and one level word can be replaced alone', () => {
  render(<ContrastBadge foreground="#00baba" background="#f6f7fb" advisory labels={{ levels: { low: 'Low contrast, allowed' } }} />);
  expect(document.querySelector('.crewlet-contrast-badge')!.textContent).toContain('Low contrast, allowed');
});

test('a pair that cannot be measured says so and puts nothing into a style', () => {
  render(<ContrastBadge foreground="red; background: url(x)" background="#ffffff" />);
  expect(screen.getByText('Not measured')).toBeDefined();
  const sample = document.querySelector<HTMLElement>('.crewlet-contrast-badge__sample')!;
  expect(sample.getAttribute('style')).toBeNull();
});

test('draws a measured pair through its two custom properties, lowercased', () => {
  render(<ContrastBadge foreground="#FFFFFF" background="#5B3DF5" />);
  const sample = document.querySelector<HTMLElement>('.crewlet-contrast-badge__sample')!;
  expect(sample.style.getPropertyValue('--crewlet-contrast-badge-ink')).toBe('#ffffff');
  expect(sample.style.getPropertyValue('--crewlet-contrast-badge-ground')).toBe('#5b3df5');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Colours</h1>
      <ContrastBadge foreground="#121625" background="#f6f7fb" label="Text on light ground" />
      <ContrastBadge foreground="#777777" background="#888888" label="Primary on light ground" scale="large" />
      <ContrastBadge foreground="" background="#ffffff" label="Text on dark ground" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
