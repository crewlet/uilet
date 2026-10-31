/**
 * A message written in place: the field is named without a visible label,
 * Command+Enter submits (or Enter, for a chat composer, never mid
 * composition), the counter appears only near the limit, a disabled composer
 * says why and fades once, and what is attached is a named group before the
 * field.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { installAtWidth, installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { SendButton } from '../SendButton/index.js';
import { Tag } from '../Tag/index.js';
import { COMPOSER_COUNTER_AT, Composer } from './index.js';

afterEach(cleanup);

function Harness({ initial = '', onSubmit }: { initial?: string; onSubmit?: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <Composer
      label="Your reply"
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      maxLength={100}
      placeholder="Tell them what you want instead"
      actions={<button type="button">Submit</button>}
    />
  );
}

test('the field is named by its label and edits its value', () => {
  render(<Harness />);
  const field = screen.getByRole('textbox', { name: 'Your reply' }) as HTMLTextAreaElement;
  fireEvent.change(field, { target: { value: 'Greedy, but exact under five' } });
  expect(field.value).toBe('Greedy, but exact under five');
});

test('Command+Enter and Control+Enter submit; Enter alone adds a line', () => {
  const onSubmit = vi.fn();
  render(<Harness onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox');
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
  expect(onSubmit).toHaveBeenCalledTimes(2);
});

test('the shortcut hint is drawn only when there is something to submit', () => {
  const { container, rerender } = render(<Harness />);
  expect(container.querySelector('.crewlet-composer__hint')).toBeNull();
  rerender(<Harness onSubmit={() => {}} />);
  expect(container.querySelector('.crewlet-composer__hint')!.textContent).toMatch(/to send$/);
});

test('the counter appears only near the limit', () => {
  const { container } = render(<Harness initial={'x'.repeat(100 * COMPOSER_COUNTER_AT - 1)} />);
  expect(container.querySelector('.crewlet-composer__counter')).toBeNull();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(100 * COMPOSER_COUNTER_AT) } });
  expect(container.querySelector('.crewlet-composer__counter')!.textContent).toBe('80 / 100');
});

test('the footer is drawn only with something in it, and a phone drops one holding only the hint', () => {
  const footer = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-composer__footer');
  // Nothing to show: no strip at all.
  const { container, rerender } = render(<Composer label="Brief" value="" onChange={() => {}} />);
  expect(footer(container)).toBeNull();
  // Only the hint: drawn at a desk, gone on a phone with the hint it held.
  rerender(<Composer label="Brief" value="" onChange={() => {}} onSubmit={() => {}} />);
  let uninstall = installAtWidth(1024, 'light', 'Composer/Composer.css');
  expect(getComputedStyle(footer(container)!).display).toBe('flex');
  uninstall();
  uninstall = installAtWidth(390, 'light', 'Composer/Composer.css');
  expect(getComputedStyle(footer(container)!).display).toBe('none');
  // With actions beside the hint, a phone keeps the strip for them.
  rerender(
    <Composer label="Brief" value="" onChange={() => {}} onSubmit={() => {}} actions={<button type="button">Send</button>} />,
  );
  expect(getComputedStyle(footer(container)!).display).toBe('flex');
  expect(getComputedStyle(container.querySelector('.crewlet-composer__hint')!).display).toBe('none');
  // And the counter near the limit keeps it too.
  rerender(<Composer label="Brief" value={'x'.repeat(9)} maxLength={10} onChange={() => {}} onSubmit={() => {}} />);
  expect(getComputedStyle(footer(container)!).display).toBe('flex');
  uninstall();
});

test('the actions sit in the footer', () => {
  const { container } = render(<Harness />);
  expect(container.querySelector('.crewlet-composer__footer')!.textContent).toContain('Submit');
});

test("a chat composer's tools stand at the footer's start and its formatting row along the top", () => {
  const { container } = render(
    <Composer
      value=""
      onChange={() => {}}
      onSubmit={() => {}}
      submitOn="enter"
      label="Message #engineering"
      toolbar={
        <div role="toolbar" aria-label="Formatting">
          <button type="button">Bold</button>
        </div>
      }
      tools={<button type="button">Attach</button>}
      actions={<button type="button">Send</button>}
    />,
  );
  const box = container.querySelector('.crewlet-composer')!;
  // The formatting row comes first, before the words it acts on.
  expect(box.firstElementChild!.className).toBe('crewlet-composer__toolbar');
  expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeTruthy();
  // The footer holds the tools first and the actions last, a spacer between.
  const footer = container.querySelector('.crewlet-composer__footer')!;
  const parts = [...footer.children].map((child) => child.className || child.textContent);
  expect(parts[0]).toBe('crewlet-composer__tools');
  expect(footer.lastElementChild!.textContent).toBe('Send');
  expect(footer.querySelector('.crewlet-composer__tools + .crewlet-composer__spacer')).not.toBeNull();
});

test('tools alone draw the footer', () => {
  const { container } = render(
    <Composer value="" onChange={() => {}} label="Message" submitOn="enter" tools={<button type="button">Attach</button>} />,
  );
  const footer = container.querySelector('.crewlet-composer__footer')!;
  expect(footer).not.toBeNull();
  expect(footer.hasAttribute('data-hint-only')).toBe(false);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Reply</h1>
      <Harness onSubmit={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

function Chat({
  onSubmit,
  disabledReason,
  initial = '',
}: {
  onSubmit?: () => void;
  disabledReason?: string;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Composer
      label="Ask a follow-up"
      placeholder="Ask a follow-up"
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      submitOn="enter"
      disabledReason={disabledReason}
      attachmentsLabel="Attached to this question"
      attachments={
        <Tag size="sm" appearance="outline" onRemove={() => {}} removeAriaLabel="Remove Work › Tasks from this question">
          Work › Tasks
        </Tag>
      }
      trailing={<SendButton mode="send" onPress={() => onSubmit?.()} />}
    />
  );
}

test('a chat composer sends on Enter, writes a line on Shift+Enter, and draws no shortcut hint', () => {
  const onSubmit = vi.fn();
  const { container } = render(<Chat onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox', { name: 'Ask a follow-up' });
  fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
  expect(onSubmit).toHaveBeenCalledTimes(2);
  expect(container.querySelector('.crewlet-composer__hint')).toBeNull();
});

test('an Enter that ends an input method composition never sends', () => {
  const onSubmit = vi.fn();
  render(<Chat onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox');
  fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
  // Safari clears the flag on the Enter that ends a composition and marks it with key code 229.
  fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
  expect(onSubmit).not.toHaveBeenCalled();
});

test('a chat composer starts as one line and keeps its send button on the field row', () => {
  const { container } = render(<Chat />);
  const field = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(field.rows).toBe(1);
  expect(container.querySelector('.crewlet-composer--inline')).not.toBeNull();
  const row = container.querySelector('.crewlet-composer__row')!;
  expect(row.contains(field)).toBe(true);
  expect(row.querySelector('.crewlet-composer__trailing button')).not.toBeNull();
});

test('what is attached is a named group, before the field in reading order', () => {
  render(<Chat />);
  const group = screen.getByRole('group', { name: 'Attached to this question' });
  const field = screen.getByRole('textbox');
  expect(group.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove Work › Tasks from this question' })).toBeTruthy();
});

test('a disabled composer keeps the draft, shows its reason as the placeholder, says it, and never sends', () => {
  const onSubmit = vi.fn();
  const { container } = render(
    <Chat onSubmit={onSubmit} disabledReason="You can ask again in 30 seconds" initial="Which budget runs out first?" />,
  );
  const field = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(field.disabled).toBe(true);
  expect(field.value).toBe('Which budget runs out first?');
  expect(field.placeholder).toBe('You can ask again in 30 seconds');
  const describedBy = field.getAttribute('aria-describedby')!;
  expect(document.getElementById(describedBy)!.textContent).toBe('You can ask again in 30 seconds');
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onSubmit).not.toHaveBeenCalled();
  expect(container.querySelector('.crewlet-composer')!.classList.contains('is-disabled')).toBe(true);
});

test('a disabled composer fades once: the box at 0.6, the field and its button inside at 1', () => {
  const uninstall = installThemed('light', 'Input/Input.css', 'IconButton/IconButton.css', 'Composer/Composer.css');
  const { container } = render(
    <Composer
      label="Ask"
      value=""
      onChange={() => {}}
      submitOn="enter"
      disabledReason="Offline"
      trailing={<SendButton mode="send" onPress={() => {}} disabledReason="Offline" />}
    />,
  );
  expect(getComputedStyle(container.querySelector('.crewlet-composer')!).opacity).toBe('0.6');
  expect(getComputedStyle(screen.getByRole('textbox')).opacity).toBe('1');
  expect(getComputedStyle(screen.getByRole('button', { name: 'Send' })).opacity).toBe('1');
  uninstall();
});

test('the field never draws a ring of its own: the box owns it', () => {
  const uninstall = installThemed('light', 'Input/Input.css', 'Composer/Composer.css');
  render(<Chat />);
  const field = screen.getByRole('textbox');
  field.focus();
  expect(getComputedStyle(field).outlineStyle).toBe('none');
  uninstall();
});

test('a chat composer carries no axe violation, enabled and disabled', async () => {
  const { container, rerender } = render(
    <main>
      <h1>Assistant</h1>
      <Chat onSubmit={() => {}} />
    </main>,
  );
  const run = () =>
    axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
  expect((await run()).violations).toEqual([]);
  rerender(
    <main>
      <h1>Assistant</h1>
      <Chat onSubmit={() => {}} disabledReason="Offline" />
    </main>,
  );
  expect((await run()).violations).toEqual([]);
});
