/**
 * A brand chip is one link named by its words, with the mark and the chevron
 * as decoration, and the brand glyph standing in when there is no mark.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { BrandChip } from './index.js';

afterEach(cleanup);

test('is one link named by its label, with the mark as decoration', () => {
  const { container } = render(<BrandChip href="#/company/brand" label="Acme brand" mark="blob:mark" />);
  const link = screen.getByRole('link', { name: 'Acme brand' });
  expect(link.getAttribute('href')).toBe('#/company/brand');
  const image = container.querySelector('img')!;
  expect(image.getAttribute('src')).toBe('blob:mark');
  expect(image.getAttribute('alt')).toBe('');
  expect(image.closest('[aria-hidden="true"]')).not.toBeNull();
});

test('draws the brand glyph when there is no mark, as an administrator sees before a brand exists', () => {
  const { container } = render(<BrandChip href="#/company/brand" label="Set up your brand" />);
  expect(screen.getByRole('link', { name: 'Set up your brand' })).toBeDefined();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('.crewlet-brand-chip__mark--glyph svg')).not.toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Artifacts</h1>
      <BrandChip href="#/company/brand" label="Acme brand" mark="blob:mark" />
      <BrandChip href="#/company/brand" label="Set up your brand" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
