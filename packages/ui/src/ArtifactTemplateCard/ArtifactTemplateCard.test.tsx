/**
 * A starting point: one button named by its title and described by its
 * detail, its preview decorative, said as pressed when chosen.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ArtifactTemplateCard } from './index.js';

afterEach(cleanup);

test('is one button named by its title, described by its detail, pressed when chosen', () => {
  let chosen = false;
  render(
    <ArtifactTemplateCard
      kind="doc"
      title="Meeting notes"
      detail="Who came and what was decided."
      selected
      onSelect={() => (chosen = true)}
      preview={<span data-testid="live" />}
    />,
  );
  const card = screen.getByRole('button', { name: 'Meeting notes' });
  expect(card.getAttribute('aria-pressed')).toBe('true');
  expect(document.getElementById(card.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Who came and what was decided.');
  expect(screen.getByTestId('live').closest('[aria-hidden="true"]')).not.toBeNull();
  card.click();
  expect(chosen).toBe(true);
});

test("without a preview the kind's ground stands in", () => {
  const { container } = render(<ArtifactTemplateCard kind="sheet" title="Blank" onSelect={() => {}} />);
  expect(container.querySelector('.crewlet-kind-ground.crewlet-kind--sheet')).not.toBeNull();
});

test('a row of starting points carries no axe violation', async () => {
  const { container } = render(
    <ul>
      <li>
        <ArtifactTemplateCard kind="doc" title="Blank" detail="An empty page." selected onSelect={() => {}} />
      </li>
      <li>
        <ArtifactTemplateCard kind="doc" title="Launch plan" detail="Goal and plan." layout="row" selected={false} onSelect={() => {}} />
      </li>
    </ul>,
  );
  const result = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
