/**
 * A document's thread: remarks in order with whom each answers, a Reply that
 * moves focus to a field naming whom it answers, and a draft that is cleared
 * only once the host says the post landed.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { CommentThread, type CommentThreadComment } from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-18T12:00:00Z');

const comments: CommentThreadComment[] = [
  {
    id: 'c1',
    author: { id: 'maya', kind: 'person', name: 'Maya Ortiz' },
    body: <p>Should the rollout wait for the audit?</p>,
    createdAt: '2026-10-18T11:00:00Z',
  },
  {
    id: 'c2',
    author: { id: 'planner', kind: 'agent', name: 'Planner' },
    body: <p>Yes, until Friday.</p>,
    createdAt: '2026-10-18T11:30:00Z',
    editedAt: '2026-10-18T11:40:00Z',
    replyTo: 'c1',
  },
  { id: 'c3', body: <p>Page moved to Runbooks.</p>, createdAt: '2026-10-18T11:50:00Z' },
];

test('lists every remark in order, with its author, when, and whom it answers', () => {
  render(<CommentThread comments={comments} now={NOW} />);
  const items = within(screen.getByRole('list')).getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(items[0]!.textContent).toContain('Maya Ortiz');
  expect(items[0]!.textContent).toContain('1h ago');
  expect(items[1]!.textContent).toContain('(edited)');
  expect(items[1]!.textContent).toContain('in reply to Maya Ortiz');
  // A remark that names nobody is the system's.
  expect(items[2]!.textContent).toContain('System');
});

test('the heading counts the remarks, and an empty thread says so', () => {
  const { rerender } = render(<CommentThread comments={comments} now={NOW} />);
  expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('Comments');
  expect(screen.getByRole('region', { name: /Comments/ })).toBeTruthy();
  rerender(<CommentThread comments={[]} />);
  expect(screen.getByText('Nobody has commented.')).toBeTruthy();
});

test('read-only without a submit handler: no field and no Reply', () => {
  render(<CommentThread comments={comments} now={NOW} />);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /Reply/ })).toBeNull();
});

test('Reply moves focus to a field that names whom it answers, and can be abandoned', () => {
  render(<CommentThread comments={comments} subject="Onboarding" onSubmit={() => {}} now={NOW} />);
  expect(screen.getByRole('textbox', { name: 'Comment on “Onboarding”' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reply to Maya Ortiz' }));
  const field = screen.getByRole('textbox', { name: 'Reply to Maya Ortiz' });
  expect(document.activeElement).toBe(field);
  expect(screen.getByText('Replying to Maya Ortiz')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Stop replying' }));
  expect(screen.queryByText('Replying to Maya Ortiz')).toBeNull();
});

test('an empty draft cannot be sent, and says why', () => {
  const onSubmit = vi.fn();
  render(<CommentThread comments={[]} onSubmit={onSubmit} />);
  const send = screen.getByRole('button', { name: 'Comment' });
  expect(send.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(send);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText('Write the comment first.')).toBeTruthy();
});

test('a post sends the trimmed draft with its reply target, and clears once it lands', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  render(<CommentThread comments={comments} onSubmit={onSubmit} now={NOW} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reply to Planner' }));
  const field = screen.getByRole('textbox');
  fireEvent.change(field, { target: { value: '  Agreed.  ' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
  });
  expect(onSubmit).toHaveBeenCalledWith('Agreed.', comments[1]);
  expect((field as HTMLTextAreaElement).value).toBe('');
  expect(screen.queryByText(/Replying to/)).toBeNull();
});

test('a refused post keeps the draft, and Mod+Enter sends', async () => {
  const onSubmit = vi.fn().mockResolvedValue(false);
  render(<CommentThread comments={[]} onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox');
  fireEvent.change(field, { target: { value: 'Draft' } });
  await act(async () => {
    fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
  });
  expect(onSubmit).toHaveBeenCalledWith('Draft', null);
  expect((field as HTMLTextAreaElement).value).toBe('Draft');
});

test('a standing reason replaces the hint and blocks the post', () => {
  const onSubmit = vi.fn();
  render(
    <CommentThread comments={[]} onSubmit={onSubmit} hint="Watchers are told." disabledReason="Sign in to comment." />,
  );
  expect(screen.getAllByText('Sign in to comment.').length).toBeGreaterThan(0);
  expect(screen.queryByText('Watchers are told.')).toBeNull();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: 'Comment' }));
  expect(onSubmit).not.toHaveBeenCalled();
});

test('a thread with a field carries no violation', async () => {
  const { container } = render(
    <main>
      <CommentThread comments={comments} onSubmit={() => {}} hint="Watchers are told." now={NOW} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(', ')}`)).toEqual([]);
});
