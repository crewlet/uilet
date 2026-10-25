/**
 * A suggested question or request as a row: a button that selects itself,
 * its glyph decoration, a filling row saying so to assistive technology, and
 * a list that puts each row in its own item, plain or divided.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { Tag } from '../Tag/index.js';
import { SuggestionList, SuggestionRow } from './index.js';

afterEach(cleanup);

test('a row is a button that selects itself, its glyph hidden', () => {
  const onSelect = vi.fn();
  const { container } = render(
    <SuggestionRow icon={<svg />} onSelect={onSelect}>
      What are my agents doing now?
    </SuggestionRow>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'What are my agents doing now?' }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.crewlet-suggestion-row__icon')!.getAttribute('aria-hidden')).toBe('true');
});

test('a filling row says it fills the message box', () => {
  render(
    <SuggestionRow icon={<svg />} fills onSelect={() => {}}>
      Pause an agent…
    </SuggestionRow>,
  );
  expect(screen.getByRole('button', { name: 'Pause an agent…, fills the message box' })).toBeTruthy();
});

test('a divided list puts each row in its own item, with its fact, count and chevron', () => {
  const { container } = render(
    <SuggestionList divided aria-label="Needs you">
      <SuggestionRow
        icon={<svg />}
        detail="Agent CTO on ENG-133, Agent PM on PM-37"
        count={<Tag size="sm" variant="warning">2</Tag>}
        chevron
        onSelect={() => {}}
      >
        Decisions waiting on you
      </SuggestionRow>
      <SuggestionRow icon={<svg />} onSelect={() => {}}>
        Weekly budget is at 78%
      </SuggestionRow>
    </SuggestionList>,
  );
  const list = screen.getByRole('list', { name: 'Needs you' });
  expect(list.className).toContain('crewlet-suggestion-list--divided');
  const items = within(list).getAllByRole('listitem');
  expect(items.length).toBe(2);
  expect(items[0]!.textContent).toContain('Agent CTO on ENG-133');
  expect(container.querySelector('.crewlet-suggestion-row__trail svg')).not.toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <SuggestionList aria-label="Anywhere in Crewlet">
        <SuggestionRow icon={<svg />} onSelect={() => {}}>
          What shipped this week?
        </SuggestionRow>
        <SuggestionRow icon={<svg />} fills onSelect={() => {}}>
          Pause an agent…
        </SuggestionRow>
      </SuggestionList>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
