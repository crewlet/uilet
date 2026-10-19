import { useCallback } from 'react';
import { useOutcome, type OutcomeOptions } from './useOutcome.js';

/** Where a download stands: not tried, handed to the browser, or refused. */
export type DownloadState = 'idle' | 'started' | 'failed';

export interface Download {
  state: DownloadState;
  /** How many downloads have settled. See [Outcome.attempt]. */
  attempt: number;
  /**
   * Offers `text` as a file, and answers whether the browser took it. The
   * text may be a thunk, resolved on the press.
   */
  download: (text: string | (() => string), filename: string, mime?: string) => Promise<boolean>;
}

/** The type a download is offered under when the caller names none. */
const DEFAULT_MIME = 'text/plain;charset=utf-8';

/**
 * Handing text to the reader as a file, and saying whether it landed: the
 * mirror of `useClipboard`, on the same state machine.
 *
 * "STARTED", NOT "SAVED". There is no completion event on an `<a download>`:
 * the browser took the click, and a gate such as Chrome's automatic multiple
 * download prompt can still stop it silently after that. What the control can
 * honestly say is that the download was handed over, and under which name.
 */
export function useDownload(options: OutcomeOptions = {}): Download {
  const outcome = useOutcome(options);
  const { run } = outcome;
  const download = useCallback(
    (text: string | (() => string), filename: string, mime: string = DEFAULT_MIME) =>
      run(() => downloadText(typeof text === 'function' ? text() : text, filename, mime).started),
    [run],
  );
  const state: DownloadState = outcome.state === 'done' ? 'started' : outcome.state;
  return { state, attempt: outcome.attempt, download };
}

/**
 * Saves `text` on the reader's machine and reports whether the browser took
 * it, with the name it was offered under ([safeFilename] of `filename`).
 *
 * For a control that cannot say so on itself, such as a menu item that
 * closes on the press: the caller raises a toast from the answer. The save
 * itself is [downloadBlob]'s, so text and binary files share one path.
 */
export function downloadText(
  text: string,
  filename: string,
  mime: string = DEFAULT_MIME,
): { started: boolean; name: string } {
  if (typeof Blob === 'undefined') return { started: false, name: safeFilename(filename) };
  return downloadBlob(new Blob([text], { type: mime }), filename);
}

/**
 * Saves `blob` on the reader's machine and reports whether the browser took
 * it, with the name it was offered under ([safeFilename] of `filename`): a
 * chart rasterised to PNG, an archive, any bytes the page already holds.
 *
 * TWO THINGS ARE CHECKED UP FRONT rather than assumed. Without
 * `URL.createObjectURL` there is nothing to point a saveable link at, and a
 * `data:` URL is the wrong fallback because several engines cap it near two
 * megabytes, so it would fail silently on exactly the large files. Without the
 * `download` attribute the click NAVIGATES to the file instead of saving it,
 * which looks enough like something happening that nobody checks.
 *
 * The blob URL is revoked on the NEXT macrotask: the click only queues the
 * download, and freeing the entry inside the same task races the fetch that is
 * about to read it. Never revoking is the other failure, a second copy of the
 * bytes held for the life of the tab.
 */
export function downloadBlob(blob: Blob, filename: string): { started: boolean; name: string } {
  const name = safeFilename(filename);
  if (
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    typeof HTMLAnchorElement === 'undefined' ||
    !('download' in HTMLAnchorElement.prototype)
  ) {
    return { started: false, name };
  }
  let url = '';
  try {
    url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    // In the document for the one synchronous call: not every engine runs an
    // activation behaviour on a node that is in no document.
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
    return { started: true, name };
  } catch {
    return { started: false, name };
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Longer than any extension in use, so a dot deep inside a name is not read as one. */
const MAX_EXTENSION = 12;

/**
 * The longest name offered, in BYTES. Every filesystem a reader is likely on
 * allows at least 255, the browser appends its own " (1)" to deduplicate, and
 * eCryptfs stops at 143; 120 clears all three with room to spare.
 */
const MAX_FILENAME = 120;

const encoder = new TextEncoder();

function bytes(value: string): number {
  return encoder.encode(value).length;
}

/** Cut to a byte budget on whole code points, so no lone surrogate reaches the disk. */
function cutToBytes(value: string, max: number): string {
  if (max <= 0) return '';
  if (bytes(value) <= max) return value;
  let out = '';
  let used = 0;
  for (const character of value) {
    const size = bytes(character);
    if (used + size > max) break;
    out += character;
    used += size;
  }
  return out;
}

/**
 * A filename the reader will actually get, out of whatever the caller had.
 *
 * The `download` attribute is only a suggestion and each browser sanitises it
 * its own way, so the name is decided here and every caller gets one
 * predictable answer. A name composed from data (an id off the URL) that
 * arrived as `../etc/passwd` or with a newline in it never reaches that guess.
 *
 * UNICODE-AWARE: letters, marks and numbers in every script are kept, and
 * separators and invisibles (a slash, a colon, the fullwidth solidus, a
 * right-to-left override) become a hyphen. An ASCII-only class turned
 * `日本語.json` into a file called `json`. The EXTENSION is never what gets cut
 * or stripped, because a name that loses it opens in the wrong application;
 * leading dots, which make `..` a traversal and `.name` a hidden file, are
 * stripped from the stem.
 */
export function safeFilename(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{M}\p{N}_.-]+/gu, '-').replace(/-{2,}/g, '-');
  const dot = cleaned.lastIndexOf('.');
  const tail = cleaned.length - dot;
  const extension = dot >= 0 && tail >= 2 && tail <= MAX_EXTENSION ? cleaned.slice(dot) : '';
  const stem = (extension ? cleaned.slice(0, dot) : cleaned).replace(/^[-.]+/, '');
  if (!stem) return `download${extension}`;
  return cutToBytes(stem, MAX_FILENAME - bytes(extension)) + extension;
}
