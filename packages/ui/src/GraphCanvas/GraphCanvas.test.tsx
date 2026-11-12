/**
 * The map's lanes, cards, keys, groups, selection, trace, lines and drawing budget.
 *
 * What these protect:
 * - the three families of line: calls drawn at rest, what things run on as a
 *   trunk with its count until the legend draws them, and what stands around
 *   only for the entry a reader stands on;
 * - the pointer and focus light an entry's neighbours and open its card, and
 *   an entry another surface points at is lit the same way;
 * - a press on the selected card or on the ground clears the selection;
 * - with its chrome off the map has no zoom bar, legend or trunks;
 * - every lane is a named group with its count, and an empty lane says what
 *   would fill it, as a stop of the walk;
 * - a card says its name, kind, attention and confirmation in words, and its
 *   relations as its description; the badge is drawn only for attention;
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
  { id: 'api>web-1', from: 'api', to: 'web-1', label: 'runs on', family: 'support' },
  { id: 'api>db', from: 'api', to: 'db', label: 'depends on' },
  { id: 'web-1>acct', from: 'web-1', to: 'acct', label: 'belongs to', family: 'context' },
  { id: 'api>repo', from: 'api', to: 'repo', label: 'built from', family: 'context' },
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
/** The path one family draws in one state, or nothing when that layer is not drawn. */
const edgePath = (container: HTMLElement, state: string, family = 'flow') =>
  container
    .querySelector(`.crewlet-graph-canvas__edge-layer[data-family='${family}'][data-state='${state}']`)
    ?.querySelector('.crewlet-graph-canvas__edge')
    ?.getAttribute('d') ?? '';
const routesIn = (d: string) => (d.match(/M/g) ?? []).length;
const dimmed = (el: HTMLElement) => el.getAttribute('data-state') === 'dim';

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
    expect(screen.getByRole('button', { name: 'orders-db, Database, postgres 16, Alerting' })).toBe(db);
    expect(db.getAttribute('data-attention')).toBe('danger');
    // The tone is said three ways: the word, the notch, and a badge with a glyph.
    expect(db.querySelector('.crewlet-graph-canvas__badge svg')).not.toBeNull();
    const web2 = card('web-2');
    expect(screen.getByRole('button', { name: 'web-2, Server, Unconfirmed' })).toBe(web2);
    expect(web2.hasAttribute('data-unconfirmed')).toBe(true);
    // A quiet entry draws no badge at all: the absence of one is the state.
    expect(web2.querySelector('.crewlet-graph-canvas__badge')).toBeNull();
    const api = card('checkout-api');
    const description = document.getElementById(api.getAttribute('aria-describedby')!)!;
    expect(description.textContent).toBe(
      'runs on web-1, depends on orders-db, built from acme/api. Used by acme.example.',
    );
    // At rest only the calls are drawn, each with its moving dashes.
    expect(routesIn(edgePath(container, 'rest'))).toBe(2);
    expect(container.querySelectorAll('.crewlet-graph-canvas__flow')).toHaveLength(1);
    expect(edgePath(container, 'rest', 'support')).toBe('');
    expect(edgePath(container, 'rest', 'context')).toBe('');
    expect(edgePath(container, 'lit')).toBe('');
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
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^AWS, 2 items, open/ }));
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
    expect(screen.getByRole('button', { name: 'AWS, 2 items, closed, Needs a look' })).toBe(summary);
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
    expect(dimmed(card('orders-db'))).toBe(false);
    // What stands around is lit one step from the selection, and no further.
    expect(dimmed(card('acme/api'))).toBe(false);
    expect(dimmed(card('acme-prod'))).toBe(true);
    // Four routes leave or reach the selection, two of them not drawn at rest, each in its family.
    expect(routesIn(edgePath(container, 'lit'))).toBe(2);
    expect(routesIn(edgePath(container, 'lit', 'support'))).toBe(1);
    expect(routesIn(edgePath(container, 'lit', 'context'))).toBe(1);
    expect(edgePath(container, 'rest')).toBe('');
    expect(container.querySelector('.crewlet-graph-canvas')!.getAttribute('data-focus')).toBe('selected');

    // Unset, the trace is the whole path both ways along what carries a failure.
    rerender(<Map selectedId="site" />);
    LayoutObserver.settle();
    expect(dimmed(card('orders-db'))).toBe(false);
    expect(dimmed(card('web-1'))).toBe(false);
    expect(dimmed(card('acme/api'))).toBe(true);

    // A trace up from the database lights what depends on it, as far as the hop limit.
    rerender(<Map selectedId="db" trace={{ direction: 'up', depth: 1 }} />);
    LayoutObserver.settle();
    expect(dimmed(card('checkout-api'))).toBe(false);
    expect(dimmed(card('acme.example'))).toBe(true);
    rerender(<Map selectedId="db" trace={{ direction: 'up', depth: Infinity }} />);
    LayoutObserver.settle();
    expect(dimmed(card('acme.example'))).toBe(false);
    expect(dimmed(card('web-1'))).toBe(true);
  });

  test('a card the caller pushes back is dimmed, and so are its edges', () => {
    const { container } = render(<Map cardDimmed={(id) => id === 'db'} />);
    LayoutObserver.settle();
    expect(dimmed(card('orders-db'))).toBe(true);
    expect(routesIn(edgePath(container, 'dim'))).toBe(1);
    // A pushed back line carries no moving dashes.
    expect(container.querySelector("[data-state='dim'] .crewlet-graph-canvas__flow")).toBeNull();
  });

  test('what things run on is a trunk with its count until the legend draws the lines', () => {
    const changes: string[][] = [];
    const edges: GraphEdge[] = [
      ...EDGES,
      { id: 'api>repo-runs', from: 'api', to: 'repo', family: 'support' },
      { id: 'site>repo-runs', from: 'site', to: 'repo', family: 'support' },
    ];
    const { container } = render(<Map edges={edges} onFamiliesChange={(next) => changes.push([...next].sort())} />);
    LayoutObserver.settle();
    // One trunk per pair of clusters in neighbouring bands; the pair inside one band has none.
    const labels = [...container.querySelectorAll('.crewlet-graph-canvas__trunk-label')].map((el) => el.textContent);
    expect(labels.sort()).toEqual(['1 run on', '1 run on']);
    expect(routesIn(container.querySelector('.crewlet-graph-canvas__trunk')!.getAttribute('d')!)).toBe(2);

    const legend = screen.getByRole('group', { name: 'Legend' });
    const calls = within(legend).getByRole('button', { name: 'Calls' });
    const runsOn = within(legend).getByRole('button', { name: 'Runs on' });
    expect(calls.getAttribute('aria-pressed')).toBe('true');
    expect(runsOn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(runsOn);
    LayoutObserver.settle();
    expect(runsOn.getAttribute('aria-pressed')).toBe('true');
    expect(changes).toEqual([['flow', 'support']]);
    // Drawn line by line, the trunks go.
    expect(routesIn(edgePath(container, 'rest', 'support'))).toBe(3);
    expect(container.querySelector('.crewlet-graph-canvas__trunk')).toBeNull();
    expect(container.querySelector('.crewlet-graph-canvas__trunk-label')).toBeNull();
    // Hiding a family moves no card: the order inside a lane never reads what is shown.
    const before = card('orders-db').style.transform;
    fireEvent.click(calls);
    LayoutObserver.settle();
    expect(edgePath(container, 'rest')).toBe('');
    expect(card('orders-db').style.transform).toBe(before);
  });

  test('the legend keys each tone the caller words, and a cluster says how many inside carry it', () => {
    render(<Map tones={{ danger: 'Alerting', warning: 'Needs a look' }} />);
    LayoutObserver.settle();
    const legend = screen.getByRole('group', { name: 'Legend' });
    expect(legend.textContent).toContain('Alerting');
    expect(legend.textContent).toContain('Needs a look');
    expect(legend.textContent).toContain('Quiet');
    expect(legend.textContent).toContain('Unconfirmed');
    expect(legend.querySelectorAll('.crewlet-graph-canvas__key-notch[data-tone]')).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Data, 1 item, 1 Alerting' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Runtime, 2 items, 1 Needs a look' })).toBeTruthy();
  });

  test('the pointer and focus light an entry and its neighbours and open its card', () => {
    vi.useFakeTimers();
    try {
      const hovers: (string | null)[] = [];
      const { container } = render(
        <Map onHover={(id) => hovers.push(id)} renderCard={(id) => <span>card for {id}</span>} />,
      );
      LayoutObserver.settle();
      const root = container.querySelector('.crewlet-graph-canvas')!;
      fireEvent.pointerEnter(card('orders-db'));
      // A pass over the map lights nothing: the pointer has to rest.
      expect(root.hasAttribute('data-focus')).toBe(false);
      act(() => void vi.advanceTimersByTime(100));
      expect(root.getAttribute('data-focus')).toBe('hover');
      expect(hovers).toEqual(['db']);
      expect(card('orders-db').getAttribute('data-state')).toBe('lit');
      expect(card('checkout-api').getAttribute('data-state')).toBe('lit');
      expect(dimmed(card('acme.example'))).toBe(true);
      expect(screen.getByRole('tooltip').textContent).toBe('card for db');
      fireEvent.pointerLeave(card('orders-db'));
      act(() => void vi.advanceTimersByTime(150));
      expect(root.hasAttribute('data-focus')).toBe(false);
      expect(screen.queryByRole('tooltip')).toBeNull();
      expect(hovers).toEqual(['db', null]);
      // Focus does the same at once, and Escape closes the card.
      act(() => card('checkout-api').focus());
      expect(screen.getByRole('tooltip').textContent).toBe('card for api');
      fireEvent.keyDown(card('checkout-api'), { key: 'Escape' });
      expect(screen.queryByRole('tooltip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  test('an entry another surface points at is lit as the pointer lights one', () => {
    const { container } = render(<Map hoveredId="db" />);
    LayoutObserver.settle();
    expect(container.querySelector('.crewlet-graph-canvas')!.getAttribute('data-focus')).toBe('hover');
    expect(card('orders-db').getAttribute('data-state')).toBe('lit');
    expect(dimmed(card('acme.example'))).toBe(true);
    expect(routesIn(edgePath(container, 'lit'))).toBe(1);
  });

  test('a press on the selected card, or on the ground, clears the selection', () => {
    const picks: (string | null)[] = [];
    const { container } = render(<Selecting onPick={(id) => picks.push(id)} dock={<button type="button">Details</button>} />);
    LayoutObserver.settle();
    fireEvent.click(card('orders-db'));
    fireEvent.click(card('orders-db'));
    expect(picks).toEqual(['db', null]);
    fireEvent.click(card('orders-db'));
    // A press on the dock is not a press on the ground.
    const details = screen.getByRole('button', { name: 'Details' });
    fireEvent.pointerDown(details, { clientX: 10, clientY: 10 });
    fireEvent.click(details, { clientX: 10, clientY: 10 });
    expect(picks).toEqual(['db', null, 'db']);
    // Neither is the end of a drag that panned the map.
    const ground = container.querySelector('.crewlet-canvas__viewport')!;
    fireEvent.pointerDown(ground, { clientX: 10, clientY: 10 });
    fireEvent.click(ground, { clientX: 90, clientY: 10 });
    expect(picks).toEqual(['db', null, 'db']);
    fireEvent.pointerDown(ground, { clientX: 10, clientY: 10 });
    fireEvent.click(ground, { clientX: 11, clientY: 10 });
    expect(picks).toEqual(['db', null, 'db', null]);
  });

  test('with its chrome off the map is a still diagram: no zoom bar, no legend, no trunks', () => {
    const edges: GraphEdge[] = [...EDGES, { id: 'api>repo-runs', from: 'api', to: 'repo', family: 'support' }];
    const { container } = render(<Map edges={edges} chrome={false} selectedId="api" />);
    LayoutObserver.settle();
    expect(screen.queryByRole('group', { name: 'Legend' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
    expect(container.querySelector('.crewlet-graph-canvas__trunk')).toBeNull();
    expect(card('checkout-api').getAttribute('aria-current')).toBe('true');
  });

  test('a lane of several columns stands its entries in the columns they name', () => {
    const bands: GraphBand[] = [
      { id: 'request', lanes: [{ id: 'services', label: 'Services', columns: 2 }] },
    ];
    const nodes: GraphNode[] = [
      { id: 'a', lane: 'services', name: 'web-app', kind: 'Service', column: 0 },
      { id: 'b', lane: 'services', name: 'checkout-api', kind: 'Service', column: 1 },
      { id: 'c', lane: 'services', name: 'search-api', kind: 'Service', column: 1 },
    ];
    render(<GraphCanvas label="Atlas map" bands={bands} nodes={nodes} edges={[]} />);
    LayoutObserver.settle();
    const x = (name: string) => Number(/translate\(([\d.]+)px/.exec(card(name).style.transform)![1]);
    expect(x('checkout-api')).toBe(x('search-api'));
    expect(x('checkout-api')).toBeGreaterThan(x('web-app'));
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
    // So are the edges: only the routes near the view are in the path.
    const routes = () => routesIn(edgePath(container, 'rest'));
    expect(routes()).toBeGreaterThan(0);
    expect(routes()).toBeLessThan(chain.length);

    // Fitting it whole is far below reading: only the tab stop stays an element.
    const viewport = container.querySelector('.crewlet-canvas__viewport')!;
    fireEvent.keyDown(viewport, { key: '0' });
    LayoutObserver.settle();
    expect(container.querySelectorAll('.crewlet-graph-canvas__items .crewlet-graph-canvas__card')).toHaveLength(1);
    const shapes = container.querySelector('.crewlet-graph-canvas__shapes [data-shape="card"]')!;
    // Every card is a shape, the tab stop too, which is also drawn as itself over its shape.
    expect(shapes.getAttribute('d')!.match(/M/g)).toHaveLength(2000);
    expect(routes()).toBe(chain.length);
    // Far more calls than a reader can follow: the dashes at rest stand still.
    expect(container.querySelector('.crewlet-graph-canvas')!.hasAttribute('data-still')).toBe(true);
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
