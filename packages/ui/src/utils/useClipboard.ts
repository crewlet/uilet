import { useCallback, useEffect, useRef, useState } from 'react';

export type ClipboardState = 'idle' | 'copied' | 'failed';

export interface ClipboardOptions {
  /** How long the copied or failed answer stands before the control settles back. */
  resetMs?: number;
}

export interface Clipboard {
  state: ClipboardState;
  copy: (text: string | (() => string)) => Promise<boolean>;
}

/**
 * Putting text on the clipboard, and saying whether it arrived.
 *
 * TWO THINGS ARE LOAD BEARING, and both were wrong before this existed.
 *
 * 1. THE CLIPBOARD API IS NOT ALWAYS THERE. It is gated on a secure context,
 *    so `navigator.clipboard` is simply undefined on the plain http origin
 *    anybody reads a dashboard at that is not their own laptop. An optional
 *    call made that failure silent: the button clicked, nothing was copied,
 *    and nothing said so. The `execCommand` fallback is deprecated and is
 *    also the only thing that works there, so it stays, and its boolean
 *    result is honoured rather than assumed.
 * 2. A COPY WITH NO FEEDBACK IS A DEAD BUTTON. The clipboard is invisible;
 *    the only way a reader learns it worked is if the control says so, which
 *    is what `state` is for.
 *
 * The text may be a THUNK, resolved on the press. On a live screen the thing
 * worth copying is assembled from everything on it, so a string prop means
 * building it again on every push for a control nobody has touched.
 */
export function useClipboard({ resetMs = 2000 }: ClipboardOptions = {}): Clipboard {
  const [state, setState] = useState<ClipboardState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The timeout outlives the component otherwise, and a screen left during the
  // two seconds after a copy sets state on something unmounted.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string | (() => string)) => {
      const ok = await writeClipboard(typeof text === 'function' ? text() : text);
      setState(ok ? 'copied' : 'failed');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('idle'), resetMs);
      return ok;
    },
    [resetMs],
  );

  return { state, copy };
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // A denied permission and an insecure origin both land here, and the
    // fallback below is the answer to both.
  }
  return execCommandCopy(text);
}

/** The pre-Clipboard-API copy: a selected off-screen textarea. */
function execCommandCopy(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const field = document.createElement('textarea');
  field.value = text;
  /*
   * Off-screen rather than hidden: a field under `display: none` cannot be
   * selected, and selecting it is the whole mechanism. `readonly` stops a
   * mobile keyboard appearing for the frame it exists.
   */
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.top = '-1000px';
  field.style.opacity = '0';
  // WHERE FOCUS WAS. Selecting the field takes focus off the control that was
  // pressed, so without this a keyboard reader's next Tab starts from the top
  // of the document rather than from the button they just used.
  const held = document.activeElement;
  document.body.appendChild(field);
  try {
    field.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    if (held instanceof HTMLElement && held.isConnected) held.focus();
  }
}
