/**
 * NO NARROW CONTAINER SCROLLS SIDEWAYS. Each one is rendered at a phone's and
 * a rail's widths holding the content that used to push it wider than itself:
 * a long unbroken path and a long command in inline code, a whole chip in a
 * nested list, a long address, a labelled link, a long reference, a wide table
 * and a wide code block. The table and the code block scroll inside their own
 * box; the container itself must not.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import {
  ChatThread,
  CodeBlock,
  InlineCode,
  InlineRef,
  ListDetail,
  Modal,
  ObjectHeader,
  PeekRail,
  SidePanel,
  Table,
} from '@crewlethq/ui';

const PATH = `/srv/releases/${'route-cache-worker-'.repeat(6)}bundle.tar.zst`;
const COMMAND =
  'docker compose -f /home/deploy/compose.production.yml --project-name route-cache up -d --force-recreate --remove-orphans route-cache-worker';
const ADDRESS = `https://status.example.com/incidents/2026-11-07/${'route-cache-worker-restart-loop-'.repeat(3)}?tab=timeline`;
const HOST_ADDRESS = 'https://route-cache-worker-restart-loop.staging-west-observability.example.com/d/a';
const WHOLE = 'route-cache-worker-restart-loop';
const REFERENCE = 'example/route-cache-worker-restart-loop-after-volume-reset#1432';
const TITLE = `Restore ${PATH} and recreate the worker`;

const mark = <svg viewBox="0 0 16 16" aria-hidden="true" />;

function Hostile() {
  return (
    <div>
      <p>
        Restored from <InlineCode>{PATH}</InlineCode> after the reset.
      </p>
      <p>
        Run <InlineCode>{COMMAND}</InlineCode> on every host.
      </p>
      <ul>
        <li>
          Level one
          <ul>
            <li>
              Level two
              <ul>
                <li>
                  Then <InlineCode whole>{WHOLE}</InlineCode> in a nested list.
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
      <p>
        Timeline at{' '}
        <InlineRef href={ADDRESS} mark={mark} wrap>
          {ADDRESS}
        </InlineRef>
        , and the dashboard at{' '}
        <InlineRef href={HOST_ADDRESS} mark={mark} wrap>
          {HOST_ADDRESS}
        </InlineRef>
        .
      </p>
      <p>
        See{' '}
        <InlineRef href={ADDRESS} mark={mark} wrap>
          <span>the restart loop dashboard for the staging cluster in the western region</span>
        </InlineRef>
        .
      </p>
      <p>
        Tracked in{' '}
        <InlineRef mark={mark} code>
          {REFERENCE}
        </InlineRef>
        .
      </p>
      <Table
        caption="Restarts"
        headers={['Host', 'Service', 'Volume', 'Mount path', 'Last restart', 'Exit code', 'Restarts', 'Owner']}
        data={[['app-west-1a.internal', 'route-cache-worker', 'route-cache-data', PATH, '2026-11-07T05:41:59Z', '137', '1432', 'backend']]}
      />
      <CodeBlock code={`${COMMAND} && ${COMMAND}`} />
    </div>
  );
}

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

/** Renders `node` into a host `width` px wide, and waits for fonts and layout. */
async function mount(node: ReactNode, width: number): Promise<HTMLElement> {
  host = document.createElement('div');
  // One column exactly `width` wide, as a pane's slot is: a container that
  // grew to its content would hide the overflow this suite looks for.
  host.style.cssText = `display: grid; grid-template-columns: minmax(0, 1fr); width: ${width}px; height: 640px;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  return host;
}

const REPLACED = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']);
const label = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;

/** True when `el`, or an ancestor below `box`, scrolls or clips its own overflow. */
function ownScroller(el: Element | null, box: Element): boolean {
  for (let up = el; up && up !== box; up = up.parentElement) {
    if (getComputedStyle(up).overflowX !== 'visible') return true;
  }
  return false;
}

/**
 * What a reader would have to scroll sideways to see: a glyph, or a box that
 * is not a run of text, past `box`'s padding edge and outside a scroller of
 * its own. A run of text is measured by its glyphs, since a browser leaves a
 * cloned inline end padding out of line breaking: a broken chip's ground may
 * reach a few pixels past the words it holds.
 */
function overflowing(box: Element): string[] {
  const right = box.getBoundingClientRect().left + box.clientLeft + box.clientWidth + 0.5;
  const found: string[] = [];
  for (const el of box.querySelectorAll('*')) {
    const run = getComputedStyle(el).display === 'inline' && !(el instanceof SVGElement) && !REPLACED.has(el.tagName);
    if (!run && el.getBoundingClientRect().right > right && !ownScroller(el.parentElement, box)) found.push(label(el));
  }
  const texts = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  for (let text = texts.nextNode(); text; text = texts.nextNode()) {
    const range = document.createRange();
    range.selectNodeContents(text);
    const past = [...range.getClientRects()].some((rect) => rect.width > 0 && rect.right > right);
    if (past && !ownScroller(text.parentElement, box)) found.push(`text in ${label(text.parentElement!)}`);
  }
  return found;
}

async function expectNoSidewaysScroll(node: ReactNode, width: number, selector: string, portal: boolean) {
  const at = await mount(node, width);
  const box = at.querySelector(selector) ?? document.querySelector(selector);
  expect(box, selector).not.toBeNull();
  expect(box!.clientWidth, `${selector} has a width`).toBeGreaterThan(0);
  // A portaled dialog takes its own width, not the slot's.
  if (!portal) {
    expect(box!.getBoundingClientRect().width, `${selector} stays inside its ${width}px slot`).toBeLessThanOrEqual(
      width + 0.5,
    );
  }
  expect(overflowing(box!), `${selector} at ${width}px`).toEqual([]);
  // And the container never scrolls sideways itself: it fits, or it clips.
  const clips = ['hidden', 'clip'].includes(getComputedStyle(box!).overflowX);
  expect(clips || box!.scrollWidth <= box!.clientWidth, `${selector} scrolls sideways at ${width}px`).toBe(true);
}

const CONTAINERS: { name: string; selector: string; portal?: boolean; render: (width: number) => ReactNode }[] = [
  {
    name: 'PeekRail',
    selector: '.crewlet-peek-rail__body',
    render: (width) => (
      <PeekRail label="Item detail" shape="column" width={width} minWidth={width} onClose={() => {}}>
        <ObjectHeader kind="Task" title={TITLE} size="peek" />
        <Hostile />
      </PeekRail>
    ),
  },
  {
    name: 'SidePanel',
    selector: '.crewlet-side-panel__body',
    render: (width) => (
      <SidePanel title="Ask" width={width} onClose={() => {}}>
        <Hostile />
      </SidePanel>
    ),
  },
  {
    name: 'Modal',
    selector: '.crewlet-modal__body',
    portal: true,
    render: () => (
      <Modal open title={TITLE} onClose={() => {}}>
        <Hostile />
      </Modal>
    ),
  },
  {
    name: 'ChatThread',
    selector: '.crewlet-chat-thread__scroller',
    render: () => (
      <ChatThread label="Conversation">
        <Hostile />
      </ChatThread>
    ),
  },
  {
    name: 'ListDetail',
    selector: '.crewlet-list-detail__detail',
    render: () => (
      <ListDetail list={<nav aria-label="Items">Items</nav>} showing="detail">
        <ObjectHeader kind="Task" title={TITLE} />
        <Hostile />
      </ListDetail>
    ),
  },
];

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  describe(`at a ${viewport.width}px viewport`, () => {
    for (const container of CONTAINERS) {
      for (const width of [320, 360, 390, 420]) {
        test(`${container.name} at ${width}px holds long paths, commands, links and wide blocks without scrolling sideways`, async () => {
          await page.viewport(viewport.width, viewport.height);
          await expectNoSidewaysScroll(container.render(width), width, container.selector, container.portal === true);
        });
      }
    }
  });
}

test('a short whole chip and a short reference stay on one line where they fit', async () => {
  // The other half of the rule: breaking only where nothing else fits.
  await page.viewport(1280, 800);
  const at = await mount(
    <p style={{ width: '320px' }}>
      Run <InlineCode whole>make deploy</InlineCode> after{' '}
      <InlineRef mark={mark} code>
        example/web#14
      </InlineRef>{' '}
      merges.
    </p>,
    320,
  );
  const lineHeight = (el: Element) => el.getBoundingClientRect().height;
  const chip = at.querySelector('.crewlet-inline-code--whole')!;
  const ref = at.querySelector('.crewlet-inline-ref')!;
  const single = at.querySelector('p')!.getBoundingClientRect().height;
  expect(lineHeight(chip)).toBeLessThan(single + 1);
  expect(chip.getClientRects()).toHaveLength(1);
  expect(ref.getClientRects()).toHaveLength(1);
});

test('a wide table and a wide code block scroll inside their own box', async () => {
  await page.viewport(390, 844);
  const at = await mount(
    <div style={{ width: '320px' }}>
      <Hostile />
    </div>,
    320,
  );
  const scrollers = [...at.querySelectorAll('*')].filter((el) => {
    const x = getComputedStyle(el).overflowX;
    return (x === 'auto' || x === 'scroll') && el.scrollWidth > el.clientWidth;
  });
  // The table is wider than the column, so it scrolls; whatever scrolls
  // sideways is the table's or the code block's own box, never what holds them.
  expect(scrollers.length).toBeGreaterThan(0);
  for (const el of scrollers) expect(el.closest('.crewlet-table, .crewlet-codeblock'), el.className).not.toBeNull();
  expect(overflowing(at)).toEqual([]);
});
