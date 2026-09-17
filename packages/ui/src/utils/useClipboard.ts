import { useCallback, useEffect, useRef, useState } from 'react';

export type ClipboardState = 'idle' | 'copied' | 'failed';

export interface ClipboardOptions {
  /** How long the copied answer stands before the control settles back. */
  resetMs?: number | undefined;
  /**
   * How long a REFUSAL stands, which is not the same question.
   *
   * Left unset it is `resetMs`, which is what this hook has always done and
   * what every current call site still gets. `null` holds the failed state
   * until the next copy; a number gives it a clock of its own.
   *
   * WHY IT IS A SEPARATE CLOCK. A success confirms something the reader
   * already knows they asked for, so it can go as soon as it has been seen.
   * A refusal is news — usually that the origin is not secure and that NO
   * copy on this page will ever work — and a control that has quietly gone
   * back to offering its action is indistinguishable from one nobody ever
   * pressed, so the reader presses it again and learns nothing a second time.
   * [Toaster] already settled this question for this design system and its
   * `DURATIONS` table is the precedent: `info` and `success` go after 4s,
   * `warning` and `danger` are sticky, because news that removes itself is
   * news somebody misses.
   *
   * `null` rather than Toaster's `0` for sticky, because `resetMs` has
   * shipped with `0` meaning "settle on the next tick" and a second option in
   * the same object reading the same number as its opposite is a trap. `null`
   * collides with nothing.
   *
   * The recommendation is `null`. It is not the DEFAULT only because moving
   * the default is a behaviour change for every call site that never asked
   * for one.
   */
  failedResetMs?: number | null | undefined;
}

export interface Clipboard {
  state: ClipboardState;
  copy: (text: string | (() => string)) => Promise<boolean>;
}

/**
 * Putting text on the clipboard, and saying whether it arrived.
 *
 * THREE THINGS ARE LOAD BEARING, and all three were wrong before this existed.
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
 * 3. THE WRITE OUTLIVES THE SCREEN. `writeText` is held for as long as the
 *    browser holds its permission prompt, which is until the reader answers
 *    it — and they may navigate instead. The unmount cleanup clears whatever
 *    timer exists AT THAT MOMENT, and for a write still in flight that is
 *    none: the settle then ran after the cleanup and armed a fresh timer with
 *    nothing left alive to clear it, so the hook leaked a timer per abandoned
 *    copy and wrote state to a component that was gone. `live` is what the
 *    settle is checked against, and it is checked AFTER the await rather than
 *    before, because the await is the whole of the gap.
 *
 * The text may be a THUNK, resolved on the press. On a live screen the thing
 * worth copying is assembled from everything on it, so a string prop means
 * building it again on every push for a control nobody has touched.
 */
export function useClipboard({ resetMs = 2000, failedResetMs }: ClipboardOptions = {}): Clipboard {
  const [state, setState] = useState<ClipboardState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /*
   * Whether the component this hook belongs to is still on the screen.
   *
   * SET IN THE EFFECT BODY, not only in its cleanup: StrictMode mounts,
   * unmounts and remounts, so a ref that is only ever turned off would stay
   * off for the whole life of a development render and every copy after the
   * first would be treated as abandoned.
   */
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      // The timeout outlives the component otherwise, and a screen left during
      // the two seconds after a copy sets state on something unmounted.
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, []);

  const copy = useCallback(
    async (text: string | (() => string)) => {
      const ok = await writeClipboard(typeof text === 'function' ? text() : text);
      /*
       * The screen may be gone by here, and the answer still matters to the
       * CALLER — the text either reached the clipboard or it did not, and
       * unmounting did not change which — so `ok` is returned either way.
       * What is skipped is everything that touches this component: the state
       * write, and the part that actually leaked, the timer.
       */
      if (!live.current) return ok;
      setState(ok ? 'copied' : 'failed');
      clearTimeout(timer.current);
      timer.current = undefined;
      const after = ok ? resetMs : (failedResetMs === undefined ? resetMs : failedResetMs);
      if (after !== null) timer.current = setTimeout(() => setState('idle'), after);
      return ok;
    },
    [resetMs, failedResetMs],
  );

  return { state, copy };
}

/**
 * The write itself, with no state machine around it.
 *
 * Exported because the two halves are independently useful and only one of
 * them is hard: a caller that already owns its feedback — a toast, a form's
 * own status line, a control whose label is driven by something else —
 * wants the secure-context detection, the fallback and the honest boolean,
 * and reimplementing those to get them means reimplementing
 * `execCommandCopy` too, which is the half with the focus restoration in it.
 *
 * Returns whether the text reached the clipboard. It never throws: a refusal
 * is `false`, because a caller that has to tell a refusal from a success is
 * exactly the caller that must not receive one as an exception.
 */
export async function writeClipboard(text: string): Promise<boolean> {
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
