/**
 * A type specimen is a figure named by its role and face, draws its letters
 * and its line in the face itself, and always falls back to the package's own
 * sans.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { TypeSpecimen } from './index.js';

afterEach(cleanup);

const familyOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.crewlet-type-specimen')!.style.getPropertyValue('--crewlet-type-specimen-family');

test('is a figure named by what the face is for and its name', () => {
  render(<TypeSpecimen family="Geist" label="Heading" detail="Crewlet's face" />);
  const figure = screen.getByRole('figure');
  expect(figure.textContent).toContain('Heading');
  expect(figure.textContent).toContain('Geist');
  expect(figure.querySelector('figcaption')?.textContent).toBe("HeadingGeistCrewlet's face");
});

test('draws the face by its name, ending in the package sans so an unloaded face still reads', () => {
  const { container } = render(<TypeSpecimen family="Inter Display" label="Heading" />);
  expect(familyOf(container)).toBe('"Inter Display", var(--font-family-sans)');
});

test('takes a family list of its own, and keeps a name with quotes one quoted name', () => {
  const { container, rerender } = render(<TypeSpecimen family="System" label="Body" fontFamily="ui-serif, Georgia" />);
  expect(familyOf(container)).toBe('ui-serif, Georgia, var(--font-family-sans)');
  rerender(<TypeSpecimen family={'Acme "Sans"\\'} label="Body" />);
  expect(familyOf(container)).toBe('"Acme Sans", var(--font-family-sans)');
});

test('a family list that is not names is refused, and the face is drawn by its name', () => {
  const { container } = render(<TypeSpecimen family="Acme Sans" label="Body" fontFamily="x; color: red" />);
  expect(familyOf(container)).toBe('"Acme Sans", var(--font-family-sans)');
});

test('the large letters are decoration, and the line is the host\'s or the default', () => {
  const { container, rerender } = render(<TypeSpecimen family="Geist" label="Body" />);
  expect(container.querySelector('.crewlet-type-specimen__glyphs')?.getAttribute('aria-hidden')).toBe('true');
  expect(container.querySelector('.crewlet-type-specimen__sample')?.textContent).toBe('Every doc, deck and page your company makes, in its own type.');
  rerender(<TypeSpecimen family="Geist" label="Body" sample="Plan the quarter in one page." />);
  expect(container.querySelector('.crewlet-type-specimen__sample')?.textContent).toBe('Plan the quarter in one page.');
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Typography</h1>
      <TypeSpecimen family="Geist" label="Heading" weight="semibold" />
      <TypeSpecimen family="Geist Mono" label="Body" size="sm" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
