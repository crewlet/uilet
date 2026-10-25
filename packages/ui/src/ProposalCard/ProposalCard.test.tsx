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
  const { container } = render(card('stepup', { onApprove }));
  expect(screen.getByRole('region', { name: 'Filter this list Needs sign-in' })).toBeTruthy();
  expect(container.querySelector('.crewlet-receipt-strip')!.textContent).toBe(
    'This approval asks you to sign in again. Nothing changed yet.',
  );
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

test('a failure hint is its own line after the sentence and "Nothing changed.", and only with a failure', () => {
  const hint = 'Ask an admin to give you access.';
  const { rerender } = render(card('failed', { failure: 'You no longer have access to share this artifact.', failureHint: hint }));
  const alert = screen.getByRole('alert');
  const sentence = alert.querySelector('.crewlet-refusal-strip__sentence')!;
  const line = alert.querySelector('.crewlet-refusal-strip__hint')!;
  expect(sentence.textContent).toBe('You no longer have access to share this artifact. Nothing changed.');
  expect(line.textContent).toBe(hint);
  // After the sentence, as a sibling of its own rather than words inside it.
  expect(sentence.nextElementSibling).toBe(line);
  expect(alert.textContent).toBe(`You no longer have access to share this artifact. Nothing changed.${hint}`);
  rerender(card('failed', { failureHint: hint }));
  expect(screen.getByRole('alert').textContent).toBe('Nothing changed.');
  rerender(card('pending', { failure: 'Refused.', failureHint: hint }));
  expect(screen.queryByText(hint)).toBeNull();
});

test('an unknown outcome never says "Nothing changed.": the Tag reads "Not confirmed" and the strip is the sentence alone', () => {
  const onRetry = vi.fn();
  const hint = 'Check the artifact before you try again.';
  const { rerender, container } = render(
    card('failed', { failureOutcome: 'unknown', failure: 'The engine did not answer in time.', failureHint: hint, onRetry }),
  );
  expect(screen.getByRole('region', { name: 'Filter this list Not confirmed' })).toBeTruthy();
  const alert = screen.getByRole('alert');
  expect(alert.querySelector('.crewlet-refusal-strip__sentence')!.textContent).toBe('The engine did not answer in time.');
  expect(alert.querySelector('.crewlet-refusal-strip__hint')!.textContent).toBe(hint);
  expect(alert.textContent).not.toContain('Nothing changed.');
  expect(container.querySelector('[data-outcome="unknown"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  // Without a sentence of the caller's, the card's own words, still without the reassurance.
  rerender(card('failed', { failureOutcome: 'unknown' }));
  expect(screen.getByRole('alert').textContent).toBe('Could not confirm whether this was applied. It may have landed.');
  // The default outcome is unchanged, so current consumers keep their words.
  rerender(card('failed', { failure: 'Refused.' }));
  expect(screen.getByRole('region', { name: 'Filter this list Not applied' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe('Refused. Nothing changed.');
  expect(container.querySelector('[data-outcome="unchanged"]')).not.toBeNull();
  // Ignored outside the failed state.
  rerender(card('pending', { failureOutcome: 'unknown' }));
  expect(container.querySelector('[data-outcome]')).toBeNull();
  expect(screen.getByRole('region', { name: 'Filter this list Needs your approval' })).toBeTruthy();
});

test('a refused decision is drawn above the decision in a polite live region the foot keeps, and only while deciding', () => {
  const refusal = { sentence: 'This approval needs a fresh sign-in.', hint: 'Confirm it is you, then approve again.' };
  const { rerender, container } = render(card('pending'));
  // The region is there, empty and hidden, before any refusal arrives.
  const region = container.querySelector<HTMLElement>('.crewlet-proposal-card__refusal')!;
  expect(region.getAttribute('role')).toBe('status');
  expect(region.textContent).toBe('');
  expect(region.classList.contains('crewlet-visually-hidden')).toBe(true);
  // Through the applying an approval passes on its way back, the same element.
  rerender(card('applying'));
  expect(container.querySelector('.crewlet-proposal-card__refusal')).toBe(region);
  rerender(card('stepup', { decisionRefusal: refusal }));
  expect(container.querySelector('.crewlet-proposal-card__refusal')).toBe(region);
  expect(region.classList.contains('crewlet-visually-hidden')).toBe(false);
  expect(region.querySelector('.crewlet-refusal-strip__sentence')!.textContent).toBe(refusal.sentence);
  expect(region.querySelector('.crewlet-refusal-strip__hint')!.textContent).toBe(refusal.hint);
  // Polite: the strip inside is not an alert of its own.
  expect(screen.queryByRole('alert')).toBeNull();
  // Above the decision, and the card stays decidable.
  const actions = container.querySelector('.crewlet-status-card__actions')!;
  expect(actions.firstElementChild).toBe(region);
  expect(screen.getByRole('button', { name: 'Confirm it’s you' })).toBeTruthy();
  // Cleared by the consumer.
  rerender(card('pending'));
  expect(region.textContent).toBe('');
  // Ignored once the card has settled, where the strip says what happened.
  rerender(card('failed', { decisionRefusal: refusal, failure: 'Refused.' }));
  expect(container.querySelector('.crewlet-proposal-card__refusal')).toBeNull();
  expect(screen.queryByText(refusal.sentence)).toBeNull();
});

test('a keyboard approve that settles the card keeps focus in it, on the strip that says what happened', () => {
  const { rerender } = render(card('pending', { receipt: 'Applied to Work › Tasks' }));
  const approve = screen.getByRole('button', { name: 'Apply to this list' });
  approve.focus();
  fireEvent.keyDown(approve, { key: 'Enter' });
  fireEvent.click(approve);
  rerender(card('applying', { receipt: 'Applied to Work › Tasks' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Apply to this list' }));
  rerender(card('applied', { receipt: 'Applied to Work › Tasks' }));
  const region = screen.getByRole('region', { name: 'Filter this list Applied' });
  const strip = screen.getByRole('status');
  expect(document.activeElement).toBe(strip);
  expect(region.contains(document.activeElement)).toBe(true);
  // Reachable by script, never a stop for Tab.
  expect(strip.getAttribute('tabindex')).toBe('-1');
});

test('a keyboard decline lands on the declined strip, and a card with no strip takes focus itself', () => {
  const { rerender } = render(card('pending'));
  screen.getByRole('button', { name: 'Decline' }).focus();
  rerender(card('declined'));
  expect(document.activeElement).toBe(screen.getByRole('status'));
  cleanup();
  const second = render(card('pending'));
  screen.getByRole('button', { name: 'Apply to this list' }).focus();
  second.rerender(card('applied'));
  const region = screen.getByRole('region', { name: 'Filter this list Applied' });
  expect(document.activeElement).toBe(region);
  expect(region.getAttribute('tabindex')).toBe('-1');
});

test('a card that settles while the reader is elsewhere leaves focus where it is', () => {
  const { rerender } = render(
    <>
      <button type="button">Elsewhere</button>
      {card('pending', { receipt: 'Applied to Work › Tasks' })}
    </>,
  );
  const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
  elsewhere.focus();
  rerender(
    <>
      <button type="button">Elsewhere</button>
      {card('applied', { receipt: 'Applied to Work › Tasks' })}
    </>,
  );
  expect(document.activeElement).toBe(elsewhere);
});

test('a blocked approval holds the primary soft disabled with its reason, shown and said, and never approves', () => {
  const reason = 'This screen cannot apply these filters.';
  const onApprove = vi.fn();
  const onDecline = vi.fn();
  const { rerender, container } = render(card('pending', { onApprove, onDecline, approveBlocked: reason }));
  const primary = screen.getByRole('button', { name: 'Apply to this list' });
  expect(primary.getAttribute('aria-disabled')).toBe('true');
  expect(primary.hasAttribute('disabled')).toBe(false);
  const described = primary.getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)?.textContent);
  expect(described).toContain(reason);
  // Shown in the foot for the eye, hidden from assistive technology so it is said once.
  const shown = container.querySelector('.crewlet-proposal-card__blocked')!;
  expect(shown.textContent).toBe(reason);
  expect(shown.getAttribute('aria-hidden')).toBe('true');
  // Focus stays where the press left it, and the press does nothing.
  primary.focus();
  fireEvent.click(primary);
  expect(document.activeElement).toBe(primary);
  expect(onApprove).not.toHaveBeenCalled();
  // Decline stays available.
  const decline = screen.getByRole('button', { name: 'Decline' });
  expect(decline.getAttribute('aria-disabled')).toBeNull();
  fireEvent.click(decline);
  expect(onDecline).toHaveBeenCalledTimes(1);

  // Step-up respects it too.
  rerender(card('stepup', { onApprove, approveBlocked: reason }));
  const confirm = screen.getByRole('button', { name: 'Confirm it’s you' });
  expect(confirm.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(confirm);
  expect(onApprove).not.toHaveBeenCalled();
});

test('a blocked approval is ignored once the card is applying or settled', () => {
  const reason = 'This screen cannot apply these filters.';
  const { rerender, container } = render(card('applying', { approveBlocked: reason }));
  const primary = screen.getByRole('button', { name: 'Apply to this list' });
  expect(primary.getAttribute('aria-busy')).toBe('true');
  expect(primary.hasAttribute('aria-describedby')).toBe(false);
  expect(container.querySelector('.crewlet-proposal-card__blocked')).toBeNull();
  for (const state of ['applied', 'declined', 'expired', 'stale', 'failed'] as const) {
    rerender(card(state, { approveBlocked: reason, onPrepareAgain: () => {} }));
    expect(screen.queryByText(reason), state).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apply to this list' }), state).toBeNull();
  }
});

test('every state carries no axe violation', async () => {
  for (const state of PROPOSAL_STATES) {
    const { container, unmount } = render(
      <main>
        {card(state, {
          receipt: 'Applied to Work › Tasks',
          onPrepareAgain: () => {},
          onRetry: () => {},
          failure: 'You no longer have access to share this artifact.',
          failureHint: 'Ask an admin to give you access.',
          approveBlocked: 'This screen cannot apply these filters.',
          decisionRefusal: { sentence: 'This approval needs a fresh sign-in.', hint: 'Confirm it is you.' },
        })}
      </main>,
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
