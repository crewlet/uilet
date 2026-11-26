/**
 * Dictation in the Composer, driven by the fake transport and microphone:
 * every state of the session, the keys it takes, the caret splice and the
 * Cancel restore, one `onChange` per Accept, one session per tab, and what is
 * announced.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type KeyboardEvent } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { Composer } from '../Composer/index.js';
import { joinWords, resetDictation, splice } from './machine.js';
import { ENTRY_LABELS, chordMatches } from './slot.js';
import {
  DICTATION_LABELS,
  fakeMicrophone,
  fakeTransport,
  preloadDictation,
  type DictationSource,
  type FakeMicrophoneOptions,
  type FakeTransportOptions,
} from './index.js';

const PACE = 50;

interface BoxProps {
  source: DictationSource | undefined;
  initial?: string;
  label?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  inline?: boolean;
  maxLength?: number;
  disabledReason?: string;
}

function Box({ source, initial = '', label = 'Reply', onChange, inline = false, ...rest }: BoxProps) {
  const [value, setValue] = useState(initial);
  return (
    <Composer
      label={label}
      value={value}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
      dictation={source}
      actions={inline ? undefined : <button type="button">Submit</button>}
      trailing={inline ? <button type="button">Send</button> : undefined}
      {...rest}
    />
  );
}

function setup(transport: FakeTransportOptions = {}, mic: FakeMicrophoneOptions = {}, extra: Partial<DictationSource> = {}) {
  const t = fakeTransport({ pace: PACE, flushDelay: 20, ...transport });
  const m = fakeMicrophone(mic);
  const source: DictationSource = { transport: t, microphone: m, ...extra };
  return { t, m, source };
}

const tick = async (ms = 0) => {
  await act(() => vi.advanceTimersByTimeAsync(ms));
};
const said = () => screen.getByRole('status').textContent ?? '';
const field = (name = 'Reply') => screen.getByRole('textbox', { name }) as HTMLTextAreaElement;
const button = (name: string) => screen.getByRole('button', { name });
const note = () => document.querySelector('.crewlet-dictation__note')?.textContent ?? null;
/** The reason a held control is described by. */
const reason = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .join(' ');
const provisional = () => document.querySelector('.crewlet-dictation__provisional')?.textContent ?? null;

async function startIn(name = 'Dictate') {
  fireEvent.click(button(name));
  await tick();
}

beforeAll(async () => {
  await preloadDictation();
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  act(() => resetDictation());
  cleanup();
  vi.useRealTimers();
});

describe('the words', () => {
  test('a splice puts the words at the caret with a space where a neighbour needs one', () => {
    expect(splice('', 0, 0, 'Hello there.')).toEqual({ value: 'Hello there.', caret: 12 });
    expect(splice('Ship it', 7, 7, 'today.')).toEqual({ value: 'Ship it today.', caret: 14 });
    expect(splice('Ship it ', 8, 8, 'today.')).toEqual({ value: 'Ship it today.', caret: 14 });
    expect(splice('Hi team.', 0, 0, 'Morning')).toEqual({ value: 'Morning Hi team.', caret: 7 });
    expect(splice('Send it now.', 5, 7, 'the deck')).toEqual({ value: 'Send the deck now.', caret: 13 });
    expect(splice('Done', 4, 4, 'mostly')).toEqual({ value: 'Done mostly', caret: 11 });
    expect(splice('Wait.', 4, 4, 'for me')).toEqual({ value: 'Wait for me.', caret: 11 });
  });

  test('the entry says the same words as the full labels', () => {
    expect(DICTATION_LABELS).toMatchObject(ENTRY_LABELS);
  });

  test('segments join with one space', () => {
    expect(joinWords(['First.', ' Second. ', '', 'third'])).toBe('First. Second. third');
  });

  test('the shortcut is Mod+Shift+Space, Command on Apple platforms and Control elsewhere', () => {
    const press = (init: Partial<globalThis.KeyboardEvent>) => new KeyboardEvent('keydown', { key: ' ', code: 'Space', ...init });
    const chord = ['Mod', 'Shift', 'Space'];
    expect(chordMatches(chord, press({ metaKey: true, shiftKey: true }), true)).toBe(true);
    expect(chordMatches(chord, press({ ctrlKey: true, shiftKey: true }), false)).toBe(true);
    expect(chordMatches(chord, press({ ctrlKey: true, shiftKey: true }), true)).toBe(false);
    expect(chordMatches(chord, press({ ctrlKey: true }), false)).toBe(false);
    expect(chordMatches(chord, press({ ctrlKey: true, shiftKey: true, altKey: true }), false)).toBe(false);
  });
});

describe('idle', () => {
  test('the mic and its chevron stand immediately before the send slot', () => {
    const { source } = setup();
    render(<Box source={source} />);
    const order = [...document.querySelectorAll('.crewlet-composer__footer button')].map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(order).toEqual(['Dictate', 'Choose a microphone', 'Submit']);
  });

  test('in the inline layout they stand before the trailing control', () => {
    const { source } = setup();
    render(<Box source={source} inline />);
    const trailing = document.querySelector('.crewlet-composer__trailing')!;
    const order = [...trailing.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(order).toEqual(['Dictate', 'Choose a microphone', 'Send']);
    expect(document.querySelector('.crewlet-composer__footer')).toBeNull();
  });

  test('without a source nothing is drawn', () => {
    render(<Box source={undefined} />);
    expect(screen.queryByRole('button', { name: 'Dictate' })).toBeNull();
  });

  test('the mic is a toggle button', () => {
    const { source } = setup();
    render(<Box source={source} />);
    expect(button('Dictate').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('a session', () => {
  test('provisional words show at the caret and never go through onChange', async () => {
    const onChange = vi.fn();
    const { source } = setup();
    render(
      <>
        <Announcer />
        <Box source={source} onChange={onChange} />
      </>,
    );
    await startIn();
    expect(said()).toBe(DICTATION_LABELS.dictating);
    expect(field().readOnly).toBe(true);
    // The field's description says the keys while dictating.
    const described = field().getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain(DICTATION_LABELS.dictating);
    expect(provisional()).toBe(DICTATION_LABELS.listening);
    await tick(PACE * 3);
    expect(provisional()).toBe('Let’s move the');
    // The words are a layer over the field: its value is untouched.
    expect(field().value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
    // Cancel and Accept stand in the send slot's place.
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    expect(button('Cancel dictation')).toBeTruthy();
    expect(button('Accept dictation')).toBeTruthy();
    expect(document.querySelector('.crewlet-composer')!.classList.contains('is-dictating')).toBe(true);
  });

  test('Accept writes the words once, with the caret after them, and brings send back', async () => {
    const onChange = vi.fn();
    const { t, m, source } = setup();
    render(
      <>
        <Announcer />
        <Box source={source} onChange={onChange} />
      </>,
    );
    await startIn();
    await tick(PACE * 9);
    fireEvent.click(button('Accept dictation'));
    await tick();
    // The check waits on the transport's last words.
    expect(button('Accept dictation').getAttribute('aria-busy')).toBe('true');
    await tick(30);
    expect(onChange).toHaveBeenCalledTimes(1);
    const value = onChange.mock.calls[0]![0] as string;
    expect(value).toBe('Let’s move the launch review to Thursday morning. Please.');
    expect(field().value).toBe(value);
    expect(field().selectionStart).toBe(value.length);
    expect(document.activeElement).toBe(field());
    expect(said()).toBe('Inserted 9 words');
    expect(t.calls).toEqual(['start:default', 'flush']);
    expect(m.openCount).toBe(0);
    expect(button('Submit')).toBeTruthy();
    expect(button('Dictate')).toBeTruthy();
    expect(field().readOnly).toBe(false);
  });

  test('Accept splices at the caret and replaces a selection', async () => {
    const onChange = vi.fn();
    const { source } = setup({ script: ['the new deck'] });
    render(<Box source={source} initial="Send the draft today." onChange={onChange} />);
    field().focus();
    field().setSelectionRange(5, 14);
    await startIn();
    await tick(PACE * 3);
    // While dictating, the layer shows the draft as it will read.
    expect(document.querySelector('.crewlet-dictation__layer')!.textContent).toBe('Send the new deck today.');
    fireEvent.keyDown(field(), { key: 'Enter' });
    await tick(30);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('Send the new deck today.');
    expect(field().selectionStart).toBe('Send the new deck'.length);
  });

  test('a field never focused takes the words at the end of its draft', async () => {
    const onChange = vi.fn();
    const { source } = setup({ script: ['and the deck.'], loop: false });
    render(<Box source={source} initial="Notes:" onChange={onChange} />);
    await startIn();
    await tick(PACE * 4);
    fireEvent.click(button('Accept dictation'));
    await tick(30);
    expect(onChange).toHaveBeenLastCalledWith('Notes: and the deck.');
  });

  test('Cancel leaves the value and restores the caret and selection exactly', async () => {
    const onChange = vi.fn();
    const { t, m, source } = setup();
    render(
      <>
        <Announcer />
        <Box source={source} initial="Keep this text" onChange={onChange} />
      </>,
    );
    field().focus();
    field().setSelectionRange(5, 9);
    await startIn();
    await tick(PACE * 4);
    fireEvent.click(button('Cancel dictation'));
    await tick();
    expect(onChange).not.toHaveBeenCalled();
    expect(field().value).toBe('Keep this text');
    expect([field().selectionStart, field().selectionEnd]).toEqual([5, 9]);
    expect(document.activeElement).toBe(field());
    expect(said()).toBe(DICTATION_LABELS.cancelled);
    expect(t.calls).toEqual(['start:default', 'cancel']);
    expect(m.openCount).toBe(0);
  });

  test('Enter accepts and never sends; Escape cancels, marked handled so a panel stays open', async () => {
    const onSubmit = vi.fn();
    const onKeyDown = vi.fn();
    const outer = vi.fn();
    const { source } = setup();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={outer}>
        <Box source={source} initial="Hi" onSubmit={onSubmit} onKeyDown={onKeyDown} />
      </div>,
    );
    await startIn();
    await tick(PACE * 2);
    const escape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      field().dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);
    expect(outer).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(button('Dictate')).toBeTruthy();

    await startIn();
    await tick(PACE * 2);
    const enter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => {
      field().dispatchEvent(enter);
    });
    await tick(30);
    expect(enter.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(field().value).toContain('Hi');
    expect(field().value.length).toBeGreaterThan(2);
  });

  test('the shortcut starts, pauses and resumes from the field', async () => {
    const { m, source } = setup();
    render(
      <>
        <Announcer />
        <Box source={source} />
      </>,
    );
    const chord = { key: ' ', code: 'Space', ctrlKey: true, shiftKey: true };
    fireEvent.keyDown(field(), chord);
    await tick();
    expect(button('Accept dictation')).toBeTruthy();
    await tick(PACE * 2);
    fireEvent.keyDown(field(), chord);
    await tick(30);
    expect(note()).toBe(DICTATION_LABELS.stopped.paused);
    expect(m.openCount).toBe(0);
    fireEvent.keyDown(field(), chord);
    await tick(30);
    expect(note()).toBeNull();
    expect(m.openCount).toBe(1);
  });

  test('a long silence hints, then stops capture and releases the microphone; the mic resumes', async () => {
    const { m, source } = setup({ quietAfter: 2 }, { level: 'silent' }, { silence: { hint: 1, stop: 3 } });
    render(
      <>
        <Announcer />
        <Box source={source} />
      </>,
    );
    await startIn();
    await tick(1300);
    expect(note()).toBe(DICTATION_LABELS.quiet);
    await tick(2000);
    expect(note()).toBe(DICTATION_LABELS.stopped.silence);
    expect(said()).toBe(DICTATION_LABELS.stopped.silence);
    expect(m.openCount).toBe(0);
    expect(button('Accept dictation')).toBeTruthy();
    // The mic comes back in its own place, before its chevron, to resume.
    const order = [...document.querySelectorAll('.crewlet-composer__footer button')].map((b) => b.getAttribute('aria-label'));
    expect(order).toEqual([DICTATION_LABELS.resume, 'Choose a microphone', 'Cancel dictation', 'Accept dictation']);
    fireEvent.click(button(DICTATION_LABELS.resume));
    await tick(30);
    expect(m.openCount).toBe(1);
    expect(note()).toBeNull();
  });

  test.each([
    ['dropped', DICTATION_LABELS.stopped.dropped],
    ['refused', DICTATION_LABELS.stopped.refused],
    ['quota', DICTATION_LABELS.stopped.quota],
    ['length', DICTATION_LABELS.stopped.length],
    ['silence', DICTATION_LABELS.stopped.silence],
  ] as const)('a transport that ends with %s keeps the words for Accept or Cancel', async (code, words) => {
    const onChange = vi.fn();
    const { m, source } = setup({ fail: { code, after: 3 } });
    render(
      <>
        <Announcer />
        <Box source={source} onChange={onChange} />
      </>,
    );
    await startIn();
    await tick(PACE * 5);
    expect(note()).toBe(words);
    expect(said()).toBe(words);
    expect(provisional()).toBe('Let’s move the');
    expect(m.openCount).toBe(0);
    fireEvent.click(button('Accept dictation'));
    await tick();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('Let’s move the');
  });

  test('a session refused before any word draws no listening line', async () => {
    const { source } = setup({ fail: { code: 'refused', after: 0 } });
    render(<Box source={source} />);
    await startIn();
    await tick(PACE * 2);
    expect(note()).toBe(DICTATION_LABELS.stopped.refused);
    expect(provisional()).toBe('');
  });

  test('a microphone unplugged mid-dictation stops capture and keeps the words', async () => {
    const { m, source } = setup();
    render(<Box source={source} />);
    await startIn();
    await tick(PACE * 3);
    act(() => m.unplug());
    await tick();
    expect(note()).toBe(DICTATION_LABELS.stopped.unplugged);
    expect(button('Cancel dictation')).toBeTruthy();
    expect(screen.queryByRole('button', { name: DICTATION_LABELS.resume })).toBeNull();
  });

  test('Accept waits at most a moment and a half for the last words', async () => {
    const onChange = vi.fn();
    const { source } = setup({ flushDelay: 5000 });
    render(<Box source={source} onChange={onChange} />);
    await startIn();
    await tick(PACE * 3);
    fireEvent.click(button('Accept dictation'));
    await tick(1400);
    expect(onChange).not.toHaveBeenCalled();
    await tick(200);
    expect(onChange).toHaveBeenLastCalledWith('Let’s move the');
  });

  test('Accept with nothing heard inserts nothing', async () => {
    const onChange = vi.fn();
    const { source } = setup({ quietAfter: 0 });
    render(
      <>
        <Announcer />
        <Box source={source} onChange={onChange} />
      </>,
    );
    await startIn();
    fireEvent.click(button('Accept dictation'));
    await tick(30);
    expect(onChange).not.toHaveBeenCalled();
    expect(said()).toBe(DICTATION_LABELS.nothing);
  });

  test('past the budget Accept still inserts, as a paste would, and the counter says so', async () => {
    const onChange = vi.fn();
    const { source } = setup();
    render(<Box source={source} maxLength={20} onChange={onChange} />);
    await startIn();
    await tick(PACE * 9);
    fireEvent.click(button('Accept dictation'));
    await tick(30);
    expect((onChange.mock.calls[0]![0] as string).length).toBeGreaterThan(20);
    expect(document.querySelector('.crewlet-composer__counter')).not.toBeNull();
  });

  test('a composer unmounted mid-dictation keeps its finished words and releases the microphone', async () => {
    const onChange = vi.fn();
    const { t, m, source } = setup();
    const view = render(<Box source={source} onChange={onChange} />);
    await startIn();
    await tick(PACE * 9);
    view.unmount();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('Let’s move the launch review to Thursday morning.');
    expect(t.calls).toContain('cancel');
    expect(m.openCount).toBe(0);
  });

  test('the caller hears when a session starts and ends', async () => {
    const onActiveChange = vi.fn();
    const { source } = setup({}, {}, { onActiveChange });
    render(<Box source={source} />);
    await startIn();
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(button('Cancel dictation'));
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });

  test('the tools stay drawn but take no presses while dictating', async () => {
    const { source } = setup();
    render(<Composer label="Reply" value="" onChange={() => undefined} dictation={source} tools={<button type="button">Attach</button>} />);
    await startIn();
    expect(document.querySelector('.crewlet-composer__tools')!.hasAttribute('inert')).toBe(true);
  });
});

describe('permission and devices', () => {
  test('while the browser asks, the mic waits with a ring and Cancel withdraws', async () => {
    const { m, source } = setup({}, { permission: 'prompt', open: 'wait' });
    render(
      <>
        <Announcer />
        <Box source={source} />
      </>,
    );
    await tick();
    await startIn();
    expect(said()).toBe(DICTATION_LABELS.pending);
    expect(button('Dictate').getAttribute('aria-pressed')).toBe('true');
    expect(button('Dictate').classList.contains('is-pending')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Accept dictation' })).toBeNull();
    fireEvent.click(button('Cancel dictation'));
    act(() => m.settle());
    await tick();
    expect(m.openCount).toBe(0);
    expect(button('Dictate').getAttribute('aria-pressed')).toBe('false');
  });

  test('a blocked microphone holds the mic with the reason and recovers when allowed', async () => {
    const { m, source } = setup({}, { open: 'denied' });
    render(
      <>
        <Announcer />
        <Box source={source} />
      </>,
    );
    await startIn();
    expect(said()).toBe(DICTATION_LABELS.denied);
    expect(button('Dictate').getAttribute('aria-disabled')).toBe('true');
    expect(reason(button('Dictate'))).toBe(DICTATION_LABELS.denied);
    // The menu says how to allow it, and offers to try again.
    fireEvent.click(button('Choose a microphone'));
    await tick();
    expect(screen.getByText(DICTATION_LABELS.deniedHelp)).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: DICTATION_LABELS.retry })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    act(() => m.setPermission('granted'));
    await tick();
    expect(button('Dictate').getAttribute('aria-disabled')).toBeNull();
  });

  test('with no microphone the mic is held, and plugging one in brings it back', async () => {
    const { m, source } = setup({}, { devices: [] });
    render(<Box source={source} />);
    await tick();
    expect(button('Dictate').getAttribute('aria-disabled')).toBe('true');
    expect(reason(button('Dictate'))).toBe(DICTATION_LABELS.noDevice);
    act(() => m.setDevices([{ deviceId: 'usb', label: 'USB Microphone' }]));
    await tick();
    expect(button('Dictate').getAttribute('aria-disabled')).toBeNull();
  });

  test('a microphone in use elsewhere is said and the mic comes back', async () => {
    const { source } = setup({}, { open: 'busy' });
    render(
      <>
        <Announcer />
        <Box source={source} />
      </>,
    );
    await startIn();
    expect(said()).toBe(DICTATION_LABELS.busy);
    expect(note()).toBe(DICTATION_LABELS.busy);
    expect(button('Dictate').getAttribute('aria-disabled')).toBeNull();
    // The note needs no answer, so it goes on its own.
    await tick(8000);
    expect(note()).toBeNull();
  });

  test.each([
    ['unsupported', DICTATION_LABELS.unsupported],
    ['insecure', DICTATION_LABELS.insecure],
    ['policy', DICTATION_LABELS.policy],
  ] as const)('a page where capture cannot work (%s) draws the mic held, never hidden', (block, words) => {
    const { source } = setup({}, { block });
    render(<Box source={source} />);
    expect(button('Dictate').getAttribute('aria-disabled')).toBe('true');
    expect(reason(button('Dictate'))).toBe(words);
    // With nothing to offer, the chevron is held with the same reason rather than opening an empty menu.
    expect(reason(button('Choose a microphone'))).toBe(words);
  });

  test('a company without speech set up holds the mic, and offers setup to who can fix it', async () => {
    const onSelect = vi.fn();
    const { source } = setup({}, {}, { unavailableReason: 'Dictation is not set up for this company', setup: { label: 'Set up dictation', onSelect } });
    render(<Box source={source} />);
    expect(button('Dictate').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button('Choose a microphone'));
    await tick();
    const menu = screen.getByRole('menu', { name: 'Choose a microphone' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Set up dictation' }));
    expect(onSelect).toHaveBeenCalled();
  });

  test('a held composer holds its mic', () => {
    const { source } = setup();
    render(<Box source={source} disabledReason="Offline" />);
    expect(button('Dictate').getAttribute('aria-disabled')).toBe('true');
  });
});

describe('the microphone menu', () => {
  test('lists the devices with the chosen one ticked under a live level, and remembers a choice', async () => {
    const { source } = setup();
    render(<Box source={source} />);
    await tick();
    fireEvent.click(button('Choose a microphone'));
    await tick();
    expect(document.querySelector('.crewlet-dictation__meter')).not.toBeNull();
    const items = screen.getAllByRole('menuitemradio');
    expect(items.map((i) => [i.textContent, i.getAttribute('aria-checked')])).toEqual([
      ['Default - Studio Display Microphone', 'true'],
      ['Studio Display Microphone', 'false'],
      ['Wireless Headset', 'false'],
    ]);
    fireEvent.click(items[2]!);
    await tick();
    expect(localStorage.getItem('crewlet:dictation:device')).toBe('headset');
    fireEvent.click(button('Choose a microphone'));
    await tick();
    expect(screen.getByRole('menuitemradio', { name: 'Wireless Headset' }).getAttribute('aria-checked')).toBe('true');
  });

  test('before permission it offers the default and a way to allow access', async () => {
    const { source } = setup({}, { permission: 'prompt' });
    render(<Box source={source} />);
    await tick();
    fireEvent.click(button('Choose a microphone'));
    await tick();
    expect(screen.getByRole('menuitemradio', { name: DICTATION_LABELS.defaultDevice })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: DICTATION_LABELS.allowToChoose }));
    await tick();
    fireEvent.click(button('Choose a microphone'));
    await tick();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
  });

  test('a device chosen while dictating replaces the old one in the same session', async () => {
    const { t, m, source } = setup();
    render(<Box source={source} />);
    await startIn();
    await tick(PACE * 2);
    fireEvent.click(button('Choose a microphone'));
    await tick();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Wireless Headset' }));
    await tick();
    expect(t.calls).toEqual(['start:default', 'switch:headset']);
    expect(m.openCount).toBe(1);
    expect(button('Accept dictation')).toBeTruthy();
  });

  test('a remembered device that is gone falls back to the default, with a note', async () => {
    localStorage.setItem('crewlet:dictation:device', 'gone');
    const { t, source } = setup();
    render(<Box source={source} />);
    await tick();
    fireEvent.click(button('Choose a microphone'));
    await tick();
    expect(screen.getByText(DICTATION_LABELS.gone)).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Default - Studio Display Microphone' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await startIn();
    expect(t.calls).toEqual(['start:default']);
  });
});

describe('one session per tab', () => {
  test('other composers are held with the reason, and their mic leads to the one dictating', async () => {
    const { source } = setup();
    render(
      <>
        <Box source={source} label="Reply in the thread" />
        <Box source={source} label="Message" />
      </>,
    );
    const [first, second] = screen.getAllByRole('button', { name: 'Dictate' });
    fireEvent.click(first!);
    await tick();
    expect(second!.getAttribute('aria-disabled')).toBe('true');
    expect(reason(second!)).toBe('Dictating in Reply in the thread');
    field('Message').focus();
    fireEvent.click(second!);
    expect(document.activeElement).toBe(field('Reply in the thread'));
    fireEvent.click(button('Cancel dictation'));
    expect(second!.getAttribute('aria-disabled')).toBeNull();
  });
});
