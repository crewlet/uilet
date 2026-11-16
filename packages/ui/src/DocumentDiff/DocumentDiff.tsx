import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';
import { Document, type DocumentSize } from '../Document/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface DocumentDiffLabels {
  /** The group's accessible name when the caller gives none. */
  region: string;
  /** Said before a block that is new: "Added:". */
  added: string;
  /** Said before a block that is gone: "Removed:". */
  removed: string;
  /** Said before each added run of words, with its own punctuation: "added:". */
  addedWords: string;
  /** Said before each removed run of words: "removed:". */
  removedWords: string;
  /** The row a run of left-out blocks folds into: "3 unchanged paragraphs", "4 more paragraphs removed". */
  skipped: (count: number, of: DocumentDiffChange) => string;
}

export const DOCUMENT_DIFF_LABELS: DocumentDiffLabels = {
  region: 'Changes',
  added: 'Added:',
  removed: 'Removed:',
  addedWords: 'added:',
  removedWords: 'removed:',
  skipped: (count, of) => {
    const n = count.toLocaleString();
    if (of === 'same') return count === 1 ? '1 unchanged paragraph' : `${n} unchanged paragraphs`;
    return `${count === 1 ? '1 more paragraph' : `${n} more paragraphs`} ${of}`;
  },
};

/** What happened to one block of the document. */
export type DocumentDiffChange = 'same' | 'changed' | 'added' | 'removed';

/**
 * One block of the diff: a paragraph, a heading, a list item or a table the
 * host rendered. A `changed` block marks its own words with
 * [DocumentDiffAdded] and [DocumentDiffRemoved]; `skipped` stands for a run of
 * blocks left out, unchanged ones unless `of` says otherwise.
 */
export type DocumentDiffBlock =
  | { change: DocumentDiffChange; content: ReactNode; key?: string | number | undefined }
  | { change: 'skipped'; count: number; of?: DocumentDiffChange | undefined; key?: string | number | undefined };

export interface DocumentDiffProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  blocks: readonly DocumentDiffBlock[];
  /** The reading size of the document the blocks come from. `sm` by default, a preview's. */
  size?: DocumentSize | undefined;
  labels?: Partial<DocumentDiffLabels> | undefined;
}

const LabelsContext = createContext<DocumentDiffLabels>(DOCUMENT_DIFF_LABELS);

/**
 * A change to a document, drawn as the document: each block rendered as it
 * reads, the words that changed marked where they stand, and the unchanged
 * stretches folded to a count.
 *
 * NO HUE. A removed word is not a failure and an added one is not a success,
 * so the marks are a strike and an underline, each on a surface step of the
 * diff's own ground, with a word read in their place. A whole new block is
 * raised one step and marked `+`; a whole removed one is sunk, struck and
 * marked `−`.
 *
 * THE HOST RENDERS, as with [Document]: it parses the two versions, decides
 * which blocks changed and wraps the changed words of a block in
 * [DocumentDiffAdded] and [DocumentDiffRemoved].
 */
export function DocumentDiff({ blocks, size = 'sm', labels: overrides, className, 'aria-label': ariaLabel, ...rest }: DocumentDiffProps) {
  const labels: DocumentDiffLabels = overrides ? { ...DOCUMENT_DIFF_LABELS, ...overrides } : DOCUMENT_DIFF_LABELS;
  return (
    <LabelsContext.Provider value={labels}>
      <Document
        {...rest}
        role="group"
        aria-label={ariaLabel ?? labels.region}
        size={size}
        measure="none"
        className={cx('crewlet-document-diff', className)}
      >
        {blocks.map((block, index) => {
          const key = block.key ?? index;
          if (block.change === 'skipped') {
            const of = block.of ?? 'same';
            return (
              <p key={key} className="crewlet-document-diff__skip">
                <span className="crewlet-document-diff__mark" aria-hidden="true">
                  {of === 'added' ? '+' : of === 'removed' ? '−' : ''}
                </span>
                <span>{labels.skipped(block.count, of)}</span>
              </p>
            );
          }
          // THE CLASS NAMES ARE LITERALS, so the stylesheet gate can see each one.
          return (
            <div
              key={key}
              className={cx(
                'crewlet-document-diff__block',
                block.change === 'same' && 'crewlet-document-diff__block--same',
                block.change === 'changed' && 'crewlet-document-diff__block--changed',
                block.change === 'added' && 'crewlet-document-diff__block--added',
                block.change === 'removed' && 'crewlet-document-diff__block--removed',
              )}
            >
              <span className="crewlet-document-diff__mark" aria-hidden="true">
                {block.change === 'added' ? '+' : block.change === 'removed' ? '−' : ''}
              </span>
              <div className="crewlet-document-diff__content">
                {block.change === 'added' && <VisuallyHidden>{labels.added}</VisuallyHidden>}
                {block.change === 'removed' && <VisuallyHidden>{labels.removed}</VisuallyHidden>}
                {block.content}
              </div>
            </div>
          );
        })}
      </Document>
    </LabelsContext.Provider>
  );
}

export interface DocumentDiffWordsProps {
  children?: ReactNode;
}

/** Words a change added inside a block: underlined on the raised step, "added:" read first. */
export function DocumentDiffAdded({ children }: DocumentDiffWordsProps) {
  const labels = useContext(LabelsContext);
  return (
    <ins className="crewlet-document-diff__added">
      <VisuallyHidden>{`${labels.addedWords} `}</VisuallyHidden>
      {children}
    </ins>
  );
}

/** Words a change removed inside a block: struck through in the quiet ink, "removed:" read first. */
export function DocumentDiffRemoved({ children }: DocumentDiffWordsProps) {
  const labels = useContext(LabelsContext);
  return (
    <del className="crewlet-document-diff__removed">
      <VisuallyHidden>{`${labels.removedWords} `}</VisuallyHidden>
      {children}
    </del>
  );
}
