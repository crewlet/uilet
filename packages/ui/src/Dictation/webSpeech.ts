/**
 * The browser's own speech recognition, on the device only. It never uses
 * the browser's cloud service: where on-device recognition is missing, or its
 * language pack cannot be installed, it answers `unavailable`.
 */

import type { DictationTransport, DictationTransportEvents } from './types.js';

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface Alternative {
  transcript: string;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: Alternative;
}

interface RecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  unspokenPunctuation?: boolean;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(track?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
}

interface LocalOptions {
  langs: string[];
  processLocally: true;
}

interface RecognitionClass {
  new (): Recognition;
  prototype: object;
  available?(options: LocalOptions): Promise<Availability>;
  install?(options: LocalOptions): Promise<boolean>;
}

export interface WebSpeechLocalOptions {
  /** The language to recognise, as a BCP 47 tag. The browser's own by default. */
  lang?: string | undefined;
}

/** More restarts than this within `RESTART_WINDOW_MS` is a recognizer that keeps failing. */
const RESTARTS = 5;
const RESTART_WINDOW_MS = 4000;
/** A pack not installed within this counts as unavailable; the browser may finish it for a later press. */
export const INSTALL_MS = 60_000;

/** Pack errors: the on-device route cannot work, so the next route may. */
const UNAVAILABLE = new Set(['language-not-supported', 'service-not-allowed', 'not-allowed', 'network']);
/** Errors the end of the run answers: a silence, or a stop of our own. */
const QUIET = new Set(['no-speech', 'aborted', 'phrases-not-supported']);

function recognitionClass(): RecognitionClass | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  const found = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  // Without the on-device controls there is no way to keep audio off the cloud path.
  return found && typeof found.available === 'function' && 'processLocally' in found.prototype ? found : undefined;
}

export function createWebSpeechLocal(options: WebSpeechLocalOptions = {}): DictationTransport {
  const lang = options.lang ?? (typeof navigator === 'undefined' ? 'en-US' : navigator.language || 'en-US');
  const local: LocalOptions = { langs: [lang], processLocally: true };
  let recognition: Recognition | null = null;
  let events: DictationTransportEvents | null = null;
  let track: MediaStreamTrack | undefined;
  let started = false;
  let stopping = false;
  let switching = false;
  let done = true;
  let settled: (() => void) | null = null;
  let restarts: number[] = [];
  // The finished results of the current run, and its words not yet final.
  let finished = 0;
  let interim = '';

  const fail = (code: 'unavailable' | 'dropped') => {
    if (done) return;
    done = true;
    const out = events;
    events = null;
    recognition?.abort();
    out?.error(code);
  };

  const run = () => {
    finished = 0;
    interim = '';
    try {
      if (track && track.readyState !== 'ended') recognition!.start(track);
      else recognition!.start();
    } catch {
      fail('dropped');
    }
  };

  // A run that ended with words still provisional keeps them as a final.
  const keepInterim = () => {
    if (interim) events?.final(interim);
    interim = '';
  };

  const wire = (r: Recognition) => {
    r.onstart = () => {
      if (started) return;
      started = true;
      events?.ready?.();
    };
    r.onresult = (event) => {
      if (done) return;
      const { results } = event;
      while (finished < results.length && results[finished]!.isFinal) {
        const text = results[finished]![0]?.transcript.trim();
        finished += 1;
        if (text) events?.final(text);
      }
      const words: string[] = [];
      for (let i = finished; i < results.length; i++) {
        const text = results[i]![0]?.transcript.trim();
        if (text) words.push(text);
      }
      interim = words.join(' ');
      events?.partial(interim);
    };
    r.onerror = ({ error }) => {
      if (QUIET.has(error)) return;
      fail(UNAVAILABLE.has(error) ? 'unavailable' : 'dropped');
    };
    r.onend = () => {
      if (done && !stopping) return;
      keepInterim();
      if (stopping) {
        done = true;
        settled?.();
        settled = null;
        return;
      }
      if (switching) switching = false;
      else {
        // The browser ends a run on a silence; one dictation stays one session.
        const now = Date.now();
        restarts = [...restarts.filter((at) => now - at < RESTART_WINDOW_MS), now];
        if (restarts.length > RESTARTS) return fail('dropped');
      }
      run();
    };
  };

  return {
    get picksDevice() {
      return track === undefined;
    },
    async available() {
      const Recognizer = recognitionClass();
      if (!Recognizer) return false;
      try {
        return (await Recognizer.available!(local)) !== 'unavailable';
      } catch {
        return false;
      }
    },
    async start(_deviceId, next, stream) {
      events = next;
      track = stream?.getAudioTracks()[0];
      done = false;
      started = false;
      stopping = false;
      switching = false;
      restarts = [];
      const Recognizer = recognitionClass();
      if (!Recognizer) return fail('unavailable');
      const state = await Recognizer.available!(local).catch((): Availability => 'unavailable');
      if (done) return;
      if (state === 'unavailable') return fail('unavailable');
      if (state !== 'available') {
        // The pack downloads once; install needs the mic press's user gesture.
        next.preparing?.();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const installed = await Promise.race([
          Promise.resolve()
            .then(() => Recognizer.install?.(local))
            .then((ok) => ok === true, () => false),
          new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), INSTALL_MS);
          }),
        ]);
        clearTimeout(timer);
        if (done) return;
        if (!installed) return fail('unavailable');
      }
      const r = new Recognizer();
      r.lang = lang;
      r.processLocally = true;
      r.continuous = true;
      r.interimResults = true;
      if ('unspokenPunctuation' in r) r.unspokenPunctuation = true;
      if (r.processLocally !== true) return fail('unavailable');
      recognition = r;
      wire(r);
      run();
    },
    switchStream(stream) {
      track = stream?.getAudioTracks()[0];
      if (!recognition || done) return;
      // Stopped rather than aborted, so the words heard so far are finished first.
      switching = true;
      recognition.stop();
    },
    flush() {
      if (!recognition || done) return Promise.resolve();
      stopping = true;
      return new Promise<void>((resolve) => {
        settled = resolve;
        recognition!.stop();
      });
    },
    cancel() {
      done = true;
      events = null;
      recognition?.abort();
    },
  };
}
