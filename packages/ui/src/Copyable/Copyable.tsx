import { useCallback } from 'react';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';
import { useClipboard } from '../utils/useClipboard.js';
import { CopyStatus, copyGlyph } from './CopyButton.js';

export type CopyableVariant = 'chip' | 'inline' | 'block';

export interface CopyableProps {
  /** The value shown, and the text copied. */
  value: string | number | null | undefined;
  /** Shown instead of the value, when the value itself is not what to read. */
  display?: string | undefined;
  variant?: CopyableVariant | undefined;
  monospace?: boolean | undefined;
  truncate?: boolean | undefined;
  truncateLength?: number | undefined;
  /** Names the copy control. */
  ariaLabel?: string | undefined;
  /** The copy control's tooltip. */
  title?: string | undefined;
  /** Read out on success. */
  copiedMessage?: string | undefined;
  /** Read out on failure. */
  failedMessage?: string | undefined;
  className?: string | undefined;
}

const truncateValue = (text: string, length: number, variant: CopyableVariant): string => {
  if (text.length <= length) return text;
  if (variant === 'chip') {
    const head = Math.max(4, length - 5);
    const tail = Math.min(4, Math.max(2, length - head - 1));
    return `${text.slice(0, head)}…${text.slice(-tail)}`;
  }
  return `${text.slice(0, length)}…`;
};

/**
 * An identifier, with a control that copies it.
 *
 * ONE TAB STOP. The value used to be a `role="button"` span with its own
 * `tabIndex` beside the button that did the same thing, so every id in a table
 * was two stops on the way to the next row, and the first of them was a button
 * that was not one. The value is text now, and the button is the only control.
 *
 * A REFUSAL IS REPORTED. The previous implementation awaited
 * `document.execCommand` and reported success whatever it returned, so on the
 * plain http origin anybody reads a remote dashboard at, the tick appeared and
 * the clipboard was empty.
 */
export const Copyable = ({
  value,
  display,
  variant = 'chip',
  monospace = false,
  truncate = false,
  truncateLength,
  ariaLabel = 'Copy to clipboard',
  title = 'Copy',
  copiedMessage = 'copied to the clipboard',
  failedMessage = 'the browser refused the clipboard',
  className,
}: CopyableProps) => {
  const text = value === undefined || value === null ? '' : String(value);
  const { state, copy } = useClipboard();
  const onCopy = useCallback(() => {
    void copy(text);
  }, [copy, text]);

  if (!text) return null;

  const resolvedLength = truncateLength ?? (variant === 'chip' ? 14 : 24);
  const shouldTruncate = truncate || (variant === 'chip' && text.length > resolvedLength);
  const rendered = display ?? (shouldTruncate ? truncateValue(text, resolvedLength, variant) : text);

  return (
    <span
      className={cx(
        'crewlet-copyable',
        `crewlet-copyable--${variant}`,
        monospace && 'crewlet-copyable--monospace',
        state === 'copied' && 'is-copied',
        state === 'failed' && 'is-failed',
        className,
      )}
    >
      {/* The whole value in the tooltip, because the drawn one may be cut. */}
      <span className="crewlet-copyable__value" title={text}>
        {rendered}
      </span>
      <IconButton
        className="crewlet-copyable__button"
        label={ariaLabel}
        title={state === 'failed' ? failedMessage : title}
        size="sm"
        variant="ghost"
        icon={copyGlyph(state)}
        onClick={onCopy}
      />
      <CopyStatus state={state} copiedMessage={copiedMessage} failedMessage={failedMessage} />
    </span>
  );
};
