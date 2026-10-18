/**
 * The refusal an artifact's place shows. It says what the reader can do, and
 * never anything about the artifact the engine has not shown them.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ACCESS_DENIED_REASONS, AccessDeniedCard } from './index.js';

afterEach(cleanup);

test('not found says both things the engine means by it, together', () => {
  render(<AccessDeniedCard reason="not-found" headingLevel={2} />);
  expect(screen.getByRole('heading', { level: 2, name: 'This artifact does not exist, or it has not been shared with you' })).toBeDefined();
});

test('names the owner in the request when the reader may know them', () => {
  const { rerender } = render(<AccessDeniedCard reason="no-access" owner="Maya Ortiz" />);
  expect(screen.getByText('Ask Maya Ortiz to share it with you.')).toBeDefined();
  rerender(<AccessDeniedCard reason="no-access" />);
  expect(screen.getByText('Ask its owner to share it with you.')).toBeDefined();
});

test('not found never names an owner, even when handed one', () => {
  render(<AccessDeniedCard reason="not-found" owner="Maya Ortiz" />);
  expect(screen.queryByText(/Maya Ortiz/)).toBeNull();
});

test('a locked app points at an administrator, and an action is drawn when given', () => {
  render(<AccessDeniedCard reason="app-locked" action={<a href="#/artifacts">Back to artifacts</a>} />);
  expect(screen.getByText('Needs Artifacts access')).toBeDefined();
  expect(screen.getByText(/Ask an administrator/)).toBeDefined();
  expect(screen.getByRole('link', { name: 'Back to artifacts' })).toBeDefined();
});

test('carries no axe violation for any reason', async () => {
  const { container } = render(
    <main>
      <h1>Artifacts</h1>
      {ACCESS_DENIED_REASONS.map((reason) => (
        <AccessDeniedCard key={reason} reason={reason} owner="Maya Ortiz" />
      ))}
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
