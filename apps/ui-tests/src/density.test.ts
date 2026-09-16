/**
 * The density helper's own suite. Every size guard written with it rests on
 * these three claims, so they are checked here rather than assumed: that the
 * density reaches a scaled step, that a token derived from another token
 * arrives as a number, and that a name the package does not emit drops its
 * declaration instead of poisoning the sheet.
 */
import { afterEach, expect, test } from 'vitest';
import { atDensity, installSheetsAtDensity } from './density.js';

let remove: (() => void) | null = null;
afterEach(() => {
  remove?.();
  remove = null;
  document.body.innerHTML = '';
});

test('a scaled step follows the density, and a floor holds under it', () => {
  remove = installSheetsAtDensity(0.82, 'Tabs/Tabs.css');
  document.body.innerHTML = '<div class="crewlet-tabs crewlet-tabs--pill"><button class="crewlet-tabs__tab"></button></div>';
  const chip = document.querySelector('.crewlet-tabs__tab')!;
  // --spacing-3 is calc(12px * density), and the pill chip spends it on both
  // sides; --size-control-md is calc(32px * density) and the chip's height is
  // six under it, clamped against the 24px target floor, which is what holds
  // at this setting.
  expect(getComputedStyle(chip).paddingLeft).toBe('9.84px');
  expect(getComputedStyle(chip).minHeight).toBe('24px');
});

test('a token derived from another token arrives as a number', () => {
  // --radius-chip is calc(var(--radius-md) - 1px) in the built stylesheet and
  // calc({radius.md} - 1px) in the JSON source. Substituted from the JSON it
  // is a brace inside a declaration, which throws in jsdom's parser and takes
  // the whole sheet with it.
  expect(atDensity('a { border-radius: var(--radius-chip); }', 1)).toContain('8px');
  expect(atDensity('a { border-radius: var(--radius-chip); }', 1)).not.toContain('{radius');
});

test('a name the package does not emit takes its own declaration down, and no more', () => {
  remove = installSheetsAtDensity(1, 'Tabs/Tabs.css');
  document.body.innerHTML = '<div class="crewlet-tabs crewlet-tabs--pill"></div>';
  const row = document.querySelector('.crewlet-tabs')!;
  // The pill's inset is a custom property the component declares itself, so
  // the gap and the padding written from it are dropped; the radius beside
  // them, which is a token, is not.
  expect(getComputedStyle(row).borderRadius).toContain('8px');
  expect(atDensity('a { color: var(--color-nothing-here); }', 1)).toContain('var(--color-nothing-here)');
});
