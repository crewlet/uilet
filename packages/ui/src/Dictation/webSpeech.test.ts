/**
 * The on-device browser route against a stub SpeechRecognition: it never
 * takes the cloud path, installs a missing pack inside the press, turns
 * results into partials and finals across the browser's own restarts, and
 * maps every error onto a dictation code.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { DictationTransportEvents } from './types.js';
import { INSTALL_MS, createWebSpeechLocal } from './webSpeech.js';
import { webSpeechLocalTransport } from './webSpeechLocal.js';

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

class StubRecognition {
  static state: Availability = 'available';
  static installs = 0;
  static installResult = true;
  static instances: StubRecognition[] = [];
  static available = vi.fn(async (options: { langs: string[]; processLocally: boolean }) => {
    expect(options.processLocally).toBe(true);
    return StubRecognition.state;
  });
  static install = vi.fn(async (options: { langs: string[]; processLocally: boolean }) => {
    expect(options).toEqual({ langs: ['en-GB'], processLocally: true });
    StubRecognition.installs += 1;
    return StubRecognition.installResult;
  });

  declare processLocally: boolean;
  declare unspokenPunctuation: boolean;
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  starts: (MediaStreamTrack | undefined)[] = [];
  stops = 0;
  aborts = 0;

  constructor() {
    StubRecognition.instances.push(this);
  }

  start(track?: MediaStreamTrack) {
    this.starts.push(track);
    this.onstart?.();
  }

  stop() {
    this.stops += 1;
    this.onend?.();
  }

  abort() {
    this.aborts += 1;
    this.onend?.();
  }

  /** Delivers the run's results so far, each [transcript, isFinal]. */
  say(results: [string, boolean][]) {
    this.onresult?.({
      resultIndex: 0,
      results: results.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
    });
  }
}
// On the prototype, as a browser declares them, so feature detection finds them.
Object.assign(StubRecognition.prototype, { processLocally: false, unspokenPunctuation: false });

const track = { readyState: 'live' } as MediaStreamTrack;
const stream = { getAudioTracks: () => [track] } as unknown as MediaStream;

function listener() {
  const said: string[] = [];
  const events: DictationTransportEvents = {
    partial: (text) => said.push(`partial:${text}`),
    final: (text) => said.push(`final:${text}`),
    error: (code) => said.push(`error:${code}`),
    preparing: () => said.push('preparing'),
    ready: () => said.push('ready'),
  };
  return { said, events };
}

const recognition = () => StubRecognition.instances.at(-1)!;

beforeEach(() => {
  StubRecognition.state = 'available';
  StubRecognition.installResult = true;
  StubRecognition.installs = 0;
  StubRecognition.instances = [];
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = StubRecognition;
});

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe('availability', () => {
  test('without on-device recognition it is unavailable, and never starts the cloud path', async () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const route = createWebSpeechLocal({ lang: 'en-GB' });
    expect(await route.available!()).toBe(false);
    // A recognizer with no on-device controls (no available(), no processLocally) is the cloud's.
    class CloudOnly {}
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = CloudOnly;
    expect(await route.available!()).toBe(false);
    const { said, events } = listener();
    await route.start(undefined, events, stream);
    expect(said).toEqual(['error:unavailable']);
  });

  test('a recognizer without processLocally is refused even with available()', async () => {
    class NoLocal {
      static available = async () => 'available';
    }
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = NoLocal;
    expect(await createWebSpeechLocal({ lang: 'en-GB' }).available!()).toBe(false);
  });

  test.each([
    ['available', true],
    ['downloadable', true],
    ['downloading', true],
    ['unavailable', false],
  ] as const)('the browser answering %s is available: %s', async (state, expected) => {
    StubRecognition.state = state;
    expect(await createWebSpeechLocal({ lang: 'en-GB' }).available!()).toBe(expected);
  });

  test('a language the device cannot do is unavailable at start, with no recognizer made', async () => {
    StubRecognition.state = 'unavailable';
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    expect(said).toEqual(['error:unavailable']);
    expect(StubRecognition.instances).toHaveLength(0);
  });

  test('the factory loads the route the first time it is asked', async () => {
    const route = webSpeechLocalTransport({ lang: 'en-GB' });
    expect(route.picksDevice).toBeUndefined();
    expect(await route.available!()).toBe(true);
  });
});

describe('a session', () => {
  test('starts on the device, continuous, with interim results and punctuation, on the chosen track', async () => {
    const route = createWebSpeechLocal({ lang: 'en-GB' });
    const { said, events } = listener();
    await route.start('studio', events, stream);
    const r = recognition();
    expect([r.processLocally, r.continuous, r.interimResults, r.unspokenPunctuation, r.lang]).toEqual([true, true, true, true, 'en-GB']);
    expect(r.starts).toEqual([track]);
    expect(said).toEqual(['ready']);
    expect(route.picksDevice).toBe(false);
  });

  test('with no track to hand over, the browser picks the microphone', async () => {
    const route = createWebSpeechLocal({ lang: 'en-GB' });
    await route.start(undefined, listener().events, null);
    expect(recognition().starts).toEqual([undefined]);
    expect(route.picksDevice).toBe(true);
  });

  test('a missing pack installs inside the press, preparing meanwhile', async () => {
    StubRecognition.state = 'downloadable';
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    expect(StubRecognition.installs).toBe(1);
    expect(said).toEqual(['preparing', 'ready']);
  });

  test('a pack that will not install is unavailable', async () => {
    StubRecognition.state = 'downloadable';
    StubRecognition.installResult = false;
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    expect(said).toEqual(['preparing', 'error:unavailable']);
    expect(StubRecognition.instances).toHaveLength(0);
  });

  test('a pack that never arrives counts as unavailable after a minute', async () => {
    vi.useFakeTimers();
    StubRecognition.state = 'downloadable';
    StubRecognition.install.mockImplementationOnce(() => new Promise<boolean>(() => undefined));
    const { said, events } = listener();
    const started = createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    await vi.advanceTimersByTimeAsync(INSTALL_MS);
    await started;
    expect(said).toEqual(['preparing', 'error:unavailable']);
    vi.useRealTimers();
  });

  test('interim results are partials, finished ones are finals, stitched across the browser’s restarts', async () => {
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    const r = recognition();
    r.say([['move the review', false]]);
    r.say([
      ['Move the review to Thursday.', true],
      [' please send', false],
    ]);
    // The browser ends a run on a silence; the words still provisional are kept, and a new run starts.
    r.onend!();
    expect(r.starts).toEqual([track, track]);
    r.say([['Thanks.', true]]);
    expect(said).toEqual([
      'ready',
      'partial:move the review',
      'final:Move the review to Thursday.',
      'partial:please send',
      'final:please send',
      'final:Thanks.',
      'partial:',
    ]);
  });

  test.each([
    ['language-not-supported', 'unavailable'],
    ['service-not-allowed', 'unavailable'],
    ['not-allowed', 'unavailable'],
    ['network', 'unavailable'],
    ['audio-capture', 'dropped'],
  ] as const)('the %s error answers %s and stops the recognizer', async (error, code) => {
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    recognition().onerror!({ error });
    expect(said).toEqual(['ready', `error:${code}`]);
    expect(recognition().aborts).toBe(1);
  });

  test('no speech is no error: the run ends and starts again', async () => {
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    const r = recognition();
    r.onerror!({ error: 'no-speech' });
    r.onend!();
    expect(said).toEqual(['ready']);
    expect(r.starts).toHaveLength(2);
  });

  test('a recognizer that keeps ending at once is a dropped session', async () => {
    const { said, events } = listener();
    await createWebSpeechLocal({ lang: 'en-GB' }).start(undefined, events, stream);
    for (let i = 0; i < 6; i++) recognition().onend!();
    expect(said).toEqual(['ready', 'error:dropped']);
  });

  test('flush stops, keeps the last words and settles at the end', async () => {
    const route = createWebSpeechLocal({ lang: 'en-GB' });
    const { said, events } = listener();
    await route.start(undefined, events, stream);
    recognition().say([['almost done', false]]);
    await route.flush();
    expect(recognition().stops).toBe(1);
    expect(said.slice(-1)).toEqual(['final:almost done']);
    expect(recognition().starts).toHaveLength(1);
  });

  test('cancel aborts and nothing more is said', async () => {
    const route = createWebSpeechLocal({ lang: 'en-GB' });
    const { said, events } = listener();
    await route.start(undefined, events, stream);
    route.cancel();
    recognition().say([['late words', false]]);
    expect(recognition().aborts).toBe(1);
    expect(said).toEqual(['ready']);
  });

  test('a new microphone restarts the run on its track without counting as a failure', async () => {
    const route = createWebSpeechLocal({ lang: 'en-GB' });
    const { said, events } = listener();
    await route.start(undefined, events, stream);
    const headset = { readyState: 'live' } as MediaStreamTrack;
    for (let i = 0; i < 7; i++) route.switchStream!({ getAudioTracks: () => [headset] } as unknown as MediaStream, 'headset');
    expect(recognition().starts.at(-1)).toBe(headset);
    expect(said).toEqual(['ready']);
  });
});
