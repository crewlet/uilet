import { ENTRY_LABELS } from './slot.js';
import type { DictationLabels } from './types.js';

export const DICTATION_LABELS: DictationLabels = {
  ...ENTRY_LABELS,
  resume: 'Resume dictating',
  cancel: 'Cancel dictation',
  accept: 'Accept dictation',
  listening: 'Listening…',
  dictating: 'Dictating. Enter to accept, Escape to cancel.',
  pending: 'Allow microphone access in your browser to dictate',
  cancelled: 'Dictation cancelled',
  inserted: (words) => `Inserted ${words} ${words === 1 ? 'word' : 'words'}`,
  nothing: 'Nothing was heard, so nothing was inserted',
  denied: 'Microphone blocked for this site',
  noDevice: 'No microphone found',
  busy: 'The microphone is in use by another app',
  elsewhere: (composer) => `Dictating in ${composer}`,
  quiet: 'Still listening',
  stopped: {
    paused: 'Paused. Accept, cancel, or resume.',
    unplugged: 'Microphone disconnected',
    dropped: 'Dictation stopped: connection lost',
    refused: 'Dictation stopped: the speech service refused it',
    quota: 'Dictation is paused: the company’s spend limit is reached',
    silence: 'Stopped after a long silence. Accept, cancel, or resume.',
    length: 'Dictation reached its length limit. Accept, then dictate again to add more.',
  },
  defaultDevice: 'Default microphone',
  allowToChoose: 'Allow microphone access to choose',
  deniedHelp: 'Allow the microphone in the site settings next to the address bar, then press the mic again.',
  gone: 'Your chosen microphone is not connected, so the default is used.',
  switched: (device) => `Now using ${device}`,
  level: 'Input level',
};

/** A source's labels over the defaults. */
export function dictationLabels(overrides: Partial<DictationLabels> | undefined): DictationLabels {
  if (!overrides) return DICTATION_LABELS;
  return { ...DICTATION_LABELS, ...overrides, stopped: { ...DICTATION_LABELS.stopped, ...overrides.stopped } };
}
