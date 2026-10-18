import './DiffView.css';

export { DiffView, DiffSummary, DIFF_VIEW_LABELS, DIFF_SUMMARY_LABELS } from './DiffView.js';
export type { DiffViewLabels, DiffViewProps, DiffSummaryLabels, DiffSummaryProps } from './DiffView.js';
export { MAX_DIFF_LINES, collapseDiff, diffLines, diffStat, firstChangedLines, splitLines } from './diff.js';
export type { DiffLine, DiffSection, DiffStat } from './diff.js';
