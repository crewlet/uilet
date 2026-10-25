/**
 * A proposed change from proposal to outcome: the head is the action and the
 * Tag the state, the decision is an explicit press that never takes focus on
 * its own, the busy primary keeps its label, the list heading follows the
 * state, each settled state says what happened at the foot, and a refusal is
 * the engine's sentence followed by "Nothing changed.".
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { ChangeListRow } from '../ChangeList/index.js';
import { PROPOSAL_STATES, ProposalCard, type ProposalCardProps, type ProposalState } from './index.js';

afterEach(cleanup);

const CHANGES: ChangeListRow[] = [
  { kind: 'changed', label: 'Status', from: 'Any open status', to: 'Blocked' },
  { kind: 'changed', label: 'Unit', from: 'Every unit', to: 'Core' },
];

function card(state: ProposalState, extra: Partial<ProposalCardProps> = {}) {
  return (
    <ProposalCard
      title="Filter this list"
      subtitle="This list only"
      scope="page"
      state={state}
      summary="Show only blocked tasks in Core."
      changes={CHANGES}
      note="Replaces the filters on this list."
      approveLabel="Apply to this list"
      onApprove={() => {}}
      onDecline={() => {}}
      {...extra}
    />
  );
}

test('pending: named by the action and its state, Decline then the primary named for its effect, nothing focused', () => {
  const onApprove = vi.fn();
  const onDecline = vi.fn();
  render(card('pending', { onApprove, onDecline }));
  expect(screen.getByRole('region', { name: 'Filter this list Needs your approval' })).toBeTruthy();
  const buttons = screen.getAllByRole('button');
  expect(buttons.map((button) => button.textContent)).toEqual(['Decline', 'Apply to this list']);
  expect(document.activeElement).toBe(document.body);
  fireEvent.click(buttons[1]!);
  fireEvent.click(buttons[0]!);
  expect(onApprove).toHaveBeenCalledTimes(1);
  expect(onDecline).toHaveBeenCalledTimes(1);
  expect(screen.getByText('What will change')).toBeTruthy();
});

test('applying: the primary keeps its label with the spinner, soft disabled, and Decline is held with its reason', () => {
  const onApprove = vi.fn();
  const onDecline = vi.fn();
  render(card('applying', { onApprove, onDecline }));
  expect(screen.getByRole('region', { name: 'Filter this list Applying' })).toBeTruthy();
  const primary = screen.getByRole('button', { name: 'Apply to this list' });
  expect(primary.getAttribute('aria-busy')).toBe('true');
  expect(primary.getAttribute('aria-disabled')).toBe('true');
  expect(primary.hasAttribute('disabled')).toBe(false);
  const decline = screen.getByRole('button', { name: 'Decline' });
  expect(decline.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(primary);
  fireEvent.click(decline);
  expect(onApprove).not.toHaveBeenCalled();
  expect(onDecline).not.toHaveBeenCalled();
});

test('a server write says Saving and Saved; a create heads its list "What will be created", then "What was created"', () => {
  const { rerender } = render(card('applying', { scope: 'server', kind: 'create', title: 'Create task' }));
  expect(screen.getByRole('region', { name: 'Create task Saving' })).toBeTruthy();
  expect(screen.getByText('What will be created')).toBeTruthy();
  rerender(card('applied', { scope: 'server', kind: 'create', title: 'Create task', receipt: 'Created ENG-156 · assigned to Agent SWE' }));
  expect(screen.getByRole('region', { name: 'Create task Saved' })).toBeTruthy();
  expect(screen.getByText('What was created')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Created ENG-156 · assigned to Agent SWE');
  expect(screen.queryByRole('button')).toBeNull();
});

test('step-up: "Needs sign-in" on the Tag, the strip says nothing changed yet, and Confirm it is you approves', () => {
  const onApprove = vi.fn();
  render(card('stepup', { onApprove }));
  expect(screen.getByRole('region', { name: 'Filter this list Needs sign-in' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('This approval asks you to sign in again. Nothing changed yet.');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm it’s you' }));
  expect(onApprove).toHaveBeenCalledTimes(1);
});

test('declined, expired and stale settle with their sentence; expired and stale offer Prepare it again', () => {
  const onPrepareAgain = vi.fn();
  const { rerender, container } = render(card('declined', { onPrepareAgain }));
  expect(screen.getByRole('status').textContent).toBe('You declined this. Nothing changed.');
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('What was proposed')).toBeTruthy();
  expect(container.querySelector('[data-settled]')).not.toBeNull();
  rerender(card('expired', { onPrepareAgain, notice: 'It was prepared 12 min ago and expired before it was applied. Nothing changed.' }));
  expect(screen.getByRole('status').textContent).toContain('12 min ago');
  fireEvent.click(screen.getByRole('button', { name: 'Prepare it again' }));
  expect(onPrepareAgain).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.crewlet-status-card__actions--start')).not.toBeNull();
  rerender(card('stale', { onPrepareAgain }));
  expect(screen.getByRole('region', { name: 'Filter this list Needs a fresh look' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Prepare it again' })).toBeTruthy();
});

test('not applied: an alert with the engine sentence and "Nothing changed.", and Try again only where offered', () => {
  const onRetry = vi.fn();
  const { rerender } = render(card('failed', { failure: 'You no longer have access to share this artifact.' }));
  expect(screen.getByRole('region', { name: 'Filter this list Not applied' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe('You no longer have access to share this artifact. Nothing changed.');
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  rerender(card('failed', { failure: 'The engine did not answer in time.', onRetry }));
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('every state carries no axe violation', async () => {
  for (const state of PROPOSAL_STATES) {
    const { container, unmount } = render(
      <main>{card(state, { receipt: 'Applied to Work › Tasks', onPrepareAgain: () => {}, onRetry: () => {} })}</main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations, state).toEqual([]);
    unmount();
  }
});
