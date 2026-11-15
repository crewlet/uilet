/**
 * A TRAIL KEEPS ITS WAY BACK OUT beside a busy bar, measured: every ancestor
 * keeps a readable minimum of its words (all of a short name, the first
 * twenty characters of a long title), and where the bar cannot hold that
 * beside its controls it breaks a line rather than cutting the ancestors to
 * stubs. Its floor was measured off the trail as drawn, so beside a busy bar
 * it allowed whatever cut it saw: "D..." for the workspace, nothing at all
 * where that crumb leads with a glyph.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Breadcrumb, type BreadcrumbCrumb } from '@crewlethq/ui';

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
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

const glyph = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" />
  </svg>
);

const TITLE = 'ADR 1: Add GPU-aware scheduling for MIG partitions on bare metal nodes';
const CRUMBS: BreadcrumbCrumb[] = [
  { label: 'Doclet', href: '#/doclet', icon: glyph },
  { label: 'Product Management', href: '#/doclet/PROD' },
  { label: TITLE, href: '#/doclet/pages/a' },
  { label: 'Meeting notes 13: Supercalifragilisticexpialidocious-identifier-without-spaces' },
];

/** A page bar as an application draws one: it wraps, the trail first, the controls in the far corner. */
function Bar({ width, controls }: { width: number; controls: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', width, padding: '4px 16px', boxSizing: 'border-box' }}>
      <Breadcrumb crumbs={CRUMBS} />
      <div className="controls" style={{ flex: '0 0 auto', width: controls, height: 28, marginLeft: 'auto' }} />
    </div>
  );
}

/** How many characters of a label are drawn before its cut, read off its box against its whole text. */
function shown(label: HTMLElement): { whole: boolean; ratio: number } {
  return { whole: label.scrollWidth <= label.clientWidth + 1, ratio: label.clientWidth / Math.max(1, label.scrollWidth) };
}

for (const [width, controls] of [
  [1180, 640],
  [1180, 820],
  [760, 420],
] as const) {
  test(`beside ${controls}px of controls in a ${width}px bar, every ancestor keeps a readable minimum of its words`, async () => {
    await page.viewport(1280, 800);
    const at = await mount(<Bar width={width} controls={controls} />);
    const labels = [...at.querySelectorAll<HTMLElement>('.crewlet-breadcrumb__part:not(:last-child) .crewlet-breadcrumb__text')];
    expect(labels).toHaveLength(3);
    const [workspace, space, parent] = labels.map(shown);
    // A name shorter than twenty characters is drawn whole.
    expect(workspace!.whole, '"Doclet" is drawn whole').toBe(true);
    expect(space!.whole, '"Product Management" is drawn whole').toBe(true);
    // A long title keeps at least its first twenty of seventy characters.
    expect(parent!.ratio, 'the parent title keeps its first twenty characters').toBeGreaterThan(20 / TITLE.length - 0.02);
    // And the page's own name keeps its stub.
    const here = at.querySelector<HTMLElement>('.crewlet-breadcrumb__here')!;
    expect(here.getBoundingClientRect().width).toBeGreaterThan(100);
    // Whatever the bar did to fit, it did not clip: the trail is inside its bar.
    const bar = at.firstElementChild as HTMLElement;
    const trail = at.querySelector<HTMLElement>('.crewlet-breadcrumb')!;
    expect(trail.getBoundingClientRect().right).toBeLessThanOrEqual(bar.getBoundingClientRect().right + 0.5);
  });
}

test('a bar that can hold the ancestry beside its controls keeps one line', async () => {
  await page.viewport(1280, 800);
  const at = await mount(<Bar width={1180} controls={420} />);
  const trail = at.querySelector<HTMLElement>('.crewlet-breadcrumb')!.getBoundingClientRect();
  const controls = at.querySelector<HTMLElement>('.controls')!.getBoundingClientRect();
  expect(Math.abs(trail.top + trail.height / 2 - (controls.top + controls.height / 2))).toBeLessThan(2);
});

test('on a phone an ancestor still gives way to its stub, as it did, so the page keeps the line', async () => {
  await page.viewport(390, 800);
  const at = await mount(<Bar width={390} controls={40} />);
  const stub = parseFloat(getComputedStyle(at.querySelector('.crewlet-breadcrumb')!).fontSize) * 2;
  for (const part of at.querySelectorAll<HTMLElement>('.crewlet-breadcrumb__part:not(:last-child)')) {
    // 2ch, about two digits of the trail's face: never the twenty characters a wide bar keeps.
    expect(parseFloat(getComputedStyle(part).minWidth)).toBeLessThanOrEqual(stub);
  }
});
