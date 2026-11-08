/**
 * A message written in place: the field is named without a visible label,
 * Enter sends and Shift+Enter writes a line (never mid composition, never a
 * touch keyboard's Return), the counter appears only near the limit, a
 * disabled composer says why and fades once, and what is attached is a named
 * group before the field.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { installAtWidth, installMotion, installSheets, installThemed, px, userAction } from '../../../../apps/ui-tests/src/cascade.js';
import { shadow, themes } from '@crewlethq/tokens';
import { contrast, flatten, parseHex } from '@crewlethq/tokens/test/palette';
import { FOCUS_MODALITY_ATTRIBUTE } from '../utils/focusModality.js';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { installPointer } from '../../../../apps/ui-tests/src/pointer.js';
import { IconButton } from '../IconButton/index.js';
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

test('Enter sends, Shift+Enter writes a line, and Command+Enter and Control+Enter still send', () => {
  const onSubmit = vi.fn();
  render(<Harness initial="Ship it" onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox');
  expect(fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
  expect(onSubmit).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
  expect(onSubmit).toHaveBeenCalledTimes(3);
});

test('an empty or blank box sends nothing on Enter and writes no line', () => {
  const onSubmit = vi.fn();
  render(<Harness initial="  " onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox');
  expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
  fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
  expect(onSubmit).not.toHaveBeenCalled();
});

test('a caller whose send carries more than the words says when it can send', () => {
  const onSubmit = vi.fn();
  const { rerender } = render(<Composer label="Brief" value="" onChange={() => {}} onSubmit={onSubmit} canSubmit />);
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalledTimes(1);
  rerender(<Composer label="Brief" value="Ship it" onChange={() => {}} onSubmit={onSubmit} canSubmit={false} />);
  expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })).toBe(false);
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test('an Enter the caller claims (an open list picking its row) never sends', () => {
  const onSubmit = vi.fn();
  render(
    <Composer
      label="Message"
      value="@ad"
      onChange={() => {}}
      onSubmit={onSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault();
      }}
    />,
  );
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
  expect(onSubmit).not.toHaveBeenCalled();
});

test('on a touch keyboard Return writes a line, the send button sends, and no hint is drawn', () => {
  const restore = installPointer('touch');
  try {
    const onSubmit = vi.fn();
    const { container } = render(<Harness initial="Ship it" onSubmit={onSubmit} />);
    const field = screen.getByRole('textbox');
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('.crewlet-composer__hint')).toBeNull();
    expect(field.hasAttribute('aria-describedby')).toBe(false);
  } finally {
    restore();
  }
});

test('the send hint is drawn only when there is something to send, and says the keys', () => {
  const { container, rerender } = render(<Harness />);
  expect(container.querySelector('.crewlet-composer__hint')).toBeNull();
  rerender(<Harness onSubmit={() => {}} />);
  expect(container.querySelector('.crewlet-composer__hint')!.textContent).toMatch(/to send, .*for a new line$/);
});

test('the field is multiline and its description names the send keys, hint drawn or not', () => {
  const { rerender } = render(<Composer label="Reply" value="" onChange={() => {}} onSubmit={() => {}} />);
  const described = () => {
    const field = screen.getByRole('textbox', { name: 'Reply' });
    expect(field.getAttribute('aria-multiline')).toBe('true');
    return field
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)!.textContent)
      .join(' | ');
  };
  expect(described()).toBe('Enter to send, Shift plus Enter for a new line');
  rerender(<Composer label="Reply" value="" onChange={() => {}} onSubmit={() => {}} sendHint={false} />);
  expect(document.querySelector('.crewlet-composer__hint')).toBeNull();
  expect(described()).toBe('Enter to send, Shift plus Enter for a new line');
  rerender(
    <Composer label="Reply" value="" onChange={() => {}} onSubmit={() => {}} sendLabels={{ send: 'to save' }} aria-describedby="outside" />,
  );
  expect(screen.getByRole('textbox').getAttribute('aria-describedby')!.startsWith('outside ')).toBe(true);
  expect(document.querySelector('.crewlet-composer__hint')!.textContent).toMatch(/to save, /);
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
      sendHint={false}
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

test('a chat composer is drawn on the transcript\'s scale, its footer with no rule of its own', () => {
  const uninstall = installThemed('dark', 'ChatMessage/ChatScale.css', 'Composer/Composer.css');
  try {
    const { container } = render(
      <Composer appearance="chat" value="" onChange={() => {}} label="Message" tools={<button type="button" aria-expanded="true">Emoji</button>} />,
    );
    const box = container.querySelector('.crewlet-composer')!;
    expect(box.className).toContain('crewlet-composer--chat');
    const footer = getComputedStyle(container.querySelector('.crewlet-composer__footer')!);
    expect(footer.borderTopWidth === '0px' || footer.borderTopStyle === 'none' || footer.borderTop.startsWith('0')).toBe(true);
    const field = getComputedStyle(container.querySelector('.crewlet-composer__field')!);
    expect(field.fontSize).not.toBe('');
  } finally {
    uninstall();
  }
  // The default composer is unchanged.
  const { container } = render(<Composer value="" onChange={() => {}} label="Reply" />);
  expect(container.querySelector('.crewlet-composer')!.className).not.toContain('crewlet-composer--chat');
});

test('tools alone draw the footer', () => {
  const { container } = render(
    <Composer value="" onChange={() => {}} label="Message" tools={<button type="button">Attach</button>} />,
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
      sendHint={false}
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

test('a chat composer sends on Enter, writes a line on Shift+Enter, and draws no hint when told not to', () => {
  const onSubmit = vi.fn();
  const { container } = render(<Chat onSubmit={onSubmit} initial="Which budget runs out first?" />);
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
  render(<Chat onSubmit={onSubmit} initial="こんにちは" />);
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

test('a chat composer says when it is empty, which is when its formatting row rests', () => {
  function Box() {
    const [value, setValue] = useState('');
    return <Composer appearance="chat" value={value} onChange={setValue} label="Message" />;
  }
  const { container } = render(<Box />);
  const box = container.querySelector('.crewlet-composer')!;
  expect(box.classList.contains('is-empty')).toBe(true);
  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Hello' } });
  expect(box.classList.contains('is-empty')).toBe(false);
});

/*
 * THE CHAT BOX'S EDGE AND FOCUS. At rest the quiet box edge (the hairline in
 * light, the medium step in dark), unmoved by the pointer; on focus the strong
 * step and a softer lift, and for the keyboard that step two pixels thick, as
 * an outline in the same grey rather than an accent ring.
 */
function chatBox() {
  const { container } = render(<Composer appearance="chat" value="" onChange={() => {}} label="Message" />);
  return { box: container.querySelector<HTMLElement>('.crewlet-composer')!, field: screen.getByRole('textbox', { name: 'Message' }) };
}

test('a chat box rests on the quiet box edge, and the pointer passing over it changes nothing', () => {
  for (const theme of ['light', 'dark'] as const) {
    const { edge } = themes[theme].color;
    const uninstall = installThemed(theme, 'ChatMessage/ChatScale.css', 'Composer/Composer.css');
    const { box } = chatBox();
    const rest = getComputedStyle(box).borderTopColor;
    expect(rest, theme).toBe(probe(edge.box));
    expect(edge.box, theme).toBe(theme === 'light' ? edge.hairline : edge.medium);
    const leave = userAction(box, 'hover');
    expect(getComputedStyle(box).borderTopColor, `${theme} hover`).toBe(rest);
    leave();
    cleanup();
    uninstall();
  }
});

test('focus steps a chat box to the strong edge, two pixels for the keyboard, with no accent ring', () => {
  for (const theme of ['light', 'dark'] as const) {
    const { color } = themes[theme];
    const uninstall = installThemed(theme, 'Input/Input.css', 'ChatMessage/ChatScale.css', 'Composer/Composer.css');
    const { box, field } = chatBox();
    tabTo(field);
    const strong = probe(color.edge.strong);
    const style = getComputedStyle(box);
    expect(style.borderTopColor, theme).toBe(strong);
    expect([style.outlineStyle, style.outlineWidth, style.outlineColor], theme).toEqual(['solid', '2px', strong]);
    expect(style.boxShadow, theme).toBe(shadow.sm);
    // The step clears 3:1 against the page round the box and the box's own ground.
    const page = parseHex(color.surface.background)!;
    const ground = flatten(color.fill.row, page);
    const edge = parseHex(color.edge.strong)!;
    expect(contrast(edge, page), `${theme} on the page`).toBeGreaterThanOrEqual(3);
    expect(contrast(edge, ground), `${theme} on the box`).toBeGreaterThanOrEqual(3);
    // At rest the edge is quiet, under the 3:1 a field's edge draws.
    expect(contrast(flatten(color.edge.box, page), page), `${theme} at rest`).toBeLessThan(3);
    cleanup();
    uninstall();
  }
});

test('a pointer gets the edge step alone, its outline drawn only in forced colours', () => {
  const uninstall = installThemed('light', 'Input/Input.css', 'ChatMessage/ChatScale.css', 'Composer/Composer.css');
  document.documentElement.setAttribute(FOCUS_MODALITY_ATTRIBUTE, 'pointer');
  try {
    const { box, field } = chatBox();
    field.focus();
    const style = getComputedStyle(box);
    expect(style.borderTopColor).toBe(probe(themes.light.color.edge.strong));
    expect([style.outlineWidth, style.outlineColor]).toEqual(['1px', probe('transparent')]);
  } finally {
    document.documentElement.removeAttribute(FOCUS_MODALITY_ATTRIBUTE);
    uninstall();
  }
});

test('a chat box steps its edge at the chat feedback step, and not at all under reduced motion', () => {
  for (const [preference, expected] of [['no-preference', /border-color/], ['reduce', /^(none|all 0s ease 0s)?$/]] as const) {
    const uninstall = installMotion(preference, 'ChatMessage/ChatScale.css', 'Composer/Composer.css');
    const { box } = chatBox();
    expect(getComputedStyle(box).transition, preference).toMatch(expected);
    cleanup();
    uninstall();
  }
});

/** A colour as jsdom computes it, for comparing a token's value with a computed style. */
function probe(colour: string): string {
  const el = document.createElement('i');
  el.style.color = colour;
  document.body.append(el);
  const value = getComputedStyle(el).color;
  el.remove();
  return value;
}

// EVERY TOOL OF A CHAT BOX ON THE CHAT TOOL STEP: 28px squares at the small
// corner with the toolbar's 18px glyph, in a band and a foot of one tool plus
// a small inset, the first glyph on the words' 12px inset. Mutation: drop the
// chat tool rules and the tools fall back to 26px squares with 12px glyphs.
test("a chat box's tools are 28px squares at the small corner with 18px glyphs, Send keeping its own glyph", () => {
  const uninstall = installSheets('IconButton/IconButton.css', 'ChatMessage/ChatScale.css', 'Composer/Composer.css');
  try {
    const glyph = <svg className="crewlet-glyph" aria-hidden="true" />;
    const { container } = render(
      <Composer
        appearance="chat"
        value=""
        onChange={() => {}}
        label="Message"
       
        toolbar={<IconButton label="Bold" size="sm" variant="ghost" icon={glyph} />}
        tools={<IconButton label="Emoji" size="sm" variant="ghost" icon={glyph} />}
        actions={<SendButton mode="send" onPress={() => {}} />}
      />,
    );
    const bold = screen.getByRole('button', { name: 'Bold' });
    const emoji = screen.getByRole('button', { name: 'Emoji' });
    for (const tool of [bold, emoji]) {
      expect(px(tool, 'width')).toBe(28);
      expect(px(tool, 'height')).toBe(28);
      expect(getComputedStyle(tool).borderRadius).toBe('4px');
      expect(px(tool.querySelector('.crewlet-glyph')!, 'width')).toBe(18);
    }
    const send = container.querySelector('.crewlet-send-button')!;
    expect(px(send, 'width')).toBe(28);
    expect(px(send.querySelector('.crewlet-send-button__glyph')!, 'width')).toBe(14);
    // The band: 6 over the tool and 4 under it, 7 at the start (12 less half of 28 - 18).
    const band = container.querySelector('.crewlet-composer__toolbar')!;
    expect(getComputedStyle(band).getPropertyValue('padding-block')).toMatch(/^calc\(12px \/ 2\) 4px$|^6px 4px$/);
    expect(px(band, 'padding-inline-start')).toBe(7);
  } finally {
    uninstall();
  }
});
