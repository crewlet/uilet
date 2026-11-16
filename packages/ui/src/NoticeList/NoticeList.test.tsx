import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { Callout } from '../Callout/index.js';
import { groupNotices, NoticeList, type NoticeEntry } from './index.js';

afterEach(cleanup);

const count = (subjects: readonly string[]) => `${subjects.length} agents`;
const schedule = (subject: string, item: string): NoticeEntry => ({
  kind: 'schedule.frequent',
  tone: 'warning',
  subject,
  item,
  title: 'Schedules run 12 or more times a day',
  detail: 'Each run starts a turn even when nothing changed.',
});

describe('groupNotices', () => {
  test('says a warning raised once per item once, with the items under its subject', () => {
    const notices = groupNotices(
      [schedule('SRE', 'health-check'), schedule('SRE', 'release-window'), schedule('SRE', 'release-window')],
      { count },
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ subject: 'SRE', lines: [{ items: ['health-check', 'release-window'] }] });
  });

  test('names several subjects with no items by their count, and lists them', () => {
    const entry = (subject: string): NoticeEntry => ({ kind: 'aux', subject, title: 'Learning runs on the work model' });
    const [notice] = groupNotices([entry('CEO'), entry('CTO'), entry('PM')], { count });
    expect(notice).toMatchObject({ subject: '3 agents', lines: [{ items: ['CEO', 'CTO', 'PM'] }] });
  });

  test('gives each subject its own line when several carry items, and the title no subject', () => {
    const [notice] = groupNotices([schedule('SRE', 'health-check'), schedule('Support', 'inbox-sweep')], { count });
    expect(notice!.subject).toBeUndefined();
    expect(notice!.lines).toEqual([
      { subject: 'SRE', items: ['health-check'] },
      { subject: 'Support', items: ['inbox-sweep'] },
    ]);
  });

  test('puts the worst tone first and keeps the source order inside a tone', () => {
    const notices = groupNotices(
      [
        { kind: 'a', tone: 'info', title: 'A' },
        { kind: 'b', tone: 'danger', title: 'B' },
        { kind: 'c', tone: 'info', title: 'C' },
      ],
      { count },
    );
    expect(notices.map((n) => n.key)).toEqual(['b', 'a', 'c']);
  });
});

describe('NoticeList', () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ key: `n${i}`, title: `Notice ${i}` }));

  test('shows the first few and folds the rest behind Show N more', () => {
    render(<NoticeList notices={many} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Show 3 more' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Show fewer' }).getAttribute('aria-expanded')).toBe('true');
  });

  test('never folds a single notice behind Show 1 more', () => {
    render(<NoticeList notices={many.slice(0, 4)} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('folds a long line of items after a few, and never hides just one', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const { container, rerender } = render(<NoticeList notices={[{ key: 'k', title: 'T', lines: [{ items }] }]} />);
    const line = () => container.querySelector('.crewlet-notice-list__line')!.textContent;
    expect(line()).toBe('a, b, c, d and 3 more');
    fireEvent.click(screen.getByRole('button', { name: 'and 3 more' }));
    expect(line()).toBe('a, b, c, d, e, f, g');
    rerender(<NoticeList notices={[{ key: 'k2', title: 'T', lines: [{ items: items.slice(0, 5) }] }]} />);
    expect(screen.queryByRole('button', { name: /more/ })).toBeNull();
  });

  test('draws a glyph and says the tone only when the tones differ', () => {
    const { container, rerender } = render(
      <NoticeList notices={[{ key: 'a', tone: 'warning', title: 'A' }, { key: 'b', tone: 'warning', title: 'B' }]} />,
    );
    expect(container.querySelector('.crewlet-notice-list__glyph')).toBeNull();
    rerender(<NoticeList notices={[{ key: 'a', tone: 'danger', title: 'A' }, { key: 'b', tone: 'warning', title: 'B' }]} />);
    expect(container.querySelectorAll('.crewlet-notice-list__glyph')).toHaveLength(2);
    expect(screen.getByText('Problem:', { exact: false })).toBeTruthy();
  });

  test('passes axe inside a callout with a subject, items, a detail and an action', async () => {
    const { container } = render(
      <Callout variant="warning" title="2 warnings">
        <NoticeList
          label="Warnings"
          notices={[
            { key: 'a', subject: 'SRE', title: 'Schedules run often', lines: [{ items: ['health-check'] }], detail: 'Each run starts a turn.', action: <a href="#/s">Open Schedules</a> },
            { key: 'b', title: 'No agent watches alarms' },
          ]}
        />
      </Callout>,
    );
    const result = await axe.run(container);
    expect(result.violations).toEqual([]);
  });
});

describe('Callout onDismiss', () => {
  test('draws a named X after the action that puts the callout away', () => {
    let dismissed = 0;
    render(
      <Callout action={<button type="button">Review</button>} onDismiss={() => (dismissed += 1)} dismissLabel="Put away">
        Delegates decided 3 requests.
      </Callout>,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Review', 'Put away']);
    fireEvent.click(screen.getByRole('button', { name: 'Put away' }));
    expect(dismissed).toBe(1);
  });
});
