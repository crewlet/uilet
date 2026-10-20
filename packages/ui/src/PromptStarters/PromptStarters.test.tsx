/**
 * Suggested briefs: a chip fills, it never sends, and the chip whose prompt
 * the field holds is said as pressed.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { PromptStarters, type PromptStarter } from './index.js';

afterEach(cleanup);

const STARTERS: PromptStarter[] = [
  {
    id: 'spend',
    label: 'Weekly spend',
    prompt: 'Build a dashboard of weekly spend.',
  },
  {
    id: 'beta',
    label: 'Beta health',
    prompt: 'Build a dashboard for the beta.',
  },
];

test('a chip hands back its starter and is pressed while the field holds its prompt', () => {
  const picked: string[] = [];
  const { rerender } = render(
    <PromptStarters label="Starting points" starters={STARTERS} picked={null} onPick={(s) => picked.push(s.prompt)} />,
  );
  const list = screen.getByRole('list', { name: 'Starting points' });
  expect(list).toBeDefined();
  screen.getByRole('button', { name: 'Beta health' }).click();
  expect(picked).toEqual(['Build a dashboard for the beta.']);
  rerender(<PromptStarters label="Starting points" starters={STARTERS} picked="beta" onPick={() => {}} />);
  expect(screen.getByRole('button', { name: 'Beta health' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Weekly spend' }).getAttribute('aria-pressed')).toBe('false');
});

test('without `picked` the chips claim no state', () => {
  render(<PromptStarters label="Starting points" starters={STARTERS} onPick={() => {}} />);
  expect(screen.getByRole('button', { name: 'Weekly spend' }).getAttribute('aria-pressed')).toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(<PromptStarters label="Starting points" starters={STARTERS} picked="spend" onPick={() => {}} />);
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
