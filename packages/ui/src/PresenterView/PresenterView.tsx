import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '../Button/index.js';
import { Eyebrow } from '../Eyebrow/index.js';
import { SlideNav } from '../SlideNav/index.js';
import { SLIDE_HEIGHT, SLIDE_WIDTH, SlideStage } from '../SlideStage/index.js';
import { cx } from '../utils/cx.js';

export interface PresenterViewLabels {
  current: (position: number, total: number, title: string) => string;
  next: (title: string) => string;
  /** The captions over the room's slide and the next one. */
  onScreen: string;
  upNext: string;
  end: string;
  notes: string;
  noNotes: string;
  timer: string;
  pause: string;
  resume: string;
  reset: string;
  previous: string;
  forward: string;
  position: (position: number, total: number) => string;
}

const LABELS: PresenterViewLabels = {
  current: (position, total, title) => `Slide ${position} of ${total}, ${title}`,
  next: (title) => `Next, ${title}`,
  onScreen: 'Current',
  upNext: 'Next',
  end: 'End of the deck',
  notes: 'Speaker notes',
  noNotes: 'No notes for this slide.',
  timer: 'Time presenting',
  pause: 'Pause',
  resume: 'Resume',
  reset: 'Reset',
  previous: 'Previous slide',
  forward: 'Next slide',
  position: (position, total) => `${position} of ${total}`,
};

export interface PresenterViewProps {
  /** The slide on the audience's screen, drawn at its own size. */
  current: ReactNode;
  currentTitle: string;
  /** The slide after it; null at the end of the deck. */
  next: ReactNode | null;
  nextTitle?: string | undefined;
  notes: string;
  /** One-based. */
  position: number;
  total: number;
  onNext: () => void;
  onPrevious: () => void;
  /** The clock the timer reads, for a test; the browser's otherwise. */
  now?: (() => number) | undefined;
  className?: string | undefined;
  labels?: Partial<PresenterViewLabels> | undefined;
}

/**
 * `ms` as a stopwatch reads, m:ss or h:mm:ss past an hour: glanceable at the
 * lectern, where RelativeTime's "4m 20s" would change width every second.
 */
export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * The presenter's own screen: the slide the room sees, the one after it, the
 * speaker notes large enough to read at a glance, how long the talk has run,
 * and the controls that move the show.
 *
 * A SEPARATE SCREEN FROM THE AUDIENCE'S. The host draws this in its own
 * window and the slide itself full screen elsewhere; both follow one position,
 * so pressing next here moves the room.
 *
 * THE TIMER COUNTS FROM WHEN THE VIEW OPENED and can be paused and reset. It
 * is the presenter's, kept by no one else, and it is not announced every
 * second: it is marked as a timer, which screen readers leave quiet.
 */
export function PresenterView({
  current,
  currentTitle,
  next,
  nextTitle = '',
  notes,
  position,
  total,
  onNext,
  onPrevious,
  now = Date.now,
  className,
  labels,
}: PresenterViewProps) {
  const text = { ...LABELS, ...labels };
  const clock = useRef(now);
  clock.current = now;
  // ELAPSED IS KEPT AS A SUM OF RUNS, so a pause holds the count exactly
  // and a resume carries on from it.
  const [banked, setBanked] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(() => now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (runningSince === null) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [runningSince]);

  const elapsed = banked + (runningSince === null ? 0 : clock.current() - runningSince);
  void tick;

  const pause = () => {
    if (runningSince === null) {
      setRunningSince(clock.current());
    } else {
      setBanked(elapsed);
      setRunningSince(null);
    }
  };
  const reset = () => {
    setBanked(0);
    setRunningSince(runningSince === null ? null : clock.current());
  };

  return (
    <div
      className={cx('crewlet-presenter', className)}
      style={{ '--crewlet-presenter-ratio': SLIDE_WIDTH / SLIDE_HEIGHT } as CSSProperties}
    >
      <section className="crewlet-presenter__main" aria-label={text.onScreen}>
        <Eyebrow as="p" className="crewlet-presenter__caption">
          {text.onScreen}
        </Eyebrow>
        <div className="crewlet-presenter__screen">
          <SlideStage label={text.current(position, total, currentTitle)} framed>
            {current}
          </SlideStage>
          <SlideNav
            className="crewlet-presenter__controls"
            position={position}
            total={total}
            onPrevious={onPrevious}
            onNext={onNext}
            labels={{ previous: text.previous, next: text.forward, end: text.end, position: text.position }}
          />
        </div>
      </section>
      <aside className="crewlet-presenter__side">
        <section className="crewlet-presenter__next" aria-label={text.upNext}>
          <Eyebrow as="p" className="crewlet-presenter__caption">
            {text.upNext}
          </Eyebrow>
          {next ? (
            <SlideStage label={text.next(nextTitle)} framed>
              {next}
            </SlideStage>
          ) : (
            <p className="crewlet-presenter__end">{text.end}</p>
          )}
        </section>
        <div className="crewlet-presenter__timer">
          <span role="timer" aria-label={text.timer} className="crewlet-presenter__elapsed">
            {formatStopwatch(elapsed)}
          </span>
          <Button size="small" variant="secondary" onClick={pause}>
            {runningSince === null ? text.resume : text.pause}
          </Button>
          <Button size="small" variant="ghost" onClick={reset}>
            {text.reset}
          </Button>
        </div>
        <section className="crewlet-presenter__notes" aria-label={text.notes}>
          <Eyebrow as="p" className="crewlet-presenter__caption">
            {text.notes}
          </Eyebrow>
          <div className="crewlet-presenter__notes-body">
            {notes ? <p>{notes}</p> : <p className="crewlet-presenter__empty">{text.noNotes}</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}
