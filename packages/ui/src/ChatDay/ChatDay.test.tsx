/**
 * A day of a conversation: a group named by its day, the day's pill (plain,
 * or the host's own control such as a Jump to menu) pinned within the day,
 * and the New line drawn on the day's own rule.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { Menu } from '../Menu/index.js';
import { ChatDay, ChatDayPill } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
/** A stylesheet with its comments blanked, so prose about a rule is never read as the rule. */
const sheet = (name: string) => readFileSync(join(here, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** The declarations of the first rule whose selector is exactly this. */
const rule = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
};

test('a day is a group named by its day, with its label drawn as a pill', () => {
  render(
    <ChatDay label="Yesterday">
      <p>First message</p>
    </ChatDay>,
  );
  const day = screen.getByRole('group', { name: 'Yesterday' });
  expect(day.querySelector('.crewlet-chat-day__pill')?.textContent).toBe('Yesterday');
  expect(day.textContent).toContain('First message');
  // No New line unless the day asks for one.
  expect(screen.queryByRole('separator')).toBeNull();
});

test('a day that starts with the first unread message draws the New line on its own rule', () => {
  render(
    <ChatDay label="Today" unread="New">
      <p>Unread</p>
    </ChatDay>,
  );
  const line = screen.getByRole('separator', { name: 'New' });
  expect(line.getAttribute('data-divider')).toBe('unread');
  expect(line.parentElement?.classList.contains('crewlet-chat-day__rule')).toBe(true);
});

test('the pill slot takes a Jump to menu whose trigger is a ChatDayPill', () => {
  let picked = '';
  render(
    <ChatDay
      label="Today"
      pill={
        <Menu
          label="Today. Jump to a date"
          renderTrigger={(props) => <ChatDayPill {...props} label="Today" />}
          items={[{ key: 'beginning', label: 'The very beginning', onSelect: () => (picked = 'beginning') }]}
        />
      }
    >
      <p>Message</p>
    </ChatDay>,
  );
  const pill = screen.getByRole('button', { name: 'Today' });
  expect(pill.getAttribute('aria-haspopup')).toBe('menu');
  // A pill that opens a menu draws the chevron that says so.
  expect(pill.querySelector('svg')).not.toBeNull();
  fireEvent.click(pill);
  fireEvent.click(screen.getByRole('menuitem', { name: 'The very beginning' }));
  expect(picked).toBe('beginning');
});

test('a pill with a plain action draws no chevron, and is a button that never submits', () => {
  let pressed = 0;
  render(<ChatDayPill label="Monday" onClick={() => (pressed += 1)} />);
  const pill = screen.getByRole('button', { name: 'Monday' });
  expect(pill.getAttribute('type')).toBe('button');
  expect(pill.querySelector('svg')).toBeNull();
  fireEvent.click(pill);
  expect(pressed).toBe(1);
});

test('the pill pins within its own day, and its own margins stay positive', () => {
  /*
   * A sticky box may travel as far as its margin box allows, so a negative
   * margin on the pill's place let it run past the end of its day and sit on
   * the next day's pill. The rule under it takes the overlap instead.
   */
  const css = sheet('ChatDay.css');
  const label = rule(css, '.crewlet-chat-day__label');
  expect(label).toMatch(/position:\s*sticky;/);
  expect(label).toMatch(/top:\s*var\(--crewlet-chat-day-pin\);/);
  expect(label).toMatch(/margin-top:\s*calc\(var\(--crewlet-chat-day-gap\) - var\(--crewlet-chat-day-pill\) \/ 2\);/);
  expect(label).not.toMatch(/margin[\w-]*:\s*-|margin[\w-]*:\s*calc\(\s*-/);
  expect(rule(css, '.crewlet-chat-day__rule')).toMatch(/margin:\s*calc\(var\(--crewlet-chat-day-pill\) \/ -2\)/);
  // The day is the sticky box's range.
  expect(rule(css, '.crewlet-chat-day')).toMatch(/position:\s*relative;/);
});

test('a day and its Jump to pill carry no axe violation', async () => {
  const { container } = render(
    <main>
      <ChatDay label="Today" unread="New" pill={<ChatDayPill label="Today" aria-haspopup="menu" aria-expanded={false} />}>
        <p>Message</p>
      </ChatDay>
      <ChatDay label="Yesterday">
        <p>Earlier</p>
      </ChatDay>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
