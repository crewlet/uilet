import type { HTMLAttributes, ReactNode } from 'react';
import { USAGE_WARN_AT, type MeterState } from '../Meter/index.js';
import { cx } from '../utils/cx.js';

/** One window of a limit: a 5-hour window, a weekly one, a model's own. */
export interface LimitWindow {
  /** Unique within the stack. */
  id: string;
  /** The window's short name, drawn at the leading edge: "5-hour", "Weekly Opus". */
  label: string;
  /** Where the window stands, as whoever enforces the limit says. */
  state: MeterState;
  /**
   * The fraction of the window used, when it is known. Without it the bar is a
   * state segment, never a guessed length.
   */
  used?: number | undefined;
  /** The trailing figure. Defaults to the rounded percentage of `used`. */
  figure?: string | undefined;
  /**
   * When the window turns over, in words: "resets 5am", "until Mon 9am". A
   * stack where no window has one keeps no column for it.
   */
  note?: string | undefined;
  /** The bar's accessible name: "5-hour limit, 83% used, resets 05:00 UTC". */
  name: string;
}

export interface LimitMetersProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The windows, in the order they are drawn from the top. */
  windows: readonly LimitWindow[];
  /** The group's accessible name: "Limits of opus-main". */
  label: string;
  /** What a stack with no window says. */
  empty?: ReactNode;
  /** A muted line under the windows, such as how old the reading is: "as of 2h ago". */
  caption?: ReactNode;
  /** How an ordinary window is painted: `success` (green, the default) or `neutral`. */
  okTone?: 'success' | 'neutral' | undefined;
}

type LimitTone = 'success' | 'neutral' | 'warning' | 'danger';
const ESCALATION: Record<MeterState, number> = { ok: 0, near: 1, refusing: 2 };

/**
 * The tone a limit window is painted in: green inside it, yellow near it, red at
 * it. A known `used` past the warning line (80%) or the limit escalates a state
 * that says less, so every bar turns at the same place.
 */
export function limitWindowTone(state: MeterState, used?: number, okTone: 'success' | 'neutral' = 'success'): LimitTone {
  if (!Object.hasOwn(ESCALATION, state)) {
    throw new RangeError(`LimitMeters window state must be ok, near or refusing; it was ${String(state)}`);
  }
  const byUse: MeterState = used === undefined ? 'ok' : used >= 1 ? 'refusing' : used >= USAGE_WARN_AT ? 'near' : 'ok';
  const worst = ESCALATION[byUse] > ESCALATION[state] ? byUse : state;
  return worst === 'refusing' ? 'danger' : worst === 'near' ? 'warning' : okTone;
}

/** Refuses a window the stack cannot draw honestly, by name. */
function checked(windows: readonly LimitWindow[]): void {
  const seen = new Set<string>();
  for (const w of windows) {
    if (seen.has(w.id)) throw new RangeError(`LimitMeters window ids must be unique; "${w.id}" is used twice`);
    seen.add(w.id);
    if (w.used !== undefined && (!Number.isFinite(w.used) || w.used < 0)) {
      throw new RangeError(`LimitMeters window "${w.id}" used must be a finite fraction of at least 0; it was ${w.used}`);
    }
  }
}

/**
 * A compact stack of a limit's windows for a table cell, one line each. A known
 * fraction is a `meter`; a window known only by its state is a hatched `img`.
 */
export function LimitMeters({
  windows,
  label,
  empty = 'None reported',
  caption,
  okTone = 'success',
  className,
  ...rest
}: LimitMetersProps) {
  checked(windows);
  if (windows.length === 0) {
    return (
      <div {...rest} className={cx('crewlet-limit-meters', 'crewlet-limit-meters--empty', className)}>
        <span className="crewlet-limit-meters__empty">{empty}</span>
        {caption === undefined ? null : <span className="crewlet-limit-meters__caption">{caption}</span>}
      </div>
    );
  }
  const noted = windows.some((w) => w.note);
  return (
    <div {...rest} className={cx('crewlet-limit-meters', className)}>
      <div
        role="group"
        aria-label={label}
        className={cx('crewlet-limit-meters__grid', !noted && 'crewlet-limit-meters__grid--no-notes')}
      >
        {windows.map((w) => {
          const known = w.used !== undefined;
          const percent = known ? Math.min(100, Math.round((w.used as number) * 100)) : 0;
          const figure = w.figure ?? (known ? `${Math.round((w.used as number) * 100)}%` : undefined);
          const tone = limitWindowTone(w.state, w.used, okTone);
          return (
            <div key={w.id} className="crewlet-limit-meters__window" data-state={w.state} data-tone={tone}>
              <span className="crewlet-limit-meters__label" aria-hidden="true">
                {w.label}
              </span>
              <div
                className="crewlet-limit-meters__track"
                role={known ? 'meter' : 'img'}
                aria-label={w.name}
                aria-valuenow={known ? percent : undefined}
                aria-valuemin={known ? 0 : undefined}
                aria-valuemax={known ? 100 : undefined}
              >
                <div
                  className={cx(
                    'crewlet-limit-meters__fill',
                    known ? percent > 0 && 'crewlet-limit-meters__fill--some' : 'crewlet-limit-meters__fill--state',
                  )}
                  data-tone={tone}
                  style={{ width: known ? `${percent}%` : '100%' }}
                />
              </div>
              <span className="crewlet-limit-meters__figure" aria-hidden="true">
                {figure}
              </span>
              {w.note ? (
                <span className="crewlet-limit-meters__note" aria-hidden="true">
                  {w.note}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {caption === undefined ? null : <span className="crewlet-limit-meters__caption">{caption}</span>}
    </div>
  );
}
