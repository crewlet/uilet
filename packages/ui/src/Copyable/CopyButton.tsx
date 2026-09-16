import { useCallback, type ReactNode } from 'react';
import { CheckGlyph, ContentCopyGlyph, ErrorGlyph } from '@crewlethq/icons/glyphs';
import { Button, type ButtonSize, type ButtonVariant } from '../Button/index.js';
import { useClipboard, type ClipboardState } from '../utils/useClipboard.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** What a copy control draws for each state. */
export function copyGlyph(state: ClipboardState): ReactNode {
  if (state === 'copied') return <CheckGlyph size="sm" />;
  if (state === 'failed') return <ErrorGlyph size="sm" />;
  return <ContentCopyGlyph size="sm" />;
}

export interface CopyStatusProps {
  state: ClipboardState;
  copiedMessage: string;
  failedMessage: string;
}

/**
 * What the copy did, said out loud.
 *
 * A SIBLING OF THE CONTROL, NEVER A CHILD. An accessible name is computed
 * from an element's contents, so a live region inside the button named it
 * "Copied copied to the clipboard", the status text becoming part of what the
 * button claimed to be.
 */
export function CopyStatus({ state, copiedMessage, failedMessage }: CopyStatusProps) {
  return (
    <VisuallyHidden>
      <span role="status">
        {state === 'copied' ? copiedMessage : state === 'failed' ? failedMessage : ''}
      </span>
    </VisuallyHidden>
  );
}

export interface CopyButtonProps {
  /**
   * The text, or a THUNK that produces it.
   *
   * The thunk is not a convenience. On a live record the thing worth copying
   * is assembled from everything on the screen, and a screen that pushes twice
   * per second would serialize the whole record on every push for a button
   * nobody has pressed. Resolved on the press, it costs nothing until it is
   * asked for.
   */
  text: string | (() => string);
  /** The label at rest. */
  label?: string | undefined;
  /** The label once the text is on the clipboard. */
  copiedLabel?: string | undefined;
  /** The label when the browser refused. */
  failedLabel?: string | undefined;
  /** Read out on success. */
  copiedMessage?: string | undefined;
  /** Read out on failure. */
  failedMessage?: string | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
  title?: string | undefined;
  className?: string | undefined;
}

/**
 * Put text on the clipboard, and SAY WHETHER IT LANDED.
 *
 * The clipboard is invisible: a copy that reached no clipboard clicks exactly
 * like one that did, so the label and the glyph are the only evidence a
 * sighted reader gets and the status region is the only evidence anybody else
 * gets. Both are part of the control, not decoration on it.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  failedLabel = 'Copy failed',
  copiedMessage = 'copied to the clipboard',
  failedMessage = 'the browser refused the clipboard',
  size = 'small',
  variant = 'tertiary',
  title,
  className,
}: CopyButtonProps) {
  const { state, copy } = useClipboard();
  const onClick = useCallback(() => {
    void copy(text);
  }, [copy, text]);

  return (
    <span className={className}>
      <Button
        size={size}
        variant={variant}
        leadingIcon={copyGlyph(state)}
        onClick={onClick}
        title={state === 'failed' ? failedMessage : title}
      >
        {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label}
      </Button>
      <CopyStatus state={state} copiedMessage={copiedMessage} failedMessage={failedMessage} />
    </span>
  );
}
