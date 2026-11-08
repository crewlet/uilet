import './SendKeys.css';

export {
  COARSE_POINTER_QUERY,
  FINE_POINTER_QUERY,
  SEND_KEYS_LABELS,
  isSendPress,
  sendKeysLabels,
  sendKeysWords,
  useTouchKeyboard,
} from './sendKeys.js';
export type { SendKeyEvent, SendKeysLabels } from './sendKeys.js';
export { useSendOnEnter } from './useSendOnEnter.js';
export type { SendOnEnter, SendOnEnterOptions } from './useSendOnEnter.js';
export { SendKeysHint } from './SendKeysHint.js';
export type { SendKeysHintProps } from './SendKeysHint.js';
