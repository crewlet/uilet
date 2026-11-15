/**
 * The chart's tree, its keys, its menus and its layout: ARIA tree semantics,
 * one roving tab stop, focus requests, and relayouts that keep the node acted
 * on in view. jsdom has no layout, so `LayoutObserver` reports a browser's sizes.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { createRef, useMemo, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChevronDownGlyph, ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { IconButton } from '../IconButton/index.js';
import { focusables } from '../Layer/index.js';
import { Menu } from '../Menu/index.js';
import { OrgNodeDisclosure, OrgNodeLead } from '../OrgNode/index.js';
import { ENTRANCE_STEP_MS, REFLOW_MS, entranceOrder } from './motion.js';
import type { TreeInput, TreeModel } from '../Tree/index.js';
import { installMotion, installSheets, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { NODE_HUES } from '../utils/nodeHue.js';
import {
  TREE_ADD_MARK_MIN_ZOOM,
  TreeCanvas,
  type TreeCanvasGroup,
  type TreeCanvasHandle,
  type TreeCardContext,
  type TreeCardInput,
  type TreeCardTone,
  type TreeComposing,
} from './TreeCanvas.js';

// ---------------------------------------------------------------------------
// A ResizeObserver this suite drives
// ---------------------------------------------------------------------------

const CARD_WIDTH = 240;
const ROW_HEIGHT = 40;
const VIEWPORT = { width: 1200, height: 800 };
/** What a ghost card measures: a form, wider than a node and much taller. */
const GHOST = { width: 320, height: 400 };
/**
 * Whether the ghost is measured at all, which a case about the tick BEFORE it
 * is placed turns off. An unmeasured card has no position, and the chart draws
 * a card it has not placed hidden.
 */
let GHOST_MEASURED = true;
/** What the margin probe measures, which a case about the margin sets. */
let MARGIN = 0;
/** What a group box's padding probe measures: beside and below its members. */
const GROUP_PAD = { width: 12, height: 10 };
/** What a group's header measures: the room above its members. */
const GROUP_HEAD = 28;

function sizeOf(el: Element): { width: number; height: number } | null {
  if (el.classList.contains('crewlet-canvas__viewport')) return VIEWPORT;
  if (el.classList.contains('crewlet-tree-canvas__gap')) return { width: 24, height: 32 };
  // The space around the whole chart, as its own probe: none here, so the
  // cases below read the same coordinates they always did, and the cases that
  // are ABOUT the margin render their own chart with a margin.
  if (el.classList.contains('crewlet-tree-canvas__margin')) return { width: MARGIN, height: MARGIN };
  if (el.classList.contains('crewlet-tree-canvas__group-pad')) return GROUP_PAD;
  if (el.classList.contains('crewlet-tree-canvas__group-head')) return { width: 180, height: GROUP_HEAD };
  // The ghost holds a form, so it is neither a card's width nor a row tall:
  // it is the size the layout has to make room for, which is the whole point
  // of measuring it rather than assuming it.
  if (el.classList.contains('crewlet-tree-canvas__card--composing')) {
    return GHOST_MEASURED ? GHOST : null;
  }
  if (el.classList.contains('crewlet-tree-canvas__card')) {
    const items = el.querySelectorAll("[role='treeitem']").length;
    return { width: CARD_WIDTH, height: Math.max(1, items) * ROW_HEIGHT };
  }
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
  private deliver(): void {
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
  /**
   * Reports every observed size, a few rounds, so cards a layout renders are
   * measured too, and then lands every card at its target. A case that is
   * ABOUT the travel passes `false` and drives the frames itself.
   */
  static settle(motion = true): void {
    for (let round = 0; round < 4; round++) {
      act(() => {
        for (const observer of [...LayoutObserver.instances]) observer.deliver();
      });
    }
    if (motion) settleMotion();
  }
}

// ---------------------------------------------------------------------------
// A clock this suite drives
// ---------------------------------------------------------------------------

/*
 * A relayout travels (motion.ts), so the suite owns the frame queue:
 * `settleMotion` runs frames past the tween until every card has landed, and
 * `LayoutObserver.settle` ends with it, so other cases read the chart at rest.
 */
const frames: (FrameRequestCallback | null)[] = [];

function runFrames(at: number): void {
  const due = [...frames];
  frames.length = 0;
  act(() => {
    for (const frame of due) frame?.(at);
  });
}

function settleMotion(): void {
  for (let round = 0; round < 4 && frames.some(Boolean); round++) {
    runFrames(performance.now() + REFLOW_MS * 2);
  }
}

/*
 * As in a browser, `focus()` inside a `visibility: hidden` subtree moves
 * nothing (jsdom focuses it anyway), so a case can ask whether focus landed.
 */
const realFocus = HTMLElement.prototype.focus;
/**
 * How many focus attempts on a placed card the browser is to refuse. Models a
 * browser's DOM lagging a commit behind the layout, which jsdom does not.
 */
let FOCUS_REFUSALS = 0;

function onlyWhenVisible(element: HTMLElement, options?: FocusOptions): void {
  for (let at: HTMLElement | null = element; at; at = at.parentElement) {
    if (at.style.visibility === 'hidden') return;
  }
  if (FOCUS_REFUSALS > 0 && element.closest('.crewlet-tree-canvas__card--composing')) {
    FOCUS_REFUSALS -= 1;
    return;
  }
  realFocus.call(element, options);
}

const realResizeObserver = globalThis.ResizeObserver;
const realFrame = globalThis.requestAnimationFrame;
const realCancelFrame = globalThis.cancelAnimationFrame;
beforeEach(() => {
  LayoutObserver.instances = [];
  MARGIN = 0;
  GHOST_MEASURED = true;
  FOCUS_REFUSALS = 0;
  HTMLElement.prototype.focus = function focus(options?: FocusOptions) {
    onlyWhenVisible(this, options);
  };
  stillness(false);
  globalThis.ResizeObserver = LayoutObserver as unknown as typeof ResizeObserver;
  frames.length = 0;
  globalThis.requestAnimationFrame = ((frame: FrameRequestCallback) =>
    frames.push(frame)) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    frames[id - 1] = null;
  }) as typeof globalThis.cancelAnimationFrame;
});
afterEach(() => {
  cleanup();
  HTMLElement.prototype.focus = realFocus;
  globalThis.ResizeObserver = realResizeObserver;
  globalThis.requestAnimationFrame = realFrame;
  globalThis.cancelAnimationFrame = realCancelFrame;
});

/** Whether the reader has asked for less motion, as jsdom has no media queries. */
function stillness(reduce: boolean): void {
  globalThis.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof globalThis.matchMedia;
}

// ---------------------------------------------------------------------------
// A company shaped fixture: cards, and seats drawn as rows inside a unit card
// ---------------------------------------------------------------------------

type Kind = 'company' | 'unit' | 'seat';
interface Entity {
  name: string;
  kind: Kind;
  parent: string | null;
}

const COMPANY = 'company:Acme';
const ENTITIES: Record<string, Entity> = {
  [COMPANY]: { name: 'Acme', kind: 'company', parent: null },
  'seat:ceo': { name: 'CEO', kind: 'seat', parent: COMPANY },
  'unit:eng': { name: 'Engineering', kind: 'unit', parent: COMPANY },
  'seat:vp': { name: 'VP Engineering', kind: 'seat', parent: 'unit:eng' },
  'seat:dev': { name: 'Dev', kind: 'seat', parent: 'unit:eng' },
  'unit:platform': { name: 'Platform', kind: 'unit', parent: 'unit:eng' },
  'seat:sre': { name: 'SRE', kind: 'seat', parent: 'unit:platform' },
  'seat:designer': { name: 'Designer', kind: 'seat', parent: 'unit:platform' },
  'unit:sales': { name: 'Sales', kind: 'unit', parent: COMPANY },
  'seat:ae': { name: 'Account Executive', kind: 'seat', parent: 'unit:sales' },
};

/** The one extra root seat the relayout case adds. */
const ADVISOR = 'seat:advisor';

function forestOf(extra: readonly string[]): TreeInput[] {
  const entities: Record<string, Entity> = { ...ENTITIES };
  for (const id of extra) entities[id] = { name: nameOf(id), kind: 'seat', parent: COMPANY };
  const node = (id: string): TreeInput => ({
    id,
    label: entities[id]!.name,
    children: Object.keys(entities)
      .filter((child) => entities[child]!.parent === id)
      .map(node),
  });
  return [node(COMPANY)];
}

/*
 * An id `extra` put on the chart is a root seat, whatever it is called: the
 * relayout case adds one and the wide-chart case adds forty, and neither is
 * about what those seats ARE.
 */
const nameOf = (id: string) => ENTITIES[id]?.name ?? (id === ADVISOR ? 'Advisor' : id);
const kindOf = (id: string) => ENTITIES[id]?.kind ?? 'seat';
const parentOf = (id: string) => ENTITIES[id]?.parent ?? COMPANY;

/** A seat inside a unit is a ROW of that unit's card; everything else is a card. */
const cardOf = (id: string) => {
  const parent = parentOf(id);
  return kindOf(id) === 'seat' && parent !== null && parent !== COMPANY ? parent : id;
};

function cards(model: TreeModel, expanded: ReadonlySet<string>): TreeCardInput[] {
  const card = (id: string): TreeCardInput => {
    const kids = model.children.get(id) ?? [];
    if (!expanded.has(id)) return { id, children: [] };
    if (kindOf(id) === 'company') return { id, children: kids.map(card) };
    if (kindOf(id) === 'unit') return { id, children: kids.filter((kid) => kindOf(kid) !== 'seat').map(card) };
    return { id, children: [] };
  };
  return model.roots.map(card);
}

function Actions({ id, card, children }: { id: string; card: TreeCardContext; children: ReactNode }) {
  return <div {...card.actions(id)}>{children}</div>;
}

/**
 * What hangs under a card that can take a child: the control that adds one.
 *
 * A SEAT GETS NOTHING, and the caller says so by returning nothing rather than
 * by drawing something empty, which is the contract `renderUnder` states.
 */
const renderUnder = (id: string, card: TreeCardContext): ReactNode =>
  kindOf(id) === 'seat' ? null : (
    <IconButton
      size="sm"
      label={`Add to ${nameOf(id)}`}
      icon={<ChevronRightGlyph />}
      tabIndex={-1}
      onClick={(event) => {
        event.stopPropagation();
        card.activate(id);
        added.push(id);
      }}
    />
  );

/** What `Under` recorded, so a suite can see the press reached it. */
const added: string[] = [];

function Toggle({ id, card }: { id: string; card: TreeCardContext }) {
  if (!card.expandable(id)) return null;
  const open = card.expanded(id);
  return (
    <IconButton
      size="sm"
      label={`${open ? 'Collapse' : 'Expand'} ${nameOf(id)}`}
      icon={open ? <ChevronDownGlyph /> : <ChevronRightGlyph />}
      tabIndex={-1}
      onClick={(event) => {
        event.stopPropagation();
        card.toggle(id);
      }}
    />
  );
}

function More({ id, card }: { id: string; card: TreeCardContext }) {
  return (
    <Menu
      label={`Actions for ${nameOf(id)}`}
      items={[
        { key: 'edit', label: 'Edit', onSelect: () => {} },
        { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
      ]}
      triggerTabIndex={-1}
      open={card.menuOpen(id)}
      onOpenChange={(open) => card.setMenuOpen(id, open)}
    />
  );
}

/*
 * The tree's accessibility contract: every control the chart draws is out of
 * the tab order and hidden from the element-by-element walk, and no treeitem
 * holds a focusable descendant.
 */
function expectNothingFocusableInAnItem() {
  for (const el of screen.getAllByRole('treeitem')) {
    expect(el.querySelectorAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0);
  }
  const tree = screen.getByRole('tree');
  // One tab stop in the whole tree: the roving one.
  expect(focusables(tree).filter((el) => el.tabIndex === 0)).toEqual([item('Acme')]);
  for (const button of tree.querySelectorAll('button')) {
    expect(button.tabIndex).toBe(-1);
    expect(button.closest("[aria-hidden='true']")).not.toBeNull();
    expect(button.closest("[role='treeitem']")).toBeNull();
  }
}

function renderCardWith(state: Record<string, string>) {
  return function renderCard(id: string, card: TreeCardContext): ReactNode {
    const kind = kindOf(id);
    const rows =
      kind === 'unit' && card.expanded(id)
        ? Object.keys(ENTITIES).filter((child) => parentOf(child) === id && kindOf(child) === 'seat')
        : [];
    return (
      <div className="card">
        <div {...card.item(id)} className="head">
          <span className="name">{nameOf(id)}</span>
          <span className="state">{state[id] ?? 'offline'}</span>
        </div>
        <Actions id={id} card={card}>
          <Toggle id={id} card={card} />
          <More id={id} card={card} />
        </Actions>
        {rows.map((row) => (
          <div key={row} className="row">
            <div {...card.item(row)} className="head">
              <span className="name">{nameOf(row)}</span>
              <span className="state">{state[row] ?? 'offline'}</span>
            </div>
            <Actions id={row} card={card}>
              <More id={row} card={card} />
            </Actions>
          </div>
        ))}
      </div>
    );
  };
}

function Harness({
  extra = [],
  state = {},
  handle,
  onNodeKey,
  anchorNode = null,
  selectedId = null,
  onSelect,
  cardTone,
  appearance,
  ranks,
  connector,
  groups,
  composing = null,
  minZoom,
  controlsStart,
  expanded,
  onExpandedChange,
  onViewChange,
  fitKey,
  initialView,
  cardDimmed,
  overlayEnd,
}: {
  fitKey?: string | undefined;
  initialView?: { x: number; y: number; k: number } | undefined;
  cardDimmed?: ((id: string) => boolean) | undefined;
  overlayEnd?: ReactNode | undefined;
  onViewChange?: ((view: { k: number }) => void) | undefined;
  expanded?: ReadonlySet<string> | undefined;
  onExpandedChange?: ((expanded: ReadonlySet<string>) => void) | undefined;
  minZoom?: number | undefined;
  controlsStart?: ReactNode | undefined;
  extra?: readonly string[] | undefined;
  state?: Record<string, string> | undefined;
  handle?: React.Ref<TreeCanvasHandle> | undefined;
  onNodeKey?: ((id: string, action: 'activate' | 'remove') => boolean) | undefined;
  anchorNode?: string | null | undefined;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  cardTone?: ((id: string) => TreeCardTone | undefined) | undefined;
  appearance?: 'card' | 'node' | undefined;
  ranks?: 'per-parent' | 'shared' | undefined;
  connector?: 'elbow' | 'straight' | 'step' | 'curve' | undefined;
  groups?: readonly TreeCanvasGroup[] | undefined;
  composing?: TreeComposing | null | undefined;
}) {
  const nodes = useMemo(() => forestOf(extra), [extra]);
  return (
    <TreeCanvas
      label="Structure chart"
      nodes={nodes}
      cards={cards}
      cardOf={cardOf}
      renderCard={renderCardWith(state)}
      renderUnder={renderUnder}
      onNodeKey={onNodeKey ?? (() => true)}
      hasNodeMenu={() => true}
      anchorNode={anchorNode}
      selectedId={selectedId}
      onSelect={onSelect}
      cardTone={cardTone}
      appearance={appearance}
      ranks={ranks}
      connector={connector}
      groups={groups}
      composing={composing}
      minZoom={minZoom}
      controlsStart={controlsStart}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      onViewChange={onViewChange}
      fitKey={fitKey}
      initialView={initialView}
      cardDimmed={cardDimmed}
      overlayEnd={overlayEnd}
      ref={handle}
    />
  );
}

function mount(props: Parameters<typeof Harness>[0] = {}) {
  const handle = createRef<TreeCanvasHandle>();
  const utils = render(<Harness {...props} handle={handle} />);
  LayoutObserver.settle();
  return {
    ...utils,
    handle,
    rerender: (next: Parameters<typeof Harness>[0] = {}) => {
      utils.rerender(<Harness {...props} {...next} handle={handle} />);
      LayoutObserver.settle();
    },
    /** Re-renders and measures, and leaves the cards where they were: the
        travel is then the suite's to drive, frame by frame. */
    rerenderMoving: (next: Parameters<typeof Harness>[0] = {}) => {
      utils.rerender(<Harness {...props} {...next} handle={handle} />);
      LayoutObserver.settle(false);
    },
    /** Re-renders and measures nothing: a card the render added is drawn
        and not laid out yet, as it is for the frame before a browser
        measures it. */
    rerenderUnmeasured: (next: Parameters<typeof Harness>[0] = {}) => {
      utils.rerender(<Harness {...props} {...next} handle={handle} />);
    },
  };
}

/** The treeitem whose name is exactly `name`. */
const item = (name: string) =>
  screen.getAllByRole('treeitem').find((el) => within(el).queryAllByText(name, { exact: true }).length > 0)!;
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
/**
 * A pointer press on a button, as a browser makes one: the press moves focus
 * to the button unless the view stops it, which jsdom leaves to the caller.
 */
const pointerPress = (name: string) => {
  const button = screen.getByRole('button', { name, hidden: true });
  if (fireEvent.mouseDown(button)) button.focus();
  fireEvent.click(button);
};
const focused = () => document.activeElement?.getAttribute('data-tree-id');
const cardBox = (name: string) => item(name).closest<HTMLElement>('.crewlet-tree-canvas__card')!;

describe('the tree', () => {
  test('every node is a treeitem saying its level, position and expansion', () => {
    mount();
    expect(screen.getByRole('tree', { name: 'Structure chart' })).toBeDefined();
    const shape = screen
      .getAllByRole('treeitem')
      .map((el) => [
        el.getAttribute('data-tree-id'),
        el.getAttribute('aria-level'),
        el.getAttribute('aria-posinset'),
        el.getAttribute('aria-setsize'),
        el.getAttribute('aria-expanded'),
      ]);
    expect(shape).toEqual([
      [COMPANY, '1', '1', '1', 'true'],
      ['seat:ceo', '2', '1', '3', null],
      ['unit:eng', '2', '2', '3', 'true'],
      ['seat:vp', '3', '1', '3', null],
      ['seat:dev', '3', '2', '3', null],
      ['unit:platform', '3', '3', '3', 'true'],
      ['seat:sre', '4', '1', '2', null],
      ['seat:designer', '4', '2', '2', null],
      ['unit:sales', '2', '3', '3', 'true'],
      ['seat:ae', '3', '1', '1', null],
    ]);
  });

  test('a caller holding the open nodes keeps a closed branch closed and hears every toggle', () => {
    const heard: string[][] = [];
    const open = new Set([COMPANY, 'unit:eng', 'unit:platform']);
    mount({ expanded: open, onExpandedChange: (next) => heard.push([...next].sort()) });
    const ids = screen.getAllByRole('treeitem').map((el) => el.getAttribute('data-tree-id'));
    expect(ids).not.toContain('seat:ae');
    expect(ids).toContain('seat:sre');
    act(() => {
      screen.getByRole('button', { name: `Expand ${nameOf('unit:sales')}`, hidden: true }).click();
    });
    expect(heard.at(-1)).toEqual([COMPANY, 'unit:eng', 'unit:platform', 'unit:sales'].sort());
  });

  test('a treeitem holds nothing focusable, and the pointer buttons are hidden beside it', () => {
    mount();
    expectNothingFocusableInAnItem();
  });

  /*
   * A control drawn on the node itself, not in `ctx.actions`, must also sit
   * beside the item, hidden and out of the tab order: `tabIndex={-1}` does not
   * hide it from a screen reader's element-by-element walk.
   */
  test('a control a card draws outside its strip keeps the same rule', () => {
    render(
      <TreeCanvas
        label="Structure chart"
        nodes={forestOf([])}
        cards={cards}
        cardOf={cardOf}
        renderCard={(id, card) => (
          <div className="card">
            <div {...card.item(id)} className="head">
              <span className="name">{nameOf(id)}</span>
            </div>
            <div className="crewlet-org-node__leading" aria-hidden="true">
              <button type="button" className="crewlet-icon-btn" tabIndex={-1}>
                {`Collapse ${nameOf(id)}`}
              </button>
            </div>
          </div>
        )}
      />,
    );
    LayoutObserver.settle();
    expectNothingFocusableInAnItem();
  });

  test('a press on the hidden buttons of a card focuses the node, never the button', () => {
    const onSelect = vi.fn();
    mount({ onSelect });
    pointerPress('Actions for Dev');
    expect(screen.getByRole('menu', { name: 'Actions for Dev' })).toBeDefined();
    press('Escape');
    // Focus in a subtree hidden from assistive technology is focus nowhere, so
    // the menu hands it back to the node rather than to the button.
    expect(document.activeElement).toBe(item('Dev'));
    expect(onSelect).toHaveBeenLastCalledWith('seat:dev');

    pointerPress('Collapse Engineering');
    expect(document.activeElement).toBe(item('Engineering'));
    expect(item('Engineering').getAttribute('aria-expanded')).toBe('false');
  });

  test('the drawing the layout needs is hidden, so the tree announces only its nodes', () => {
    const { container } = mount();
    // The connectors and the gap probe say nothing the treeitems' levels do not;
    // announced, each would be an unnamed graphic between every pair of cards.
    const links = container.querySelector('.crewlet-tree-canvas__links')!;
    expect(links.getAttribute('aria-hidden')).toBe('true');
    const probe = container.querySelector('.crewlet-tree-canvas__gap')!;
    expect(probe.getAttribute('aria-hidden')).toBe('true');
    // Nothing else inside the tree is hidden: a card that disappeared from the
    // accessibility tree would pass the two lines above and be unreachable.
    const hidden = [...screen.getByRole('tree').querySelectorAll("[aria-hidden='true']")];
    expect(hidden.some((el) => el.querySelector("[role='treeitem']"))).toBe(false);
  });

  test('the selected node is the one marked, and every card is laid out where the tidy layout put it', () => {
    const { container } = mount({ selectedId: 'seat:dev' });
    expect(item('Dev').getAttribute('aria-selected')).toBe('true');
    expect(item('CEO').getAttribute('aria-selected')).toBe('false');
    const placed = [...container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__card')];
    expect(placed).toHaveLength(5);
    for (const card of placed) expect(card.style.transform).toMatch(/^translate\(-?[\d.]+px, -?[\d.]+px\)$/);
    // One connector per card that has a parent card.
    expect(container.querySelectorAll('.crewlet-tree-canvas__links path')).toHaveLength(4);
  });
});

describe('keys', () => {
  test('arrows walk the visible order, Right and Left open, close and climb, Home and End jump', () => {
    const onSelect = vi.fn();
    mount({ onSelect });
    item('Acme').focus();
    press('ArrowDown');
    expect(focused()).toBe('seat:ceo');
    press('ArrowDown');
    expect(focused()).toBe('unit:eng');
    press('ArrowLeft');
    expect(item('Engineering').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryAllByText('Dev')).toHaveLength(0);
    press('ArrowDown');
    expect(focused()).toBe('unit:sales');
    press('ArrowUp');
    press('ArrowRight');
    expect(item('Engineering').getAttribute('aria-expanded')).toBe('true');
    press('ArrowRight');
    expect(focused()).toBe('seat:vp');
    press('ArrowLeft');
    expect(focused()).toBe('unit:eng');
    press('End');
    expect(focused()).toBe('seat:ae');
    press('Home');
    expect(focused()).toBe(COMPANY);
    // Selection follows focus.
    expect(onSelect).toHaveBeenLastCalledWith(COMPANY);
    // The roving stop moved with it.
    expect(item('Acme').tabIndex).toBe(0);
    expect(item('CEO').tabIndex).toBe(-1);
  });

  test('typing finds a node by name, and a zoom key never starts a word', () => {
    mount();
    item('Acme').focus();
    press('p');
    expect(focused()).toBe('unit:platform');
    press('0');
    expect(focused()).toBe('unit:platform');
  });

  test('the item keys reach the caller, and a node that refuses one leaves the key alone', () => {
    const onNodeKey = vi.fn((id: string) => id !== COMPANY);
    mount({ onNodeKey });
    item('Dev').focus();
    press('Enter');
    expect(onNodeKey).toHaveBeenLastCalledWith('seat:dev', 'activate');
    press('Delete');
    press('Backspace');
    expect(onNodeKey.mock.calls.slice(-2)).toEqual([
      ['seat:dev', 'remove'],
      ['seat:dev', 'remove'],
    ]);

    // A node that answers false is one the key did nothing on, and the key was
    // not swallowed on its way back out.
    item('Acme').focus();
    expect(fireEvent.keyDown(document.activeElement!, { key: 'Delete' })).toBe(true);

    // A chord is the application's, never the node's, and Shift turns neither
    // Enter nor Delete into the node's action.
    onNodeKey.mockClear();
    item('Dev').focus();
    press('Backspace', { metaKey: true });
    press('Delete', { shiftKey: true });
    press('Enter', { shiftKey: true });
    expect(onNodeKey).not.toHaveBeenCalled();
  });

  test('the ContextMenu key and Shift+F10 open the node menu in the layer, and Escape returns', () => {
    const { container } = mount();
    const dev = item('Dev');
    dev.focus();
    press('ContextMenu');
    const menu = screen.getByRole('menu', { name: 'Actions for Dev' });
    expect(container.querySelector('.crewlet-layer-host')!.contains(menu)).toBe(true);
    press('Escape');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(dev);

    press('F10', { shiftKey: true });
    expect(screen.getByRole('menu', { name: 'Actions for Dev' })).toBeDefined();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(document.activeElement).toBe(dev);
  });
});

describe('focus', () => {
  test('focusing a node inside a collapsed card opens it and never scrolls', () => {
    const { handle } = mount();
    item('Engineering').focus();
    press('ArrowLeft');
    expect(screen.queryAllByText('Dev')).toHaveLength(0);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    act(() => handle.current!.focusNode('seat:dev'));
    LayoutObserver.settle();
    expect(focused()).toBe('seat:dev');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  test('a focus request for a node the last render added is taken once it is laid out', () => {
    const { handle, rerender } = mount();
    rerender({ extra: [ADVISOR] });
    act(() => handle.current!.focusNode(ADVISOR));
    LayoutObserver.settle();
    expect(focused()).toBe(ADVISOR);
  });

  /*
   * A new card is drawn hidden until a commit after layout places it, and a
   * browser refuses focus inside it, so the request waits until it is drawn.
   */
  test('a focus request made before a new card is measured lands once the card is drawn', () => {
    const view = mount();
    item('Engineering').focus();
    view.rerenderUnmeasured({ extra: [ADVISOR] });
    act(() => view.handle.current!.focusNode(ADVISOR));
    LayoutObserver.settle();
    expect(focused()).toBe(ADVISOR);
  });

  test('a relayout keeps the node the operator acted on where it was on screen', () => {
    const { container, rerender } = mount();
    const translate = (el: HTMLElement) => {
      const [, x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(el.style.transform)!;
      return { x: Number(x), y: Number(y) };
    };
    const place = (name: string) => {
      const world = translate(container.querySelector<HTMLElement>('.crewlet-canvas__world')!);
      const box = translate(cardBox(name));
      return { world: box, screen: { x: world.x + box.x, y: world.y + box.y } };
    };
    const before = place('Acme');

    // A seat added at the root widens the row beneath the company, so the
    // company card moves in the world. The new seat had no place before the
    // relayout, so the card that holds it, the company, is kept still.
    rerender({ extra: [ADVISOR], anchorNode: ADVISOR });
    const after = place('Acme');
    expect(after.world).not.toEqual(before.world);
    expect(after.screen).toEqual(before.screen);
  });

  test('collapse all keeps the tops open, and expand all opens everything', () => {
    const { handle } = mount();
    act(() => handle.current!.collapseAll());
    expect(item('Acme').getAttribute('aria-expanded')).toBe('true');
    expect(item('Engineering').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryAllByText('Dev')).toHaveLength(0);
    act(() => handle.current!.expandAll());
    expect(item('Platform').getAttribute('aria-expanded')).toBe('true');
    expect(item('SRE')).toBeDefined();
  });
});

describe('live state', () => {
  test('a push that changes a word inside a card never changes the layout', () => {
    const { rerender, container } = mount();
    const layout = () => ({
      cards: [...container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__card')].map((card) => [
        card,
        card.style.transform,
      ]),
      world: container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform,
      links: container.querySelector('.crewlet-tree-canvas__links')!.innerHTML,
    });
    const before = layout();
    expect(within(item('Dev')).getByText('offline')).toBeDefined();

    rerender({ state: { 'seat:dev': 'working' } });
    expect(within(item('Dev')).getByText('working')).toBeDefined();
    // The same card elements, at the same places, under the same view.
    expect(layout()).toEqual(before);
  });
});


/*
 * A person's seat is told by its badge's outline, never the card's edge, so
 * every card takes the same edge; the only dashed card is the ghost of a node
 * being added.
 */
test("every node's card takes the same edge, and the only dashed card is the ghost", () => {
  // @ts-expect-error a card's edge is not the caller's to choose
  void (<TreeCanvas label="Chart" nodes={forestOf([])} cards={cards} cardOf={cardOf} renderCard={renderCardWith({})} cardOutline={() => true} />);

  const { container } = render(
    <TreeCanvas
      label="Structure chart"
      nodes={forestOf([])}
      cards={cards}
      cardOf={cardOf}
      renderCard={renderCardWith({})}
    />,
  );
  LayoutObserver.settle();
  const drawn = [...container.querySelectorAll('.crewlet-tree-canvas__card')];
  expect(drawn.length).toBeGreaterThan(1);
  for (const card of drawn) expect(card.className).toBe('crewlet-tree-canvas__card');

  // And nothing in the stylesheet draws a dashed edge on a CARD but the
  // ghost: every rule declaring one is the composing card's, or the unit box
  // round several cards, which is not a card and is dashed to say so.
  const rules = [...SHEET.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const dashed = rules.filter(([, , body]) => /\bdashed\b/.test(body!)).map(([, selector]) => selector!.trim());
  expect(dashed.filter((selector) => selector.includes('crewlet-tree-canvas__card--composing')).length).toBeGreaterThan(0);
  for (const selector of dashed) {
    expect(selector === '.crewlet-tree-canvas__group' || selector.includes('crewlet-tree-canvas__card--composing'), selector).toBe(true);
  }
});

/*
 * ───────────────────────────────────────────────────────────────────────────
 * The pointer's controls: the props here, the reveal rules at the file's end.
 * ───────────────────────────────────────────────────────────────────────────
 */

describe('the pointer-only controls', () => {
  test('the actions strip is the chart’s own element, hidden from assistive technology', () => {
    const { container } = mount();
    const strips = [...container.querySelectorAll('.crewlet-tree-canvas__actions')];
    expect(strips.length).toBeGreaterThan(0);
    for (const strip of strips) expect(strip.getAttribute('aria-hidden')).toBe('true');
    // Every button the chart draws sits in one of the two quiet strips, never
    // over a name at rest (the canvas's zoom controls are outside the tree).
    for (const button of screen.getByRole('tree').querySelectorAll('button')) {
      expect(button.closest('.crewlet-tree-canvas__actions, .crewlet-tree-canvas__under')).not.toBeNull();
    }
  });

  /*
   * The reveal rule is keyed on sibling order, so a strip must be its
   * treeitem's next sibling. jsdom applies no stylesheet, so this asserts the
   * shape the rule needs rather than its effect.
   */
  test('a strip is drawn immediately after the node it belongs to', () => {
    mount();
    const head = item('Acme');
    expect(head.nextElementSibling?.className).toBe('crewlet-tree-canvas__actions');
  });

  test('a menu opened from a strip marks it, so the strip outlives its own hover', () => {
    const { container } = mount();
    const strip = () => container.querySelector('.crewlet-tree-canvas__actions')!;
    expect(strip().getAttribute('data-menu-open')).toBeNull();
    pointerPress('Actions for Acme');
    expect(strip().getAttribute('data-menu-open')).toBe('true');
    press('Escape');
    expect(strip().getAttribute('data-menu-open')).toBeNull();
  });

  /*
   * The strip's OWN press, not one of its buttons': a press that lands on the
   * padding between two controls still belongs to the node, so the arrows carry
   * on from the card the operator pressed rather than from wherever they were.
   */
  test('a press on the strip itself lands on the node', () => {
    mount();
    item('Acme').focus();
    expect(focused()).toBe(COMPANY);
    const strip = cardBox('Engineering').querySelector('.crewlet-tree-canvas__actions')!;
    fireEvent.mouseDown(strip);
    expect(focused()).toBe('unit:eng');
  });
});

describe('what hangs under a card', () => {
  test('it is drawn inside the card the layout measures, under everything else', () => {
    const { container } = mount();
    const card = cardBox('Engineering');
    const under = card.querySelector('.crewlet-tree-canvas__under')!;
    expect(under).not.toBeNull();
    // A direct child of the card, and the last of them: the layout's height
    // includes it, so a connector already leaves from below it.
    expect(under.parentElement).toBe(card);
    expect(card.lastElementChild).toBe(under);
    expect(under.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.crewlet-tree-canvas__under').length).toBeGreaterThan(0);
  });

  /*
   * A CARD WHOSE CALLER DRAWS NOTHING RESERVES NOTHING. Drawn unconditionally,
   * every leaf would carry an empty band and the ranks would stand a strip
   * apart for a control none of them has.
   */
  test('a card its caller gives nothing draws no band at all', () => {
    mount();
    expect(cardBox('CEO').querySelector('.crewlet-tree-canvas__under')).toBeNull();
    expect(cardBox('Acme').querySelector('.crewlet-tree-canvas__under')).not.toBeNull();
  });

  test('a press in it lands on the card’s node and reaches the control', () => {
    mount();
    item('Acme').focus();
    added.length = 0;
    pointerPress('Add to Engineering');
    expect(added).toEqual(['unit:eng']);
    // The press moved focus to the node rather than leaving it on a button
    // inside a subtree hidden from assistive technology.
    expect(focused()).toBe('unit:eng');
  });
});

/*
 * ───────────────────────────────────────────────────────────────────────────
 * The reveal rules, read off the stylesheet, since jsdom applies none of it.
 * ───────────────────────────────────────────────────────────────────────────
 */

/*
 * A tone reaches five things: the card's fill, its edge, its name's ink, its
 * mark's accent and the branch that arrives at it.
 */
describe('a toned node', () => {
  const tone = (id: string) => (kindOf(id) === 'seat' ? ('purple' as const) : undefined);
  const card = (name: string) => item(name).closest('.crewlet-tree-canvas__card')!;

  test('the card carries its tone and an untoned card carries none', () => {
    mount({ cardTone: tone });
    expect(card('CEO').getAttribute('data-tone')).toBe('purple');
    expect(card('Engineering').getAttribute('data-tone')).toBeNull();
  });

  test('the branch into a toned card carries the same tone', () => {
    const { container } = mount({ cardTone: tone });
    const links = [...container.querySelectorAll('.crewlet-tree-canvas__links path')];
    expect(links.length).toBeGreaterThan(1);
    // Every branch is either toned with its child's tone or neutral, and the
    // one arriving at a seat card is the toned one.
    expect(links.some((path) => path.getAttribute('data-tone') === 'purple')).toBe(true);
    expect(links.some((path) => path.getAttribute('data-tone') === null)).toBe(true);
  });

  test('with no tone answered at all, no card and no branch carries one', () => {
    const { container } = mount();
    expect(container.querySelector('[data-tone]')).toBeNull();
  });

  /*
   * Every hue name needs a stylesheet rule giving its four steps: a name with
   * no rule draws a card with no fill, which the type cannot catch.
   */
  test('every tone the type offers has its four steps and its branch', () => {
    for (const hue of NODE_HUES) {
      const card = rule(`.crewlet-tree-canvas__card[data-tone='${hue}']`);
      // Matched rather than compared, because the package's own variable check
      // reads this file for token names too and would take a written-out one
      // here for a component declaring a token.
      const step = (name: string) =>
        new RegExp(`--crewlet-tree-canvas-card-${name}:\\s*var\\(--[\\w-]*${hue}[\\w-]*\\)`);
      for (const name of ['fill', 'line', 'ink', 'accent']) {
        expect(card, `${hue} ${name}`).toMatch(step(name));
      }
      expect(rule(`.crewlet-tree-canvas__links path[data-tone='${hue}']`)).toMatch(
        new RegExp(`stroke:\\s*var\\(--[\\w-]*${hue}-line\\)`),
      );
    }
  });

  /*
   * A TINT ON A TRANSLUCENT SURFACE IS A TINT OVER WHATEVER IS BEHIND IT, and
   * what is behind a card is the branches of the rank above, drawn under it.
   */
  test('a toned card lays its tint over the page rather than over the branches', () => {
    const toned = rule('.crewlet-tree-canvas__card[data-tone]');
    expect(toned).toContain('background-color: var(--color-surface-background)');
    expect(toned).toContain('linear-gradient');
  });
});

/*
 * THE `node` APPEARANCE is the console org chart's own drawing, and what is
 * asserted here is the part a browser is not needed for: that asking for it
 * reaches the element every rule in the stylesheet is written against.
 */
describe('the node appearance', () => {
  test('the chart says which appearance it is drawn in', () => {
    const { container } = mount({ appearance: 'node' });
    expect(container.querySelector('.crewlet-tree-canvas--node')).not.toBeNull();
  });

  test('a chart that asks for nothing is drawn as cards', () => {
    const { container } = mount();
    expect(container.querySelector('.crewlet-tree-canvas--node')).toBeNull();
  });

  /* Everything the `node` appearance changes, changed against the element the
     component actually draws. A rule written against a class nothing carries is
     a rule that silently does nothing. */
  test('its rules are written against the classes the component draws', () => {
    const { container } = mount({ appearance: 'node' });
    for (const selector of [
      '.crewlet-tree-canvas__card',
      '.crewlet-tree-canvas__actions',
      '.crewlet-tree-canvas__under',
      '.crewlet-tree-canvas__links path',
    ]) {
      expect(rule(`.crewlet-tree-canvas--node ${selector}`), selector).not.toBe('');
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
  });

  /*
   * The branches are drawn under the cards, so every card, toned or not, is
   * painted over the page ground to hide the connectors behind its face.
   */
  test('a node is painted over the page ground, with or without a tone', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    const { container } = mount({ appearance: 'node' });
    const card = getComputedStyle(container.querySelector('.crewlet-tree-canvas__card')!);
    const rgb = (hex: string) => {
      const one = parseHex(hex)!;
      return `rgb(${one.r}, ${one.g}, ${one.b})`;
    };
    expect(card.backgroundColor).toBe(rgb(themes.dark.color.surface.background));
    // The tint over it is the card's own variable, which a toned node rebinds
    // and a neutral one leaves at the card step: the cascade reports the
    // winning declaration with its fallback, which is that step's own value.
    expect(card.backgroundImage).toContain('--crewlet-tree-canvas-card-fill');
    expect(card.backgroundImage).toContain(themes.dark.color.surface.subtle);
    uninstall();
  });

  /*
   * Each cell of the actions column is a 24 by 24 target at every density, and
   * its edge hairline is a shadow, since a border would narrow every control.
   * jsdom has no layout, so the declarations are read from the stylesheet.
   */
  test('a control in the column is a pointer target at every density', () => {
    const item = rule(`.crewlet-tree-canvas--node .crewlet-tree-canvas__card [role='treeitem']`);
    expect(item).toContain('min-height: max(var(--size-row-lg), calc(2 * var(--size-target-min)))');
    const strip = rule('.crewlet-tree-canvas--node .crewlet-tree-canvas__actions');
    expect(strip).toContain('width: max(var(--size-control-sm), var(--size-target-min))');
    expect(rule('.crewlet-tree-canvas--node .crewlet-tree-canvas__actions > *')).toContain(
      'min-height: var(--size-target-min)',
    );
  });

  /*
   * The hairlines inside a node are inset from its edges, and drawn outside the
   * column's box so they take no width from the cells.
   */
  test('the hairlines inside a node are inset, and take no width from the cells', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    const { container } = mount({ appearance: 'node' });
    const strip = container.querySelector('.crewlet-tree-canvas--node .crewlet-tree-canvas__actions');
    expect(strip).not.toBeNull();
    expect(getComputedStyle(strip!).boxShadow).not.toContain('-1px');
    expect(getComputedStyle(strip!).borderLeftStyle).not.toBe('solid');
    const column = rule('.crewlet-tree-canvas--node .crewlet-tree-canvas__actions::before');
    expect(column).toContain('top: var(--spacing-1)');
    expect(column).toContain('bottom: var(--spacing-1)');
    // Outside the box, on the boundary: the cells keep the whole width.
    expect(column).toContain('left: -1px');
    const divider = rule('.crewlet-tree-canvas--node .crewlet-tree-canvas__actions > * + *::before');
    expect(divider).toContain('left: var(--spacing-1)');
    expect(divider).toContain('right: var(--spacing-1)');
    uninstall();
  });

  /*
   * A KEY THE CALLER CLAIMS, asked first and swallowed when it is taken. Alt
   * with an arrow moves a node among the siblings it is drawn beside, which is
   * the same key the grid of rows binds: two views of one hierarchy, one key.
   */
  test('a key the caller claims on a node is asked first and swallowed', () => {
    const claimed: string[] = [];
    const { container } = render(
      <TreeCanvas
        label="Structure chart"
        nodes={forestOf([])}
        cards={cards}
        cardOf={cardOf}
        renderCard={renderCardWith({})}
        onNodeKeyDown={(id, event) => {
          if (!event.altKey || event.key !== 'ArrowUp') return false;
          claimed.push(id);
          return true;
        }}
      />,
    );
    LayoutObserver.settle();
    const node = within(container).getAllByRole('treeitem')[0]!;
    node.focus();
    fireEvent.keyDown(node, { key: 'ArrowUp', altKey: true });
    expect(claimed).toHaveLength(1);
    // And the tree still has the key when the caller does not take it.
    fireEvent.keyDown(node, { key: 'ArrowDown' });
    expect(claimed).toHaveLength(1);
  });

  test('the tree pattern is the same one, whatever the node is drawn like', () => {
    mount({ appearance: 'node' });
    const company = item('Acme');
    expect(company.getAttribute('role')).toBe('treeitem');
    expect(company.getAttribute('aria-level')).toBe('1');
    expect(company.getAttribute('aria-expanded')).toBe('true');
  });
});

/*
 * The shape a caller asks for reaches `layoutConnectors`; each shape's
 * arithmetic is the layout suite's.
 */
describe('the connector shape', () => {
  const paths = (container: HTMLElement) =>
    [...container.querySelectorAll('.crewlet-tree-canvas__links path')].map(
      (path) => path.getAttribute('d') ?? '',
    );

  test('a chart that asks for nothing draws the elbow: vertical, horizontal and round corners only', () => {
    const { container } = mount();
    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    // Every command is a move, a vertical, a horizontal or a corner: no
    // diagonal line, no quadratic and no cubic.
    expect(drawn.every((d) => /^M[^A-Z]+(?:[VHA][^A-Z]+)+$/.test(d))).toBe(true);
    expect(drawn.some((d) => d.includes('A'))).toBe(true);
  });

  test('a chart that asks for the straight shape draws one segment per branch', () => {
    const { container } = mount({ connector: 'straight' });
    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((d) => /^M[^A-Z]+L[^A-Z]+$/.test(d))).toBe(true);
  });

  test('a chart that asks for the step draws its quadratic corners', () => {
    const { container } = mount({ connector: 'step' });
    expect(paths(container).some((d) => d.includes('Q'))).toBe(true);
  });

  test('a chart that asks for the curve draws one cubic per branch', () => {
    const { container } = mount({ connector: 'curve' });
    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((d) => /^M [\d.-]+ [\d.-]+ C [^A-Z]+$/.test(d))).toBe(true);
  });

  /*
   * A path carries only its geometry, so a theme reaches its colour: every
   * connector stroke is a sheet colour token (the neutral one held to 3:1).
   */
  test('the connector colour is a token from the stylesheet, never a literal', () => {
    const { container } = mount();
    for (const path of container.querySelectorAll('.crewlet-tree-canvas__links path')) {
      for (const attribute of ['stroke', 'fill', 'style', 'stroke-width']) {
        expect(path.hasAttribute(attribute), attribute).toBe(false);
      }
    }
    const strokes = [...SHEET.matchAll(/crewlet-tree-canvas__links path[^{]*\{([^}]*)\}/g)]
      .flatMap((found) => [...found[1]!.matchAll(/(?:^|;|\s)stroke:\s*([^;]+);/g)].map((one) => one[1]!.trim()));
    expect(strokes.length).toBeGreaterThan(0);
    for (const stroke of strokes) expect(stroke).toMatch(/^var\(--color-[a-z0-9-]+\)$/);
    expect(rule('.crewlet-tree-canvas__links path')).toContain('stroke: var(--color-border-control)');
    expect(rule('.crewlet-tree-canvas__links path')).toContain('stroke-width: 1.5');
  });
});

/*
 * Groups: a box round a run of sibling cards, labelled along its top. It stands
 * where the layout made room, travels with its members, and is told to a tree
 * reader as each member's description while the drawing is hidden.
 */
describe('groups', () => {
  const UNITS: TreeCanvasGroup[] = [
    {
      id: 'units',
      label: 'Engineering · Core',
      lead: <span className="key">ENG</span>,
      memberIds: ['unit:eng', 'unit:sales'],
    },
  ];
  const box = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-tree-canvas__group')!;
  const head = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-tree-canvas__group-head')!;
  const heightOf = (card: HTMLElement) => Math.max(1, card.querySelectorAll("[role='treeitem']").length) * ROW_HEIGHT;

  test("the box is drawn round exactly its members' cards, plus the padding and header it measured", () => {
    const { container } = mount({ groups: UNITS });
    const members = [cardBox('Engineering'), cardBox('Sales')];
    const left = Math.min(...members.map((one) => translateOf(one).x));
    const top = Math.min(...members.map((one) => translateOf(one).y));
    const right = Math.max(...members.map((one) => translateOf(one).x + CARD_WIDTH));
    const bottom = Math.max(...members.map((one) => translateOf(one).y + heightOf(one)));
    const drawn = box(container);
    expect(translateOf(drawn)).toEqual({ x: left - GROUP_PAD.width, y: top - GROUP_HEAD });
    expect(drawn.style.width).toBe(`${right - left + 2 * GROUP_PAD.width}px`);
    expect(drawn.style.height).toBe(`${bottom - top + GROUP_HEAD + GROUP_PAD.height}px`);
    // The label's line is the box's top edge, as wide as the box.
    expect(translateOf(head(container))).toEqual(translateOf(drawn));
    expect(head(container).style.width).toBe(drawn.style.width);
  });

  /*
   * A CARD OUTSIDE THE BOX IS NEVER DRAWN IN IT, and it is the layout that
   * keeps it out: the CEO is the members' own sibling, immediately left of
   * the run, and is held a gap clear of the BOX's edge rather than the card's.
   */
  test("a card outside the box is kept a gap clear of the box, not of the member's card", () => {
    const { container } = mount({ groups: UNITS });
    const drawn = box(container);
    const ceo = translateOf(cardBox('CEO'));
    expect(translateOf(drawn).x - (ceo.x + CARD_WIDTH)).toBe(24);
  });

  test("the label is the group's, with its key chip AHEAD of it, as the org chart reads it", () => {
    const { container } = mount({ groups: UNITS });
    const line = head(container);
    expect(line.querySelector('.crewlet-tree-canvas__group-label')!.textContent).toBe('Engineering · Core');
    expect(line.firstElementChild!.className).toBe('crewlet-tree-canvas__group-lead');
    expect(line.firstElementChild!.textContent).toBe('ENG');
    expect(line.lastElementChild!.className).toBe('crewlet-tree-canvas__group-label');
    // Nothing pushes the key to the far end of the line any more.
    expect(/\.crewlet-tree-canvas__group-lead\s*\{([^}]*)\}/.exec(SHEET)?.[1]).not.toContain('margin-inline-start: auto');
  });



  test('the drawing is hidden, and each member card is described by what the box says', () => {
    const { container } = mount({ groups: UNITS });
    expect(box(container).getAttribute('aria-hidden')).toBe('true');
    expect(head(container).getAttribute('aria-hidden')).toBe('true');
    const described = item('Engineering').getAttribute('aria-describedby');
    expect(described).toBe(head(container).id);
    expect(document.getElementById(described!)!.textContent).toBe('ENG Engineering · Core');
    expect(item('Sales').getAttribute('aria-describedby')).toBe(described);
    // A node that is not a member, and a ROW inside a member card, say nothing.
    expect(item('CEO').hasAttribute('aria-describedby')).toBe(false);
    expect(item('Dev').hasAttribute('aria-describedby')).toBe(false);
    // Neither is inside the tree, so the tree still holds only its items.
    expect(screen.getByRole('tree').contains(box(container))).toBe(false);
    expectNothingFocusableInAnItem();
  });

  test('a group whose members are not drawn is not drawn, and one drawn in part encloses what is', () => {
    const { container, rerender } = mount({
      groups: [
        { id: 'platform', label: 'Platform', memberIds: ['unit:platform'] },
        { id: 'units', label: 'Units', memberIds: ['unit:eng', 'unit:sales'] },
      ],
    });
    expect(container.querySelectorAll('.crewlet-tree-canvas__group')).toHaveLength(2);
    pointerPress('Collapse Engineering');
    const drawn = [...container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__group')];
    expect(drawn.map((one) => one.getAttribute('data-group-id'))).toEqual(['units']);
    // No label is left behind for the box that went.
    expect(container.querySelectorAll('.crewlet-tree-canvas__group-head')).toHaveLength(1);
    rerender({ groups: [] });
    expect(container.querySelector('.crewlet-tree-canvas__group')).toBeNull();
    expect(container.querySelector('.crewlet-tree-canvas__group-pad')).toBeNull();
  });

  /*
   * THE BRANCH INTO A MEMBER RUNS ACROSS ABOVE THE BOX, halfway through the
   * space between the parent and the box's top: a run at the plain midpoint of
   * the gap would pass through the label.
   */
  test("the run into the box's members is drawn above the box", () => {
    const { container } = mount({ groups: UNITS });
    const top = translateOf(box(container)).y;
    const company = translateOf(cardBox('Acme'));
    const runs = [...container.querySelectorAll('.crewlet-tree-canvas__links path')]
      .map((path) => /A[\d.]+ [\d.]+ 0 0 [01] -?[\d.]+ (-?[\d.]+)H/.exec(path.getAttribute('d') ?? ''))
      .filter((found) => found !== null)
      .map((found) => Number(found[1]));
    expect(runs.length).toBeGreaterThan(0);
    expect(runs).toContain((company.y + ROW_HEIGHT + top) / 2);
    for (const y of runs) expect(y).toBeLessThanOrEqual(top);
  });

  test('a box and its label are painted in tokens: the card rung, a dashed strong edge and the tertiary ink at 12px', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    const { container } = mount({ groups: UNITS });
    const rgb = (hex: string) => {
      const one = parseHex(hex)!;
      return `rgb(${one.r}, ${one.g}, ${one.b})`;
    };
    const drawn = getComputedStyle(box(container));
    expect(drawn.backgroundColor).toBe(rgb(themes.dark.color.surface.subtle));
    // DASHED, as the org chart draws a unit: a box round cards drawn solid
    // read as one more card. In the strong step, since a dash is half gaps.
    expect(drawn.borderTopStyle).toBe('dashed');
    expect(drawn.borderTopColor).toBe(rgb(themes.dark.color.border.strong));
    expect(drawn.borderTopWidth).toBe('1px');
    const line = getComputedStyle(head(container));
    expect(line.color).toBe(rgb(themes.dark.color.text.tertiary));
    expect(line.fontSize).toBe('12px');
    expect(line.whiteSpace).toBe('nowrap');
    // The words stand on the box's own fill, over the branches.
    const label = getComputedStyle(head(container).querySelector('.crewlet-tree-canvas__group-label')!);
    expect(label.backgroundColor).toBe(rgb(themes.dark.color.surface.subtle));
    uninstall();
  });

  test('the labels are drawn over the branches and the boxes under them', () => {
    const { container } = mount({ groups: UNITS });
    const world = [...box(container).parentElement!.children];
    const at = (el: Element) => world.indexOf(el);
    const links = container.querySelector('.crewlet-tree-canvas__links')!;
    expect(at(box(container))).toBeLessThan(at(links));
    expect(at(head(container))).toBeGreaterThan(at(links));
    expect(at(head(container))).toBeLessThan(at(screen.getByRole('tree')));
  });

  test('the chart with its groups carries no axe violation', async () => {
    const { container } = mount({ groups: UNITS });
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'TreeCanvas.css'), 'utf8');

/** The declarations of the rule `selector` opens, without its comments. */
function rule(selector: string): string {
  const at = SHEET.indexOf(`${selector} {`);
  if (at < 0) return '';
  return SHEET.slice(at, SHEET.indexOf('}', at));
}

describe('the stylesheet', () => {
  test('the card is one column, so a name is measured against the whole of it', () => {
    const card = rule('.crewlet-tree-canvas__card');
    expect(card).toContain('flex-direction: column');
    // The two-column grid is what truncated every name in the chart to fit
    // beside three buttons nobody was pointing at.
    expect(card).not.toContain('grid-template-columns');
  });

  /*
   * One line round one card: no halo, breathing or selection ring is drawn
   * beside a card's own boundary.
   */
  test('no card draws a ring beside its own boundary', () => {
    expect(SHEET).not.toContain('.crewlet-tree-canvas__card[data-tone]::after');
    expect(SHEET).not.toContain('.crewlet-tree-canvas__card--composing::after');
    expect(SHEET).not.toMatch(/--crewlet-tree-canvas-card-halo/);
  });

  test("a selected card's own node is the card's boundary in the accent", () => {
    expect(rule(".crewlet-tree-canvas__card:has(> [role='treeitem'][aria-selected='true'])")).toContain(
      'border-color: var(--color-brand-accent)',
    );
    expect(rule(".crewlet-tree-canvas__card > [role='treeitem'][aria-selected='true']")).toContain(
      'box-shadow: none',
    );
  });

  /*
   * THE RING IS THE CARD'S, OVER ITS BOUNDARY. On the treeitem it stopped
   * short of whatever the card holds under the node (a unit's lead), and stood
   * a line inside the card's own edge.
   */
  test("a focused card's own node rings the whole card, over its boundary", () => {
    const ring = rule(".crewlet-tree-canvas__card:has(> [role='treeitem']:focus-visible)");
    expect(ring).toContain('outline: 2px solid var(--color-focus)');
    expect(ring).toContain('outline-offset: var(--size-focus-ring-inset-offset)');
    // The card's own node never rings itself, in any state; a row inside a
    // card (something between the two) still does.
    expect(rule(".crewlet-tree-canvas__card > [role='treeitem']")).toContain('outline: none');
    expect(SHEET).toContain(".crewlet-tree-canvas__card * [role='treeitem']:focus-visible,");
  });

  /* The ghost waits by its own boundary, which breathes, rather than by a ring. */
  test("the ghost's boundary is what breathes", () => {
    const pulse = SHEET.slice(SHEET.indexOf('@keyframes crewlet-tree-canvas-ghost-pulse'));
    expect(pulse.slice(0, pulse.indexOf('\n}\n'))).toContain('border-color');
    expect(rule('.crewlet-tree-canvas .crewlet-tree-canvas__card--composing')).toContain(
      'crewlet-tree-canvas-ghost-pulse',
    );
  });

  /*
   * A card is placed by its transform alone, so it stays `position: absolute`
   * (in flow, each card lands below the ones before it). jsdom computes no
   * position, so the declaration is read.
   */
  test('a card is placed by its transform, not by the cards before it', () => {
    expect(rule('.crewlet-tree-canvas__card')).toContain('position: absolute');
    expect(rule('.crewlet-tree-canvas__card')).not.toContain('position: relative');
  });

  /*
   * A caller's component that renders nothing is still an element, so the
   * `:empty` rule collapses the band the slot contract cannot catch.
   */
  test('a band with nothing in it takes no room', () => {
    expect(rule('.crewlet-tree-canvas__under:empty')).toContain('display: none');
  });

  test('the quiet controls are inert as well as invisible', () => {
    for (const selector of ['.crewlet-tree-canvas__actions', '.crewlet-tree-canvas__under']) {
      const quiet = rule(selector);
      expect(quiet).toContain('opacity: 0');
      // A button at zero opacity that still takes the press is a control that
      // acts on a card the reader has not reached.
      expect(quiet).toContain('pointer-events: none');
    }
  });

  /*
   * A row's strip hangs off its row, not the card's corner, so the rule makes
   * the caller's element that holds a strip its containing block.
   */
  test('whatever holds a strip is made its containing block', () => {
    expect(rule('.crewlet-tree-canvas__card :has(> .crewlet-tree-canvas__actions)')).toContain(
      'position: relative',
    );
  });

  test('the strip covers what it is drawn over rather than sitting through it', () => {
    const strip = rule('.crewlet-tree-canvas__actions');
    expect(strip).toContain('position: absolute');
    expect(strip).toContain('background: var(--color-surface-subtle)');
  });

  /*
   * Revealed by hover, focus, selection, and while its menu is open (focus is
   * then portalled out of the card). A card's strip appears with the card, a
   * row's with its row.
   */
  test('every way a reader reaches a node reveals its controls', () => {
    const reveal = rule(
      '.crewlet-tree-canvas__card:hover > .crewlet-tree-canvas__actions,\n' +
        '.crewlet-tree-canvas__card:focus-within > .crewlet-tree-canvas__actions,\n' +
        ".crewlet-tree-canvas__card:has([aria-selected='true']) > .crewlet-tree-canvas__actions,\n" +
        ".crewlet-tree-canvas__card [role='treeitem']:hover + .crewlet-tree-canvas__actions,\n" +
        ".crewlet-tree-canvas__card [role='treeitem']:focus-visible + .crewlet-tree-canvas__actions,\n" +
        ".crewlet-tree-canvas__card [role='treeitem'][aria-selected='true'] + .crewlet-tree-canvas__actions,\n" +
        '.crewlet-tree-canvas__actions:hover,\n' +
        '.crewlet-tree-canvas__actions:focus-within,\n' +
        ".crewlet-tree-canvas__actions[data-menu-open='true'],\n" +
        ".crewlet-tree-canvas__actions:has([aria-expanded='true'])",
    );
    expect(reveal).toContain('opacity: 1');
    expect(reveal).toContain('pointer-events: auto');
  });

  test('a reveal is a state change, so reduced motion simply has it happen', () => {
    /*
     * Put to the cascade rather than read off the block, so a rule that loses
     * on source order is caught. Every control the chart reveals is measured.
     */
    const { container } = render(
      <TreeCanvas
        label="Structure chart"
        nodes={forestOf([])}
        cards={cards}
        cardOf={cardOf}
        appearance="node"
        renderCard={(id, card) => (
          <div className="card">
            <div {...card.item(id)} className="head">
              <span className="name">{nameOf(id)}</span>
            </div>
            <Actions id={id} card={card}>
              <More id={id} card={card} />
            </Actions>
            <OrgNodeDisclosure>
              <button type="button" tabIndex={-1} aria-label={`Collapse ${nameOf(id)}`} />
            </OrgNodeDisclosure>
            <OrgNodeLead clear={<button type="button" tabIndex={-1} aria-label={`Clear the lead of ${nameOf(id)}`} />}>
              Lead
            </OrgNodeLead>
          </div>
        )}
        renderUnder={renderUnder}
      />,
    );
    LayoutObserver.settle();
    const revealed = [
      ...container.querySelectorAll('.crewlet-tree-canvas__actions, .crewlet-tree-canvas__under'),
      ...container.querySelectorAll('.crewlet-tree-canvas__under > :not(.crewlet-add-pill)'),
      ...container.querySelectorAll('.crewlet-org-node__leading, .crewlet-org-node-lead__clear'),
    ];
    const kinds = (selector: string) => revealed.filter((element) => element.matches(selector)).length;
    // Each kind is really on the chart, or the case below passes on nothing.
    for (const selector of [
      '.crewlet-tree-canvas__actions',
      '.crewlet-tree-canvas__under',
      '.crewlet-tree-canvas__under > :not(.crewlet-add-pill)',
      '.crewlet-org-node__leading',
      '.crewlet-org-node-lead__clear',
    ]) {
      expect(kinds(selector), selector).toBeGreaterThan(0);
    }

    let uninstall = installMotion('no-preference', 'TreeCanvas/TreeCanvas.css');
    for (const element of revealed) expect(getComputedStyle(element).transition, element.className).toContain('opacity');
    uninstall();
    uninstall = installMotion('reduce', 'TreeCanvas/TreeCanvas.css');
    for (const element of revealed) expect(getComputedStyle(element).transition, element.className).toBe('none');
    uninstall();
  });
});

// ---------------------------------------------------------------------------
// Where the ranks sit, and the space around the chart
// ---------------------------------------------------------------------------

/** Where an element the layout placed is drawn. */
function translateOf(el: HTMLElement): { x: number; y: number } {
  const found = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(el.style.transform)!;
  return { x: Number(found[1]), y: Number(found[2]) };
}

/** Every card's drawn position, by the name of the node whose card it is. */
function positions(container: HTMLElement): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  for (const card of container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__card')) {
    const first = card.querySelector<HTMLElement>("[role='treeitem']");
    const name = first?.getAttribute('data-tree-id');
    if (!name || card.style.transform === '') continue;
    out.set(nameOf(name), translateOf(card));
  }
  return out;
}

/** The view the canvas's world is drawn at. */
function worldView(container: HTMLElement): { x: number; y: number; k: number } {
  const world = container.querySelector<HTMLElement>('.crewlet-canvas__world')!;
  const found = /translate\((-?[\d.e+-]+)px, (-?[\d.e+-]+)px\) scale\(([\d.e+-]+)\)/.exec(world.style.transform)!;
  return { x: Number(found[1]), y: Number(found[2]), k: Number(found[3]) };
}

/** Where every node's card is drawn in the viewport, by the node's id: the view applied to its place and its measured size. */
function cardsOnScreen(container: HTMLElement): Map<string, { left: number; top: number; right: number; bottom: number }> {
  const view = worldView(container);
  const out = new Map<string, { left: number; top: number; right: number; bottom: number }>();
  for (const card of container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__card')) {
    const id = card.querySelector<HTMLElement>("[role='treeitem']")?.getAttribute('data-tree-id');
    const size = sizeOf(card);
    if (!id || !size || card.style.transform === '') continue;
    const at = translateOf(card);
    out.set(id, {
      left: view.x + at.x * view.k,
      top: view.y + at.y * view.k,
      right: view.x + (at.x + size.width) * view.k,
      bottom: view.y + (at.y + size.height) * view.k,
    });
  }
  return out;
}

describe('where the ranks sit', () => {
  /*
   * Here a unit holding seats is taller than a seat: on shared ranks both still
   * sit on one line, and on per-parent ranks the seats under the shorter card
   * ride up beside the taller one's.
   */
  /**
   * Engineering's card holds three rows and Sales's holds two, and both hang
   * off the company: they are the two cards of one depth that differ in
   * height, which is the whole of the difference between the two answers.
   */
  const middle = (at: Map<string, { x: number; y: number }>, name: string, rows: number) =>
    at.get(name)!.y + (rows * ROW_HEIGHT) / 2;

  test('a chart of nodes puts every card of a depth on one line', () => {
    const at = positions(mount({ appearance: 'node' }).container);
    expect(middle(at, 'Engineering', 3)).toBe(middle(at, 'Sales', 2));
    expect(at.get('Engineering')!.y).not.toBe(at.get('Sales')!.y);
  });

  test('a chart of cards hangs each card a gap under its own parent', () => {
    const at = positions(mount({ appearance: 'card' }).container);
    // The company's card holds one row; its children start a card and the gap
    // probe's height below it, whatever they are made of.
    expect(at.get('Engineering')!.y).toBe(at.get('Acme')!.y + ROW_HEIGHT + 32);
    expect(at.get('Sales')!.y).toBe(at.get('Engineering')!.y);
    expect(middle(at, 'Engineering', 3)).not.toBe(middle(at, 'Sales', 2));
  });

  test('a caller may ask for either, whatever the appearance', () => {
    const shared = positions(mount({ appearance: 'card', ranks: 'shared' }).container);
    expect(middle(shared, 'Engineering', 3)).toBe(middle(shared, 'Sales', 2));
    cleanup();
    const perParent = positions(mount({ appearance: 'node', ranks: 'per-parent' }).container);
    expect(perParent.get('Engineering')!.y).toBe(perParent.get('Sales')!.y);
  });

  /*
   * THE MARGIN IS A LAYOUT VALUE. The canvas clips, so space drawn as padding
   * on the scroller is space the control under the outermost card is cut off
   * in. It arrives through a probe, like the gaps, so density scales it.
   */
  test('the space around the chart is measured from its own probe', () => {
    MARGIN = 36;
    const { container } = mount();
    expect(container.querySelector('.crewlet-tree-canvas__margin')).not.toBeNull();
    const at = [...positions(container).values()];
    expect(Math.min(...at.map((one) => one.y))).toBe(36);
    expect(Math.min(...at.map((one) => one.x))).toBe(36);
  });

  test('a chart that measures no margin starts at the origin', () => {
    const at = [...positions(mount().container).values()];
    expect(Math.min(...at.map((one) => one.y))).toBe(0);
    expect(Math.min(...at.map((one) => one.x))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The chart arriving, and rearranging
// ---------------------------------------------------------------------------

const entered = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__card')].map((card) =>
    card.getAttribute('data-enter'),
  );

describe('the chart arriving', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('cards are revealed one at a time rather than all at once', () => {
    const { container } = mount();
    expect(entered(container).every((one) => one === 'waiting')).toBe(true);
    act(() => vi.advanceTimersByTime(0));
    expect(entered(container).filter((one) => one === 'shown')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(ENTRANCE_STEP_MS));
    expect(entered(container).filter((one) => one === 'shown')).toHaveLength(2);
  });

  test('a branch waits for the card it arrives at', () => {
    const { container } = mount();
    const links = [...container.querySelectorAll('.crewlet-tree-canvas__links path')];
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((path) => path.getAttribute('data-enter') === 'waiting')).toBe(true);
  });

  test('once the chart is whole nothing carries an entrance any more', () => {
    const { container } = mount();
    act(() => vi.advanceTimersByTime(ENTRANCE_STEP_MS * 60));
    expect(entered(container).every((one) => one === null)).toBe(true);
  });

  test('a reader who asked for less is given the whole chart at once', () => {
    stillness(true);
    const { container } = mount();
    expect(entered(container).every((one) => one === null)).toBe(true);
  });

  test('the order is the order the chart is read in', () => {
    // `a` and `b` are two pixels apart, which is one row, so `a` comes first
    // because it is further left and not because it is higher.
    expect(
      entranceOrder({
        nodes: [
          { id: 'b', x: 100, y: 0, width: 10, height: 10, depth: 0, parent: null },
          { id: 'a', x: 0, y: 2, width: 10, height: 10, depth: 0, parent: null },
          { id: 'c', x: 50, y: 90, width: 10, height: 10, depth: 1, parent: 'a' },
        ],
        byId: new Map(),
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      }),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('the chart rearranging', () => {
  /** A card the added seat moves, with where it was and where it is going. */
  function travelling() {
    const view = mount();
    const before = positions(view.container);
    view.rerenderMoving({ extra: [ADVISOR], anchorNode: ADVISOR });
    // Not one frame has run, so every card is still where it was.
    const at = positions(view.container);
    const name = [...before.keys()].find((one) => at.get(one)!.x === before.get(one)!.x)!;
    return { ...view, before, name };
  }

  test('a card is between its two positions while the relayout is travelling', () => {
    const { container, before, name } = travelling();
    runFrames(performance.now() + REFLOW_MS / 2);
    const half = positions(container).get(name)!.x;
    settleMotion();
    const end = positions(container).get(name)!.x;
    expect(end).not.toBe(before.get(name)!.x);
    expect(half).not.toBe(before.get(name)!.x);
    expect(half).not.toBe(end);
    expect(half).toBeGreaterThan(Math.min(before.get(name)!.x, end));
    expect(half).toBeLessThan(Math.max(before.get(name)!.x, end));
  });

  test('the branches travel with the cards', () => {
    const { container } = travelling();
    const path = () => container.querySelector('.crewlet-tree-canvas__links path')!.getAttribute('d');
    const still = path();
    runFrames(performance.now() + REFLOW_MS / 2);
    expect(path()).not.toBe(still);
  });

  /* A BOX IS DRAWN ROUND WHERE ITS MEMBERS ARE THIS FRAME, not where they are going. */
  test('a group box travels with its members', () => {
    // The company is what an added seat moves: it re-centres over one more
    // child. A run of roots is a run of siblings too.
    const groups: TreeCanvasGroup[] = [{ id: 'company', label: 'Company', memberIds: [COMPANY] }];
    const view = mount({ groups });
    const drawn = () => view.container.querySelector<HTMLElement>('.crewlet-tree-canvas__group')!;
    const was = translateOf(drawn()).x;
    view.rerenderMoving({ groups, extra: [ADVISOR], anchorNode: ADVISOR });
    runFrames(performance.now() + REFLOW_MS / 2);
    const half = translateOf(drawn()).x;
    expect(half).toBe(translateOf(cardBox('Acme')).x - GROUP_PAD.width);
    settleMotion();
    const end = translateOf(drawn()).x;
    expect(end).not.toBe(was);
    expect(half).not.toBe(end);
    expect(half).not.toBe(was);
    expect(end).toBe(translateOf(cardBox('Acme')).x - GROUP_PAD.width);
  });

  test('a reader who asked for less is given the new chart at once', () => {
    stillness(true);
    const { container, rerenderMoving } = mount();
    const before = positions(container);
    rerenderMoving({ extra: [ADVISOR], anchorNode: ADVISOR });
    // Nothing was queued: the cards are at their targets with no frame run.
    expect(frames.filter(Boolean)).toHaveLength(0);
    const after = positions(container);
    expect([...before.keys()].some((name) => after.get(name)!.x !== before.get(name)!.x)).toBe(true);
  });
});

describe('the motion in the stylesheet', () => {
  test('a card waiting its turn is drawn at nothing and is still laid out', () => {
    const waiting = rule(
      ".crewlet-tree-canvas__card[data-enter='waiting'],\n" +
        ".crewlet-tree-canvas__links path[data-enter='waiting'],\n" +
        ".crewlet-tree-canvas__group[data-enter='waiting'],\n" +
        ".crewlet-tree-canvas__group-head[data-enter='waiting']",
    );
    expect(waiting).toContain('opacity: 0');
    expect(waiting).not.toContain('display: none');
  });

  test('reduced motion draws every card at once', () => {
    /*
     * The component starts no reveal under the preference; the stylesheet
     * stops a card already mid-reveal, so the chart is caught mid-reveal and
     * the stops are put to the cascade.
     */
    vi.useFakeTimers();
    try {
      const { container } = mount();
      act(() => vi.advanceTimersByTime(0));
      const cards = [...container.querySelectorAll<HTMLElement>('.crewlet-tree-canvas__card')];
      const shown = cards.filter((card) => card.getAttribute('data-enter') === 'shown');
      const waiting = cards.filter((card) => card.getAttribute('data-enter') === 'waiting');
      expect(shown).toHaveLength(1);
      expect(waiting.length).toBeGreaterThan(0);

      let uninstall = installMotion('no-preference', 'TreeCanvas/TreeCanvas.css');
      expect(getComputedStyle(shown[0]!).animation).toContain('crewlet-tree-canvas-arrive');
      for (const card of waiting) expect(getComputedStyle(card).opacity).toBe('0');
      uninstall();
      uninstall = installMotion('reduce', 'TreeCanvas/TreeCanvas.css');
      expect(getComputedStyle(shown[0]!).animation).toBe('none');
      for (const card of [...shown, ...waiting]) expect(getComputedStyle(card).opacity).toBe('1');
      uninstall();
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * A group arrives with its first member and, like a card, stops arriving for
   * a reader who asked for less motion.
   */
  test('a group waits for its first member, and reduced motion draws it at once', () => {
    vi.useFakeTimers();
    try {
      const { container } = mount({
        groups: [{ id: 'units', label: 'Units', memberIds: ['unit:eng', 'unit:sales'] }],
      });
      const drawing = () =>
        [
          container.querySelector<HTMLElement>('.crewlet-tree-canvas__group')!,
          container.querySelector<HTMLElement>('.crewlet-tree-canvas__group-head')!,
        ] as const;
      act(() => vi.advanceTimersByTime(0));
      for (const one of drawing()) expect(one.getAttribute('data-enter')).toBe('waiting');
      let uninstall = installMotion('no-preference', 'TreeCanvas/TreeCanvas.css');
      for (const one of drawing()) expect(getComputedStyle(one).opacity).toBe('0');
      uninstall();
      uninstall = installMotion('reduce', 'TreeCanvas/TreeCanvas.css');
      for (const one of drawing()) expect(getComputedStyle(one).opacity).toBe('1');
      uninstall();

      act(() => vi.advanceTimersByTime(ENTRANCE_STEP_MS * 2));
      expect(cardBox('Engineering').getAttribute('data-enter')).toBe('shown');
      for (const one of drawing()) expect(one.getAttribute('data-enter')).toBe('shown');
      uninstall = installMotion('no-preference', 'TreeCanvas/TreeCanvas.css');
      for (const one of drawing()) expect(getComputedStyle(one).animation).toContain('crewlet-tree-canvas-arrive');
      uninstall();
      uninstall = installMotion('reduce', 'TreeCanvas/TreeCanvas.css');
      for (const one of drawing()) expect(getComputedStyle(one).animation).toBe('none');
      uninstall();
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * 50 across, 80 + 24 from a node's bottom to its children's tops (the add
   * strip hangs in that gap), and a margin round the chart. Read from the
   * stylesheet: jsdom computes no custom property.
   */
  test('a chart of nodes is spaced like the chart it is drawn to match', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    const { container } = mount({ appearance: 'node' });
    const gap = container.querySelector('.crewlet-tree-canvas__gap')!;
    expect(px(gap, 'width')).toBe(48);
    expect(px(gap, 'height')).toBe(104);
    expect(px(container.querySelector('.crewlet-tree-canvas__margin')!, 'width')).toBe(40);
    uninstall();
  });

  /*
   * The add hangs below the card on the branch its children come off, out of
   * the flow, so the card's measured box is the node alone and nothing in the
   * strip can relay the chart.
   */
  test('what hangs under a node is drawn below the card and measured with none of it', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    const { container } = mount({ appearance: 'node' });
    const under = container.querySelector('.crewlet-tree-canvas__under')!;
    const style = getComputedStyle(under);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe('100%');
    expect(px(under, 'min-height')).toBe(24);
    uninstall();
  });

  /*
   * The add is centred on the node's axis in a track of its own, as wide as the
   * widest open pill (four targets), so no neighbour sits where a choice lands
   * when the pill opens.
   */
  test('the add sits on the axis whatever else is drawn beside it', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    // The strip's expander and add, as a chart draws them. `AddPill` is not
    // mounted: the rule is keyed on its class.
    const { container } = render(
      <TreeCanvas
        label="Structure chart"
        nodes={forestOf([])}
        cards={cards}
        cardOf={cardOf}
        appearance="node"
        renderCard={renderCardWith({})}
        renderUnder={(id) =>
          kindOf(id) === 'seat' ? null : (
            <>
              <button type="button" className="crewlet-icon-btn" aria-label={`Expand ${id}`} />
              <span className="crewlet-add-pill" />
            </>
          )
        }
      />,
    );
    LayoutObserver.settle();
    const under = container.querySelector('.crewlet-tree-canvas__under')!;
    expect(getComputedStyle(under).gridTemplateColumns).toBe('1fr auto 1fr');
    expect(getComputedStyle(under.querySelector('.crewlet-add-pill')!).gridColumn).toBe('2');
    expect(getComputedStyle(under.querySelector('.crewlet-icon-btn')!).gridColumn).toBe('1');
    // And the middle track follows the pill's own floor: four pointer targets,
    // the widest `AddPill` opens to, so nothing beside it is ever under one.
    expect(px(under.querySelector('.crewlet-add-pill')!, 'min-width')).toBe(96);
    uninstall();
  });

  /*
   * The add shows on a resting chart and the expander does not: a control per
   * branch on a large chart is a field of chrome.
   */
  test('the add is drawn at rest and everything else in the strip is not', () => {
    // The rule that hides the strip's controls, not the reduced-motion block
    // in the same section that names the same selector to still its fade.
    const section = SHEET.slice(SHEET.indexOf('THE `node` APPEARANCE'));
    expect(rule('.crewlet-tree-canvas--node .crewlet-tree-canvas__under')).toContain('opacity: 1');
    expect(section).toMatch(/__under > :not\(\.crewlet-add-pill\) \{[^}]*opacity: 0/);
  });
});

// ---------------------------------------------------------------------------
// A node being composed: the ghost
// ---------------------------------------------------------------------------

/*
 * A ghost is a card the layout knows and the data does not: the tree never
 * sees it, the chart makes room for it (opening a closed parent), and the view
 * and focus come back to where the add began.
 */
const GHOST_ID = 'ghost:new';

/** A ghost under `parent`, with a form in it and a record of what it was told. */
function ghost(parent: string, cancelled: string[] = []): TreeComposing {
  return {
    id: GHOST_ID,
    parent,
    label: `Add to ${nameOf(parent)}`,
    /*
     * A CONTROL BEFORE THE FIELD, as a real form has: the chart focuses the
     * FIRST control in the box, so a fixture whose first control is also its
     * only field could not tell that answer from any other.
     */
    render: () => (
      <form aria-label="New node">
        <button type="button">Kind</button>
        <input aria-label="Name" defaultValue="" />
        <button type="submit">Add</button>
      </form>
    ),
    onCancel: () => cancelled.push(parent),
  };
}

const ghostCard = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.crewlet-tree-canvas__card--composing');

describe('a node being composed', () => {
  /*
   * A ghost in the node forest would be counted by `aria-setsize` and reached
   * by the keys, so the tree's whole shape is compared, not one number.
   */
  test('the tree says exactly what it said before the ghost', () => {
    const shape = () =>
      screen
        .getAllByRole('treeitem')
        .map((el) =>
          [
            el.getAttribute('data-tree-id'),
            el.getAttribute('aria-level'),
            el.getAttribute('aria-posinset'),
            el.getAttribute('aria-setsize'),
          ].join('/'),
        );
    const view = mount();
    const before = shape();
    view.rerender({ composing: ghost('unit:eng') });
    expect(shape()).toEqual(before);
  });

  test('the ghost is no treeitem, and the tree element does not hold it', () => {
    const { container } = mount({ composing: ghost('unit:eng') });
    const card = ghostCard(container)!;
    expect(card).not.toBeNull();
    expect(card.querySelectorAll("[role='treeitem']")).toHaveLength(0);
    expect(card.closest("[role='tree']")).toBeNull();
    // Named, and a region rather than an anonymous box: focus is put in it.
    expect(card.getAttribute('role')).toBe('group');
    expect(card.getAttribute('aria-label')).toBe('Add to Engineering');
  });

  /*
   * AND NO KEY CAN REACH IT. Type ahead is the one that would find it by its
   * text rather than by its place in the model, so it is the one asked here:
   * "N" for the "New node" form must leave focus on the node it was on.
   */
  test('no key of the tree lands on the ghost', () => {
    mount({ composing: ghost('unit:eng') });
    item('Engineering').focus();
    press('ArrowDown');
    const first = focused();
    press('End');
    expect(focused()).not.toBe(GHOST_ID);
    expect(focused()).toBe('seat:ae');
    item('Engineering').focus();
    press('n');
    expect(focused()).not.toBe(GHOST_ID);
    expect(first).not.toBe(GHOST_ID);
  });

  /*
   * The ghost is placed after the parent's children, in the rank the new node
   * will take, and the room is made for its measured form.
   */
  test('the ghost is placed where the new node will go, and the siblings move', () => {
    const view = mount();
    const before = translateOf(cardBox('Platform'));
    view.rerender({ composing: ghost('unit:eng') });
    const card = ghostCard(view.container)!;
    const at = translateOf(card);
    // Placed, rather than drawn at the origin waiting to be measured.
    expect(card.style.transform).not.toBe('');
    // Under its parent and to the right of the last child it follows.
    expect(at.y).toBeGreaterThan(translateOf(cardBox('Engineering')).y);
    expect(at.x).toBeGreaterThan(translateOf(cardBox('Platform')).x);
    expect(translateOf(cardBox('Platform')).x).not.toBe(before.x);
  });

  test('the branch into the ghost is drawn, and marked as the ghost branch', () => {
    const { container } = mount({ composing: ghost('unit:eng') });
    const paths = [...container.querySelectorAll<SVGPathElement>('.crewlet-tree-canvas__links path')];
    const wire = paths.filter((path) => path.getAttribute('data-composing') === 'true');
    expect(wire).toHaveLength(1);
    // It leaves the parent's bottom and arrives at the ghost's top, which is
    // the same arithmetic every other branch on this chart runs.
    const parent = translateOf(cardBox('Engineering'));
    const at = translateOf(ghostCard(container)!);
    const d = wire[0]!.getAttribute('d') ?? '';
    expect(d.startsWith(`M${parent.x + CARD_WIDTH / 2} `)).toBe(true);
    expect(d).toContain(`${at.x + GHOST.width / 2}`);
  });

  /*
   * THE VIEW GOES TO IT AND COMES BACK. Not the reveal a focused node gets: a
   * region ease, which zooms as well as pans, and which remembers the view it
   * left so the reader is put back exactly where they were.
   */
  /* AND THE VIEW IT GIVES BACK IS THE ONE THE READER LEFT, to the pixel. */
  test('the chart eases onto the ghost and gives the view back', () => {
    const view = mount({ anchorNode: 'unit:platform' });
    const world = () => view.container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
    const before = world();
    view.rerender({ composing: ghost('unit:eng') });
    const onto = world();
    expect(onto).not.toBe(before);
    view.rerender({ composing: null });
    expect(world()).toBe(before);
  });

  /*
   * On a chart wider than its pane, the view is remembered before the ghost is
   * measured, and focus going back to the parent does not pan the view again.
   */
  test('the view comes back on a chart wider than its pane', () => {
    const wide = Array.from({ length: 40 }, (_, at) => `seat:extra${at}`);
    const view = mount({ extra: wide, anchorNode: COMPANY });
    const world = () => view.container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
    const before = world();
    view.rerender({ extra: wide, anchorNode: COMPANY, composing: ghost('unit:eng') });
    expect(world()).not.toBe(before);
    view.rerender({ extra: wide, anchorNode: COMPANY, composing: null });
    expect(world()).toBe(before);
  });

  /*
   * An add ends in one commit (the node arrives, the ghost goes), then the
   * caller focuses the new node. Six more seats overflow the 1200px pane, so
   * the fit is given back for the grown chart, not as the old transform.
   */
  const sixMore = Array.from({ length: 6 }, (_, at) => `seat:extra${at}`);
  const sevenMore = [...sixMore, ADVISOR];

  test('an add on the fitted chart ends on the fit of the chart it made, with every card inside', () => {
    const view = mount({ extra: sixMore });
    const fitted = worldView(view.container);
    view.rerender({ composing: ghost(COMPANY) });
    view.rerenderUnmeasured({ extra: sevenMore, anchorNode: ADVISOR, composing: null });
    act(() => view.handle.current!.focusNode(ADVISOR));
    LayoutObserver.settle();

    const now = worldView(view.container);
    // The wider chart's own fit: pressing Fit moves nothing.
    expect(now.k).toBeLessThan(fitted.k);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
    expect(worldView(view.container)).toEqual(now);
    const cut = [...cardsOnScreen(view.container)]
      .filter(([, box]) => box.left < 0 || box.top < 0 || box.right > VIEWPORT.width || box.bottom > VIEWPORT.height)
      .map(([id]) => id);
    expect(cut).toEqual([]);
    expect(focused()).toBe(ADVISOR);
  });

  /*
   * AND A VIEW THE READER MOVED IS THEIRS: it keeps its zoom, and the node
   * the caller sends focus to, which that view does not show at all, is
   * brought to the middle of it rather than to the nearest edge.
   */
  test('an add on a view the reader moved keeps their zoom and brings the new node to the middle', () => {
    const view = mount({ extra: sixMore });
    for (let press = 0; press < 4; press++) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const moved = worldView(view.container);
    view.rerender({ composing: ghost(COMPANY) });
    view.rerenderUnmeasured({ extra: sevenMore, anchorNode: ADVISOR, composing: null });
    act(() => view.handle.current!.focusNode(ADVISOR));
    LayoutObserver.settle();

    expect(worldView(view.container).k).toBe(moved.k);
    const box = cardsOnScreen(view.container).get(ADVISOR)!;
    expect((box.left + box.right) / 2).toBeCloseTo(VIEWPORT.width / 2);
    expect((box.top + box.bottom) / 2).toBeCloseTo(VIEWPORT.height / 2);
    expect(focused()).toBe(ADVISOR);
  });

  /* A CANCEL GIVES A VIEW THE READER MOVED BACK TO THE PIXEL: only a fit is worked out again. */
  test('a cancel gives back the view the reader moved, to the pixel', () => {
    const view = mount({ extra: sixMore });
    for (let press = 0; press < 2; press++) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const moved = worldView(view.container);
    view.rerender({ composing: ghost(COMPANY) });
    expect(worldView(view.container)).not.toEqual(moved);
    view.rerender({ composing: null });
    expect(worldView(view.container)).toEqual(moved);
  });

  /* A CHART THAT MUST OPEN WHOLE names a floor under the canvas's own 25%. */
  test('a chart wider than its pane opens whole when it names a lower floor', () => {
    const wide = Array.from({ length: 40 }, (_, at) => `seat:extra${at}`);
    const zoom = (container: HTMLElement) =>
      Number(/scale\(([\d.e-]+)\)/.exec(container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform)![1]);
    const floored = mount({ extra: wide });
    expect(zoom(floored.container)).toBeCloseTo(0.25);
    floored.unmount();
    const whole = mount({ extra: wide, minZoom: 0.02 });
    expect(zoom(whole.container)).toBeLessThan(0.25);
    expect(zoom(whole.container)).toBeGreaterThan(0.02);
  });

  test('a start bar reaches the canvas, in the corner opposite its controls', () => {
    const { container } = mount({ appearance: 'node', controlsStart: <span>Reporting view</span> });
    const start = container.querySelector('.crewlet-canvas__controls--start')!;
    expect(start.textContent).toBe('Reporting view');
    expect(start.getAttribute('data-placement')).toBe('top-right');
  });

  /* AN ADD MARK IS A FULL TARGET AT ANY ZOOM: the zoom is on the root for the
     sheet to undo, and a chart too far out for one says so. */
  test('the zoom is written on the root, and a chart too far out hides its add marks', () => {
    const heard: number[] = [];
    const near = mount({ onViewChange: (view) => heard.push(view.k) });
    const root = () => document.querySelector<HTMLElement>('.crewlet-tree-canvas')!;
    const k = Number(root().style.getPropertyValue('--crewlet-tree-canvas-zoom'));
    expect(k).toBe(heard.at(-1));
    expect(k).toBeGreaterThanOrEqual(TREE_ADD_MARK_MIN_ZOOM);
    expect(root().hasAttribute('data-zoomed-out')).toBe(false);
    near.unmount();
    mount({ extra: Array.from({ length: 40 }, (_, at) => `seat:extra${at}`) });
    expect(Number(root().style.getPropertyValue('--crewlet-tree-canvas-zoom'))).toBeCloseTo(0.25);
    expect(root().hasAttribute('data-zoomed-out')).toBe(true);
    expect(SHEET).toMatch(
      /\.crewlet-tree-canvas__under > \.crewlet-add-pill \{\s*scale: max\(1, calc\(1 \/ var\(--crewlet-tree-canvas-zoom\)\)\);\s*transform-origin: 50% 0;/,
    );
    expect(SHEET).toMatch(
      /\.crewlet-tree-canvas\[data-zoomed-out\] \.crewlet-tree-canvas__under > \.crewlet-add-pill \{\s*visibility: hidden;/,
    );
  });

  describe('the view a page holds', () => {
    const world = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
    const zoomIn = () => fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

    test('a new fit key fits the whole chart again, and the same key keeps the zoom of the reader', () => {
      const view = mount({ fitKey: 'open' });
      const fitted = world(view.container);
      zoomIn();
      const zoomed = world(view.container);
      expect(zoomed).not.toBe(fitted);
      view.rerender({ fitKey: 'open', state: { 'seat:sre': 'working' } });
      expect(world(view.container)).toBe(zoomed);
      view.rerender({ fitKey: 'filtered' });
      expect(world(view.container)).toBe(fitted);
    });

    test('a key that changes with the cards fits once the new layout is placed', () => {
      const wide = Array.from({ length: 40 }, (_, at) => `seat:extra${at}`);
      const view = mount({ fitKey: 'few' });
      zoomIn();
      view.rerender({ fitKey: 'many', extra: wide });
      // Forty more seats: the fit is the wide chart's, not the one it had.
      expect(Number(/scale\(([\d.e-]+)\)/.exec(world(view.container))![1])).toBeCloseTo(0.25);
    });

    test('a saved view opens instead of the fit, and the next new key fits again', () => {
      const fresh = mount({ fitKey: 'a' });
      const fitted = world(fresh.container);
      fresh.unmount();
      const saved = { x: -120, y: -40, k: 1.2 };
      const view = mount({ fitKey: 'a', initialView: saved });
      expect(world(view.container)).toBe('translate(-120px, -40px) scale(1.2)');
      view.rerender({ fitKey: 'b', initialView: saved });
      expect(world(view.container)).toBe(fitted);
    });
  });

  test('a card pushed back says so, and is drawn grey until the keyboard reaches it', () => {
    mount({ cardDimmed: (id) => id === 'unit:sales' });
    const card = (id: string) => document.querySelector(`[data-tree-id="${id}"]`)!.closest('.crewlet-tree-canvas__card')!;
    expect(card('unit:sales').hasAttribute('data-dimmed')).toBe(true);
    expect(card('unit:eng').hasAttribute('data-dimmed')).toBe(false);
    expect(SHEET).toMatch(/\.crewlet-tree-canvas__card\[data-dimmed\] \{\s*filter: grayscale\(1\);/);
    expect(SHEET).toMatch(/\.crewlet-tree-canvas__card\[data-dimmed\]:has\(:focus-visible\) \{\s*filter: none;/);
  });

  test('an end bar reaches the canvas, across from its controls', () => {
    const { container } = mount({ appearance: 'node', overlayEnd: <span>Legend</span> });
    const end = container.querySelector('.crewlet-canvas__controls--end')!;
    expect(end.textContent).toBe('Legend');
    expect(end.getAttribute('data-placement')).toBe('top-right');
  });

  /*
   * A ghost holds a form drawn at its design size, so on a small chart the
   * ease brings the reader to it without magnifying it.
   */
  test('the ease never draws the ghost larger than its own size', () => {
    const view = mount();
    view.rerender({ composing: ghost('unit:eng') });
    const world = view.container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
    const scale = Number(/scale\(([\d.]+)\)/.exec(world)![1]);
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThanOrEqual(1);
  });

  /*
   * Focus lands on the form's first control, not the ghost. A hidden subtree
   * holds nothing focusable, so this also guards that the ghost is placed by
   * the commit the form is focused on.
   */
  test('focus goes into the form, and back to the node it was added to', () => {
    const view = mount();
    item('Engineering').focus();
    view.rerender({ composing: ghost('unit:eng') });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Kind' }));
    expect(ghostCard(view.container)!.style.visibility).not.toBe('hidden');
    view.rerender({ composing: null });
    expect(focused()).toBe('unit:eng');
  });

  /*
   * An unplaced card is drawn `visibility: hidden`, where focus does nothing,
   * so the form is focused on the first layout that places it. Reduced motion
   * is asked for, since the entrance's extra commits would mask a failure.
   */
  test('the form takes focus on the first layout that places it, motion or not', () => {
    stillness(true);
    GHOST_MEASURED = false;
    const view = mount();
    item('Engineering').focus();
    view.rerender({ composing: ghost('unit:eng') });
    // Drawn, and hidden, because nothing has said where it goes. The chart
    // asks for the focus here and the browser's rule refuses it.
    const card = ghostCard(view.container)!;
    expect(card.style.visibility).toBe('hidden');
    expect(card.contains(document.activeElement)).toBe(false);

    GHOST_MEASURED = true;
    LayoutObserver.settle();
    expect(card.style.visibility).not.toBe('hidden');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Kind' }));
  });

  /*
   * Every relayout under an open form is another pass at focusing it, so a
   * reader who moved to another field must be left there.
   */
  test('a relayout under an open form does not pull focus back to its first field', () => {
    const view = mount({ composing: ghost('unit:eng') });
    const submit = screen.getByRole('button', { name: 'Add' });
    submit.focus();
    expect(document.activeElement).toBe(submit);
    // A push: another root seat arrives and every card moves.
    view.rerender({ extra: [ADVISOR], composing: ghost('unit:eng') });
    expect(document.activeElement).toBe(submit);
  });

  /*
   * Once the card is placed the request is no longer renewed, so only the
   * focus effect's retry can ask again. `FOCUS_REFUSALS` models the browser's
   * one-commit lag that refuses the first attempt on a placed card.
   */
  test('the form is asked again when a placed card still refuses the focus', () => {
    stillness(true);
    // One refusal, spent on the attempt made the moment the card is placed.
    FOCUS_REFUSALS = 1;
    const view = mount();
    item('Engineering').focus();
    view.rerender({ composing: ghost('unit:eng') });
    // The card is placed, the request is no longer being renewed, and the one
    // attempt made has been refused.
    expect(ghostCard(view.container)!.style.visibility).not.toBe('hidden');
    expect(FOCUS_REFUSALS).toBe(0);
    // The next layout is the retry's alone.
    view.rerender({ composing: ghost('unit:eng') });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Kind' }));
  });

  test('Escape cancels, from the form and from a node behind it', () => {
    const fromForm: string[] = [];
    mount({ composing: ghost('unit:eng', fromForm) });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Name' }), { key: 'Escape' });
    expect(fromForm).toEqual(['unit:eng']);
    cleanup();

    const fromNode: string[] = [];
    mount({ composing: ghost('unit:eng', fromNode) });
    item('Engineering').focus();
    press('Escape');
    expect(fromNode).toEqual(['unit:eng']);
  });

  /*
   * A GHOST UNDER A CLOSED PARENT IS A GHOST NOBODY SEES. Adding to a unit the
   * reader has collapsed opens it, once, so the form is drawn among the
   * children it is about to join.
   */
  test('a closed parent is opened for the ghost', () => {
    const view = mount();
    pointerPress('Collapse Engineering');
    expect(screen.queryByText('Platform')).toBeNull();
    view.rerender({ composing: ghost('unit:eng') });
    expect(screen.queryByText('Platform')).not.toBeNull();
    expect(ghostCard(view.container)).not.toBeNull();
  });

  /*
   * HOW FAR THE CHART ZOOMS IS A FACT ABOUT ITS NODES. The ghost is wider than
   * any of them and is there for one add, so a ceiling that counted it would
   * be lowered for the rest of the chart's life.
   */
  test('the ghost does not move the chart zoom ceiling', () => {
    const view = mount({ appearance: 'node' });
    const world = () =>
      view.container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
    const scale = () => Number(/scale\(([\d.]+)\)/.exec(world())![1]);
    const toTheCeiling = () => {
      for (let press = 0; press < 20; press++) {
        fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      }
      return scale();
    };
    view.rerender({ composing: ghost('unit:eng') });
    const withGhost = toTheCeiling();
    view.rerender({ composing: null });
    expect(toTheCeiling()).toBe(withGhost);
  });
});

describe('the ghost in the stylesheet', () => {
  /*
   * The ghost's width rule needs two classes to beat the `node` appearance's
   * name-width cap, so it is measured through the cascade, not read.
   */
  test('the ghost is drawn at a form width, not at a node width', () => {
    // `installSheets`, not the themed one: only it substitutes a var()'s
    // fallback, and this is a length behind a component's custom property.
    const uninstall = installSheets('TreeCanvas/TreeCanvas.css');
    const { container } = mount({ appearance: 'node', composing: ghost('unit:eng') });
    const card = ghostCard(container)!;
    // The cap the `node` appearance puts on a card really is in force here,
    // which is what makes the next two lines a comparison rather than a
    // reading of a sheet that might not have applied at all.
    expect(px(cardBox('Engineering'), 'max-width')).toBe(264);
    expect(getComputedStyle(card).maxWidth).toBe('none');
    expect(px(card, 'width')).toBe(320);
    expect(px(card, 'min-width')).toBe(0);
    // The form has room of its own: a card's own padding is its treeitem's,
    // and the ghost has no treeitem.
    expect(px(card, 'padding-top')).toBe(16);
    uninstall();
  });

  test('the ghost branch is dashed and the ghost card is not toned', () => {
    const wire = rule(".crewlet-tree-canvas__links path[data-composing='true']");
    expect(wire).toContain('stroke-dasharray');
    expect(wire).toContain('var(--color-brand-accent-soft-strong)');
    const { container } = mount({ composing: ghost('unit:eng'), cardTone: () => 'purple' });
    expect(ghostCard(container)!.getAttribute('data-tone')).toBeNull();
    const wired = container.querySelector("[data-composing='true'][d]");
    expect(wired?.getAttribute('data-tone')).toBeNull();
  });

  /*
   * A READER WHO ASKED FOR LESS still gets the ghost, drawn in place: the
   * chart still makes room, the view still moves and focus still lands in the
   * form. Only the arrival, the breath and the rise are dropped.
   */
  test('reduced motion draws the ghost in place', () => {
    /*
     * jsdom applies no `@media` rule, so the block is read from the source with
     * every selector in it named; the half that is drawn is measured below.
     */
    const at = SHEET.indexOf(
      '@media (prefers-reduced-motion: reduce)',
      SHEET.indexOf('__card--composing'),
    );
    const guarded = SHEET.slice(at, SHEET.indexOf('\n}\n', at));
    for (const selector of [
      '.crewlet-tree-canvas .crewlet-tree-canvas__card--composing,',
      ".crewlet-tree-canvas__links path[data-composing='true'] {",
      '.crewlet-tree-canvas__card--composing > * {',
    ]) {
      expect(guarded).toContain(selector);
    }
    expect(guarded.match(/animation: none/g)).toHaveLength(2);
    expect(guarded).toContain('opacity: 1');

    stillness(true);
    const view = mount();
    const world = () => view.container.querySelector<HTMLElement>('.crewlet-canvas__world')!.style.transform;
    const before = world();
    item('Engineering').focus();
    view.rerender({ composing: ghost('unit:eng') });
    expect(ghostCard(view.container)!.style.transform).not.toBe('');
    expect(world()).not.toBe(before);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Kind' }));

    /*
     * And the block is put to the cascade: the card's arrival starts on two
     * classes, so a stop naming one loses on specificity. The form rises alike.
     */
    const card = ghostCard(view.container)!;
    const form = [...card.children];
    expect(form.length).toBeGreaterThan(0);
    let uninstall = installMotion('no-preference', 'TreeCanvas/TreeCanvas.css');
    expect(getComputedStyle(card).animation).toContain('crewlet-tree-canvas-ghost-card');
    expect(getComputedStyle(card).animation).toContain('crewlet-tree-canvas-ghost-pulse');
    for (const part of form) expect(getComputedStyle(part).animation).toContain('crewlet-tree-canvas-ghost-form');
    uninstall();
    uninstall = installMotion('reduce', 'TreeCanvas/TreeCanvas.css');
    expect(getComputedStyle(card).animation).toBe('none');
    for (const part of form) expect(getComputedStyle(part).animation).toBe('none');
    uninstall();
  });
});

describe('a strip with nothing drawn in it', () => {
  /*
   * A node with no pointer control still holds the keyboard's menu anchor,
   * drawn nowhere: its strip keeps its box but draws no rule and no ground.
   */
  function strip(appearance: 'card' | 'node', drawn: boolean) {
    const { container } = render(
      <div className={`crewlet-tree-canvas crewlet-tree-canvas--${appearance}`}>
        <div className="crewlet-tree-canvas__card">
          <div className="crewlet-tree-canvas__actions" data-menu-open="true">
            <span data-keyboard-only="true">
              <button type="button">Actions for Nimbus</button>
            </span>
            {drawn && <button type="button">Edit Nimbus</button>}
          </div>
        </div>
      </div>,
    );
    return container.querySelector('.crewlet-tree-canvas__actions')!;
  }

  test('draws no ground in a card, and keeps it where a control is drawn', () => {
    const uninstall = installThemed('light', 'TreeCanvas/TreeCanvas.css');
    try {
      const empty = getComputedStyle(strip('card', false));
      expect(empty.backgroundColor === '' || empty.backgroundColor === 'rgba(0, 0, 0, 0)').toBe(true);
      // It is still revealed and still a box the menu is placed from.
      expect(empty.opacity).toBe('1');
      expect(empty.position).toBe('absolute');
      cleanup();
      expect(getComputedStyle(strip('card', true)).backgroundColor).not.toMatch(/^(|rgba\(0, 0, 0, 0\))$/);
    } finally {
      uninstall();
    }
  });

  test("draws no column rule on a node, by the same selector as the ground's", () => {
    // jsdom measures a pseudo-element through a stand-in child that this
    // `:has()` matches itself, so the rule is read from the sheet: the same
    // condition as the ground above, after the node's column rule.
    const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'TreeCanvas.css'), 'utf8');
    const empty = '.crewlet-tree-canvas__actions:not(:has(> :not([data-keyboard-only])))';
    const cancel = sheet.indexOf(`${empty}::before {\n  content: none;\n}`);
    expect(cancel).toBeGreaterThan(-1);
    expect(cancel).toBeGreaterThan(sheet.indexOf('.crewlet-tree-canvas--node .crewlet-tree-canvas__actions::before {'));
    expect(sheet).toContain(`${empty} {\n  background: none;\n}`);
  });
});
