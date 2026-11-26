/**
 * Dictation's lazy chunk: the session's controls, the provisional words over
 * the field, the live level and the microphone menu's meter. Fetched by
 * `slot.tsx` on the mic's first hover, focus or press.
 */

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { CheckGlyph, MicGlyph, XGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { prefersReducedMotion } from '../MediaMatch/index.js';
import { Spinner } from '../Spinner/index.js';
import { copyTextStyles } from '../utils/fieldMirror.js';
import {
  accept,
  activeSession,
  cancel,
  meterable,
  menuNotes,
  micState,
  splice,
  joinWords,
  subscribeWords,
  wordsVersion,
  type MicState,
} from './machine.js';
import type { DictationOwner } from './slot.js';
import type { DictationCapture } from './types.js';

export { focusActive, keyDown, menuItems, releaseOwner as release, resumeOwner, start, view } from './machine.js';
export { MicOffGlyph } from '@crewlethq/icons/glyphs';

const BARS = 16;
/** Bars at rest, so a silent room reads as a row of dots. */
const REST = 0.15;
const FRAME_MS = 60;
const STEADY_MS = 500;

/**
 * Calls `draw` with the level about every frame, or twice a second in steps
 * when the reader asked for less motion.
 */
function useLevel(read: () => number, draw: (level: number, steady: boolean) => void): void {
  const latest = useRef({ read, draw });
  latest.current = { read, draw };
  useEffect(() => {
    const steady = prefersReducedMotion();
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= (steady ? STEADY_MS : FRAME_MS)) {
        last = now;
        const level = latest.current.read();
        latest.current.draw(steady ? Math.round(level * 4) / 4 : level, steady);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
}

/** The live level while dictating: a short history of bars, flat once capture stops. */
export function Wave({ owner }: { owner: DictationOwner }) {
  const bars = useRef<HTMLSpanElement>(null);
  const history = useRef<number[]>(Array.from({ length: BARS }, () => 0));
  useLevel(
    () => {
      const s = activeSession();
      return s?.owner === owner && s.capture ? s.capture.level() : 0;
    },
    (level, steady) => {
      const row = history.current;
      if (steady) row.fill(level);
      else {
        row.shift();
        row.push(level);
      }
      const spans = bars.current?.children;
      if (!spans) return;
      for (let i = 0; i < spans.length; i++) {
        (spans[i] as HTMLElement).style.transform = `scaleY(${REST + (1 - REST) * row[i]!})`;
      }
    },
  );
  return (
    <span ref={bars} className="crewlet-dictation__wave" aria-hidden="true">
      {history.current.map((_, i) => (
        <span key={i} className="crewlet-dictation__bar" />
      ))}
    </span>
  );
}

/** Cancel and Accept in the send slot's place. */
export function Swap({ owner }: { owner: DictationOwner }) {
  const s = activeSession();
  if (!s || s.owner !== owner) return null;
  const { labels, phase } = s;
  return (
    <>
      <IconButton
        label={labels.cancel}
        icon={<XGlyph />}
        variant="secondary"
        className="crewlet-dictation__cancel"
        onClick={() => cancel(s)}
      />
      {phase === 'pending' || phase === 'preparing' ? null : (
        <IconButton
          label={labels.accept}
          icon={phase === 'accepting' ? <Spinner /> : <CheckGlyph />}
          variant="primary"
          aria-busy={phase === 'accepting' || undefined}
          className="crewlet-dictation__accept"
          onClick={() => void accept(s)}
        />
      )}
    </>
  );
}

/**
 * The draft as it will read, over the field: the words before the caret, the
 * provisional words in the muted italic, then the words after. The field
 * underneath keeps its value and caret, drawn transparent, and is held at
 * least as tall as this layer.
 */
export function Layer({ owner }: { owner: DictationOwner }) {
  useSyncExternalStore(subscribeWords, wordsVersion, wordsVersion);
  const layer = useRef<HTMLDivElement>(null);
  const said = useRef<HTMLSpanElement>(null);
  const s = activeSession();
  const mine = s?.owner === owner ? s : null;
  const field = owner.get().field.current;
  const value = owner.get().value;
  const provisional = mine ? joinWords([...mine.finals, mine.partial]) : '';
  const from = Math.min(mine?.from ?? 0, value.length);
  const to = Math.min(Math.max(from, mine?.to ?? 0), value.length);
  const shown = provisional ? splice(value, from, to, provisional) : null;
  const before = shown ? shown.value.slice(0, shown.caret - provisional.length) : value.slice(0, from);
  const after = shown ? shown.value.slice(shown.caret) : value.slice(to);

  useLayoutEffect(() => {
    const el = layer.current;
    if (!el || !field) return;
    const place = () => {
      const style = getComputedStyle(field);
      copyTextStyles(style, el);
      el.style.top = `${field.offsetTop}px`;
      el.style.left = `${field.offsetLeft}px`;
      el.style.height = 'auto';
      // The field grows to the layer's words, up to its own cap.
      const need = Math.min(el.offsetHeight, Number.parseFloat(style.maxHeight) || Infinity);
      if (need > field.offsetHeight) field.style.minHeight = `${need}px`;
      el.style.height = `${field.offsetHeight}px`;
      const end = said.current;
      if (end) el.scrollTop = Math.max(0, end.offsetTop + end.offsetHeight - el.clientHeight + Number.parseFloat(style.paddingBottom));
    };
    place();
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
    watch?.observe(field);
    return () => watch?.disconnect();
  });
  // The field's own sizing comes back with the session's end.
  useEffect(() => () => void field?.style.removeProperty('min-height'), [field]);

  const empty = before === '' && provisional === '' && after === '';
  return (
    <div ref={layer} className="crewlet-dictation__layer" aria-hidden="true">
      {before}
      <span ref={said} className="crewlet-dictation__provisional">
        {empty && (mine?.phase === 'listening' || mine?.phase === 'pending') ? mine.labels.listening : provisional}
      </span>
      {after}
      {/* A trailing line break draws a line only with something after it. */}
      {after.endsWith('\n') || (after === '' && provisional === '' && before.endsWith('\n')) ? '​' : null}
    </div>
  );
}

/** The input level of the chosen device, while the menu is open. */
function Meter({ m }: { m: MicState }) {
  const fill = useRef<HTMLSpanElement>(null);
  const own = useRef<DictationCapture | null>(null);
  useEffect(() => {
    if (activeSession()?.capture) return;
    let alive = true;
    m.mic.open(m.chosen).then(
      (capture) => {
        if (alive) own.current = capture;
        else capture.stop();
      },
      () => undefined,
    );
    return () => {
      alive = false;
      own.current?.stop();
      own.current = null;
    };
  }, [m, m.chosen]);
  useLevel(
    () => (activeSession()?.capture ?? own.current)?.level() ?? 0,
    (level) => {
      if (fill.current) fill.current.style.transform = `scaleX(${level})`;
    },
  );
  return (
    <span className="crewlet-dictation__meter" aria-hidden="true">
      <MicGlyph size="sm" />
      <span className="crewlet-dictation__track">
        <span ref={fill} className="crewlet-dictation__fill" />
      </span>
    </span>
  );
}

/** Whether the menu has a head to draw. */
export function hasHeader(owner: DictationOwner): boolean {
  return meterable(owner) || menuNotes(owner).length > 0;
}

/** Above the devices: the live level, or why there is none. */
export function MenuHeader({ owner }: { owner: DictationOwner }) {
  const notes = menuNotes(owner);
  const meter = meterable(owner);
  return (
    <div className="crewlet-dictation__head">
      {meter ? <Meter m={micState(owner.get().source)} /> : null}
      {notes.map((note) => (
        <p key={note} className="crewlet-dictation__help">
          {note}
        </p>
      ))}
    </div>
  );
}
