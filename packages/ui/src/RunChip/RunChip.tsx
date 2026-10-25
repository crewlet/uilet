import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { DisclosureAnatomy } from '../Disclosure/index.js';
import { StepStateMark, type StepState } from '../Stepper/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * Where a request stands. `thinking` before its first step, `working` while
 * its steps run, `done`, `waiting` on the person's approval, `applying` while
 * an approved change is carried out, `stopped` by the person, `failed` (the
 * system could not finish it) and `refused` (the person's own access does not
 * allow it).
 */
export type RunState = 'thinking' | 'working' | 'done' | 'waiting' | 'applying' | 'stopped' | 'failed' | 'refused';

export const RUN_STATES = [
  'thinking',
  'working',
  'done',
  'waiting',
  'applying',
  'stopped',
  'failed',
  'refused',
] as const satisfies readonly RunState[];

/** The states in which the request is still under way, and its steps are shown open. */
const ACTIVE: ReadonlySet<RunState> = new Set(['thinking', 'working', 'applying']);

/** Each request state's mark, from the one set of step marks, so the chip and its steps share a column. */
const MARK: Record<RunState, StepState> = {
  thinking: 'running',
  working: 'running',
  applying: 'running',
  done: 'done',
  waiting: 'waiting',
  stopped: 'stopped',
  failed: 'failed',
  refused: 'refused',
};

export interface RunChipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  state: RunState;
  /** The state in words, with the time where it has one: "Working", "Done in 5s", "Stopped after 3s". */
  title: string;
  /** A fact after the title, behind a " · " separator: "3s", "2 steps", "1 of 2 steps". */
  meta?: string | undefined;
  /**
   * What the chip opens: the request's steps (`StepList`). Without it, or
   * with `expandable` false, the chip is words with its chevron's slot kept,
   * so its mark does not move when the first step arrives.
   */
  children?: ReactNode;
  /** Whether there is anything to open. Defaults to whether `children` is given. */
  expandable?: boolean | undefined;
  /** Controlled open state. */
  open?: boolean | undefined;
  /**
   * The uncontrolled starting state. Left out, the chip is open while the
   * request is under way and closed otherwise, and it follows the request: it
   * opens when work starts and closes itself when the request settles,
   * whatever the reader last did with it.
   */
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/**
 * A request's state, as the row a reader opens to see its steps.
 *
 * BUILT ON THE DISCLOSURE TRIGGER: the chevron, then the state's mark (the
 * spinner while it works, the check, the clock, the lock), the state in words
 * and a quieter fact after a " · ", in the disclosure's own register. The
 * chevron's padding hangs into the gutter, so the chevron sits on the text
 * edge of the thread above it.
 *
 * THE STATE CARRIES ITS TONE IN THE TITLE'S INK: waiting on the person in the
 * warning ink, failed in the danger ink, everything else in the secondary
 * ink. Colour is never alone: the words say the state, and the mark draws it.
 *
 * ITS NAME IS ITS WORDS, "Working, 3 s": the visible separator is drawn by
 * the style sheet, so it is neither read nor copied, and a hidden comma is
 * said and copied in its place. The step list it opens
 * is a region named by the chip.
 */
export function RunChip({
  state,
  title,
  meta,
  children,
  expandable: expandableProp,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  className,
  ...rest
}: RunChipProps) {
  const expandable = expandableProp ?? (children !== undefined && children !== null && children !== false);
  const controlled = controlledOpen !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen ?? ACTIVE.has(state));
  const active = ACTIVE.has(state);
  const wasActive = useRef(active);
  useEffect(() => {
    // Follows the request across the line between under way and settled, and
    // only across it, so a reader who closed a running request's steps is
    // not overruled on every second its time ticks.
    if (controlled || wasActive.current === active) return;
    wasActive.current = active;
    setUncontrolled(active);
  }, [active, controlled]);
  const open = expandable && (controlled ? controlledOpen : uncontrolled);
  const rid = useId();

  const toggle = () => {
    if (!controlled) setUncontrolled(!open);
    onOpenChange?.(!open);
  };

  return (
    <div
      {...rest}
      className={cx('crewlet-run-chip', `crewlet-run-chip--${state}`, className)}
      data-state={open ? 'open' : 'closed'}
    >
      <DisclosureAnatomy
        open={open}
        onToggle={toggle}
        expandable={expandable}
        icon={<StepStateMark state={MARK[state]} />}
        title={
          <>
            {title}
            {meta === undefined ? null : <VisuallyHidden>,</VisuallyHidden>}
          </>
        }
        meta={meta === undefined ? undefined : <span className="crewlet-run-chip__meta">{meta}</span>}
        headingLevel="none"
        triggerId={`${rid}-trigger`}
        panelId={`${rid}-panel`}
        triggerClassName="crewlet-run-chip__trigger"
      />
      {expandable ? (
        <div
          id={`${rid}-panel`}
          role="region"
          aria-labelledby={`${rid}-trigger`}
          className="crewlet-run-chip__panel"
          hidden={!open}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
