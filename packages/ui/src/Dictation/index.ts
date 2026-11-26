import './Dictation.css';

export { DICTATION_SHORTCUT, preloadDictation } from './slot.js';
export { DICTATION_LABELS, dictationLabels } from './labels.js';
export { FAKE_DEVICES, FAKE_SCRIPT, fakeMicrophone, fakeTransport } from './fake.js';
export type { FakeMicrophone, FakeMicrophoneOptions, FakeTransport, FakeTransportOptions } from './fake.js';
export type {
  DictationBlock,
  DictationCapture,
  DictationDevice,
  DictationErrorCode,
  DictationLabels,
  DictationMicrophone,
  DictationPermission,
  DictationSource,
  DictationStopReason,
  DictationTransport,
  DictationTransportEvents,
} from './types.js';
