/**
 * A brand sample is a named picture that paints only its own box: each brand
 * colour reaches a style only once it reads as `#rrggbb`, each family list
 * only once it reads as family names, and every role it lacks takes the
 * product's value for the sample's own mode, never the page's.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { themes } from '@crewlethq/tokens';
import { afterEach, expect, test } from 'vitest';
import { BrandSample, type BrandSampleColors } from './index.js';

afterEach(cleanup);

const BRAND: BrandSampleColors = {
  primary: '#5B3DF5',
  primary_on_dark: '#9d8bff',
  secondary: '#0e9f8a',
  text: '#16131f',
  light_ground: '#fbfaff',
  dark_ground: '#120a2b',
};

function root(): HTMLElement {
  return screen.getByRole('img');
}

function painted(name: string): string {
  return root().style.getPropertyValue(`--crewlet-brand-sample-${name}`);
}

test('is a picture named by what it shows, with its words and its link drawn rather than read or followed', () => {
  render(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} />);
  expect(screen.getByRole('img', { name: 'A doc in the Acme brand, light mode' })).toBeDefined();
  expect(root().textContent).toContain('Quarterly review');
  expect(root().textContent).toContain('See the breakdown');
  expect(root().querySelector('a, button, input, [tabindex]')).toBeNull();
});

test('in light mode draws the brand text on the brand light ground with the primary accent, lowercased', () => {
  render(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} />);
  expect(painted('ground')).toBe('#fbfaff');
  expect(painted('text')).toBe('#16131f');
  expect(painted('accent')).toBe('#5b3df5');
  expect(painted('secondary')).toBe('#0e9f8a');
  expect(painted('muted')).toBe(themes.light.color.text.tertiary);
});

test("in dark mode draws the product's dark text on the brand dark ground with the primary for dark grounds", () => {
  render(<BrandSample kind="slide" mode="dark" name="Acme" colors={BRAND} />);
  expect(painted('ground')).toBe('#120a2b');
  expect(painted('text')).toBe(themes.dark.color.text.primary);
  expect(painted('accent')).toBe('#9d8bff');
  expect(painted('muted')).toBe(themes.dark.color.text.tertiary);
});

test('the primary stands in for a dark ground when the brand has no colour of its own for one', () => {
  render(<BrandSample kind="slide" mode="dark" name="Acme" colors={{ primary: '#5b3df5' }} />);
  expect(painted('accent')).toBe('#5b3df5');
});

test("every role the brand lacks takes the product's value for the sample's mode", () => {
  const { rerender } = render(<BrandSample kind="doc" mode="light" name="Acme" colors={{}} />);
  expect(painted('ground')).toBe(themes.light.color.surface.background);
  expect(painted('text')).toBe(themes.light.color.text.primary);
  expect(painted('accent')).toBe(themes.light.color.brand.accent);
  expect(painted('secondary')).toBe(themes.light.color.brand.accent);
  rerender(<BrandSample kind="doc" mode="dark" name="Acme" colors={{}} />);
  expect(painted('ground')).toBe(themes.dark.color.surface.background);
  expect(painted('accent')).toBe(themes.dark.color.brand.accent);
});

test('a colour that is not #rrggbb never reaches a style', () => {
  render(
    <BrandSample
      kind="doc"
      mode="light"
      name="Acme"
      colors={{ primary: 'red; background: url(https://example.com/x)', light_ground: '#fff', text: ['var(', '--', 'evil)'].join('') }}
    />,
  );
  const style = root().getAttribute('style') ?? '';
  expect(style).not.toMatch(/url|red|evil|#fff[^0-9a-f]/);
  expect(painted('accent')).toBe(themes.light.color.brand.accent);
  expect(painted('ground')).toBe(themes.light.color.surface.background);
});

test('a family list that reads as names is drawn before the package face; anything else is the package face', () => {
  const { rerender } = render(
    <BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} headingFamily="'Acme Display', Georgia" bodyFamily="Inter" />,
  );
  expect(painted('heading-family')).toBe("'Acme Display', Georgia, var(--font-family-display)");
  expect(painted('body-family')).toBe('Inter, var(--font-family-sans)');
  rerender(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} headingFamily="x; color: red" bodyFamily="url(evil.woff2)" />);
  expect(painted('heading-family')).toBe('var(--font-family-display)');
  expect(painted('body-family')).toBe('var(--font-family-sans)');
});

test("the doc carries the mode's logo, or the company's name where there is none", () => {
  const { container, rerender } = render(
    <BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} logo="blob:light" logoOnDark="blob:dark" />,
  );
  const logo = () => container.querySelector('img');
  expect(logo()?.getAttribute('src')).toBe('blob:light');
  expect(logo()?.getAttribute('alt')).toBe('');
  rerender(<BrandSample kind="doc" mode="dark" name="Acme" colors={BRAND} logo="blob:light" logoOnDark="blob:dark" />);
  expect(logo()?.getAttribute('src')).toBe('blob:dark');
  rerender(<BrandSample kind="doc" mode="dark" name="Acme" colors={BRAND} logo="blob:light" />);
  expect(logo()?.getAttribute('src')).toBe('blob:light');
  rerender(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} />);
  expect(logo()).toBeNull();
  expect(container.querySelector('.crewlet-brand-sample__wordmark')?.textContent).toBe('Acme');
});

test("the slide carries the mark, or the mode's logo, then the heading, the accent bar and the footer", () => {
  const { container, rerender } = render(
    <BrandSample kind="slide" mode="dark" name="Acme" colors={BRAND} mark="blob:mark" logo="blob:light" logoOnDark="blob:dark" />,
  );
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:mark');
  expect(root().textContent).toContain('The year ahead');
  expect(container.querySelector('.crewlet-brand-sample__footer')?.textContent).toBe('Acme · Company review');
  expect(container.querySelector('.crewlet-brand-sample__bar-secondary')).not.toBeNull();
  rerender(<BrandSample kind="slide" mode="dark" name="Acme" colors={{ primary: '#5b3df5' }} logo="blob:light" logoOnDark="blob:dark" />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:dark');
  expect(container.querySelector('.crewlet-brand-sample__bar-secondary')).toBeNull();
  rerender(<BrandSample kind="slide" mode="light" name="Acme" colors={BRAND} logo="blob:light" logoOnDark="blob:dark" />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:light');
});

test('takes its words from the host', () => {
  render(
    <BrandSample
      kind="slide"
      mode="light"
      name="Acme"
      colors={BRAND}
      labels={{ slideHeading: 'Plan for 2027', slideFooter: 'Board review', label: (name) => `${name} title slide` }}
    />,
  );
  expect(screen.getByRole('img', { name: 'Acme title slide' }).textContent).toContain('Plan for 2027');
  expect(document.querySelector('.crewlet-brand-sample__footer')?.textContent).toBe('Acme · Board review');
});

test('carries no axe violation, as a doc and a slide', async () => {
  const { container } = render(
    <main>
      <h1>Brand</h1>
      <BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} logo="blob:light" />
      <BrandSample kind="slide" mode="dark" name="Acme" colors={BRAND} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
