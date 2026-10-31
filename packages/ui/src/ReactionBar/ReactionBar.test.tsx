/**
 * A message's reactions: one toggle pill to an emoji, saying who reacted
 * with the reader first, held when the reader cannot react, and the add pill
 * that opens the emoji picker, quiet in a row until the row is pointed at.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installHover, installSheets, userAction } from '../../../../apps/ui-tests/src/cascade.js';
import { ChatMessage } from '../ChatMessage/index.js';
import { AddReaction, REACTION_BAR_LABELS, ReactionBar, reactionWho, type ReactionSummary } from './index.js';

afterEach(cleanup);

const SHEETS = ['ChatMessage/ChatScale.css', 'ChatMessage/ChatMessage.css', 'ReactionBar/ReactionBar.css'] as const;

const eyes: ReactionSummary = { emoji: '👀', count: 2, mine: true, people: ['Product Manager'] };
const check: ReactionSummary = { emoji: '✅', count: 3, mine: false };

// YOU LEAD THE LIST. In the data's order the reader fell mid sentence:
// "Product Manager and You reacted". Mutation: list the names as given.
test('says who reacted with the reader first, and counts those it cannot name', () => {
  expect(reactionWho(eyes)).toBe('You and Product Manager');
  expect(reactionWho({ emoji: '👍', count: 1, mine: true, people: [] })).toBe('You');
  expect(reactionWho({ emoji: '👍', count: 3, mine: true, people: ['Designer', 'CTO'] })).toBe('You, Designer and CTO');
  expect(reactionWho({ emoji: '👍', count: 5, mine: true, people: ['Designer', 'CTO', 'SWE', 'PM'] })).toBe(
    'You, Designer and 3 others',
  );
  // Names known for some of them: the rest are counted.
  expect(reactionWho({ emoji: '👍', count: 4, mine: false, people: ['Designer'] })).toBe('Designer and 3 others');
  // No names at all.
  expect(reactionWho({ emoji: '👍', count: 3, mine: true })).toBe('You and 2 others');
  expect(reactionWho({ emoji: '👍', count: 1, mine: true })).toBe('You');
  expect(reactionWho(check)).toBe('3 members');
  expect(reactionWho({ emoji: '👍', count: 1, mine: false })).toBe('1 member');
  expect(reactionWho(eyes, { ...REACTION_BAR_LABELS, you: 'Du', others: (n) => `${n} weitere` })).toBe('Du and Product Manager');
});

test('draws a toggle pill to an emoji, named by the emoji and who reacted, pressed when it is yours', () => {
  const onToggle = vi.fn();
  render(<ReactionBar reactions={[eyes, check]} onToggle={onToggle} />);
  expect(screen.getByRole('group', { name: 'Reactions' })).toBeTruthy();
  const mine = screen.getByRole('button', { name: 'eyes: You and Product Manager reacted' });
  expect(mine.getAttribute('aria-pressed')).toBe('true');
  expect(mine.textContent).toBe('👀2');
  const theirs = screen.getByRole('button', { name: 'check: 3 members reacted' });
  expect(theirs.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(theirs);
  expect(onToggle).toHaveBeenCalledWith('✅');
});

test('says who reacted on hover', async () => {
  render(<ReactionBar reactions={[eyes]} onToggle={() => {}} />);
  const pill = screen.getByRole('button', { name: /eyes/ });
  fireEvent.focus(pill);
  await waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('You and Product Manager reacted with 👀'));
});

test('a reader who cannot react sees who did, and why the pills hold', async () => {
  const onToggle = vi.fn();
  render(<ReactionBar reactions={[eyes]} onToggle={onToggle} disabledReason="Join the room to react." />);
  const pill = screen.getByRole('button', { name: /eyes/ });
  expect(pill.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(pill);
  expect(onToggle).not.toHaveBeenCalled();
  fireEvent.focus(pill);
  await waitFor(() =>
    expect(screen.getByRole('tooltip').textContent).toBe('You and Product Manager reacted with 👀. Join the room to react.'),
  );
});

test('draws nothing with no reactions and nothing to add one with', () => {
  const { container } = render(<ReactionBar reactions={[]} onToggle={() => {}} />);
  expect(container.firstChild).toBeNull();
});

// AT REST A PILL IS A FILL, NOT A FRAME; yours is ringed in the accent with
// a heavier count. Mutation: give every pill the edge at rest.
test('a pill rests on a fill with no edge, and yours carries a ring and a medium count', () => {
  const uninstall = installSheets(...SHEETS);
  try {
    render(<ReactionBar reactions={[eyes, check]} onToggle={() => {}} />);
    const theirs = screen.getByRole('button', { name: /check/ });
    expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(getComputedStyle(theirs).borderColor);
    expect(getComputedStyle(theirs.querySelector('.crewlet-reaction__count')!).fontWeight).toBe('400');
    const mine = screen.getByRole('button', { name: /eyes/ });
    expect(mine.classList.contains('is-mine')).toBe(true);
    expect(getComputedStyle(mine.querySelector('.crewlet-reaction__count')!).fontWeight).toBe('500');
  } finally {
    uninstall();
  }
});

test('the add pill opens the emoji picker, and a pick is reported', async () => {
  const onPick = vi.fn();
  render(<ReactionBar reactions={[eyes]} onToggle={() => {}} add={<AddReaction onPick={onPick} />} />);
  const add = screen.getByRole('button', { name: 'Add a reaction' });
  expect(add.getAttribute('aria-haspopup')).toBe('dialog');
  fireEvent.click(add);
  expect(add.getAttribute('aria-expanded')).toBe('true');
  screen.getByRole('dialog', { name: 'Add a reaction' });
  fireEvent.click(screen.getByRole('button', { name: 'rocket' }));
  expect(onPick).toHaveBeenCalledWith('🚀');
  expect(screen.queryByRole('dialog')).toBeNull();
});

function Row() {
  return (
    <ChatMessage id="m1" label="PM, 11:02 AM" avatar={null} author="PM" time="11:02 AM" timeTitle="11:02 AM"
      footer={<ReactionBar reactions={[eyes]} onToggle={() => {}} add={<AddReaction onPick={() => {}} />} />}
    >
      Ready.
    </ChatMessage>
  );
}

// THE ADD PILL IS QUIET IN A ROW UNTIL THE ROW IS POINTED AT, and always
// shown on a touch screen, where there is no pointing.
test('in a message the add pill shows under the pointer, and always on a touch screen', () => {
  const hovering = installHover('hover', ...SHEETS);
  try {
    render(<Row />);
    const add = screen.getByRole('button', { name: 'Add a reaction' });
    expect(getComputedStyle(add).opacity).toBe('0');
    const release = userAction(screen.getByRole('article'), 'hover');
    expect(getComputedStyle(add).opacity).toBe('1');
    release();
  } finally {
    hovering();
    cleanup();
  }
  const touching = installHover('none', ...SHEETS);
  try {
    render(<Row />);
    expect(getComputedStyle(screen.getByRole('button', { name: 'Add a reaction' })).opacity).toBe('1');
  } finally {
    touching();
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ReactionBar reactions={[eyes, check]} onToggle={() => {}} add={<AddReaction onPick={() => {}} />} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
