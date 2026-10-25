/** A request the person's access does not allow: Not permitted in a neutral Tag, the product's own sentence, and always "Nothing changed.". */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { Button } from '../Button/index.js';
import { RefusalCard } from './index.js';

afterEach(cleanup);

test('is named by the action and Not permitted, and always says nothing changed', () => {
  const { container } = render(
    <RefusalCard title="File a task" actions={<Button variant="secondary" size="small">Copy a request to an admin</Button>}>
      Filing tasks needs Tracker access, and your role includes Knowledge only.
    </RefusalCard>,
  );
  expect(screen.getByRole('region', { name: 'File a task Not permitted' })).toBeTruthy();
  expect(container.querySelector('.crewlet-tag--neutral, [class*="crewlet-tag"]')!.textContent).toContain('Not permitted');
  expect(screen.getByText('Nothing changed.')).toBeTruthy();
  expect(container.querySelector('.crewlet-status-card__actions--start')).not.toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <RefusalCard title="File a task" heading="You do not have permission to file tasks.">
        Filing tasks needs Tracker access.
      </RefusalCard>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
