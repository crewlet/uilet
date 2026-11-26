import type { DictationTransport } from './types.js';
import type { WebSpeechLocalOptions } from './webSpeech.js';

export type { WebSpeechLocalOptions } from './webSpeech.js';

/**
 * The browser's on-device speech recognition as a dictation route, never its
 * cloud service: a fallback after the application's own relay. Its code loads
 * the first time it is asked whether it is available.
 */
export function webSpeechLocalTransport(options: WebSpeechLocalOptions = {}): DictationTransport {
  let route: DictationTransport | null = null;
  const load = async () => (route ??= (await import('./webSpeech.js')).createWebSpeechLocal(options));
  return {
    get picksDevice() {
      return route?.picksDevice;
    },
    available: async () => (await load()).available!(),
    start: async (deviceId, events, stream) => (await load()).start(deviceId, events, stream),
    switchStream: (stream, deviceId) => route?.switchStream?.(stream, deviceId),
    flush: () => route?.flush() ?? Promise.resolve(),
    cancel: () => route?.cancel(),
  };
}
