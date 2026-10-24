/**
 * A brand sample is a named picture drawn through a BrandScope pinned to its
 * own mode: each brand colour reaches the mapping only once it reads as
 * `#rrggbb`, each family list only once it reads as family names, and a role
 * it lacks sets nothing, so the mapping takes the theme's value for the mode.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
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

/** The scope around the sample: it carries the brand's inputs and the pinned mode. */
function scope(): HTMLElement {
  return root().parentElement as HTMLElement;
}

function input(name: string): string {
  return scope().style.getPropertyValue(`--brand-${name}`);
}

test('is a picture named by what it shows, with its words and its link drawn rather than read or followed', () => {
  render(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} />);
  expect(screen.getByRole('img', { name: 'A doc in the Acme brand, light mode' })).toBeDefined();
  expect(root().textContent).toContain('Quarterly review');
  expect(root().textContent).toContain('See the breakdown');
  expect(root().querySelector('a, button, input, [tabindex]')).toBeNull();
});

test('is drawn through a BrandScope pinned to its own mode, whatever the page is in', () => {
  const { rerender } = render(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} />);
  expect(scope().classList.contains('crewlet-brand-scope')).toBe(true);
  expect(root().classList.contains('crewlet-brand-scope__layer')).toBe(true);
  expect(scope().getAttribute('data-mode')).toBe('light');
  rerender(<BrandSample kind="slide" mode="dark" name="Acme" colors={BRAND} />);
  expect(scope().getAttribute('data-mode')).toBe('dark');
});

test("hands the mapping the brand's colours as its inputs, lowercased", () => {
  render(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} />);
  expect(input('primary')).toBe('#5b3df5');
  expect(input('primary-on-dark')).toBe('#9d8bff');
  expect(input('secondary')).toBe('#0e9f8a');
  expect(input('text')).toBe('#16131f');
  expect(input('light-ground')).toBe('#fbfaff');
  expect(input('dark-ground')).toBe('#120a2b');
});

test("sets no input for a role the brand lacks, so the mapping takes the theme's value for the mode", () => {
  render(<BrandSample kind="doc" mode="dark" name="Acme" colors={{ primary: '#5b3df5' }} />);
  expect(input('primary')).toBe('#5b3df5');
  for (const name of ['primary-on-dark', 'secondary', 'text', 'light-ground', 'dark-ground', 'font-heading', 'font-body']) {
    expect(input(name), name).toBe('');
  }
  // The second segment of the accent bar is drawn only for a brand with a second colour.
  expect(document.querySelector('.crewlet-brand-sample__bar-secondary')).toBeNull();
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
  const style = `${scope().getAttribute('style') ?? ''} ${root().getAttribute('style') ?? ''}`;
  expect(style).not.toMatch(/url|red|evil|#fff[^0-9a-f]/);
  expect(input('primary')).toBe('');
});

test('a family list that reads as names is handed on before the package face; anything else is not handed on', () => {
  const { rerender } = render(
    <BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} headingFamily="'Acme Display', Georgia" bodyFamily="Inter" />,
  );
  expect(input('font-heading')).toBe("'Acme Display', Georgia, var(--font-family-display)");
  expect(input('font-body')).toBe('Inter, var(--font-family-sans)');
  rerender(<BrandSample kind="doc" mode="light" name="Acme" colors={BRAND} headingFamily="x; color: red" bodyFamily="url(evil.woff2)" />);
  expect(input('font-heading')).toBe('');
  expect(input('font-body')).toBe('');
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
