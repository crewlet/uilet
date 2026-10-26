/**
 * A record with a state: a section named by its title and its state Tag, no
 * tone rail, the foot's one alignment rule, and a settled body that steps
 * back to the secondary ink.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { Button } from '../Button/index.js';
import { ReceiptStrip } from '../ReceiptStrip/index.js';
import { StatusCard } from './index.js';

afterEach(cleanup);

test('is a section named by its title and its state', () => {
  const { container } = render(
    <StatusCard title="Create task" status={{ label: 'Needs your approval', tone: 'warning' }} subtitle="Saved for the company">
      <p>File a new task in Core.</p>
    </StatusCard>,
  );
  expect(screen.getByRole('region', { name: 'Create task Needs your approval' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Create task' })).toBeTruthy();
  expect(container.querySelector('.crewlet-card__subtitle')!.textContent).toBe('Saved for the company');
  // No rail: the state is the Tag's.
  expect(container.querySelector('[class*="crewlet-card--rail"]')).toBeNull();
});

test('a decision ends the foot; utilities start it with a ghost pulled onto the text edge', () => {
  const uninstall = installThemed('light', 'Card/Card.css', 'Button/Button.css', 'StatusCard/StatusCard.css');
  const { container, rerender } = render(
    <StatusCard title="Filter this list" actions={<Button variant="primary">Apply to this list</Button>}>
      <p>Show only blocked tasks.</p>
    </StatusCard>,
  );
  const foot = () => container.querySelector('.crewlet-status-card__actions')!;
  expect(getComputedStyle(foot()).justifyContent).toBe('flex-end');
  rerender(
    <StatusCard
      title="Token spend by agent"
      actionsAlign="start"
      actions={
        <Button variant="ghost" size="small">
          CSV
        </Button>
      }
    >
      <p>Rows.</p>
    </StatusCard>,
  );
  expect(getComputedStyle(foot()).justifyContent).toBe('flex-start');
  expect(getComputedStyle(foot().querySelector('.crewlet-btn')!).marginInlineStart).toMatch(/^calc\(-1 \* \(|^-9px$/);
  uninstall();
});

test('a settled body steps back to the secondary ink', () => {
  const { container } = render(
    <StatusCard title="Filter this list" settled>
      <p>Show only blocked tasks.</p>
    </StatusCard>,
  );
  expect(container.querySelector('.crewlet-status-card--settled .crewlet-status-card__body')).not.toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <StatusCard
        title="Create task"
        status={{ label: 'Needs your approval', tone: 'warning' }}
        actions={<Button variant="primary">Create task</Button>}
      >
        <p>File a new task in Core.</p>
      </StatusCard>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('the strip reaches the card edges, in a footer with no inset rather than a padded body', () => {
  const { container } = render(
    <StatusCard title="Filter this list" strip={<ReceiptStrip>Applied to Work › Tasks</ReceiptStrip>}>
      <p>Show only blocked tasks.</p>
    </StatusCard>,
  );
  const strip = container.querySelector('.crewlet-receipt-strip')!;
  expect(strip.parentElement!.className).toContain('crewlet-card__footer--p-none');
  expect(container.querySelectorAll('.crewlet-card__body').length).toBe(1);
});

test('a collapsible result folds to its head: the title opens it and says how much it holds', () => {
  const uninstall = installThemed('light', 'Card/Card.css', 'StatusCard/StatusCard.css');
  const onOpenChange = vi.fn();
  const { container } = render(
    <StatusCard
      title="Company principles"
      subtitle="Saved for the company"
      collapsible
      summary="Mission, vision, 6 policies"
      onOpenChange={onOpenChange}
      actions={<Button variant="ghost">Open Principles</Button>}
      actionsAlign="start"
    >
      <p>Build a good relationship.</p>
    </StatusCard>,
  );
  const toggle = screen.getByRole('button', { name: 'Company principles, Mission, vision, 6 policies' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByRole('heading', { name: 'Company principles, Mission, vision, 6 policies' })).toBeTruthy();
  const body = container.querySelector('.crewlet-status-card__body')!;
  expect(toggle.getAttribute('aria-controls')).toBe(body.id);
  expect(body.hasAttribute('hidden')).toBe(true);
  expect(getComputedStyle(body).display).toBe('none');
  // Folded, the subtitle gives way to the summary, and the utility stands in
  // the head, so the folded card still offers it.
  expect(container.querySelector('.crewlet-card__subtitle')).toBeNull();
  expect(container.querySelector('.crewlet-status-card__actions')).toBeNull();
  expect(container.querySelector('.crewlet-card__header-actions')!.textContent).toBe('Open Principles');

  fireEvent.click(toggle);
  expect(onOpenChange).toHaveBeenCalledWith(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(toggle.textContent).toBe('Company principles');
  expect(body.hasAttribute('hidden')).toBe(false);
  expect(container.querySelector('.crewlet-card__subtitle')!.textContent).toBe('Saved for the company');
  // OPEN, THE UTILITY STAYS IN THE HEAD: opening the card never moves a
  // control under the pointer, and it is never drawn twice.
  expect(container.querySelector('.crewlet-status-card__actions')).toBeNull();
  expect(container.querySelector('.crewlet-card__header-actions')!.textContent).toBe('Open Principles');
  expect(screen.getAllByRole('button', { name: 'Open Principles' })).toHaveLength(1);
  uninstall();
});

test('a controlled fold follows its open prop, and a card that is not collapsible never folds', () => {
  const { rerender } = render(
    <StatusCard title="Tasks" collapsible summary="7 rows" open>
      <p>Rows.</p>
    </StatusCard>,
  );
  expect(screen.getByRole('button', { name: 'Tasks' }).getAttribute('aria-expanded')).toBe('true');
  rerender(
    <StatusCard title="Tasks" collapsible summary="7 rows" open={false}>
      <p>Rows.</p>
    </StatusCard>,
  );
  expect(screen.getByRole('button', { name: 'Tasks, 7 rows' }).getAttribute('aria-expanded')).toBe('false');
  // Pressed while controlled, it asks and does not move on its own.
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  rerender(
    <StatusCard title="Tasks" summary="7 rows">
      <p>Rows.</p>
    </StatusCard>,
  );
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('Rows.')).toBeTruthy();
});

test('a folded card has no accessibility violations', async () => {
  const { container } = render(
    <StatusCard title="Tasks" collapsible summary="7 rows" actions={<Button variant="ghost">CSV</Button>} actionsAlign="start">
      <p>Rows.</p>
    </StatusCard>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
