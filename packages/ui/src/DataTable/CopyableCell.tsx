import { type MouseEvent, type ReactNode } from 'react';
import { CheckGlyph, ContentCopyGlyph, ErrorGlyph } from '@crewlethq/icons/glyphs';
import { useClipboard } from '../utils/useClipboard.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/*
 * CopyableCell: a cell value with a copy beside it.
 *
 * TWO THINGS IT DOES NOT DO ANY MORE. It had its own clipboard write, which
 * called `navigator.clipboard` where the API exists and fell through an
 * `execCommand` path whose boolean result it threw away; and it swallowed
 * every failure, so on a plain http origin the button clicked, nothing was
 * copied, and nothing said so. Both are `useClipboard`'s job now, and the
 * refusal is REPORTED: the glyph changes and a status line says "Copy
 * failed", because a clipboard is invisible and the control is the only place
 * a reader can learn what happened.
 *
 * The clipboard text is supplied explicitly rather than scraped from the DOM,
 * because a cell often holds a pill, a glyph or a formatter and none of those
 * belong on the clipboard verbatim.
 *
 * ONE TAB STOP: the value is text and the button is the only control.
 */
export interface CopyableCellProps {
  value: string | number | null | undefined;
  children?: ReactNode;
  /** The button's accessible name. */
  ariaLabel?: string;
  /** What the status line says once the value is on the clipboard. */
  copiedLabel?: string;
  /** What it says when the clipboard refused. */
  failedLabel?: string;
}

export const CopyableCell = ({
  value,
  children,
  ariaLabel,
  copiedLabel = 'Copied',
  failedLabel = 'Copy failed',
}: CopyableCellProps) => {
  const text = value === undefined || value === null ? '' : String(value);
  const clipboard = useClipboard();

  const onCopy = (event: MouseEvent<HTMLButtonElement>) => {
    // The row underneath may navigate; copying a cell is not that press.
    event.stopPropagation();
    if (!text) return;
    void clipboard.copy(text);
  };

  return (
    <span className="crewlet-data-table__copy-cell">
      <span className="crewlet-data-table__copy-cell-value">{children}</span>
      {text && (
        <>
          <button
            type="button"
            className={`crewlet-data-table__copy-cell-button${clipboard.state === 'copied' ? ' is-copied' : ''}${clipboard.state === 'failed' ? ' is-failed' : ''}`}
            onClick={onCopy}
            aria-label={ariaLabel || 'Copy to clipboard'}
            title={ariaLabel || 'Copy to clipboard'}
          >
            {clipboard.state === 'copied' ? (
              <CheckGlyph size="sm" />
            ) : clipboard.state === 'failed' ? (
              <ErrorGlyph size="sm" />
            ) : (
              <ContentCopyGlyph size="sm" />
            )}
          </button>
          {/*
            * The outcome sits OUTSIDE the button, so the button's own name
            * stays "Copy <column>" rather than growing a second sentence
            * every reader hears before they can press it.
            */}
          <span role="status">
            <VisuallyHidden>
              {clipboard.state === 'copied' ? copiedLabel : clipboard.state === 'failed' ? failedLabel : ''}
            </VisuallyHidden>
          </span>
        </>
      )}
    </span>
  );
};
