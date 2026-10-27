/**
 * A brief card: its fixed shape, the count in its head, what nothing waiting
 * says, never more than three rows, and actions and follow-ups that take one
 * press each.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { BriefCard } from './index.js';

afterEach(cleanup);

const need = (key: string, onSelect = () => {}) => ({ key, text: `Row ${key}`, action: { label: `Do ${key}`, onSelect } });

test('a brief says its sentence, its rows and one recommendation, and each action is one press', () => {
  const answer = vi.fn();
  const next = vi.fn();
  render(
    <BriefCard
      scope="Inbox"
      asOf="Just now"
      summary="7 decisions wait on you."
      needs={[need('a', answer), { ...need('b'), detail: 'Asked 2 hours ago', tone: 'danger' as const }]}
      recommended={{ text: 'Answer GOP-11 first.', action: { label: 'Open GOP-11', onSelect: next } }}
    />,
  );
  expect(screen.getByRole('region', { name: 'Brief 2 need you' })).toBeTruthy();
  expect(screen.getByText('Inbox')).toBeTruthy();
  expect(screen.getByText('Just now')).toBeTruthy();
  expect(screen.getByText('7 decisions wait on you.')).toBeTruthy();
  expect(screen.getByText('Asked 2 hours ago')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Do a' }));
  expect(answer).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Open GOP-11' }));
  expect(next).toHaveBeenCalledTimes(1);
});

test('never more than three rows are drawn, and the count says three', () => {
  render(<BriefCard summary="s" needs={['a', 'b', 'c', 'd'].map((k) => need(k))} recommended={null} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('region', { name: 'Brief 3 need you' })).toBeTruthy();
  expect(screen.queryByText('Row d')).toBeNull();
});

test('nothing waiting is said in words, and a null recommendation leaves its block out', () => {
  render(<BriefCard summary="All quiet." needs={[]} recommended={null} />);
  expect(screen.getByRole('region', { name: 'Brief All clear' })).toBeTruthy();
  expect(screen.getByText('Nothing needs you.')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Recommended' })).toBeNull();
  expect(screen.queryByRole('list')).toBeNull();
});

test('a follow-up is a suggestion row that asks itself', () => {
  const ask = vi.fn();
  render(
    <BriefCard
      summary="s"
      needs={[]}
      recommended={null}
      followUps={[{ key: 'why', question: 'Why is PM stopped?', onSelect: ask }]}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Ask next' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Why is PM stopped?' }));
  expect(ask).toHaveBeenCalledTimes(1);
});

test('labels are replaced one at a time', () => {
  render(<BriefCard summary="s" needs={[need('a')]} recommended={null} labels={{ heading: 'Briefing', count: (n) => `${n} open` }} />);
  expect(screen.getByRole('region', { name: 'Briefing 1 open' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Needs you' })).toBeTruthy();
});

test('carries no axe violation with rows, with nothing waiting, and with follow-ups', async () => {
  const { container } = render(
    <main>
      <BriefCard
        scope="Decision on GOP-11"
        asOf="Just now"
        summary="QA asks which build to test."
        needs={[need('a'), need('b')]}
        recommended={{ text: 'Answer with the store build.', action: { label: 'Answer', onSelect: () => {} } }}
        followUps={[{ key: 'q', question: 'What did QA test last?', onSelect: () => {} }]}
      />
      <BriefCard summary="All quiet." needs={[]} recommended={null} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
