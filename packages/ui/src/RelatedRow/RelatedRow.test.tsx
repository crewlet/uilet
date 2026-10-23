/**
 * RelatedRow: one link, in a region named Related, whose name is the place and
 * the sentence.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { RelatedRow } from './index.js';

afterEach(cleanup);

test('is one link in a region named for what it is', () => {
  render(
    <RelatedRow
      href="#/settings/limits"
      icon={<svg />}
      title="Engine limits"
      description="The caps the engine holds every turn to."
    />,
  );
  const region = screen.getByRole('navigation', { name: 'Related' });
  const link = within(region).getByRole('link');
  expect(link.getAttribute('href')).toBe('#/settings/limits');
  expect(link.textContent).toContain('Engine limits');
  expect(link.textContent).toContain('The caps the engine holds every turn to.');
});

test('takes the region name and the class it is given', () => {
  const { container } = render(
    <RelatedRow href="#/x" icon={<svg />} title="Backups" description="Where logs are kept." label="See also" className="foot" />,
  );
  expect(screen.getByRole('navigation', { name: 'See also' })).toBeTruthy();
  expect(container.querySelector('nav')!.className).toBe('crewlet-related-row foot');
});
