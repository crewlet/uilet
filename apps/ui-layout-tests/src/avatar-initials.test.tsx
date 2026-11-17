/**
 * A FACE'S INITIALS SIT ON ITS MIDDLE, measured on their ink: at every step, a
 * numeric size and the text size, with and without a status corner, for a
 * person and an agent. A text-sized face is also the same box, at the same
 * height, as the character face beside it.
 */
import { afterEach, expect, test } from 'vitest';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Avatar, InlineRef, type AvatarKind, type AvatarSize } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const canvas = document.createElement('canvas');

/** Half a device pixel and the rounding of the font's ink metrics: what a perfectly centred run still measures. */
const SNAP = 0.6;

/** The initials' ink box, from the run's line box and the font's own metrics. */
function ink(face: Element): DOMRect {
  const walker = document.createTreeWalker(face, NodeFilter.SHOW_TEXT);
  const text = walker.nextNode() as Text;
  const style = getComputedStyle(text.parentElement!);
  const range = document.createRange();
  range.selectNodeContents(text);
  const run = range.getBoundingClientRect();
  const context = canvas.getContext('2d')!;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.letterSpacing = style.letterSpacing;
  const glyphs = context.measureText(style.textTransform === 'uppercase' ? text.data.toUpperCase() : text.data);
  const baseline = run.top + glyphs.fontBoundingBoxAscent;
  const left = run.left - glyphs.actualBoundingBoxLeft;
  const top = baseline - glyphs.actualBoundingBoxAscent;
  return new DOMRect(left, top, glyphs.actualBoundingBoxLeft + glyphs.actualBoundingBoxRight, glyphs.actualBoundingBoxAscent + glyphs.actualBoundingBoxDescent);
}

/** The face's box inside its outline. */
function inside(face: Element): DOMRect {
  const box = face.getBoundingClientRect();
  const style = getComputedStyle(face);
  const [top, right, bottom, left] = ['Top', 'Right', 'Bottom', 'Left'].map((side) => Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)));
  return new DOMRect(box.left + left!, box.top + top!, box.width - left! - right!, box.height - top! - bottom!);
}

function offCentre(face: Element): { x: number; y: number } {
  const glyphs = ink(face);
  const box = inside(face);
  return {
    x: glyphs.left + glyphs.width / 2 - (box.left + box.width / 2),
    y: glyphs.top + glyphs.height / 2 - (box.top + box.height / 2),
  };
}

const SIZES: AvatarSize[] = ['xs', 'sm', 'md', 'lg', 48, 'text'];
const KINDS: AvatarKind[] = ['human', 'agent'];
const CASES = SIZES.flatMap((size) => KINDS.flatMap((kind) => [false, true].map((status) => ({ size, kind, status }))));

test.each(CASES)('$kind initials at $size (status $status) are centred on their ink', async ({ size, kind, status }) => {
  const at = await mount(
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
      Asked <Avatar name="Miles Ingram" kind={kind} size={size} status={status ? 'working' : undefined} /> about it
    </p>,
  );
  const off = offCentre(at.querySelector('.crewlet-avatar')!);
  expect(Math.abs(off.x), `x ${off.x.toFixed(2)}px`).toBeLessThanOrEqual(SNAP);
  expect(Math.abs(off.y), `y ${off.y.toFixed(2)}px`).toBeLessThanOrEqual(SNAP);
});

test.each([13, 14, 16, 20])('a text-sized person beside a text-sized character, in a %ipx sentence, is the same box on the same line', async (fontSize) => {
  const at = await mount(
    <p style={{ margin: 0, fontSize, lineHeight: 1.45 }}>
      <InlineRef markShape="face" mark={<Avatar name="Miles Ingram" kind="human" size="text" decorative />}>
        Miles Ingram
      </InlineRef>{' '}
      and{' '}
      <InlineRef markShape="face" mark={<Avatar name="CTO" kind="agent" character="gemlet" hue="cyan" size="text" decorative />}>
        CTO
      </InlineRef>
    </p>,
  );
  const [person, agent] = [...at.querySelectorAll('.crewlet-avatar')];
  const [p, a] = [person!.getBoundingClientRect(), agent!.getBoundingClientRect()];
  expect(Math.abs(p.top - a.top)).toBeLessThanOrEqual(SNAP);
  expect(Math.abs(p.width - a.width)).toBeLessThanOrEqual(SNAP);
  expect(Math.abs(p.height - a.height)).toBeLessThanOrEqual(SNAP);
  expect(getComputedStyle(person!).borderRadius).toBe(getComputedStyle(agent!).borderRadius);
  const off = offCentre(person!);
  expect(Math.abs(off.x), `x ${off.x.toFixed(2)}px`).toBeLessThanOrEqual(SNAP);
  expect(Math.abs(off.y), `y ${off.y.toFixed(2)}px`).toBeLessThanOrEqual(SNAP);
});

test.each([13, 14, 20])('a text-sized face alone in a %ipx sentence stands where InlineRef stands one', async (fontSize) => {
  const at = await mount(
    <p style={{ margin: 0, fontSize, lineHeight: 1.45 }}>
      <InlineRef markShape="face" mark={<Avatar name="Miles Ingram" kind="human" size="text" decorative />}>
        Miles
      </InlineRef>{' '}
      and <Avatar name="Miles Ingram" kind="human" size="text" /> and{' '}
      <Avatar name="CTO" kind="agent" character="gemlet" hue="cyan" size="text" />
    </p>,
  );
  const [held, alone, character] = [...at.querySelectorAll('.crewlet-avatar')].map((face) => face.getBoundingClientRect());
  expect(Math.abs(alone!.top - held!.top)).toBeLessThanOrEqual(SNAP);
  expect(Math.abs(character!.top - held!.top)).toBeLessThanOrEqual(SNAP);
});
