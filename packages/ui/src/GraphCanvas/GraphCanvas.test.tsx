/**
 * The map's lanes, cards, keys, groups, selection, trace and drawing budget.
 *
 * What these protect:
 * - every lane is a named group with its count, and an empty lane says what
 *   would fill it, as a stop of the walk;
 * - a card says its name, kind, attention and confirmation in words, and its
 *   relations as its description; the dot is drawn only for attention;
 * - one roving tab stop: the arrows walk, Enter selects or opens a group,
 *   Escape clears, typing finds a name;
 * - groups start closed past the caller's threshold, and a selection inside a
 *   closed group opens it;
 * - a selection dims what it does not reach, and draws its edges strong,
 *   including the ones not drawn at rest;
 * - at two thousand entries only the cards near the view are mounted, and
 *   zoomed out past reading none are, the map drawing shapes instead.
 *
 * jsdom has no layout, so `LayoutObserver` reports the sizes a browser would.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  GRAPH_CANVAS_DETAIL_ZOOM,
  GraphCanvas,
  graphWindow,
  type GraphBand,
  type GraphCanvasProps,
  type GraphEdge,
  type GraphGroup,
  type GraphNode,
} from './index.js';

const VIEWPORT = { width: 1200, height: 800 };

function sizeOf(el: Element): { width: number; height: number } | null {
  if (el.classList.contains('crewlet-graph-canvas')) return VIEWPORT;
  if (el.classList.contains('crewlet-canvas__viewport')) return VIEWPORT;
  if (
    !el.classList.contains('crewlet-graph-canvas__probe') &&
    !el.classList.contains('crewlet-graph-canvas__empty-probe')
  ) {
    return null;
  }
  if (el.classList.contains('crewlet-graph-canvas__card')) return { width: 216, height: 52 };
  if (el.classList.contains('crewlet-graph-canvas__gap')) return { width: 64, height: 20 };
  if (el.classList.contains('crewlet-graph-canvas__pad')) return { width: 12, height: 24 };
  if (el.classList.contains('crewlet-graph-canvas__lane-head')) return { width: 120, height: 32 };
  if (el.classList.contains('crewlet-graph-canvas__band-title')) return { width: 120, height: 40 };
  if (el.classList.contains('crewlet-graph-canvas__empty-probe')) return { width: 216, height: 90 };
  return null;
}

class LayoutObserver {
  static instances: LayoutObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    LayoutObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.add(el);
  }
  unobserve(el: Element): void {
    this.observed.delete(el);
  }
  disconnect(): void {
    this.observed.clear();
  }
  deliver(): void {
    const entries = [...this.observed]
      .map((target) => {
        const size = sizeOf(target);
        if (!size) return null;
        return {
          target,
          contentRect: { width: size.width, height: size.height },
          borderBoxSize: [{ inlineSize: size.width, blockSize: size.height }],
        };
      })
      .filter((entry) => entry !== null) as unknown as ResizeObserverEntry[];
    if (entries.length > 0) this.callback(entries, this as unknown as ResizeObserver);
  }
  static settle(): void {
    for (let round = 0; round < 5; round++) {
      act(() => {
        for (const observer of [...LayoutObserver.instances]) observer.deliver();
      });
    }
  }
}

const realResizeObserver = globalThis.ResizeObserver;
beforeEach(() => {
  LayoutObserver.instances = [];
  globalThis.ResizeObserver = LayoutObserver as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = realResizeObserver;
});

const BANDS: GraphBand[] = [
  {
    id: 'request',
    lanes: [
      { id: 'entry', label: 'Entry', empty: 'Domains appear here from a DNS provider.' },
      { id: 'services', label: 'Services', empty: 'Services appear when you add one.' },
      { id: 'runtime', label: 'Runtime', empty: 'Servers appear here.' },
      { id: 'data', label: 'Data', empty: 'Databases appear here.' },
      { id: 'platforms', label: 'Platforms', empty: 'Accounts appear here.' },
    ],
  },
  {
    id: 'around',
    label: 'Around it',
    lanes: [
      { id: 'code', label: 'Code and delivery', empty: 'Repositories appear here.' },
      { id: 'observability', label: 'Observability', empty: 'Monitors appear here.' },
      { id: 'tools', label: 'Tools and models', empty: 'Tool servers appear here.' },
    ],
  },
];

const NODES: GraphNode[] = [
  { id: 'site', lane: 'entry', name: 'acme.example', kind: 'Domain' },
  { id: 'api', lane: 'services', name: 'checkout-api', kind: 'Service', caption: 'api.acme.example' },
  {
    id: 'web-1',
    lane: 'runtime',
    group: 'aws',
    name: 'web-1',
    kind: 'Server',
    attention: { tone: 'warning', label: 'Needs a look' },
  },
  { id: 'web-2', lane: 'runtime', group: 'aws', name: 'web-2', kind: 'Server', unconfirmed: true },
  {
    id: 'db',
    lane: 'data',
    name: 'orders-db',
    kind: 'Database',
    caption: 'postgres 16',
    attention: { tone: 'danger', label: 'Alerting' },
  },
  { id: 'acct', lane: 'platforms', name: 'acme-prod', kind: 'Account' },
  { id: 'repo', lane: 'code', name: 'acme/api', kind: 'Repository' },
];
const GROUPS: GraphGroup[] = [{ id: 'aws', lane: 'runtime', label: 'AWS' }];
const EDGES: GraphEdge[] = [
  { id: 'site>api', from: 'site', to: 'api', label: 'resolves to' },
  { id: 'api>web-1', from: 'api', to: 'web-1', label: 'runs on' },
  { id: 'api>db', from: 'api', to: 'db', label: 'depends on' },
  { id: 'web-1>acct', from: 'web-1', to: 'acct', label: 'belongs to', atRest: false },
  { id: 'api>repo', from: 'api', to: 'repo', label: 'built from', atRest: false },
];

function Map(props: Partial<GraphCanvasProps>) {
  return <GraphCanvas label="Atlas map" bands={BANDS} nodes={NODES} edges={EDGES} groups={GROUPS} {...props} />;
}

/** A map whose selection is the caller's, as a screen holds it. */
function Selecting(props: Partial<GraphCanvasProps> & { onPick?: (id: string | null) => void }) {
  const [selected, setSelected] = useState<string | null>(props.selectedId ?? null);
  return (
    <Map
      {...props}
      selectedId={selected}
      onSelect={(id) => {
        props.onPick?.(id);
        setSelected(id);
      }}
    />
  );
}

const card = (name: RegExp | string) =>
  screen.getByRole('button', { name: typeof name === 'string' ? new RegExp(`^${name},`) : name });
const edgePath = (container: HTMLElement, state: string) =>
  container.querySelector(`.crewlet-graph-canvas__edge[data-state='${state}']`)!.getAttribute('d') ?? '';

describe('GraphCanvas', () => {
  test('every lane is a named group with its count, and an empty lane says what would fill it', () => {
    render(<Map nodes={NODES.filter((node) => node.lane !== 'tools')} />);
    LayoutObserver.settle();
    const runtime = screen.getByRole('group', { name: 'Runtime, 2 items' });
    expect(within(runtime).getByRole('button', { name: /^AWS, 2 items, open/ })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Around it' })).toBeTruthy();
    const tools = screen.getByRole('group', { name: 'Tools and models, 0 items' });
    const empty = within(tools).getByRole('group', { name: 'Tools and models, empty' });
    expect(empty.textContent).toBe('Tool servers appear here.');
    // The measuring copy of the message is out of reach of the keyboard and assistive technology.
    const probe = document.querySelector('.crewlet-graph-canvas__empty-probe')!;
    expect(probe.hasAttribute('inert')).toBe(true);
    expect(probe.getAttribute('aria-hidden')).toBe('true');
  });

  test('a card says its name, kind, attention and confirmation, and its relations as its description', () => {
    const { container } = render(<Map />);
    LayoutObserver.settle();
    const db = card('orders-db');
    expect(db.getAttribute('aria-label')).toBe('orders-db, Database, postgres 16, Alerting');
    expect(db.getAttribute('data-attention')).toBe('danger');
    expect(db.querySelector('.crewlet-status-dot--danger')).not.toBeNull();
    const web2 = card('web-2');
    expect(web2.getAttribute('aria-label')).toBe('web-2, Server, Unconfirmed');
    expect(web2.hasAttribute('data-unconfirmed')).toBe(true);
    // A quiet entry draws no dot at all: the absence of a dot is the state.
    expect(web2.querySelector('.crewlet-status-dot')).toBeNull();
    const api = card('checkout-api');
    const description = document.getElementById(api.getAttribute('aria-describedby')!)!;
    expect(description.textContent).toBe(
      'runs on web-1, depends on orders-db, built from acme/api. Used by acme.example.',
    );
    // At rest, the edges not drawn at rest are not drawn.
    expect(edgePath(container, 'quiet')).not.toBe('');
    expect(edgePath(container, 'strong')).toBe('');
  });

  test('one tab stop; the arrows walk the lanes, and Enter and Escape select and clear', () => {
    const picks: (string | null)[] = [];
    render(<Selecting onPick={(id) => picks.push(id)} />);
    LayoutObserver.settle();
    const stops = document.querySelectorAll('[data-graph-key][tabindex="0"]');
    expect(stops).toHaveLength(1);
    const site = card('acme.example');
    expect(site.tabIndex).toBe(0);
    act(() => site.focus());
    fireEvent.keyDown(site, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(card('checkout-api'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement!.getAttribute('aria-label')).toMatch(/^AWS, 2 items, open/);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(card('web-1'));
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(picks).toEqual(['web-1']);
    expect(card('web-1').getAttribute('aria-current')).toBe('true');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(picks).toEqual(['web-1', null]);
    expect(card('web-1').hasAttribute('aria-current')).toBe(false);
    // The tab stop follows the walk.
    expect(card('web-1').tabIndex).toBe(0);
    expect(site.tabIndex).toBe(-1);
  });

  test('typing finds an entry by name', () => {
    render(<Map />);
    LayoutObserver.settle();
    act(() => card('acme.example').focus());
    fireEvent.keyDown(document.activeElement!, { key: 'o' });
    expect(document.activeElement).toBe(card('orders-db'));
  });

  test('Enter on a group header closes it to one card, which keeps the focus and says what it holds', () => {
    const changes: string[][] = [];
    render(<Map onOpenGroupsChange={(open) => changes.push([...open])} />);
    LayoutObserver.settle();
    const head = screen.getByRole('button', { name: /^AWS, 2 items, open/ });
    expect(head.getAttribute('aria-expanded')).toBe('true');
    act(() => head.focus());
    fireEvent.keyDown(head, { key: 'Enter' });
    LayoutObserver.settle();
    const summary = screen.getByRole('button', { name: /^AWS, 2 items, closed/ });
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(summary);
    // The worst attention inside a closed group is still on its card.
    expect(summary.getAttribute('aria-label')).toBe('AWS, 2 items, closed, Needs a look');
    expect(screen.queryByRole('button', { name: /^web-1,/ })).toBeNull();
    expect(changes).toEqual([[]]);
    fireEvent.keyDown(summary, { key: 'Enter' });
    LayoutObserver.settle();
    expect(screen.getByRole('button', { name: /^AWS, 2 items, open/ })).toBeTruthy();
  });

  test('groups start closed past the threshold, and a selection inside one opens it', () => {
    const { rerender } = render(<Map collapseAbove={3} />);
    LayoutObserver.settle();
    expect(screen.getByRole('button', { name: /^AWS, 2 items, closed/ })).toBeTruthy();
    rerender(<Map collapseAbove={3} selectedId="web-2" />);
    LayoutObserver.settle();
    expect(card('web-2').getAttribute('aria-current')).toBe('true');
    expect(screen.queryByRole('button', { name: /^AWS, 2 items, closed/ })).toBeNull();
  });

  test('a selection dims what it does not reach and draws its edges strong, the hidden ones included', () => {
    const { container, rerender } = render(<Map selectedId="api" />);
    LayoutObserver.settle();
    expect(card('orders-db').hasAttribute('data-dimmed')).toBe(false);
    expect(card('acme-prod').hasAttribute('data-dimmed')).toBe(true);
    expect(card('acme/api').hasAttribute('data-dimmed')).toBe(false);
    const strong = edgePath(container, 'strong');
    // Four routes leave or reach the selection, one of them not drawn at rest.
    expect(strong.match(/M/g)).toHaveLength(4);
    expect(edgePath(container, 'quiet')).toBe('');

    // A trace up from the database lights what depends on it, as far as the hop limit.
    rerender(<Map selectedId="db" trace={{ direction: 'up', depth: 1 }} />);
    LayoutObserver.settle();
    expect(card('checkout-api').hasAttribute('data-dimmed')).toBe(false);
    expect(card('acme.example').hasAttribute('data-dimmed')).toBe(true);
    rerender(<Map selectedId="db" trace={{ direction: 'up', depth: Infinity }} />);
    LayoutObserver.settle();
    expect(card('acme.example').hasAttribute('data-dimmed')).toBe(false);
    expect(card('web-1').hasAttribute('data-dimmed')).toBe(true);
  });

  test('a card the caller pushes back is dimmed, and so are its edges', () => {
    const { container } = render(<Map cardDimmed={(id) => id === 'db'} />);
    LayoutObserver.settle();
    expect(card('orders-db').hasAttribute('data-dimmed')).toBe(true);
    expect(edgePath(container, 'faint').match(/M/g)).toHaveLength(1);
  });

  test('a press selects a card, and a press on a group header toggles it', () => {
    const onSelect = vi.fn();
    render(<Map onSelect={onSelect} />);
    LayoutObserver.settle();
    fireEvent.click(card('orders-db'));
    expect(onSelect).toHaveBeenCalledWith('db');
    fireEvent.click(screen.getByRole('button', { name: /^AWS, 2 items, open/ }));
    LayoutObserver.settle();
    expect(screen.getByRole('button', { name: /^AWS, 2 items, closed/ })).toBeTruthy();
  });

  test('no axe violations, with groups, an empty lane, a selection and a trace', async () => {
    const { container } = render(
      <Map
        nodes={NODES.filter((node) => node.lane !== 'tools')}
        selectedId="db"
        trace={{ direction: 'up', depth: 3 }}
      />,
    );
    LayoutObserver.settle();
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('at two thousand entries', () => {
  const lanes = BANDS.flatMap((band) => band.lanes.map((lane) => lane.id));
  const many: GraphNode[] = Array.from({ length: 2000 }, (_, i) => ({
    id: `n${i}`,
    lane: lanes[i % lanes.length]!,
    name: `entry-${i}`,
  }));
  const chain: GraphEdge[] = many.slice(1).map((node, i) => ({ id: `e${i}`, from: many[i]!.id, to: node.id }));

  test('only the cards near the view are mounted, and zoomed out past reading the map draws shapes', () => {
    const { container } = render(<GraphCanvas label="Atlas map" bands={BANDS} nodes={many} edges={chain} />);
    LayoutObserver.settle();
    const mounted = container.querySelectorAll('.crewlet-graph-canvas__items .crewlet-graph-canvas__card');
    // The map opens on its start at a size that reads, so a screen and its margin are mounted.
    expect(mounted.length).toBeGreaterThan(20);
    expect(mounted.length).toBeLessThan(400);
    expect(container.querySelector('.crewlet-graph-canvas__shapes')).toBeNull();

    // Fitting it whole is far below reading: only the tab stop stays an element.
    const viewport = container.querySelector('.crewlet-canvas__viewport')!;
    fireEvent.keyDown(viewport, { key: '0' });
    LayoutObserver.settle();
    expect(container.querySelectorAll('.crewlet-graph-canvas__items .crewlet-graph-canvas__card')).toHaveLength(1);
    const shapes = container.querySelector('.crewlet-graph-canvas__shapes [data-shape="card"]')!;
    // Every card is a shape, the tab stop too, which is also drawn as itself over its shape.
    expect(shapes.getAttribute('d')!.match(/M/g)).toHaveLength(2000);
  });
});

describe('graphWindow', () => {
  const viewport = { width: 1000, height: 500 };

  test('mounts the view with half a screen of room each side, and keeps it while the view stays inside', () => {
    const first = graphWindow(null, { x: 0, y: 0, k: 1 }, viewport);
    expect(first).toEqual({ rect: { x: -500, y: -250, width: 2000, height: 1000 }, detail: true });
    expect(graphWindow(first, { x: -300, y: -100, k: 1 }, viewport)).toBe(first);
    const moved = graphWindow(first, { x: -700, y: 0, k: 1 }, viewport);
    expect(moved).not.toBe(first);
    expect(moved.rect.x).toBe(200);
  });

  test('a zoom past reading switches to shapes, and a deep zoom in remounts a smaller window', () => {
    const far = graphWindow(null, { x: 0, y: 0, k: GRAPH_CANVAS_DETAIL_ZOOM / 2 }, viewport);
    expect(far.detail).toBe(false);
    const near = graphWindow(far, { x: 0, y: 0, k: 2 }, viewport);
    expect(near.detail).toBe(true);
    const deeper = graphWindow(
      { rect: { x: 0, y: 0, width: 100000, height: 100000 }, detail: true },
      { x: 0, y: 0, k: 2 },
      viewport,
    );
    expect(deeper.rect.width).toBe(1000);
  });
});
