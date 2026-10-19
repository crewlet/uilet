// Framework free: the artifact kit imports this entry into a bundle with no
// React in it, so nothing reachable from here may import React or a stylesheet.
export { SHEET_COLUMN_TYPES, isSheetColumnType } from './types.js';
export type {
  SheetCellPresence,
  SheetChange,
  SheetColumn,
  SheetColumnType,
  SheetEdit,
  SheetNumberStyle,
  SheetOption,
  SheetPerson,
  SheetRow,
  SheetSort,
  SheetStatusCategory,
  SheetSyncState,
  SheetValue,
} from './types.js';
export { SHEET_LABELS, sheetLabels } from './labels.js';
export type { SheetLabels } from './labels.js';
export { findOption, liveOptions, optionHue, parseOptionList, statusTone } from './options.js';
export {
  LONGTEXT_MAX_DEFAULT,
  RATING_MAX_CEILING,
  RATING_MAX_DEFAULT,
  TEXT_MAX_DEFAULT,
  URL_MAX,
  checkValue,
  compareValues,
  displayText,
  editText,
  findPerson,
  isEmptyValue,
  normalizeValue,
  parseText,
  ratingMax,
  sameValue,
  spokenText,
  textMax,
} from './values.js';
export type { SheetParse, SheetValueContext } from './values.js';
export {
  SHEET_COLUMN_WIDTHS,
  SHEET_ROW_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  columnOffsets,
  columnWidth,
  drawnColumns,
  editorSide,
  inRange,
  isMod,
  isMultiCell,
  isTypingKey,
  moveFrom,
  rangeOf,
  scrollToRow,
  visibleRows,
} from './navigation.js';
export type { SheetBounds, SheetKey, SheetPosition, SheetRange } from './navigation.js';
export { SHEET_COLUMN_BOUNDS, SHEET_FIT_SAMPLES, fitSamples, fittedWidth } from './fit.js';
export { parseTSV, planClear, planPaste, toTSV } from './clipboard.js';
export type { SheetPastePlan } from './clipboard.js';
export { SheetPendingEdits, changeText, changeTime, hasPrevious, refusalText } from './edits.js';
export type { SheetRefusalCode, SheetSettle } from './edits.js';
export {
  cellDescription,
  cellKey,
  cellSpeech,
  flagText,
  nextSort,
  presenceByCell,
  presenceByColumn,
  presenceByRow,
  rowName,
  sortRows,
} from './view.js';
