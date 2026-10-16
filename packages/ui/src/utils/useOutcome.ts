import { useCallback, useEffect, useRef, useState } from 'react';

/** Where a hand-off stands: not tried, landed, or refused. */
export type OutcomeState = 'idle' | 'done' | 'failed';

export interface OutcomeOptions {
  /** How long a success stands before the control settles back. */
  resetMs?: number | undefined;
  /**
   * How long a REFUSAL stands. Unset it is `resetMs`; `null` holds it until
   * the next attempt; a number gives it a clock of its own. See
   * [ClipboardOptions.failedResetMs] for why a refusal wants its own.
   */
  failedResetMs?: number | null | undefined;
}

export interface Outcome {
  state: OutcomeState;
  /**
   * How many attempts have settled. A status region keyed on it is REPLACED
   * on every attempt, so an identical outcome twice running is still a change
   * a screen reader announces: a second refusal used to be silence.
   */
  attempt: number;
  /**
   * Runs `task` and settles on its answer. The task returns whether it landed
   * and must not throw: a refusal is `false`. The answer is returned to the
   * caller even when the component is gone by the time it arrives.
   */
  run: (task: () => boolean | Promise<boolean>) => Promise<boolean>;
}

/**
 * The state machine every hand-off control shares: do a thing that either
 * lands or does not, say which, and settle back so the label is never a stale
 * claim.
 *
 * ONE MACHINE, because the controls built on it sit side by side (a Copy and
 * a Download over the same text), and any difference between them in how
 * long a confirmation holds, or whether a repeat is announced, is a visible
 * inconsistency rather than a private detail.
 *
 * THE TASK CAN OUTLIVE THE SCREEN. A clipboard write waits on a permission
 * prompt the reader may never answer, so whether the component is still
 * mounted is checked AFTER the await, and nothing is armed for one that is
 * gone. The flag is set in the effect body as well as cleared in its cleanup,
 * because StrictMode mounts, unmounts and mounts again.
 */
export function useOutcome({ resetMs = 2000, failedResetMs }: OutcomeOptions = {}): Outcome {
  const [{ state, attempt }, setOutcome] = useState<{ state: OutcomeState; attempt: number }>({
    state: 'idle',
    attempt: 0,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, []);

  const run = useCallback(
    async (task: () => boolean | Promise<boolean>) => {
      const ok = await task();
      if (!live.current) return ok;
      setOutcome((prior) => ({ state: ok ? 'done' : 'failed', attempt: prior.attempt + 1 }));
      clearTimeout(timer.current);
      timer.current = undefined;
      const after = ok ? resetMs : failedResetMs === undefined ? resetMs : failedResetMs;
      if (after !== null) {
        timer.current = setTimeout(() => setOutcome((prior) => ({ ...prior, state: 'idle' })), after);
      }
      return ok;
    },
    [resetMs, failedResetMs],
  );

  return { state, attempt, run };
}
