/**
 * PRESSING THE MIC CHANGES THE ROW ONCE, WHEN THE WORDS CAN COME. Opening the
 * microphone and the route takes a second or two; the row used to change as
 * the press landed (Cancel in, the mic and field pushed aside) and again at
 * listening. Every frame from the press to past listening is measured here.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';
import { PlusGlyph } from '@crewlethq/icons/glyphs';
import { Composer, IconButton, SendButton, fakeMicrophone, fakeTransport, preloadDictation, type DictationSource } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeAll(async () => {
  await preloadDictation();
});

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

type Kind = 'chat' | 'inline';

function Box({ kind, source }: { kind: Kind; source: DictationSource }) {
  const [value, setValue] = useState('');
  const send = <SendButton mode="send" onPress={() => setValue('')} />;
  return kind === 'chat' ? (
    <Composer
      appearance="chat"
      rows={1}
      label="Message"
      placeholder="Message the room"
      value={value}
      onChange={setValue}
      dictation={source}
      tools={<IconButton label="Attach" icon={<PlusGlyph />} size="sm" />}
      actions={send}
    />
  ) : (
    <Composer label="Ask" placeholder="Ask about this page" value={value} onChange={setValue} dictation={source} sendHint={false} trailing={send} />
  );
}

/** The microphone opens in 300 ms and the route answers 400 ms later; `prepare` adds a model load. */
function source(prepare?: number): DictationSource {
  return {
    microphone: fakeMicrophone({ delay: 300 }),
    transport: fakeTransport({ connect: 400, prepare, quietAfter: 0 }),
  };
}

async function mount(kind: Kind, src: DictationSource, width: number): Promise<HTMLElement> {
  await page.viewport(width + 40, 600);
  host = document.createElement('div');
  host.style.cssText = `width: ${width}px; padding: 120px 0 0;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(<Box kind={kind} source={src} />));
  await document.fonts.ready;
  return host;
}

const SHOWN = 'button, textarea, .crewlet-composer__row, .crewlet-composer__footer, .crewlet-composer__trailing, .crewlet-dictation__wave, .crewlet-dictation__layer, .crewlet-dictation__note';

/** Every drawn part of the box, by name, with its rectangle. */
function measure(box: HTMLElement): Record<string, string> {
  const out: Record<string, string> = { box: rect(box) };
  for (const el of box.querySelectorAll<HTMLElement>(SHOWN)) {
    if (el.getClientRects().length === 0) continue;
    const name = el.getAttribute('aria-label') ?? el.className.split(' ')[0]!;
    out[name] = rect(el);
  }
  return out;
}

function rect(el: Element): string {
  const r = el.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 2) / 2).join(',');
}

interface Frame {
  live: boolean;
  parts: Record<string, string>;
}

/** Presses the mic and measures every frame until `after` ms past listening. */
async function record(shown: HTMLElement, after = 400): Promise<Frame[]> {
  const box = shown.querySelector<HTMLElement>('.crewlet-composer')!;
  const frames: Frame[] = [{ live: false, parts: measure(box) }];
  let done = false;
  let heard = 0;
  const loop = () => {
    const live = box.classList.contains('is-dictating');
    if (live && !heard) heard = performance.now();
    frames.push({ live, parts: measure(box) });
    if (heard && performance.now() - heard > after) done = true;
    else requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  await userEvent.click(shown.querySelector('[aria-label="Dictate"]')!);
  const start = performance.now();
  while (!done && performance.now() - start < 6000) await new Promise((r) => setTimeout(r, 20));
  return frames;
}

/** The frames at which the drawn parts differ from the frame before, with what differed. */
function changes(frames: Frame[], ignore: (name: string) => boolean = () => false): { at: number; live: boolean; what: string[] }[] {
  const out: { at: number; live: boolean; what: string[] }[] = [];
  for (let i = 1; i < frames.length; i++) {
    const [a, b] = [frames[i - 1]!.parts, frames[i]!.parts];
    const what = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !ignore(k) && a[k] !== b[k]);
    if (what.length) out.push({ at: i, live: frames[i]!.live, what });
  }
  return out;
}

describe.each([
  ['chat', 640],
  ['chat', 360],
  ['inline', 640],
  ['inline', 360],
] as const)('a %s composer %i px wide', (kind, width) => {
  // Mutation: draw Cancel from the press (session.tsx Swap, slot.tsx) and the row changes before listening.
  test('nothing moves from the press until it listens, and then the row changes in one frame', async () => {
    const shown = await mount(kind, source(), width);
    const frames = await record(shown);
    const seen = changes(frames);
    expect(frames.some((f) => f.live)).toBe(true);
    expect(seen.filter((c) => !c.live)).toEqual([]);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.what).toContain('Accept dictation');
    // The send action held its place until then.
    const before = frames.filter((f) => !f.live).map((f) => f.parts['crewlet-send-button'] ?? f.parts['Send']);
    expect(new Set(before).size).toBe(1);
  });

  // Mutation: let a preparing route draw Cancel, or move the mic, and the controls move before listening.
  test('while the route prepares, only its line comes; the controls hold their place until it listens', async () => {
    const shown = await mount(kind, source(600), width);
    const frames = await record(shown);
    const line = (name: string) => name === 'crewlet-dictation__note';
    const before = frames.filter((f) => !f.live);
    expect(before.some((f) => f.parts['crewlet-dictation__note'])).toBe(true);
    // Across, every control keeps its place and width; the line may push what is below it down once.
    const across = (f: Frame) => Object.fromEntries(Object.entries(f.parts).filter(([k]) => !line(k)).map(([k, v]) => [k, v.split(',').filter((_, i) => i % 2 === 0).join(',')]));
    expect(new Set(before.map((f) => JSON.stringify(across(f)))).size).toBe(1);
    const moves = changes(before, line);
    expect(moves.length).toBeLessThanOrEqual(1);
    const live = changes(frames).filter((c) => c.live);
    expect(live).toHaveLength(1);
  });
});
