/**
 * Dictation's entry: the mic and chevron a `Composer` draws, and the wiring
 * that hands everything else to the lazy session chunk (`session.tsx`),
 * fetched on the mic's first hover, focus or press.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDownGlyph, MicGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { isApplePlatform, keyGlyph } from '../Kbd/Kbd.js';
import { Menu } from '../Menu/index.js';
import { cx } from '../utils/cx.js';
import type * as Session from './session.js';
import type { DictationBlock, DictationSource } from './types.js';

type Chunk = typeof Session;

let chunk: Chunk | null = null;
let loading: Promise<Chunk> | null = null;
let version = 0;
const listeners = new Set<() => void>();

/** Redraws every composer's dictation controls. */
export function notify(): void {
  version += 1;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// A failed load is forgotten, so the next press asks again (as RichEditor's does).
function load(): Promise<Chunk> {
  loading ??= import('./session.js').then(
    (module) => {
      chunk = module;
      notify();
      return module;
    },
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

/** Fetches dictation's code ahead of the first press. */
export function preloadDictation(): Promise<void> {
  return load().then(
    () => undefined,
    () => undefined,
  );
}

/** The words the entry itself says; the chunk carries the rest. */
export const ENTRY_LABELS = {
  dictate: 'Dictate',
  chooseMicrophone: 'Choose a microphone',
  unsupported: 'Dictation needs a newer browser',
  insecure: 'Dictation needs this site on https',
  policy: 'This page does not allow the microphone',
};

/** Mod+Shift+Space: free in the dashboard's keymap and in the common OS and browser chords. */
export const DICTATION_SHORTCUT: readonly string[] = ['Mod', 'Shift', 'Space'];

/** Why the browser's microphone cannot work in this page, or undefined. */
export function browserBlock(): DictationBlock | undefined {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') return 'unsupported';
  const policy = (document as Document & { permissionsPolicy?: { allowsFeature(name: string): boolean } }).permissionsPolicy;
  return policy && !policy.allowsFeature('microphone') ? 'policy' : undefined;
}

/** Whether a key press is `chord` (`Mod` is Command on Apple platforms, Control elsewhere). */
export function chordMatches(chord: readonly string[], event: KeyboardEvent | globalThis.KeyboardEvent, apple: boolean): boolean {
  const key = chord[chord.length - 1]!;
  const has = (name: string) => chord.includes(name);
  const mod = apple ? event.metaKey : event.ctrlKey;
  const pressed = key === 'Space' ? event.code === 'Space' || event.key === ' ' : event.key.toLowerCase() === key.toLowerCase();
  return (
    pressed &&
    mod === has('Mod') &&
    event.shiftKey === has('Shift') &&
    event.altKey === has('Alt') &&
    (apple ? event.ctrlKey === has('Ctrl') : true)
  );
}

/** What a composer reads off its owner while a session runs. */
export interface DictationOwner {
  get(): {
    source: DictationSource;
    label: string;
    field: RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (value: string) => void;
  };
  /** Where the caret goes once the accepted value is drawn. */
  caret: { value: string; at: number } | null;
  /** The field has had focus, so its caret is where the writer left it. */
  touched: boolean;
}

export interface DictationSlotOptions {
  label: string;
  field: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  /** The composer's own reason it cannot be written in, which holds the mic too. */
  heldReason: string | undefined;
}

/** The pieces a composer lays out. */
export interface DictationSlot {
  /** A session is running here: the send slot swaps and the layer draws the words. */
  live: boolean;
  /** A session is starting or running here: Enter is dictation's and the field is read only. */
  active: boolean;
  /** The mic and chevron, before the send slot; while live, the level, chevron, Cancel and Accept. */
  controls: ReactNode;
  /** The provisional words over the field, while live. */
  layer: ReactNode;
  /** A line under the field: a stop's reason, a hint, a busy microphone. */
  note: ReactNode;
  /** The field's added description while live. */
  describe: string | undefined;
  /** Routes a key pressed in the field; true when dictation took it. */
  keyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

const LONG_PRESS_MS = 500;

/** Wires dictation into a composer. Null without a source. */
export function useDictationSlot(source: DictationSource | undefined, options: DictationSlotOptions): DictationSlot | null {
  useSyncExternalStore(subscribe, () => version, () => version);
  const [open, setOpen] = useState(false);
  const props = useRef({ ...options, source: source! });
  props.current = { ...options, source: source! };
  const ownerRef = useRef<DictationOwner | null>(null);
  ownerRef.current ??= { get: () => props.current, caret: null, touched: false };
  const owner = ownerRef.current;
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | undefined; long: boolean }>({ timer: undefined, long: false });

  useEffect(() => () => chunk?.release(owner), [owner]);
  useEffect(() => {
    const field = options.field.current;
    const touch = () => {
      owner.touched = true;
    };
    field?.addEventListener('focus', touch);
    return () => field?.removeEventListener('focus', touch);
  }, [owner, options.field]);
  // The accepted words' caret, once the caller has drawn the new value.
  useLayoutEffect(() => {
    const field = options.field.current;
    const caret = owner.caret;
    if (caret && field && field.value === caret.value) {
      owner.caret = null;
      field.focus();
      field.setSelectionRange(caret.at, caret.at);
    }
  });

  if (!source) return null;
  const view = chunk?.view(owner);
  const phase = view?.phase ?? null;
  const labels = { ...ENTRY_LABELS, ...source.labels };
  const block = source.microphone ? source.microphone.check() : browserBlock();
  const held = options.heldReason ?? source.unavailableReason ?? (block && labels[block]) ?? view?.held;
  const apple = isApplePlatform();
  const chord = source.shortcut === false ? undefined : (source.shortcut ?? DICTATION_SHORTCUT);
  const start = () => {
    void load().then((c) => c.start(owner), () => undefined);
  };
  const openMenu = (next: boolean) => {
    if (!next) setOpen(false);
    else void load().then(() => setOpen(true), () => undefined);
  };
  // Waiting on the browser's prompt or on a route preparing: the mic waits, Send stays.
  const waiting = phase === 'pending' || phase === 'preparing';
  const live = phase !== null && !waiting;
  // Nothing to offer in the menu: the chevron is held with the same reason.
  const bare = options.heldReason ?? ((block || source.unavailableReason) && !source.setup ? held : undefined);

  const mic = live && !view?.resume ? null : (
    <IconButton
      label={view?.resume ?? labels.dictate}
      icon={chunk && view?.off ? <chunk.MicOffGlyph /> : <MicGlyph />}
      pressed={waiting}
      disabledReason={held}
      tooltip={chord ? `${labels.dictate} (${chord.map((k) => keyGlyph(k, apple).glyph).join(apple ? '' : '+')})` : true}
      className={cx('crewlet-dictation__mic', waiting && 'is-pending')}
      onPointerEnter={() => void preloadDictation()}
      onFocus={() => void preloadDictation()}
      onPointerDown={() => {
        press.current.long = false;
        press.current.timer = setTimeout(() => {
          press.current.long = true;
          openMenu(true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={() => clearTimeout(press.current.timer)}
      onPointerLeave={() => clearTimeout(press.current.timer)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openMenu(true);
        }
      }}
      onClick={() => {
        if (press.current.long) press.current.long = false;
        else if (view?.resume) chunk?.resumeOwner(owner);
        else if (phase === null) start();
      }}
    />
  );

  const controls = (
    <>
      {live && chunk ? <chunk.Wave owner={owner} /> : null}
      <Menu
        label={labels.chooseMicrophone}
        items={chunk ? chunk.menuItems(owner) : []}
        header={chunk && open && chunk.hasHeader(owner) ? <chunk.MenuHeader owner={owner} /> : null}
        open={open}
        onOpenChange={openMenu}
        align="end"
        renderTrigger={(trigger) => (
          // A press on a mic held by another composer's session moves focus there.
          <span ref={trigger.ref} className="crewlet-dictation" onClickCapture={() => view?.elsewhere && chunk?.focusActive()}>
            {mic}
            <IconButton
              label={labels.chooseMicrophone}
              icon={<ChevronDownGlyph />}
              size="sm"
              className="crewlet-dictation__more"
              disabledReason={bare}
              aria-haspopup={trigger['aria-haspopup']}
              aria-expanded={trigger['aria-expanded']}
              aria-controls={trigger['aria-controls']}
              onClick={trigger.onClick}
              onKeyDown={trigger.onKeyDown}
              onPointerEnter={() => void preloadDictation()}
              onFocus={() => void preloadDictation()}
            />
          </span>
        )}
      />
      {phase !== null && chunk ? <chunk.Swap owner={owner} /> : null}
    </>
  );

  return {
    live,
    active: phase !== null,
    controls,
    layer: live && chunk ? <chunk.Layer owner={owner} /> : null,
    note: view?.note ? <div className="crewlet-dictation__note">{view.note}</div> : null,
    describe: live ? view?.describe : undefined,
    keyDown: (event) => {
      if (phase !== null) return chunk!.keyDown(owner, event);
      if (!chord || !chordMatches(chord, event, apple)) return false;
      event.preventDefault();
      if (held === undefined) start();
      return true;
    },
  };
}
