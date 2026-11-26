/**
 * Dictation's state machine, one per tab: at most one session, the
 * microphone's permission and devices, and the words a session holds until
 * Accept splices them into the draft with one `onChange`.
 */

import type { KeyboardEvent } from 'react';
import { announce } from '../Announcer/Announcer.js';
import type { MenuEntry } from '../Menu/index.js';
import { isApplePlatform } from '../Kbd/Kbd.js';
import { dictationLabels } from './labels.js';
import { browserMicrophone } from './microphone.js';
import { DICTATION_SHORTCUT, chordMatches, notify, type DictationOwner } from './slot.js';
import type {
  DictationCapture,
  DictationDevice,
  DictationErrorCode,
  DictationLabels,
  DictationMicrophone,
  DictationPermission,
  DictationSource,
  DictationStopReason,
  DictationTransport,
  DictationTransportEvents,
} from './types.js';

/** How long Accept waits for the last words before inserting what it has. */
export const FLUSH_MS = 1500;
/** The level under which the room counts as silent. */
export const SILENT_LEVEL = 0.08;
const GATE_MS = 250;
/** How long a note that needs no answer (a busy microphone) stays. */
const NOTE_MS = 8000;
const STORE_KEY = 'crewlet:dictation:device';

export type DictationPhase = 'pending' | 'preparing' | 'listening' | 'stopped' | 'accepting';

/** What one microphone is known to allow, per tab. */
export interface MicState {
  mic: DictationMicrophone;
  permission: DictationPermission;
  /** Null until listed. */
  devices: DictationDevice[] | null;
  /** The device in use; undefined is the default. */
  chosen: string | undefined;
  /** The remembered device is not connected, so the default is used. */
  gone: boolean;
  /** The last route used lets the browser pick the microphone. */
  picks: boolean;
}

export interface Session {
  owner: DictationOwner;
  label: string;
  source: DictationSource;
  labels: DictationLabels;
  mic: MicState;
  /** The draft and selection when the session began. */
  value: string;
  from: number;
  to: number;
  finals: string[];
  partial: string;
  phase: DictationPhase;
  reason: DictationStopReason | null;
  quiet: boolean;
  capture: DictationCapture | null;
  /** The route in use, and its place in the source's list. */
  transport: DictationTransport | null;
  index: number;
  /** Before the route's first word or `ready`: a `busy` or `unavailable` moves to the next route. */
  opening: boolean;
  /** The route said it is preparing, so it will say when it is ready. */
  prepared: boolean;
  progress: number | undefined;
  /** Why the routes tried so far declined: `busy` outranks `unavailable`. */
  declined: 'busy' | 'unavailable' | null;
  /** The transport has nothing more to send. */
  ended: boolean;
  flushing: Promise<void> | null;
  heard: number;
  timer: ReturnType<typeof setInterval> | undefined;
  /** Accepted, cancelled or released: nothing it does reaches the composer now. */
  over: boolean;
}

let session: Session | null = null;
const notes = new Map<DictationOwner, string>();
const states = new WeakMap<DictationMicrophone, MicState>();
let browser: DictationMicrophone | null = null;

let words = 0;
const wordListeners = new Set<() => void>();

/** The provisional words changed; only the layer redraws. */
function wordsChanged(): void {
  words += 1;
  for (const listener of [...wordListeners]) listener();
}

export function subscribeWords(listener: () => void): () => void {
  wordListeners.add(listener);
  return () => wordListeners.delete(listener);
}

export function wordsVersion(): number {
  return words;
}

export function activeSession(): Session | null {
  return session;
}

/** Whether the words so far can be added to by pressing the mic again. */
export function resumable(reason: DictationStopReason | null): boolean {
  return reason === 'paused' || reason === 'silence';
}

function remember(id: string | undefined): void {
  try {
    if (id === undefined) localStorage.removeItem(STORE_KEY);
    else localStorage.setItem(STORE_KEY, id);
  } catch {
    // Storage refused (private mode): the choice lasts for the tab.
  }
}

function recall(): string | undefined {
  try {
    return localStorage.getItem(STORE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function micOf(source: DictationSource): DictationMicrophone {
  return source.microphone ?? (browser ??= browserMicrophone());
}

/** A source's microphone, probed for its permission and devices the first time it is asked for. */
export function micState(source: DictationSource): MicState {
  const mic = micOf(source);
  let state = states.get(mic);
  if (!state) {
    state = { mic, permission: 'unknown', devices: null, chosen: recall(), gone: false, picks: false };
    states.set(mic, state);
    void probe(state);
  }
  return state;
}

async function probe(m: MicState): Promise<void> {
  if (m.mic.check()) return;
  m.permission = await m.mic.permission().catch((): DictationPermission => 'unknown');
  m.mic.onPermissionChange?.((state) => {
    m.permission = state;
    void listDevices(m);
  });
  m.mic.onDeviceChange?.(() => void deviceChanged(m));
  await listDevices(m);
}

async function listDevices(m: MicState): Promise<void> {
  try {
    m.devices = await m.mic.devices();
  } catch {
    m.devices = null;
  }
  // Ids are only stable once labels are shown, which is once permission is granted.
  const wanted = recall();
  if (wanted !== undefined && m.devices?.some((d) => d.label)) {
    const present = m.devices.some((d) => d.deviceId === wanted);
    m.chosen = present ? wanted : undefined;
    m.gone = !present;
  }
  notify();
}

async function deviceChanged(m: MicState): Promise<void> {
  await listDevices(m);
  // On the default device, a new OS default replaces the track in the same session.
  if (session?.mic === m && session.phase === 'listening' && m.chosen === undefined) await switchTo(session, undefined);
}

function labelsOf(source: DictationSource): DictationLabels {
  return dictationLabels(source.labels);
}

export interface DictationView {
  phase: DictationPhase | null;
  held: string | undefined;
  /** Draw the mic-off glyph: the browser blocked the microphone. */
  off: boolean;
  /** Held because another composer is dictating. */
  elsewhere: boolean;
  note: string | undefined;
  describe: string;
  /** The mic's name while it resumes a paused session, else undefined. */
  resume: string | undefined;
}

/** What a composer's controls draw now. */
export function view(owner: DictationOwner): DictationView {
  const source = owner.get().source;
  const labels = labelsOf(source);
  const m = micState(source);
  const mine = session?.owner === owner ? session : null;
  let held: string | undefined;
  if (session && !mine) held = labels.elsewhere(session.label);
  else if (!mine && m.permission === 'denied') held = labels.denied;
  else if (!mine && m.devices?.length === 0) held = labels.noDevice;
  return {
    phase: mine?.phase ?? null,
    held,
    off: !mine && m.permission === 'denied',
    elsewhere: session !== null && !mine,
    note: mine ? line(mine) : notes.get(owner),
    describe: labels.dictating,
    resume: mine?.phase === 'stopped' && resumable(mine.reason) ? labels.resume : undefined,
  };
}

function line(s: Session): string | undefined {
  if (s.phase === 'preparing') return s.labels.preparing(s.progress);
  if (s.phase === 'stopped' && s.reason) return s.labels.stopped[s.reason];
  if (s.phase === 'listening' && s.quiet) return s.labels.quiet;
  return undefined;
}

/** Moves focus to the composer that is dictating. */
export function focusActive(): void {
  session?.owner.get().field.current?.focus();
}

/** Starts a session in `owner`'s composer, unless one runs already. */
export function start(owner: DictationOwner): void {
  if (session) {
    if (session.owner !== owner) focusActive();
    return;
  }
  const o = owner.get();
  const field = o.field.current;
  const m = micState(o.source);
  notes.delete(owner);
  const s: Session = {
    owner,
    label: o.label,
    source: o.source,
    labels: labelsOf(o.source),
    mic: m,
    value: o.value,
    // A field never focused reports its caret at the start; the words then go at the end.
    from: field && owner.touched ? field.selectionStart : o.value.length,
    to: field && owner.touched ? field.selectionEnd : o.value.length,
    finals: [],
    partial: '',
    phase: 'pending',
    reason: null,
    quiet: false,
    capture: null,
    transport: null,
    index: 0,
    opening: false,
    prepared: false,
    progress: undefined,
    declined: null,
    ended: false,
    flushing: null,
    heard: Date.now(),
    timer: undefined,
    over: false,
  };
  session = s;
  // The field keeps focus for Enter and Escape; its own caret and selection hide under the layer.
  field?.focus();
  field?.setSelectionRange(s.from, s.from);
  o.source.onActiveChange?.(true);
  notify();
  if (m.permission !== 'granted') announce(s.labels.pending);
  void open(s, false);
}

async function open(s: Session, resuming: boolean): Promise<void> {
  let capture: DictationCapture;
  try {
    capture = await s.mic.mic.open(s.mic.chosen);
  } catch (error) {
    if (session !== s || s.over) return;
    const name = (error as { name?: string } | null)?.name;
    // A remembered device that is gone falls back to the default once.
    if ((name === 'OverconstrainedError' || name === 'NotFoundError') && s.mic.chosen !== undefined) {
      s.mic.chosen = undefined;
      s.mic.gone = true;
      return open(s, resuming);
    }
    end(s);
    restore(s);
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      s.mic.permission = 'denied';
      announce(s.labels.denied);
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      s.mic.devices = [];
      announce(s.labels.noDevice);
    } else {
      note(s.owner, s.labels.busy);
    }
    notify();
    return;
  }
  if (session !== s || s.over) {
    capture.stop();
    return;
  }
  s.capture = capture;
  s.mic.permission = 'granted';
  capture.onEnded(() => {
    if (s.capture === capture) stop(s, 'unplugged');
  });
  s.reason = null;
  s.ended = false;
  s.flushing = null;
  s.declined = null;
  if (!s.mic.devices?.some((d) => d.label)) void listDevices(s.mic);
  await begin(s, 0, resuming);
}

/** A source's routes, in order. */
export function transportsOf(source: DictationSource): readonly DictationTransport[] {
  const { transport } = source;
  return Array.isArray(transport) ? transport : [transport as DictationTransport];
}

/** Starts the first available route from `from` on; with none left, says why and ends. */
async function begin(s: Session, from: number, resuming: boolean): Promise<void> {
  const routes = transportsOf(s.source);
  for (let i = from; i < routes.length; i++) {
    const t = routes[i]!;
    // A check that throws counts as unavailable.
    const usable = t.available ? await Promise.resolve().then(() => t.available!()).catch(() => false) : true;
    if (session !== s || s.over) return;
    if (!usable) {
      s.declined ??= 'unavailable';
      continue;
    }
    Object.assign(s, { transport: t, index: i, opening: true, prepared: false, progress: undefined });
    try {
      await t.start(s.mic.chosen, events(s, t, resuming), s.capture?.stream ?? null);
    } catch {
      if (s.transport === t && s.opening) decline(s, 'unavailable', resuming);
      else if (s.transport === t && s.phase === 'listening') {
        s.ended = true;
        stop(s, 'dropped');
      }
      return;
    }
    if (s.transport === t && s.opening && !s.prepared) ready(s, t, resuming);
    return;
  }
  if (session !== s || s.over) return;
  const why = s.declined === 'busy' ? s.labels.serviceBusy : s.labels.unavailable;
  if (resuming || s.finals.length > 0) {
    // Words already said stay for Accept or Cancel.
    s.phase = 'listening';
    s.ended = true;
    stop(s, 'dropped');
    return;
  }
  end(s);
  restore(s);
  note(s.owner, why);
}

/** The route declined before its first word: the next one is tried. */
function decline(s: Session, why: 'busy' | 'unavailable', resuming: boolean): void {
  s.transport?.cancel();
  s.transport = null;
  s.declined = why === 'busy' || s.declined === 'busy' ? 'busy' : 'unavailable';
  void begin(s, s.index + 1, resuming);
}

/** The route is listening: words may come. */
function ready(s: Session, t: DictationTransport, resuming: boolean): void {
  if (s.transport !== t || !s.opening || session !== s || s.over) return;
  s.opening = false;
  s.phase = 'listening';
  s.heard = Date.now();
  s.mic.picks = Boolean(t.picksDevice);
  notify();
  if (!resuming) announce(s.labels.dictating);
  gate(s);
}

/** A note that needs no answer, said once and gone after a while. */
function note(owner: DictationOwner, text: string): void {
  notes.set(owner, text);
  announce(text);
  notify();
  setTimeout(() => {
    if (notes.get(owner) === text && notes.delete(owner)) notify();
  }, NOTE_MS);
}

function events(s: Session, t: DictationTransport, resuming: boolean): DictationTransportEvents {
  const mine = () => session === s && !s.over && s.transport === t;
  const heard = () => {
    s.heard = Date.now();
    if (s.quiet) {
      s.quiet = false;
      notify();
    }
  };
  return {
    preparing(progress?: number) {
      if (!mine() || !s.opening) return;
      const first = s.phase !== 'preparing';
      s.prepared = true;
      s.phase = 'preparing';
      s.progress = progress;
      notify();
      if (first) announce(s.labels.preparing(undefined));
    },
    ready() {
      if (mine()) ready(s, t, resuming);
    },
    partial(text: string) {
      if (!mine()) return;
      if (s.opening) ready(s, t, resuming);
      s.partial = text;
      heard();
      wordsChanged();
    },
    final(text: string) {
      if (!mine()) return;
      if (s.opening) ready(s, t, resuming);
      const trimmed = text.trim();
      if (trimmed) s.finals.push(trimmed);
      s.partial = '';
      heard();
      wordsChanged();
    },
    error(code: DictationErrorCode) {
      if (!mine()) return;
      const declined = code === 'busy' || code === 'unavailable';
      if (s.opening && declined) return decline(s, code, resuming);
      if (s.opening) {
        s.opening = false;
        s.phase = 'listening';
      }
      if (s.phase !== 'listening') return;
      s.ended = true;
      // Mid-session, a route that goes away is a dropped one.
      stop(s, declined ? 'dropped' : code);
    },
  };
}

/** The silence gate: a hint after `hint` seconds, then capture stops. */
function gate(s: Session): void {
  const { hint, stop: cut } = s.source.silence ?? { hint: 10, stop: 30 };
  clearInterval(s.timer);
  s.timer = setInterval(() => {
    if (!s.capture) return;
    const now = Date.now();
    if (s.capture.level() > SILENT_LEVEL) s.heard = now;
    const quiet = now - s.heard;
    if (quiet >= cut * 1000) stop(s, 'silence');
    else if (quiet >= hint * 1000 !== s.quiet) {
      s.quiet = !s.quiet;
      notify();
    }
  }, GATE_MS);
}

function release(s: Session): void {
  clearInterval(s.timer);
  s.timer = undefined;
  s.capture?.stop();
  s.capture = null;
}

/** Waits for the transport's last words, or `FLUSH_MS`, whichever is first. */
function settle(s: Session): Promise<void> {
  if (s.ended || !s.transport) return Promise.resolve();
  const flushed = s.transport.flush().catch(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FLUSH_MS));
  return Promise.race([flushed, timeout]).then(() => {
    s.ended = true;
  });
}

/** Capture stops; the words stay provisional until Accept or Cancel. */
export function stop(s: Session, reason: DictationStopReason): void {
  if (s.phase !== 'listening' || session !== s) return;
  release(s);
  s.phase = 'stopped';
  s.reason = reason;
  s.quiet = false;
  s.flushing = settle(s);
  notify();
  announce(s.labels.stopped[reason]);
}

/** Starts capture again after a pause or a silence, keeping the words so far. */
export async function resume(s: Session): Promise<void> {
  if (s.phase !== 'stopped' || !resumable(s.reason)) return;
  s.phase = 'pending';
  notify();
  await s.flushing;
  if (session !== s || s.over) return;
  void open(s, true);
}

/** Resumes `owner`'s paused session. */
export function resumeOwner(owner: DictationOwner): void {
  if (session?.owner === owner) void resume(session);
}

/** The words joined into one run, a space between segments. */
export function joinWords(parts: readonly string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * `text` put in place of `value`'s `from` to `to`, with a space where a
 * neighbour needs one, and where the caret goes: after the inserted words.
 */
export function splice(value: string, from: number, to: number, text: string): { value: string; caret: number } {
  const start = Math.min(from, value.length);
  const before = value.slice(0, start);
  const after = value.slice(Math.max(start, Math.min(to, value.length)));
  const words = text.trim();
  const lead = before !== '' && !/\s$/.test(before) ? ' ' : '';
  const tail = after !== '' && !/^[\s.,;:!?)\]}]/.test(after) ? ' ' : '';
  return { value: before + lead + words + tail + after, caret: before.length + lead.length + words.length };
}

/** Accept: the last words arrive (at most `FLUSH_MS`), then go into the draft with one `onChange`. */
export async function accept(s: Session): Promise<void> {
  if (s.phase === 'pending' || s.phase === 'preparing' || s.phase === 'accepting' || session !== s) return;
  if (s.phase === 'listening') {
    release(s);
    s.flushing = settle(s);
  }
  s.phase = 'accepting';
  notify();
  await s.flushing;
  if (session !== s || s.over) return;
  commit(s, [...s.finals, s.partial], true);
}

function commit(s: Session, parts: readonly string[], speak: boolean): void {
  const text = joinWords(parts);
  end(s);
  const o = s.owner.get();
  if (!text) {
    if (speak) {
      restore(s);
      announce(s.labels.nothing);
    }
    return;
  }
  // Into the draft as it is now, in case something else wrote to it meanwhile.
  const next = splice(o.value, s.from, s.to, text);
  s.owner.caret = { value: next.value, at: next.caret };
  o.onChange(next.value);
  if (speak) announce(s.labels.inserted(text.split(/\s+/).length));
}

/** Cancel: the draft and the caret are as they were. */
export function cancel(s: Session): void {
  if (session !== s) return;
  if (!s.ended) s.transport?.cancel();
  end(s);
  restore(s);
  announce(s.labels.cancelled);
}

function end(s: Session): void {
  s.over = true;
  release(s);
  if (session === s) session = null;
  notify();
  s.source.onActiveChange?.(false);
}

function restore(s: Session): void {
  const field = s.owner.get().field.current;
  if (!field) return;
  field.focus();
  field.setSelectionRange(Math.min(s.from, field.value.length), Math.min(s.to, field.value.length));
}

/** The composer is going away: its finished words stay in the draft, and the microphone is released. */
export function releaseOwner(owner: DictationOwner): void {
  notes.delete(owner);
  const s = session;
  if (!s || s.owner !== owner) return;
  if (!s.ended) s.transport?.cancel();
  commit(s, s.finals, false);
}

/** Enter accepts, Escape cancels and the shortcut pauses or resumes, each marked handled. */
export function keyDown(owner: DictationOwner, event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  const s = session;
  if (!s || s.owner !== owner || event.nativeEvent.isComposing) return false;
  const chord = s.source.shortcut === false ? undefined : (s.source.shortcut ?? DICTATION_SHORTCUT);
  if (event.key === 'Enter') void accept(s);
  else if (event.key === 'Escape') cancel(s);
  else if (chord && chordMatches(chord, event, isApplePlatform())) {
    if (s.phase === 'listening') stop(s, 'paused');
    else void resume(s);
  } else return false;
  event.preventDefault();
  event.stopPropagation();
  return true;
}

async function switchTo(s: Session, id: string | undefined): Promise<void> {
  let next: DictationCapture;
  try {
    next = await s.mic.mic.open(id);
  } catch {
    return;
  }
  if (session !== s || s.phase !== 'listening') {
    next.stop();
    return;
  }
  const old = s.capture;
  s.capture = next;
  next.onEnded(() => {
    if (s.capture === next) stop(s, 'unplugged');
  });
  s.transport?.switchStream?.(next.stream, id);
  old?.stop();
  const label = s.mic.devices?.find((d) => d.deviceId === (id ?? 'default'))?.label;
  if (label) announce(s.labels.switched(label));
  notify();
}

/** Uses a device from now on, and in the running session if there is one. */
export async function choose(m: MicState, id: string | undefined): Promise<void> {
  m.chosen = id;
  m.gone = false;
  remember(id);
  notify();
  if (session?.mic === m && session.phase === 'listening') await switchTo(session, id);
}

/** Asks for the microphone so the devices can be named. */
export async function allow(m: MicState): Promise<void> {
  try {
    (await m.mic.open(m.chosen)).stop();
    m.permission = 'granted';
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'NotAllowedError') m.permission = 'denied';
  }
  await listDevices(m);
}

/** Why the microphone menu cannot list devices, as lines above it. */
export function menuNotes(owner: DictationOwner): string[] {
  const source = owner.get().source;
  const labels = labelsOf(source);
  const block = micOf(source).check();
  if (source.unavailableReason) return [source.unavailableReason];
  if (block) return [labels[block]];
  const m = micState(source);
  if (m.permission === 'denied') return [labels.denied, labels.deniedHelp];
  if (m.devices?.length === 0) return [labels.noDevice];
  return [...(m.gone ? [labels.gone] : []), ...(m.picks ? [labels.browserPicks] : [])];
}

/** Whether the menu can draw a live level: the device is allowed and nothing holds it. */
export function meterable(owner: DictationOwner): boolean {
  const source = owner.get().source;
  const labels = labelsOf(source);
  return micState(source).permission === 'granted' && menuNotes(owner).every((n) => n === labels.gone || n === labels.browserPicks);
}

/** The microphone menu's rows: the devices, the chosen one ticked, then a setup action. */
export function menuItems(owner: DictationOwner): MenuEntry[] {
  const source = owner.get().source;
  const labels = labelsOf(source);
  const m = micState(source);
  const items: MenuEntry[] = [];
  const blocked = source.unavailableReason !== undefined || micOf(source).check() !== undefined;
  if (!blocked && m.permission === 'denied') items.push({ key: 'retry', label: labels.retry, onSelect: () => void allow(m) });
  else if (!blocked && m.devices?.length === 0) items.push({ key: 'recheck', label: labels.recheck, onSelect: () => void listDevices(m) });
  else if (!blocked) {
    const named = m.devices?.filter((d) => d.label) ?? [];
    if (m.permission !== 'granted' || named.length === 0) {
      items.push(
        { key: 'default', label: labels.defaultDevice, checked: true, onSelect: () => undefined },
        { key: 'allow', label: labels.allowToChoose, onSelect: () => void allow(m) },
      );
    } else {
      const ticked = m.chosen ?? (named.some((d) => d.deviceId === 'default') ? 'default' : named[0]!.deviceId);
      for (const device of named) {
        items.push({
          key: `device:${device.deviceId}`,
          label: device.label,
          checked: device.deviceId === ticked,
          onSelect: () => void choose(m, device.deviceId === 'default' ? undefined : device.deviceId),
        });
      }
    }
  }
  if (source.setup) {
    if (items.length > 0) items.push({ kind: 'separator', key: 'setup-rule' });
    items.push({ key: 'setup', label: source.setup.label, onSelect: source.setup.onSelect });
  }
  return items;
}

/** Ends every session and forgets every microphone; for tests. */
export function resetDictation(): void {
  if (session) end(session);
  notes.clear();
  browser = null;
}

/** Forgets what a microphone was found to allow, so the next ask probes it again; for tests and demos. */
export function forgetMicrophone(mic: DictationMicrophone): void {
  states.delete(mic);
}
