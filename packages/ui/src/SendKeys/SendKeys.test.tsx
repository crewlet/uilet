/**
 * One send rule for every message box: Enter sends, Shift+Enter writes a
 * line, Command+Enter still sends, an input method's Enter and a claimed
 * Enter never do, and a touch keyboard's Return is a line. The hint and the
 * field's description say the same keys, and say none on a touch keyboard.
 */

import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { installPointer } from '../../../../apps/ui-tests/src/pointer.js';
import { Textarea } from '../Input/index.js';
import { SendKeysHint, isSendPress, sendKeysWords, useSendOnEnter, useTouchKeyboard, type SendKeyEvent } from './index.js';

afterEach(cleanup);

const press = (over: Partial<SendKeyEvent> = {}): SendKeyEvent => ({
  key: 'Enter',
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ctrlKey: false,
  defaultPrevented: false,
  ...over,
});

describe('isSendPress', () => {
  test.each([
    ['Enter', press(), false, true],
    ['Shift+Enter', press({ shiftKey: true }), false, false],
    ['Command+Enter', press({ metaKey: true }), false, true],
    ['Control+Enter', press({ ctrlKey: true }), false, true],
    ['Command+Shift+Enter', press({ metaKey: true, shiftKey: true }), false, true],
    ['Alt+Enter', press({ altKey: true }), false, false],
    ['an Enter inside a composition', press({ isComposing: true }), false, false],
    ["Safari's Enter ending a composition", press({ keyCode: 229 }), false, false],
    ['an Enter an open list claimed', press({ defaultPrevented: true }), false, false],
    ['a letter', press({ key: 'a' }), false, false],
    ["a touch keyboard's Return", press(), true, false],
    ['Command+Enter on a touch screen with a keyboard', press({ metaKey: true }), true, true],
  ])('%s', (_name, event, touch, sends) => {
    expect(isSendPress(event, touch)).toBe(sends);
  });
});

describe('useTouchKeyboard', () => {
  test.each([
    ['a phone', 'touch', true],
    ['a laptop with a touch screen', 'hybrid', false],
    ['a desk', 'fine', false],
  ] as const)('%s', (_name, kind, touch) => {
    const restore = installPointer(kind);
    try {
      expect(renderHook(() => useTouchKeyboard()).result.current).toBe(touch);
    } finally {
      restore();
    }
  });
});

function Box({ onSend, canSend = true, claim = false }: { onSend: () => void; canSend?: boolean; claim?: boolean }) {
  const [value, setValue] = useState('');
  const send = useSendOnEnter({ onSend, canSend });
  return (
    <>
      <Textarea
        aria-label="Reply"
        aria-describedby={send.describedBy}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // An open mention list takes its Enter first.
          if (claim && event.key === 'Enter') event.preventDefault();
          send.onKeyDown(event);
        }}
      />
      {send.description}
    </>
  );
}

describe('useSendOnEnter', () => {
  test('Enter sends and is the box\'s; Shift+Enter is left to the field', () => {
    const onSend = vi.fn();
    render(<Box onSend={onSend} />);
    const field = screen.getByRole('textbox', { name: 'Reply' });
    expect(fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
    expect(onSend).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
    expect(onSend).toHaveBeenCalledTimes(2);
  });

  test('with nothing to send, Enter neither sends nor writes a line', () => {
    const onSend = vi.fn();
    render(<Box onSend={onSend} canSend={false} />);
    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
  });

  test('an Enter an open list claimed picks there and never sends', () => {
    const onSend = vi.fn();
    render(<Box onSend={onSend} claim />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  test('an input method composing never sends, through its start and its end', () => {
    const onSend = vi.fn();
    render(<Box onSend={onSend} />);
    const field = screen.getByRole('textbox');
    fireEvent.compositionStart(field);
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
    fireEvent.compositionEnd(field);
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  test("the field's description names the keys in words", () => {
    render(<Box onSend={() => {}} />);
    const field = screen.getByRole('textbox');
    const description = document.getElementById(field.getAttribute('aria-describedby')!)!;
    expect(description.hidden).toBe(true);
    expect(description.textContent).toBe('Enter to send, Shift plus Enter for a new line');
  });

  test("on a touch keyboard Return writes a line, Command+Enter still sends, and no keys are named", () => {
    const restore = installPointer('touch');
    try {
      const onSend = vi.fn();
      render(<Box onSend={onSend} />);
      const field = screen.getByRole('textbox');
      expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(true);
      expect(onSend).not.toHaveBeenCalled();
      fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
      expect(onSend).toHaveBeenCalledTimes(1);
      expect(field.hasAttribute('aria-describedby')).toBe(false);
    } finally {
      restore();
    }
  });
});

describe('SendKeysHint', () => {
  test('draws both chords in the platform notation, with their words', () => {
    const { container, rerender } = render(<SendKeysHint apple={false} />);
    expect(container.textContent).toBe('EnterEnter to send, Shift+EnterShift plus Enter for a new line');
    rerender(<SendKeysHint apple labels={{ send: 'to save' }} />);
    expect(container.textContent).toBe('↵Return to save, ⇧↵Shift plus Return for a new line');
  });

  test('is not drawn on a touch keyboard', () => {
    const restore = installPointer('touch');
    try {
      const { container } = render(<SendKeysHint />);
      expect(container.textContent).toBe('');
    } finally {
      restore();
    }
  });

  test('says the words its description says', () => {
    expect(sendKeysWords(undefined, true)).toBe('Return to send, Shift plus Return for a new line');
    expect(sendKeysWords({ send: 'to save' }, false)).toBe('Enter to save, Shift plus Enter for a new line');
  });
});
