import { useEffect, useRef, useState, type ReactNode } from 'react';

/*
 * CopyableCell, a DataTable-internal helper for the compact variant.
 * Wraps any rendered cell content with a hover-revealed copy button
 * whose clipboard text is supplied explicitly. The DOM is never
 * scraped, because cells often contain pills, icons, or formatters
 * that should not appear on the clipboard verbatim.
 *
 * The button only fades in on row hover (driven by CSS), so it does
 * not add visual weight to a static reading of the table.
 */
export interface CopyableCellProps {
  value: string | number | null | undefined;
  children?: ReactNode;
  ariaLabel?: string;
}

const COPIED_DURATION_MS = 1500;

const writeToClipboard = async (text: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
};

export const CopyableCell = ({ value, children, ariaLabel }: CopyableCellProps) => {
  const text = value === undefined || value === null ? '' : String(value);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!text) return;
    try {
      await writeToClipboard(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_DURATION_MS);
    } catch {
      // No good UI for "clipboard refused"; an alert would be noisier than silence.
    }
  };

  return (
    <span className="crewlet-data-table__copy-cell">
      <span className="crewlet-data-table__copy-cell-value">{children}</span>
      {text && (
        <button
          type="button"
          className={`crewlet-data-table__copy-cell-button${copied ? ' is-copied' : ''}`}
          onClick={onCopy}
          aria-label={ariaLabel || 'Copy to clipboard'}
          title="Copy"
        >
          <span className="material-symbols-outlined" aria-hidden>
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      )}
    </span>
  );
};
