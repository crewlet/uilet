/**
 * A brand scope sets the brand mapping's inputs on its outer element, each
 * only once it has passed its gate, and hands its box every attribute it is
 * given. The mapping it applies is the token package's css/brand-scope, held
 * to the artifact kit's own layer by the token and kit suites; here it is
 * held to being the one stylesheet the component brings.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { BrandScope, brandScopeInputs, type BrandColors } from './index.js';

afterEach(cleanup);

const BRAND: BrandColors = {
  primary: '#0A7F5A',
  primary_on_dark: '#3fd69a',
  secondary: '#f2a33a',
  text: '#1d2b24',
  light_ground: '#f7f4ec',
  dark_ground: '#0b1410',
};

const here = dirname(fileURLToPath(import.meta.url));

test('sets every colour input from its role, lowercased', () => {
  expect(brandScopeInputs(BRAND)).toEqual({
    '--brand-primary': '#0a7f5a',
    '--brand-primary-on-dark': '#3fd69a',
    '--brand-secondary': '#f2a33a',
    '--brand-text': '#1d2b24',
    '--brand-light-ground': '#f7f4ec',
    '--brand-dark-ground': '#0b1410',
  });
});

test('sets nothing for a role left out or given as anything but #rrggbb', () => {
  expect(brandScopeInputs({})).toEqual({});
  expect(
    brandScopeInputs({ primary: 'red', secondary: '#fff', text: 'url(https://example.com/x)', light_ground: '#f7f4ec; color: red' }),
  ).toEqual({});
});

test('sets a family list that reads as names, ending in the page face, and refuses anything else', () => {
  expect(brandScopeInputs({}, '"Acme Display", serif', 'Inter')).toEqual({
    '--brand-font-heading': '"Acme Display", serif, var(--font-family-display)',
    '--brand-font-body': 'Inter, var(--font-family-sans)',
  });
  expect(brandScopeInputs({}, 'x; color: red', 'url(evil.woff2)')).toEqual({});
});

test('draws one box inside an outer element that carries the inputs, and hands the box its attributes', () => {
  render(
    <BrandScope colors={BRAND} className="doc" aria-label="Launch plan" role="region" data-testid="box">
      <p>Body</p>
    </BrandScope>,
  );
  const box = screen.getByRole('region', { name: 'Launch plan' });
  expect(box.classList.contains('crewlet-brand-scope__layer')).toBe(true);
  expect(box.classList.contains('doc')).toBe(true);
  expect(box.textContent).toBe('Body');
  const outer = box.parentElement as HTMLElement;
  expect(outer.classList.contains('crewlet-brand-scope')).toBe(true);
  expect(outer.style.getPropertyValue('--brand-primary')).toBe('#0a7f5a');
  expect(outer.style.getPropertyValue('--brand-dark-ground')).toBe('#0b1410');
  expect(box.getAttribute('style')).toBeNull();
});

test('follows the page unless its mode is pinned', () => {
  const { container, rerender } = render(<BrandScope colors={BRAND}>Body</BrandScope>);
  const outer = () => container.querySelector('.crewlet-brand-scope') as HTMLElement;
  expect(outer().hasAttribute('data-mode')).toBe(false);
  rerender(
    <BrandScope colors={BRAND} mode="light">
      Body
    </BrandScope>,
  );
  expect(outer().getAttribute('data-mode')).toBe('light');
});

test("brings the token package's scope stylesheet, and its own sheet declares no part of the mapping", () => {
  const entry = readFileSync(join(here, 'index.ts'), 'utf8');
  expect(entry).toMatch(/import '@crewlethq\/tokens\/css\/brand-scope';/);
  const own = readFileSync(join(here, 'BrandScope.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // The mapping is the token package's alone: no custom property and no
  // colour mixing here, or the scope would have two sources.
  expect(own).not.toMatch(/--[\w-]+\s*:/);
  expect(own).not.toMatch(/color-mix/);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Brand</h1>
      <BrandScope colors={BRAND} headingFamily="Georgia, serif">
        <h2>Quarterly review</h2>
        <p>
          Every team finished on plan. <a href="#/breakdown">See the breakdown</a>
        </p>
      </BrandScope>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
