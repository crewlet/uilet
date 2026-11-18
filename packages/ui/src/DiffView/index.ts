import './DiffView.css';

export {
  DiffView,
  DiffSummary,
  DIFF_VIEW_LABELS,
  DIFF_SUMMARY_LABELS,
  WINDOW_BLOCK_ROWS,
  WINDOW_FROM_ROWS,
} from './DiffView.js';
export type { DiffLayout, DiffViewLabels, DiffViewProps, DiffSummaryLabels, DiffSummaryProps } from './DiffView.js';
export { collapseDiff, diffStat, firstChangedLines, splitLines } from './diff.js';
export type { DiffLine, DiffSection, DiffStat } from './diff.js';
export {
  CONTEXT_LINES,
  MAX_COMPARE_LINES,
  MAX_EDITS,
  compareLines,
  compareSequences,
  distanceFloor,
  notComparedReason,
} from './lineDiff.js';
export type { EditRun, LineComparison, Uncompared } from './lineDiff.js';
export { changedRuns, lineTokens, segments } from './wordDiff.js';
export type { ChangedRuns, DiffSpan, LineToken, Run, Segment } from './wordDiff.js';
