/**
 * Deterministic doubles for stories, tests and demos: a transport that speaks
 * a script and a microphone that opens, refuses or unplugs on request.
 */

import type {
  DictationBlock,
  DictationCapture,
  DictationDevice,
  DictationErrorCode,
  DictationMicrophone,
  DictationPermission,
  DictationTransport,
  DictationTransportEvents,
} from './types.js';

export const FAKE_SCRIPT: readonly string[] = [
  'Let’s move the launch review to Thursday morning.',
  'Please send the updated pricing table to the whole team before then.',
  'If the billing page is not ready, we ship the checklist first and follow up next week.',
];

export interface FakeTransportOptions {
  /** Sentences said in turn: each a word at a time as provisional text, then sent punctuated. */
  script?: readonly string[] | undefined;
  /** Milliseconds between words. */
  pace?: number | undefined;
  /** Ends the session with `code` after `after` words (0 by default). */
  fail?: { code: DictationErrorCode; after?: number | undefined } | undefined;
  /** Stops speaking after this many words, with the session left open. */
  quietAfter?: number | undefined;
  /** Milliseconds `flush` takes to send the last words. */
  flushDelay?: number | undefined;
}

export interface FakeTransport extends DictationTransport {
  /** Every call the composer made, in order: `start:<device>`, `switch:<device>`, `flush`, `cancel`. */
  readonly calls: string[];
}

function unpunctuated(sentence: string): string[] {
  return sentence
    .replace(/[.,!?;:]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** A transport that says `script`, the same way every run. */
export function fakeTransport(options: FakeTransportOptions = {}): FakeTransport {
  const script = options.script ?? FAKE_SCRIPT;
  const pace = options.pace ?? 180;
  const calls: string[] = [];
  let events: DictationTransportEvents | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sentence = 0;
  let word = 0;
  let spoken = 0;

  const tick = () => {
    if (!events) return;
    const { fail, quietAfter } = options;
    if (fail && spoken >= (fail.after ?? 0)) {
      const out = events;
      events = null;
      out.error(fail.code);
      return;
    }
    if (quietAfter !== undefined && spoken >= quietAfter) return;
    const words = unpunctuated(script[sentence]!);
    word += 1;
    spoken += 1;
    if (word < words.length) events.partial(words.slice(0, word).join(' '));
    else {
      events.final(script[sentence]!);
      sentence = (sentence + 1) % script.length;
      word = 0;
    }
    timer = setTimeout(tick, pace);
  };

  return {
    calls,
    start(deviceId, next) {
      calls.push(`start:${deviceId ?? 'default'}`);
      clearTimeout(timer);
      events = next;
      word = 0;
      timer = setTimeout(tick, pace);
    },
    switchStream(_stream, deviceId) {
      calls.push(`switch:${deviceId ?? 'default'}`);
    },
    flush() {
      calls.push('flush');
      clearTimeout(timer);
      const out = events;
      events = null;
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // The words heard so far come back punctuated, as a provider's last segment does.
          if (out && word > 0) {
            const heard = unpunctuated(script[sentence]!).slice(0, word).join(' ');
            out.final(`${heard.charAt(0).toUpperCase()}${heard.slice(1)}.`);
            sentence = (sentence + 1) % script.length;
            word = 0;
          }
          resolve();
        }, options.flushDelay ?? 120);
      });
    },
    cancel() {
      calls.push('cancel');
      clearTimeout(timer);
      events = null;
    },
  };
}

export const FAKE_DEVICES: readonly DictationDevice[] = [
  { deviceId: 'default', label: 'Default - Studio Display Microphone' },
  { deviceId: 'studio', label: 'Studio Display Microphone' },
  { deviceId: 'headset', label: 'Wireless Headset' },
];

export interface FakeMicrophoneOptions {
  devices?: readonly DictationDevice[] | undefined;
  permission?: DictationPermission | undefined;
  /** What opening a device does; `wait` asks, and settles only when `settle()` is called. */
  open?: 'ok' | 'denied' | 'missing' | 'busy' | 'wait' | undefined;
  /** Why capture cannot work in this page. */
  block?: DictationBlock | undefined;
  /** A level that moves like speech, or silence. */
  level?: 'speech' | 'silent' | undefined;
}

export interface FakeMicrophone extends DictationMicrophone {
  /** Takes the open device away, as pulling its cable does. */
  unplug(): void;
  /** Changes the permission, as the browser's site settings do. */
  setPermission(state: DictationPermission): void;
  setDevices(devices: readonly DictationDevice[]): void;
  /** Settles a pending `open` (`open: 'wait'`) as allowed. */
  settle(): void;
  /** How many devices are open now. */
  readonly openCount: number;
}

function named(name: string): Error {
  return Object.assign(new Error(name), { name });
}

/** A microphone that does what it is told, with a level that moves like speech. */
export function fakeMicrophone(options: FakeMicrophoneOptions = {}): FakeMicrophone {
  let permission = options.permission ?? 'granted';
  let devices = [...(options.devices ?? FAKE_DEVICES)];
  const permissionListeners = new Set<(state: DictationPermission) => void>();
  const deviceListeners = new Set<() => void>();
  const open = new Set<{ ended: Set<() => void> }>();
  let waiting: (() => void) | null = null;

  const capture = (): DictationCapture => {
    const handle = { ended: new Set<() => void>() };
    open.add(handle);
    const born = Date.now();
    return {
      stream: null,
      level() {
        if (options.level === 'silent') return 0;
        const t = Date.now() - born;
        return Math.min(1, 0.2 + 0.6 * Math.abs(Math.sin(t / 140) * Math.sin(t / 410 + 1)));
      },
      onEnded(listener) {
        handle.ended.add(listener);
      },
      stop() {
        open.delete(handle);
      },
    };
  };

  return {
    check: () => options.block,
    permission: async () => permission,
    onPermissionChange(listener) {
      permissionListeners.add(listener);
      return () => permissionListeners.delete(listener);
    },
    devices: async () => (permission === 'granted' ? devices : devices.slice(0, 1).map(() => ({ deviceId: '', label: '' }))),
    onDeviceChange(listener) {
      deviceListeners.add(listener);
      return () => deviceListeners.delete(listener);
    },
    async open(deviceId) {
      switch (options.open) {
        case 'denied':
          permission = 'denied';
          throw named('NotAllowedError');
        case 'missing':
          throw named('NotFoundError');
        case 'busy':
          throw named('NotReadableError');
        case 'wait':
          // The browser asks once; after an answer the device opens at once.
          if (permission !== 'granted')
            await new Promise<void>((resolve) => {
              waiting = resolve;
            });
      }
      if (deviceId !== undefined && !devices.some((d) => d.deviceId === deviceId)) throw named('OverconstrainedError');
      permission = 'granted';
      return capture();
    },
    unplug() {
      for (const handle of [...open]) for (const listener of handle.ended) listener();
      devices = devices.slice(0, -1);
      for (const listener of deviceListeners) listener();
    },
    setPermission(state) {
      permission = state;
      for (const listener of permissionListeners) listener(state);
    },
    setDevices(next) {
      devices = [...next];
      for (const listener of deviceListeners) listener();
    },
    settle() {
      waiting?.();
      waiting = null;
    },
    get openCount() {
      return open.size;
    },
  };
}
