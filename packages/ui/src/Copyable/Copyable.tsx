import { useCallback } from 'react';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';
import { pathBreaks } from '../utils/pathBreaks.js';
import { useClipboard } from '../utils/useClipboard.js';
import { CopyStatus, copyGlyph } from './CopyButton.js';

/**
 * `chip` a pill for a table cell, `inline` a value in a detail row, `compact` a
 * framed value set in a sentence with its control always drawn, `block` a panel.
 */
export type CopyableVariant = 'chip' | 'inline' | 'compact' | 'block';

export interface CopyableProps {
  /** The value shown, and the text copied. */
  value: string | number | null | undefined;
  /** Shown instead of the value, when the value itself is not what to read. */
  display?: string | undefined;
  /** `display` is words rather than a shortened identifier: drawn in the surrounding face, not mono. */
  displayWords?: boolean | undefined;
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
  /** How long the tick stands before the control settles back. */
  resetMs?: number | undefined;
  /**
   * How long the refusal glyph stands. Unset it is `resetMs`; `null` holds it
   * until the next press. See [ClipboardOptions.failedResetMs] for why a
   * refusal wants a clock of its own.
   */
  failedResetMs?: number | null | undefined;
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
 * An identifier with a control that copies it. The value is plain text and the
 * button the one tab stop; a clipboard the browser refuses is reported.
 */
export const Copyable = ({
  value,
  display,
  displayWords = false,
  variant = 'chip',
  monospace = false,
  truncate = false,
  truncateLength,
  ariaLabel = 'Copy to clipboard',
  title = 'Copy',
  copiedMessage = 'copied to the clipboard',
  failedMessage = 'the browser refused the clipboard',
  resetMs,
  failedResetMs,
  className,
}: CopyableProps) => {
  const text = value === undefined || value === null ? '' : String(value);
  const { state, attempt, copy } = useClipboard({ resetMs, failedResetMs });
  const onCopy = useCallback(() => {
    void copy(text);
  }, [copy, text]);

  if (!text) return null;

  const resolvedLength = truncateLength ?? (variant === 'chip' ? 14 : 24);
  const shouldTruncate = truncate || (variant === 'chip' && text.length > resolvedLength);
  const rendered = display ?? (shouldTruncate ? truncateValue(text, resolvedLength, variant) : text);
  // A whole value drawn (block, compact) wraps, and an opaque one (a token,
  // an id: one run with no space and no `/`) breaks at any character.
  const wraps = variant === 'block' || variant === 'compact';
  const opaque = wraps && display === undefined && !/[\s/]/.test(text);
  // A compact value is drawn whole, so it needs its words on a title only where they were replaced.
  const valueTitle = variant === 'compact' && rendered === text ? undefined : text;

  return (
    <span
      className={cx(
        'crewlet-copyable',
        `crewlet-copyable--${variant}`,
        monospace && 'crewlet-copyable--monospace',
        displayWords && display !== undefined && 'crewlet-copyable--words',
        opaque && 'crewlet-copyable--opaque',
        state === 'copied' && 'is-copied',
        state === 'failed' && 'is-failed',
        className,
      )}
    >
      {/* The whole value in the tooltip, because the drawn one may be cut. */}
      <span className="crewlet-copyable__value" title={valueTitle}>
        {/* A PATH OR AN ADDRESS BREAKS AT ITS SEPARATORS where it wraps (`pathBreaks`). */}
        {variant === 'chip' || shouldTruncate ? rendered : pathBreaks(rendered)}
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
      <CopyStatus state={state} attempt={attempt} copiedMessage={copiedMessage} failedMessage={failedMessage} />
    </span>
  );
};
