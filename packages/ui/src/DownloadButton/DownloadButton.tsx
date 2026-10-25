import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckGlyph, CircleAlertGlyph, SaveGlyph } from '@crewlethq/icons/glyphs';
import { Button, type ButtonSize, type ButtonVariant } from '../Button/index.js';
import { safeFilename, useDownload, type DownloadState } from '../utils/useDownload.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

function downloadGlyph(state: DownloadState): ReactNode {
  if (state === 'started') return <CheckGlyph size="sm" />;
  if (state === 'failed') return <CircleAlertGlyph size="sm" />;
  return <SaveGlyph size="sm" />;
}

/**
 * What the file is: text the page already holds (or a thunk producing it),
 * or a file fetched on the press, such as an export the server builds.
 */
export type DownloadButtonSource =
  | {
      /** The text, or a thunk that produces it, resolved on the press. See [CopyButtonProps.text]. */
      text: string | (() => string);
      file?: undefined;
      /** The type the file is offered as. Defaults to plain text in UTF-8. */
      mime?: string | undefined;
    }
  | {
      text?: undefined;
      /**
       * Fetches the file on the press. The button keeps its label with the
       * spinner while it waits, and a fetch that rejects reads as a failed
       * download. The type is the blob's own.
       */
      file: () => Promise<Blob>;
      mime?: undefined;
    };

export interface DownloadButtonBaseProps {
  /** The name to offer it under. Sanitised by [safeFilename]. */
  filename: string;
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
   * The control's name where several stand side by side, such as one per
   * file in a list: "Download report.csv". It must contain the visible label,
   * so a reader who says the label to a voice control still finds it.
   */
  'aria-label'?: string | undefined;
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

export type DownloadButtonProps = DownloadButtonBaseProps & DownloadButtonSource;

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
  file,
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
  'aria-label': ariaLabel,
  disabled,
  resetMs,
  failedResetMs = null,
  className,
}: DownloadButtonProps) {
  const { state, attempt, download, downloadFile } = useDownload({ resetMs, failedResetMs });
  const name = useMemo(() => safeFilename(filename), [filename]);
  const [fetching, setFetching] = useState(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const onClick = useCallback(() => {
    if (file) {
      // One fetch at a time: a second press while the first is in flight would
      // fetch the same export twice and offer two files.
      if (fetching) return;
      setFetching(true);
      void downloadFile(file, filename).finally(() => {
        if (live.current) setFetching(false);
      });
      return;
    }
    void download(text, filename, mime);
  }, [download, downloadFile, fetching, file, text, filename, mime]);
  const said =
    state === 'started' ? (startedMessage ?? `download started: ${name}`) : state === 'failed' ? failedMessage : '';

  return (
    <span className={className}>
      <Button
        size={size}
        variant={variant}
        leadingIcon={downloadGlyph(state)}
        onClick={onClick}
        loading={fetching}
        disabled={disabled}
        title={state === 'failed' ? failedMessage : title}
        aria-label={ariaLabel}
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
