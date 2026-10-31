/**
 * The tray a message shows on hover: one tab stop the arrows walk, quick
 * reactions named by what they do, tools whose hint is their name, a tool
 * that can be a Menu's own trigger, and a divider said by nothing.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { BookmarkGlyph, EllipsisGlyph, MessagesSquareGlyph } from '@crewlethq/icons/glyphs';
import { installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { Menu } from '../Menu/index.js';
import { ActionDivider, MessageAction, MessageActions, QuickReaction } from './index.js';

afterEach(cleanup);

function Tray({ onReact = () => {}, onReply = () => {}, saved = false }: { onReact?: (emoji: string) => void; onReply?: () => void; saved?: boolean }) {
  return (
    <MessageActions>
      <QuickReaction emoji="✅" onPick={() => onReact('✅')} />
      <QuickReaction emoji="👀" onPick={() => onReact('👀')} />
      <MessageAction label="Reply in thread" icon={<MessagesSquareGlyph size="md" />} onClick={onReply} />
      <MessageAction label={saved ? 'Remove from Saved' : 'Save for later'} icon={<BookmarkGlyph size="md" />} pressed={saved} />
      <ActionDivider />
      <Menu
        label="More actions"
        align="end"
        renderTrigger={(props) => <MessageAction {...props} label="More actions" icon={<EllipsisGlyph size="md" />} />}
        items={[{ key: 'copy', label: 'Copy link', onSelect: () => {} }]}
      />
    </MessageActions>
  );
}

test('is a toolbar named Message actions, one tab stop the arrows walk', () => {
  render(<Tray />);
  const toolbar = screen.getByRole('toolbar', { name: 'Message actions' });
  const buttons = [...toolbar.querySelectorAll('button')];
  expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
  buttons[0]!.focus();
  fireEvent.keyDown(buttons[0]!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'React with eyes' }));
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More actions' }));
});

test('a quick reaction is the emoji itself, named by what it does', () => {
  const onReact = vi.fn();
  render(<Tray onReact={onReact} />);
  const check = screen.getByRole('button', { name: 'React with check' });
  expect(check.textContent).toBe('✅');
  fireEvent.click(check);
  expect(onReact).toHaveBeenCalledWith('✅');
});

test('a tool is named by its label, says it as its hint, and carries its pressed state', async () => {
  const onReply = vi.fn();
  render(<Tray onReply={onReply} saved />);
  const reply = screen.getByRole('button', { name: 'Reply in thread' });
  fireEvent.click(reply);
  expect(onReply).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Remove from Saved' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.focus(reply);
  await waitFor(() => expect(screen.getByRole('tooltip').textContent).toBe('Reply in thread'));
});

test("a tool can be a Menu's own trigger, and its hint steps aside while the menu is open", async () => {
  render(<Tray />);
  const more = screen.getByRole('button', { name: 'More actions' });
  expect(more.getAttribute('aria-haspopup')).toBe('menu');
  fireEvent.click(more);
  expect(more.getAttribute('aria-expanded')).toBe('true');
  await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeTruthy());
  expect(screen.queryByRole('tooltip')).toBeNull();
});

test('the divider is said by nothing', () => {
  render(<Tray />);
  expect(document.querySelector('.crewlet-message-actions__divider')!.getAttribute('aria-hidden')).toBe('true');
});

// A SOFT TRAY, NOT A FRAMED BAR, on one line. Two classes, so Toolbar's own
// wrap and padding never win in a bundle that orders it later.
test("holds the tray's own shape over Toolbar's in either order", () => {
  const uninstall = installThemed('light', 'MessageActions/MessageActions.css', 'Toolbar/Toolbar.css');
  try {
    render(<Tray />);
    const toolbar = screen.getByRole('toolbar');
    expect(getComputedStyle(toolbar).flexWrap).toBe('nowrap');
    expect(getComputedStyle(toolbar).borderStyle).toBe('solid');
  } finally {
    uninstall();
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Tray />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
