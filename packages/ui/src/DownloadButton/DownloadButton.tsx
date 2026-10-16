import { useCallback, useMemo, type ReactNode } from 'react';
import { CheckGlyph, CircleAlertGlyph, SaveGlyph } from '@crewlethq/icons/glyphs';
import { Button, type ButtonSize, type ButtonVariant } from '../Button/index.js';
import { safeFilename, useDownload, type DownloadState } from '../utils/useDownload.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

function downloadGlyph(state: DownloadState): ReactNode {
  if (state === 'started') return <CheckGlyph size="sm" />;
  if (state === 'failed') return <CircleAlertGlyph size="sm" />;
  return <SaveGlyph size="sm" />;
}

export interface DownloadButtonProps {
  /** The text, or a thunk that produces it, resolved on the press. See [CopyButtonProps.text]. */
  text: string | (() => string);
  /** The name to offer it under. Sanitised by [safeFilename]. */
  filename: string;
  /** The type the file is offered as. Defaults to plain text in UTF-8. */
  mime?: string | undefined;
  /** The label at rest. */
  label?: string | undefined;
  /**
   * The label once the browser took the download. It says STARTED, not saved:
   * an `<a download>` has no completion event, so a saved file is a claim
   * nothing here can check.
   */
  startedLabel?: string | undefined;
  /** The label when the browser refused. */
  failedLabel?: string | undefined;
  /** Read out once the download starts. Defaults to "download started: {name}". */
  startedMessage?: string | undefined;
  /** Read out on failure, and the control's `title` while it stands. */
  failedMessage?: string | undefined;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
  title?: string | undefined;
  /**
   * Nothing to offer yet, such as an export of an empty table. Give a `title`
   * that says why, so the control is never a dead button with no reason.
   */
  disabled?: boolean | undefined;
  /** How long `startedLabel` stands before the control offers its action again. */
  resetMs?: number | undefined;
  /** How long `failedLabel` stands. `null`, the default, holds it until the next press. */
  failedResetMs?: number | null | undefined;
  className?: string | undefined;
}

/**
 * Hand text to the reader as a file, and SAY WHETHER IT LANDED.
 *
 * The sibling of [CopyButton], over the same text and on the same state
 * machine, because the two sit side by side ("Copy all", "Download") and any
 * difference in how long a confirmation holds is a visible inconsistency. A
 * clipboard also holds exactly one thing, so a reader keeping two exports
 * side by side needs a file.
 *
 * WHAT IT SAYS IS WHAT WAS OBSERVED. The name the file was offered under is
 * the half that is true and worth saying, because a reader who cannot see the
 * browser's download shelf has nothing else to tell them what to open. A
 * refusal holds until the next press, and every attempt replaces the status
 * message, so a second identical refusal is still announced.
 */
export function DownloadButton({
  text,
  filename,
  mime,
  label = 'Download',
  startedLabel = 'Downloading',
  failedLabel = 'Download failed',
  startedMessage,
  failedMessage = 'the browser refused the download',
  size = 'small',
  variant = 'ghost',
  title,
  disabled,
  resetMs,
  failedResetMs = null,
  className,
}: DownloadButtonProps) {
  const { state, attempt, download } = useDownload({ resetMs, failedResetMs });
  const name = useMemo(() => safeFilename(filename), [filename]);
  const onClick = useCallback(() => {
    void download(text, filename, mime);
  }, [download, text, filename, mime]);
  const said =
    state === 'started' ? (startedMessage ?? `download started: ${name}`) : state === 'failed' ? failedMessage : '';

  return (
    <span className={className}>
      <Button
        size={size}
        variant={variant}
        leadingIcon={downloadGlyph(state)}
        onClick={onClick}
        disabled={disabled}
        title={state === 'failed' ? failedMessage : title}
      >
        {state === 'started' ? startedLabel : state === 'failed' ? failedLabel : label}
      </Button>
      {/* A SIBLING of the button, never a child, so the status is not part of
          the button's accessible name. */}
      <VisuallyHidden>
        <span role="status">
          <span key={attempt}>{said}</span>
        </span>
      </VisuallyHidden>
    </span>
  );
}
