/**
 * A COMPOSER'S BAR RUNS ALONG ITS WORDS AND MOVES NONE OF THEM. Past its cap
 * the field scrolls, and its bar ran from the box's top edge down to the
 * footer's rule beside the send button, and took its width from the words
 * only once it came, so they re-wrapped the moment the field filled. Runs on
 * the browser that draws scrollbars in the layout (vitest.config.ts).
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { useState, type ReactNode } from 'react';
import { Button, Composer, SendButton } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

type Kind = 'inline' | 'default' | 'chat';

function Box({ kind, text }: { kind: Kind; text: string }) {
  const [value, setValue] = useState(text);
  return (
    <Composer
      label="Ask Crewlet"
      value={value}
      onChange={setValue}
      appearance={kind === 'chat' ? 'chat' : 'default'}
      trailing={kind === 'inline' ? <SendButton mode="send" onPress={() => {}} /> : undefined}
      actions={kind === 'inline' ? undefined : <Button size="small">Send</Button>}
    />
  );
}

const LONG = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}: do I need the developer key and the app manager key as well?`).join('\n');

async function mount(node: ReactNode, width = 640): Promise<HTMLElement> {
  await page.viewport(1280, 900);
  host = document.createElement('div');
  host.style.cssText = `width: ${width}px; display: grid; gap: 16px;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  return host;
}

const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

describe.each(['inline', 'default', 'chat'] as const)('a %s composer', (kind) => {
  // Mutation: drop the track's margin and the bar runs into the box's edge.
  test('past its cap its bar runs along the words, inset as they are from the box’s edges', async () => {
    const shown = await mount(<Box kind={kind} text={LONG} />);
    const field = shown.querySelector('textarea')!;
    expect(field.scrollHeight).toBeGreaterThan(field.clientHeight);
    const own = getComputedStyle(field);
    const track = getComputedStyle(field, '::-webkit-scrollbar-track');
    expect(parseFloat(own.paddingTop)).toBeGreaterThan(0);
    expect(track.marginTop).toBe(own.paddingTop);
    expect(track.marginBottom).toBe(own.paddingBottom);
  });

  // Mutation: drop `scrollbar-gutter: stable` and the words lose 6px as the bar comes.
  test('its words keep their width when the bar comes', async () => {
    const shown = await mount(
      <>
        <Box kind={kind} text="Short" />
        <Box kind={kind} text={LONG} />
      </>,
    );
    const [short, long] = [...shown.querySelectorAll('textarea')];
    expect(long!.scrollHeight).toBeGreaterThan(long!.clientHeight);
    expect(long!.offsetWidth).toBe(short!.offsetWidth);
    expect(long!.clientWidth).toBe(short!.clientWidth);
  });
});

// Mutation: drop `scrollbarGutter` from the mirror's styles and, at widths
// where a line fits only without the gutter, the field grows a line short.
test('under its cap the field shows every line at every width, wrapping inside its gutter as its measure does', async () => {
  const shown = await mount(<Box kind="inline" text="So you mean I need to add a developer key and an app manager key in the settings" />, 900);
  const field = shown.querySelector('textarea')!;
  await frame();
  const oneLine = field.offsetHeight;
  // At a width, whether the field wraps, and that it shows all of its words there.
  const at = async (width: number) => {
    host!.style.width = `${width}px`;
    await frame();
    expect(field.scrollHeight, `${width}px`).toBeLessThanOrEqual(field.clientHeight);
    return field.offsetHeight > oneLine;
  };
  let wraps = 900;
  while (wraps > 500 && !(await at(wraps))) wraps -= 10;
  expect(wraps).toBeGreaterThan(500);
  // Every pixel down to where it wraps, where a line fits only without the gutter.
  for (let width = wraps + 20; width > wraps && !(await at(width)); width -= 1);
});
