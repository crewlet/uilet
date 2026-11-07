import '../ChatMessage/ChatScale.css';
import '../PersonRow/PersonRow.css';
import './MentionMenu.css';

export { MENTION_MENU_LABELS, MentionMenu, mentionQuery } from './MentionMenu.js';
export type { MentionMenuAppearance, MentionMenuLabels, MentionMenuProps, MentionOption, MentionQuery } from './MentionMenu.js';
// The caret's place, for the menu's `anchor`, from the shared field mirror.
export { caretPoint } from '../utils/fieldMirror.js';
export type { CaretPoint } from '../utils/fieldMirror.js';
