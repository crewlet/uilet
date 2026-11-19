/**
 * A proposed change from proposal to outcome: the head is the action and the
 * Tag the state, the decision is an explicit press that never takes focus on
 * its own, the busy primary keeps its label, the list heading follows the
 * state, each settled state says what happened at the foot, and a refusal is
 * the engine's sentence followed by "Nothing changed.". A destructive change
 * carries the danger tone and can wait on a deliberate confirmation, the
 * precise request is folded away, and a primary that has just appeared takes
 * no pointer for a moment.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { contrast } from '@crewlethq/tokens/test/palette';
import { channels, installSheets, installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import type { ChangeListRow } from '../ChangeList/index.js';
import {
  PROPOSAL_CARD_LABELS,
  PROPOSAL_STATES,
  ProposalCard,
  type ProposalCardProps,
  type ProposalState,
} from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  vi.useRealTimers();
  cleanup();
});

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

const REMOVE: Partial<ProposalCardProps> = {
  title: 'Remove seat QA Engineer',
  subtitle: 'Saved for the company',
  scope: 'server',
  summary: 'Remove the QA Engineer seat from the Core unit.',
  changes: [{ kind: 'removed', label: 'Seat', from: 'QA Engineer' }],
  note: 'You can bring it back from the configuration history.',
  approveLabel: 'Remove seat',
  tone: 'danger',
};
const CONFIRM = { label: 'I understand the QA Engineer seat stops working' };

function describedBy(element: HTMLElement): (string | null | undefined)[] {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);
}

test('danger: the rail and the danger primary while the decision is open, and none of it once settled', () => {
  const { rerender, container } = render(card('pending', REMOVE));
  const region = screen.getByRole('region', { name: 'Remove seat QA Engineer Needs your approval' });
  expect(region.getAttribute('data-tone')).toBe('danger');
  expect(region.classList.contains('crewlet-card--rail-danger')).toBe(true);
  const primary = screen.getByRole('button', { name: 'Remove seat' });
  expect(primary.classList.contains('crewlet-btn--danger')).toBe(true);
  expect(primary.classList.contains('crewlet-btn--primary')).toBe(false);
  // The Tag still says the state, in its own tone.
  expect(container.querySelector('.crewlet-tag--danger')).toBeNull();
  rerender(card('applying', REMOVE));
  expect(screen.getByRole('button', { name: 'Remove seat' }).classList.contains('crewlet-btn--danger')).toBe(true);
  rerender(card('declined', REMOVE));
  expect(container.querySelector('[data-tone]')).toBeNull();
  expect(container.querySelector('.crewlet-card--rail-danger')).toBeNull();
  // The default tone draws no rail and the ordinary primary.
  rerender(card('pending'));
  expect(container.querySelector('.crewlet-card--rail-danger')).toBeNull();
  expect(screen.getByRole('button', { name: 'Apply to this list' }).classList.contains('crewlet-btn--primary')).toBe(true);
});

test('danger: the title is set in the danger ink, at AA on the card in both palettes', () => {
  for (const theme of ['light', 'dark'] as const) {
    uninstall = installThemed(theme, 'Card/Card.css', 'ProposalCard/ProposalCard.css');
    const { container, unmount } = render(card('pending', REMOVE));
    const title = container.querySelector<HTMLElement>('.crewlet-card__title')!;
    const ground = container.querySelector<HTMLElement>('.crewlet-card')!;
    const ink = getComputedStyle(title).color;
    const ratio = contrast(channels(ink), channels(getComputedStyle(ground).backgroundColor));
    expect(ratio, `${theme}: ${ink}`).toBeGreaterThanOrEqual(4.5);
    // The plain card's title is the primary ink, so the rule above is what moved it.
    const plain = render(card('pending'));
    expect(getComputedStyle(plain.container.querySelector('.crewlet-card__title')!).color).not.toBe(ink);
    plain.unmount();
    unmount();
    uninstall();
    uninstall = undefined;
  }
});

test('a confirmation holds the primary, described by why, until it is ticked, and never approves before', () => {
  const onApprove = vi.fn();
  const onDecline = vi.fn();
  const { container } = render(card('pending', { ...REMOVE, confirmation: CONFIRM, onApprove, onDecline }));
  const box = screen.getByRole('checkbox', { name: CONFIRM.label });
  expect((box as HTMLInputElement).checked).toBe(false);
  const primary = screen.getByRole('button', { name: 'Remove seat' });
  expect(primary.getAttribute('aria-disabled')).toBe('true');
  expect(primary.hasAttribute('disabled')).toBe(false);
  expect(describedBy(primary)).toContain(PROPOSAL_CARD_LABELS.confirmationNeeded);
  // Said, not shown: the box itself is what the eye reads.
  expect(container.querySelector('.crewlet-proposal-card__blocked')).toBeNull();
  fireEvent.click(primary);
  expect(onApprove).not.toHaveBeenCalled();
  // Above the decision: the box comes before both buttons in the foot.
  const actions = container.querySelector('.crewlet-status-card__actions')!;
  const order = [...actions.querySelectorAll('input, button')].map((el) => el.textContent || el.getAttribute('type'));
  expect(order).toEqual(['checkbox', 'Decline', 'Remove seat']);
  // Decline never waits on it.
  fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
  expect(onDecline).toHaveBeenCalledTimes(1);
  // Ticked, the primary is live and carries no reason.
  fireEvent.click(box);
  expect(primary.getAttribute('aria-disabled')).toBeNull();
  expect(describedBy(primary)).not.toContain(PROPOSAL_CARD_LABELS.confirmationNeeded);
  fireEvent.click(primary);
  expect(onApprove).toHaveBeenCalledTimes(1);
  // Unticked again, held again.
  fireEvent.click(box);
  expect(primary.getAttribute('aria-disabled')).toBe('true');
});

test('a confirmation is operated from the keyboard: Space ticks it, then Enter on the primary approves', async () => {
  const user = userEvent.setup();
  const onApprove = vi.fn();
  render(card('pending', { ...REMOVE, confirmation: CONFIRM, onApprove }));
  // Nothing takes focus on arrival; the first stop is the box.
  expect(document.activeElement).toBe(document.body);
  await user.tab();
  const box = screen.getByRole('checkbox', { name: CONFIRM.label });
  expect(document.activeElement).toBe(box);
  await user.tab();
  await user.tab();
  const primary = screen.getByRole('button', { name: 'Remove seat' });
  // Held, it keeps its place in the order and its focus, and Enter does nothing.
  expect(document.activeElement).toBe(primary);
  await user.keyboard('{Enter}');
  expect(onApprove).not.toHaveBeenCalled();
  await user.tab({ shift: true });
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(box);
  await user.keyboard(' ');
  expect((box as HTMLInputElement).checked).toBe(true);
  await user.tab();
  await user.tab();
  expect(document.activeElement).toBe(primary);
  await user.keyboard('{Enter}');
  expect(onApprove).toHaveBeenCalledTimes(1);
});

test('the tick belongs to one proposal: another proposal in place, or a settled card, starts unticked', () => {
  const { rerender } = render(card('pending', { ...REMOVE, confirmation: CONFIRM }));
  fireEvent.click(screen.getByRole('checkbox'));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  // Through a step-up and the applying an approval passes through, it holds.
  rerender(card('stepup', { ...REMOVE, confirmation: CONFIRM }));
  expect(screen.getByRole('button', { name: 'Confirm it’s you' }).getAttribute('aria-disabled')).toBeNull();
  rerender(card('applying', { ...REMOVE, confirmation: CONFIRM }));
  const held = screen.getByRole('checkbox') as HTMLInputElement;
  expect(held.checked).toBe(true);
  // Nothing to change while the approved change is carried out.
  expect(held.disabled).toBe(true);
  // Handed a different proposal in the same place: unticked, held again.
  rerender(card('pending', { ...REMOVE, title: 'Remove seat Technical Writer', confirmation: CONFIRM }));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Remove seat' }).getAttribute('aria-disabled')).toBe('true');
  // Ticked, settled and decided again as the same proposal: unticked.
  const writer = { ...REMOVE, title: 'Remove seat Technical Writer', confirmation: CONFIRM };
  fireEvent.click(screen.getByRole('checkbox'));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  rerender(card('declined', writer));
  expect(screen.queryByRole('checkbox')).toBeNull();
  rerender(card('pending', writer));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
});

test('a blocked approval outranks the confirmation: ticked or not, the primary says why it is blocked', () => {
  const reason = 'Your access no longer covers this unit.';
  render(card('pending', { ...REMOVE, confirmation: CONFIRM, approveBlocked: reason }));
  const primary = screen.getByRole('button', { name: 'Remove seat' });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(primary.getAttribute('aria-disabled')).toBe('true');
  expect(describedBy(primary)).toContain(reason);
  expect(describedBy(primary)).not.toContain(PROPOSAL_CARD_LABELS.confirmationNeeded);
});

test('details: a compact disclosure, collapsed by default, mounted on opening, at the foot of the body above the note', () => {
  const { container, rerender } = render(
    card('pending', { ...REMOVE, details: <pre>PUT /config/units/core</pre> }),
  );
  const trigger = screen.getByRole('button', { name: 'Technical details' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('PUT /config/units/core')).toBeNull();
  const disclosure = container.querySelector('.crewlet-proposal-card__details')!;
  expect(disclosure.classList.contains('crewlet-disclosure--compact')).toBe(true);
  // After the list, before the note.
  const body = container.querySelector('.crewlet-status-card__body')!;
  const children = [...body.children];
  expect(children.indexOf(disclosure)).toBe(children.indexOf(body.querySelector('.crewlet-proposal-card__note')!) - 1);
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('region', { name: 'Technical details' }).textContent).toBe('PUT /config/units/core');
  // Its title is a label like every other word on the card.
  rerender(card('pending', { ...REMOVE, details: 'PUT', labels: { details: 'Request' } }));
  expect(screen.getByRole('button', { name: 'Request' })).toBeTruthy();
  // It stays with the record once the card has settled.
  rerender(card('applied', { ...REMOVE, details: 'PUT' }));
  expect(screen.getByRole('button', { name: 'Technical details' })).toBeTruthy();
  // And none is drawn without details.
  rerender(card('pending', REMOVE));
  expect(container.querySelector('.crewlet-proposal-card__details')).toBeNull();
});

test('a primary that has just appeared takes no pointer for half a second; the keyboard is never held', () => {
  vi.useFakeTimers();
  uninstall = installSheets('ProposalCard/ProposalCard.css');
  const onApprove = vi.fn();
  const { rerender } = render(card('pending', { onApprove }));
  const primary = screen.getByRole('button', { name: 'Apply to this list' });
  expect(primary.hasAttribute('data-arming')).toBe(true);
  expect(getComputedStyle(primary).pointerEvents).toBe('none');
  // Never drawn or said as disabled while it arms.
  expect(primary.getAttribute('aria-disabled')).toBeNull();
  // A keyboard press reaches it at once.
  primary.focus();
  fireEvent.click(primary, { detail: 0 });
  expect(onApprove).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(499));
  expect(primary.hasAttribute('data-arming')).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(primary.hasAttribute('data-arming')).toBe(false);
  expect(getComputedStyle(primary).pointerEvents).not.toBe('none');
  // Back to a decision under the same pointer (a step-up), it arms again.
  rerender(card('stepup', { onApprove }));
  const confirm = screen.getByRole('button', { name: 'Confirm it’s you' });
  expect(confirm.hasAttribute('data-arming')).toBe(true);
  act(() => vi.advanceTimersByTime(500));
  expect(confirm.hasAttribute('data-arming')).toBe(false);
  // A different proposal in place arms again too.
  rerender(card('stepup', { onApprove, title: 'Filter another list' }));
  expect(screen.getByRole('button', { name: 'Confirm it’s you' }).hasAttribute('data-arming')).toBe(true);
  // Applying holds the primary its own way, with nothing to arm.
  rerender(card('applying', { onApprove }));
  expect(screen.getByRole('button', { name: 'Apply to this list' }).hasAttribute('data-arming')).toBe(false);
});

test('the danger tone, a confirmation and details together carry no axe violation in any state', async () => {
  for (const state of PROPOSAL_STATES) {
    const { container, unmount } = render(
      <main>
        {card(state, {
          ...REMOVE,
          confirmation: CONFIRM,
          details: <pre>PUT /config/units/core</pre>,
          receipt: 'Removed the QA Engineer seat',
          onPrepareAgain: () => {},
          onRetry: () => {},
          failure: 'The unit changed after this was prepared.',
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

const CAUTION = 'Prepared after reading a comment on a task, written outside the company.';

test('a caution leads the body while the card can be decided, and leaves with the decision', () => {
  const { rerender, container } = render(card('pending', { caution: CAUTION }));
  const caution = screen.getByText(CAUTION);
  // A warning, before the summary, so it is read first.
  expect(caution.closest('.crewlet-callout')?.className).toContain('warning');
  const body = container.querySelector('.crewlet-status-card__body')!;
  expect(body.textContent!.indexOf(CAUTION)).toBeLessThan(body.textContent!.indexOf('Show only blocked tasks'));
  for (const state of ['stepup', 'applying'] as const) {
    rerender(card(state, { caution: CAUTION }));
    expect(screen.queryByText(CAUTION), state).not.toBeNull();
  }
  for (const state of ['applied', 'declined', 'expired', 'stale', 'failed'] as const) {
    rerender(card(state, { caution: CAUTION }));
    expect(screen.queryByText(CAUTION), state).toBeNull();
  }
});

test('the foot says a step-up is ahead only while the card waits, since the step-up strip says it after', () => {
  const ahead = PROPOSAL_CARD_LABELS.stepUpAhead;
  const { rerender } = render(card('pending', { stepUp: true }));
  expect(screen.getByText(ahead)).toBeTruthy();
  rerender(card('pending'));
  expect(screen.queryByText(ahead)).toBeNull();
  for (const state of PROPOSAL_STATES.filter((s) => s !== 'pending')) {
    rerender(card(state, { stepUp: true }));
    expect(screen.queryByText(ahead), state).toBeNull();
  }
});

test('the foot counts down to the expiry on the shared clock, only while the card can be decided', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
  const expiresAt = '2026-11-15T10:14:00Z';
  const { rerender } = render(card('pending', { expiresAt }));
  const time = screen.getByText(`${PROPOSAL_CARD_LABELS.expires} in 14m`);
  // The exact instant is the element's own, for a machine and on hover.
  expect(time.tagName).toBe('TIME');
  expect(time.getAttribute('datetime')).toBe('2026-11-15T10:14:00.000Z');
  // Only while it can be decided: a settled or busy card has no time left to count.
  for (const state of ['applying', 'applied', 'declined', 'expired', 'stale', 'failed'] as const) {
    rerender(card(state, { expiresAt }));
    expect(document.querySelector('.crewlet-proposal-card__terms'), state).toBeNull();
  }
  // A value that names no instant draws nothing rather than a guess, and never expires the card.
  rerender(card('pending', { expiresAt: 'not a time' }));
  expect(document.querySelector('.crewlet-proposal-card__terms')).toBeNull();
  expect(screen.getByRole('button', { name: 'Apply to this list' })).toBeTruthy();
});

/*
 * A WAIT THAT HAS RUN OUT IS EXPIRED. The card used to keep "Needs your
 * approval" and both buttons beside a line saying it could no longer be
 * approved: a host that had not yet heard the engine settle it drew a card
 * that contradicted itself, and a press on Approve could only be refused.
 */
test('a waiting card whose expiry has passed reads as expired, with no decision, from its first draw', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T10:20:00Z'));
  for (const state of ['pending', 'stepup'] as const) {
    const onPrepareAgain = vi.fn();
    const { container, unmount } = render(
      card(state, { expiresAt: '2026-11-15T10:14:00Z', notice: 'Sign in again to approve this.', onPrepareAgain }),
    );
    expect(screen.getByRole('region', { name: 'Filter this list Expired' }), state).toBeTruthy();
    expect(screen.getByText(PROPOSAL_CARD_LABELS.expiredNotice), state).toBeTruthy();
    // The host's sentence was written for the wait, so it is not the lapsed card's.
    expect(screen.queryByText('Sign in again to approve this.'), state).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decline' }), state).toBeNull();
    expect(screen.queryByRole('button', { name: /Apply to this list|Confirm it’s you/ }), state).toBeNull();
    expect(screen.queryByText(PROPOSAL_CARD_LABELS.lapsed), state).toBeNull();
    expect(container.querySelector('.crewlet-proposal-card__terms'), state).toBeNull();
    const root = container.querySelector('.crewlet-proposal-card')!;
    expect(root.classList.contains('crewlet-proposal-card--expired'), state).toBe(true);
    expect(root.getAttribute('data-lapsed'), state).toBe('true');
    // An expired card can still be prepared again.
    fireEvent.click(screen.getByRole('button', { name: PROPOSAL_CARD_LABELS.prepareAgain }));
    expect(onPrepareAgain, state).toHaveBeenCalledTimes(1);
    unmount();
  }
});

test('a card whose wait runs out on screen turns expired on that tick, and focus on its buttons lands on the strip', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T10:13:57Z'));
  const onApprove = vi.fn();
  render(card('pending', { expiresAt: '2026-11-15T10:14:00Z', onApprove }));
  const approve = screen.getByRole('button', { name: 'Apply to this list' });
  approve.focus();
  expect(screen.getByText(`${PROPOSAL_CARD_LABELS.expires} in 3s`)).toBeTruthy();
  act(() => vi.advanceTimersByTime(2000));
  // Still a second left: still a decision.
  expect(screen.getByRole('button', { name: 'Apply to this list' })).toBe(approve);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('region', { name: 'Filter this list Expired' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Apply to this list' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
  // Focus is never dropped to the page: it lands on what replaced the buttons.
  expect(document.activeElement).toBe(screen.getByText(PROPOSAL_CARD_LABELS.expiredNotice).closest('[tabindex="-1"]'));
  expect(onApprove).not.toHaveBeenCalled();
});

test('only a wait lapses: a card being carried out, or already settled, keeps its own state past the expiry', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T10:20:00Z'));
  const expiresAt = '2026-11-15T10:14:00Z';
  const { container, rerender } = render(card('applying', { expiresAt }));
  // An approval already given in time is being carried out.
  expect(screen.getByRole('region', { name: 'Filter this list Applying' })).toBeTruthy();
  expect(container.querySelector('[data-lapsed]')).toBeNull();
  for (const state of ['applied', 'declined', 'stale', 'failed'] as const) {
    rerender(card(state, { expiresAt, receipt: 'Applied the filter' }));
    expect(container.querySelector(`.crewlet-proposal-card--${state}`), state).not.toBeNull();
  }
  // A new expiry handed to the same card in place counts again.
  rerender(card('pending', { expiresAt: '2026-11-15T10:30:00Z' }));
  expect(screen.getByRole('button', { name: 'Apply to this list' })).toBeTruthy();
  expect(screen.getByText(`${PROPOSAL_CARD_LABELS.expires} in 10m`)).toBeTruthy();
});

test('a caution and the terms carry no axe violation while the card waits', async () => {
  for (const state of ['pending', 'stepup'] as const) {
    const { container, unmount } = render(
      <main>{card(state, { caution: CAUTION, stepUp: true, expiresAt: Date.now() + 600_000 })}</main>,
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
