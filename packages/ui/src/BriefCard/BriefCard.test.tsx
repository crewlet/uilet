/**
 * A brief card: the verdict in its head derived from its rows, said once and
 * as loud as its loudest row, the first of several rows marked as the one to
 * do first, never more than three rows or two follow-ups, and actions and
 * follow-ups that take one press each.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { BriefCard } from './index.js';

const verdictTag = (name: string) => screen.getByText(name).closest('.crewlet-tag')?.className ?? '';

afterEach(cleanup);

const need = (key: string, onSelect = () => {}) => ({ key, text: `Row ${key}`, action: { label: `Do ${key}`, onSelect } });

test('a brief says its verdict, what it is about and its ranked rows, and each action is one press', () => {
  const first = vi.fn();
  const second = vi.fn();
  render(
    <BriefCard
      scope="Inbox"
      asOf="Just now"
      about="GOP-11 waits on your answer and PM is stopped."
      needs={[need('a', first), { ...need('b', second), detail: 'Stopped 2 hours ago', tone: 'danger' as const }]}
      context="The beta ships Thursday."
    />,
  );
  expect(screen.getByRole('region', { name: 'Brief 2 things need you' })).toBeTruthy();
  expect(screen.getByText('Inbox')).toBeTruthy();
  expect(screen.getByText('Just now')).toBeTruthy();
  expect(screen.getByText('GOP-11 waits on your answer and PM is stopped.')).toBeTruthy();
  expect(screen.getByText('Stopped 2 hours ago')).toBeTruthy();
  expect(screen.getByText('The beta ships Thursday.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Do a' }));
  expect(first).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Do b' }));
  expect(second).toHaveBeenCalledTimes(1);
});

test('the first of several rows is the recommendation: marked to do first, read first, with the primary press', () => {
  render(<BriefCard about="s" needs={[need('a'), need('b')]} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows[0]?.textContent?.startsWith('Do first')).toBe(true);
  expect(rows[0]?.textContent).toContain('Row a');
  expect(rows[1]?.textContent).not.toContain('Do first');
  expect(screen.getAllByText('Do first')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Do a' }).className).toContain('primary');
  expect(screen.getByRole('button', { name: 'Do b' }).className).not.toContain('primary');
});

test('one row has nothing to rank: no "Do first" mark, and its press is still the primary', () => {
  render(<BriefCard about="s" needs={[need('a')]} />);
  expect(screen.queryByText('Do first')).toBeNull();
  expect(screen.getByRole('listitem').className).not.toContain('crewlet-brief-card__need--first');
  expect(screen.getByRole('button', { name: 'Do a' }).className).toContain('primary');
});

test('the verdict is as loud as the loudest row, and calm when nothing needs the reader', () => {
  render(<BriefCard about="s" needs={[need('a'), { ...need('b'), tone: 'danger' as const }]} />);
  expect(verdictTag('2 things need you')).toContain('crewlet-tag--danger');
  cleanup();
  render(<BriefCard about="s" needs={[need('a'), { ...need('b'), tone: 'warning' as const }]} />);
  expect(verdictTag('2 things need you')).toContain('crewlet-tag--warning');
  cleanup();
  render(<BriefCard about="s" needs={[]} />);
  expect(verdictTag('Nothing needs you')).toContain('crewlet-tag--success');
});

test('the host ranks and caps: more than three rows or two follow-ups are cut, and said so outside production', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const asks = ['a', 'b', 'c'].map((k) => ({ key: k, question: `Question ${k}?`, onSelect: () => {} }));
  render(<BriefCard about="s" needs={['a', 'b', 'c', 'd'].map((k) => need(k))} followUps={asks} />);
  expect(screen.queryByText('Row d')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Question c?' })).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Question/ })).toHaveLength(2);
  expect(warn).toHaveBeenCalledTimes(2);
  expect(String(warn.mock.calls[0]?.[0])).toContain('4 needs');
  expect(String(warn.mock.calls[1]?.[0])).toContain('3 follow-ups');
  warn.mockRestore();
});

test('a re-render with the same counts does not warn again, and a new count over the cap does', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const four = ['a', 'b', 'c', 'd'].map((k) => need(k));
  const { rerender } = render(<BriefCard about="s" needs={four} />);
  rerender(<BriefCard about="s" needs={[...four]} />);
  rerender(<BriefCard about="s" needs={[...four]} context="c" />);
  expect(warn).toHaveBeenCalledTimes(1);
  rerender(<BriefCard about="s" needs={[...four, need('e')]} />);
  expect(warn).toHaveBeenCalledTimes(2);
  expect(String(warn.mock.calls[1]?.[0])).toContain('5 needs');
  warn.mockRestore();
});

test('a host with no process warns about nothing rather than throwing', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('process', undefined);
  try {
    render(<BriefCard about="s" needs={['a', 'b', 'c', 'd'].map((k) => need(k))} />);
  } finally {
    vi.unstubAllGlobals();
  }
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test('a brief within its caps warns about nothing', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<BriefCard about="s" needs={['a', 'b', 'c'].map((k) => need(k))} />);
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test('the verdict counts the rows it draws: one thing, and never more than three', () => {
  render(<BriefCard about="s" needs={[need('a')]} />);
  expect(screen.getByRole('region', { name: 'Brief 1 thing needs you' })).toBeTruthy();
  cleanup();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<BriefCard about="s" needs={['a', 'b', 'c', 'd'].map((k) => need(k))} />);
  warn.mockRestore();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('region', { name: 'Brief 3 things need you' })).toBeTruthy();
  expect(screen.queryByText('Row d')).toBeNull();
});

test('nothing waiting is said once, in the head, and the body draws no list and no echo of it', () => {
  render(<BriefCard about="Inbox: 8 decisions, every one asked of someone else." needs={[]} />);
  expect(screen.getByRole('region', { name: 'Brief Nothing needs you' })).toBeTruthy();
  expect(screen.getAllByText('Nothing needs you')).toHaveLength(1);
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.queryByText('Do first')).toBeNull();
});

test('a follow-up is a suggestion row that asks itself, in a list named for it', () => {
  const ask = vi.fn();
  render(<BriefCard about="s" needs={[]} followUps={[{ key: 'why', question: 'Why is PM stopped?', onSelect: ask }]} />);
  expect(screen.getByRole('list', { name: 'Ask next' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Why is PM stopped?' }));
  expect(ask).toHaveBeenCalledTimes(1);
});

test('labels are replaced one at a time', () => {
  render(
    <BriefCard about="s" needs={[need('a'), need('b')]} labels={{ heading: 'Briefing', count: (n) => `${n} open` }} />,
  );
  expect(screen.getByRole('region', { name: 'Briefing 2 open' })).toBeTruthy();
  expect(screen.getByRole('list', { name: 'Needs you' })).toBeTruthy();
  expect(screen.getByText('Do first')).toBeTruthy();
});

test('carries no axe violation with rows and context, with nothing waiting, and with follow-ups', async () => {
  const { container } = render(
    <main>
      <BriefCard
        scope="Decision GOP-11"
        asOf="Just now"
        about="QA asks which build to test."
        needs={[need('a'), need('b')]}
        context="The beta ships Thursday."
        followUps={[{ key: 'q', question: 'What did QA test last?', onSelect: () => {} }]}
      />
      <BriefCard about="All quiet." needs={[]} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
