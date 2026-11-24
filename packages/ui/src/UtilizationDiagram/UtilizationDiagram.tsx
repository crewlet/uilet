import { useEffect, useRef, type HTMLAttributes } from 'react';
import { REDUCED_MOTION_QUERY, useMediaMatch } from '../MediaMatch/index.js';
import { usageTone } from '../Meter/index.js';
import { cx } from '../utils/cx.js';

export type UtilizationMode = 'balanced' | 'sequential';

export interface UtilizationDiagramProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** `sequential` fills lane 1, then 2, then 3; `balanced` fills them together to one level. */
  mode: UtilizationMode;
  /** How many lanes, 2 to 5; 3 by default. */
  lanes?: number | undefined;
  /** Names the picture for assistive technology; without it the diagram is decoration. */
  label?: string | undefined;
}

/** The phases of one loop, in milliseconds. */
export const UTILIZATION_TIMING = { fill: 1200, balancedFill: 2400, hold: 1500, fade: 400 } as const;
/** Where a balanced loop rests: every lane level, below the warning line. */
export const BALANCED_LEVEL = 0.6;

/** One loop's length for a mode and a lane count. */
export function utilizationCycle(mode: UtilizationMode, lanes: number): number {
  const fill = mode === 'sequential' ? UTILIZATION_TIMING.fill * lanes : UTILIZATION_TIMING.balancedFill;
  return fill + UTILIZATION_TIMING.hold + UTILIZATION_TIMING.fade;
}

/** Each lane's level (0 to 1) and opacity at `ms` into the loop. */
export function utilizationFrame(mode: UtilizationMode, lanes: number, ms: number): { level: number; opacity: number }[] {
  const cycle = utilizationCycle(mode, lanes);
  const t = ((ms % cycle) + cycle) % cycle;
  const fadeAt = cycle - UTILIZATION_TIMING.fade;
  const opacity = t < fadeAt ? 1 : 1 - (t - fadeAt) / UTILIZATION_TIMING.fade;
  return Array.from({ length: lanes }, (_, lane) => {
    if (mode === 'balanced') {
      const p = Math.min(1, t / UTILIZATION_TIMING.balancedFill);
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      return { level: BALANCED_LEVEL * eased, opacity };
    }
    const start = lane * UTILIZATION_TIMING.fill;
    const level = Math.max(0, Math.min(1, (t - start) / UTILIZATION_TIMING.fill));
    return { level, opacity };
  });
}

/** The still frame under reduced motion: lane 1 at its limit and lane 2 part way, or every lane level. */
export function utilizationStill(mode: UtilizationMode, lanes: number): number[] {
  return Array.from({ length: lanes }, (_, lane) =>
    mode === 'balanced' ? BALANCED_LEVEL : lane === 0 ? 1 : lane === 1 ? 0.55 : 0,
  );
}

/**
 * A utilization strategy at a glance: lanes as horizontal usage bars that loop
 * while seen, each coloured by its level (green, yellow from 80%, red at the
 * limit). Paused off screen or in a hidden tab; a still frame under reduced motion.
 */
export function UtilizationDiagram({ mode, lanes = 3, label, className, ...rest }: UtilizationDiagramProps) {
  const root = useRef<HTMLSpanElement>(null);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const still = useMediaMatch(REDUCED_MOTION_QUERY);

  useEffect(() => {
    const paint = (levels: number[], opacity = 1) => {
      levels.forEach((level, lane) => {
        const fill = fills.current[lane];
        if (!fill) return;
        fill.style.transform = `scaleX(${level})`;
        fill.style.opacity = String(opacity);
        fill.dataset['tone'] = usageTone(level);
      });
    };
    if (still || typeof requestAnimationFrame !== 'function') {
      paint(utilizationStill(mode, lanes));
      return undefined;
    }
    let seen = true;
    let frame = 0;
    let elapsed = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) elapsed += now - last;
      last = now;
      const at = utilizationFrame(mode, lanes, elapsed);
      paint(
        at.map((one) => one.level),
        at[0]?.opacity ?? 1,
      );
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      const run = seen && !document.hidden;
      cancelAnimationFrame(frame);
      last = null;
      if (run) frame = requestAnimationFrame(tick);
    };
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            seen = entries.some((entry) => entry.isIntersecting);
            sync();
          });
    if (root.current) io?.observe(root.current);
    document.addEventListener('visibilitychange', sync);
    paint(utilizationStill(mode, lanes).map(() => 0));
    sync();
    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [mode, lanes, still]);

  if (!Number.isInteger(lanes) || lanes < 2 || lanes > 5) {
    throw new RangeError(`UtilizationDiagram lanes must be a whole number from 2 to 5; it was ${lanes}`);
  }
  return (
    <span
      {...rest}
      ref={root}
      className={cx('crewlet-utilization-diagram', className)}
      data-mode={mode}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: lanes }, (_, lane) => (
        <span key={lane} className="crewlet-utilization-diagram__lane">
          {mode === 'sequential' ? <span className="crewlet-utilization-diagram__n">{lane + 1}</span> : null}
          <span className="crewlet-utilization-diagram__track">
            <span
              className="crewlet-utilization-diagram__fill"
              data-tone="success"
              ref={(node) => {
                fills.current[lane] = node;
              }}
            />
          </span>
        </span>
      ))}
    </span>
  );
}
