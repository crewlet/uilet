/**
 * The chart's tree, its keys, its menus and its layout.
 *
 * What these protect:
 * - the chart is an ARIA tree whose items say their level, position and
 *   expansion, and hold nothing focusable: the pointer's buttons sit beside
 *   them, hidden and out of the tab order;
 * - the arrows, Home, End and type ahead move one roving tab stop, the item
 *   keys reach the caller, and the ContextMenu key or Shift+F10 opens the
 *   node's menu in the canvas layer, returning focus to the node;
 * - focus lands where the caller sends it, opening a collapsed card on the way
 *   and never scrolling;
 * - a relayout keeps the node the operator acted on still on screen;
 * - a push that changes a word inside a card lays nothing out again.
 *
 * jsdom has no layout, so `LayoutObserver` reports the sizes a browser would.
 *
 * Ported from the generic half of the engine dashboard's
 * `routes/org/builder/CanvasView.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef, useMemo, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { KeyboardArrowDownGlyph, ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { IconButton } from '../IconButton/index.js';
import { focusables } from '../Layer/index.js';
import { Menu } from '../Menu/index.js';
import { ENTRANCE_STEP_MS, REFLOW_MS, entranceOrder } from './motion.js';
import type { TreeInput, TreeModel } from '../Tree/index.js';
import { installSheets, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import {
  TreeCanvas,
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

function sizeOf(el: Element): { width: number; height: number } | null {
  if (el.classList.contains('crewlet-canvas__viewport')) return VIEWPORT;
  if (el.classList.contains('crewlet-tree-canvas__gap')) return { width: 24, height: 32 };
  // The space around the whole chart, as its own probe: none here, so the
  // cases below read the same coordinates they always did, and the cases that
  // are ABOUT the margin render their own chart with a margin.
  if (el.classList.contains('crewlet-tree-canvas__margin')) return { width: MARGIN, height: MARGIN };
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
 * A RELAYOUT TRAVELS (motion.ts), so a card's transform right after one is
 * where the card WAS. jsdom's own frames fire on a timer nothing here waits
 * for, which would leave every case in this file reading a chart mid-move, so
 * the suite owns the frame queue: `settleMotion` runs the pending frames far
 * enough past the tween's length that every card has landed. Every case that
 * is not ABOUT the motion goes through `LayoutObserver.settle`, which ends
 * with it, and reads the chart at rest exactly as it always did.
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
 * FOCUS ON AN INVISIBLE ELEMENT DOES NOTHING, which is what a browser does and
 * what jsdom does not.
 *
 * The specification says a focusable area must be being rendered, so `focus()`
 * inside a subtree whose computed `visibility` is `hidden` returns having
 * moved nothing at all, silently. jsdom focuses it anyway. That difference hid
 * a real defect for a whole afternoon: the chart draws a card it has not
 * placed yet hidden, a ghost is unplaced on the tick it first renders, and a
 * single focus attempt made then cannot land. Every suite here passed while a
 * browser opened the form with the cursor on the node behind it.
 *
 * So the rule is installed for this file. It is the browser's own, not a
 * convenience: a case that asks whether focus LANDED has to be asked somewhere
 * the answer can be no.
 */
const realFocus = HTMLElement.prototype.focus;
/**
 * How many focus attempts on a PLACED card the browser is to refuse, for a
 * case about the ordering jsdom does not reproduce.
 *
 * The DOM is a commit behind the layout in a real browser: the card is placed
 * as far as this component is concerned and still reads as the unplaced one,
 * which is drawn hidden, so the attempt made on that commit is refused. jsdom
 * commits the two together and every attempt succeeds, which is why nothing
 * here could see the retry that covers it. This is the lag, modelled.
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
      icon={open ? <KeyboardArrowDownGlyph /> : <ChevronRightGlyph />}
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
 * THE TREE'S OWN ACCESSIBILITY CONTRACT, as one assertion: every control the
 * chart draws is out of the tab order AND hidden from the element-by-element
 * walk, and no treeitem holds a focusable descendant. Written once because two
 * cases ask it of two different shapes (a strip beside the item, a slot inside
 * it), and a rule stated twice is a rule that drifts.
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
  composing = null,
}: {
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
  connector?: 'step' | 'curve' | undefined;
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
      composing={composing}
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

  test('a treeitem holds nothing focusable, and the pointer buttons are hidden beside it', () => {
    mount();
    expectNothingFocusableInAnItem();
  });

  /*
   * INCLUDING A CONTROL A CALLER DRAWS ON A NODE RATHER THAN IN A STRIP. The
   * rule above was only ever checked against a fixture whose every button sits
   * in `ctx.actions`, so it could catch that strip regressing and nothing
   * else: a control added to the node's own leading edge went inside the
   * treeitem, and this case stayed green while a screen reader walking element
   * by element met a stray button in every node. `tabIndex={-1}` is the Tab
   * order and does not answer for that walk.
   *
   * SO THE SECOND PLACE A CARD DRAWS A CONTROL IS CHECKED HERE TOO: beside the
   * item, hidden, out of the tab order, exactly as the strip is.
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
    // The connectors carry no information a reader cannot get from the levels
    // the treeitems already say, and the gap probe is a measuring stick with
    // no content at all. Announced, each would be an unnamed graphic between
    // every pair of cards.
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
 * THE FRAME IS THE CHART'S, so the mark on it is too. A card that stands for
 * somebody outside the system takes the dashed edge, and the modifier lands on
 * the card box rather than on anything the caller drew inside it, because the
 * caller no longer draws the frame at all.
 */
test('a card can be marked as standing for somebody outside the system', () => {
  const { container } = render(
    <TreeCanvas
      label="Structure chart"
      nodes={forestOf([])}
      cards={cards}
      cardOf={cardOf}
      cardOutline={(id) => id === 'unit:sales'}
      renderCard={renderCardWith({})}
    />,
  );
  LayoutObserver.settle();
  const marked = [...container.querySelectorAll('.crewlet-tree-canvas__card')].filter((card) =>
    card.className.includes('crewlet-tree-canvas__card--outline'),
  );
  expect(marked).toHaveLength(1);
  expect(marked[0]!.textContent).toContain('Sales');
});

/*
 * ───────────────────────────────────────────────────────────────────────────
 * The pointer's controls
 *
 * They are the component's to place, because where they sit decides how much
 * width a name has. Two halves of that: the PROPS the caller spreads (here),
 * and the RULES that reveal them, which no jsdom can see and which are read off
 * the stylesheet at the bottom of this file.
 * ───────────────────────────────────────────────────────────────────────────
 */

describe('the pointer-only controls', () => {
  test('the actions strip is the chart’s own element, hidden from assistive technology', () => {
    const { container } = mount();
    const strips = [...container.querySelectorAll('.crewlet-tree-canvas__actions')];
    expect(strips.length).toBeGreaterThan(0);
    for (const strip of strips) expect(strip.getAttribute('aria-hidden')).toBe('true');
    // And every button the chart itself draws is inside one of the two quiet
    // strips: nothing the caller hung on a card is left in the open, where it
    // would be drawn over a name at rest. (The canvas's own zoom controls are
    // outside the tree and are not the chart's cards.)
    for (const button of screen.getByRole('tree').querySelectorAll('button')) {
      expect(button.closest('.crewlet-tree-canvas__actions, .crewlet-tree-canvas__under')).not.toBeNull();
    }
  });

  /*
   * THE REVEAL IS KEYED ON THE SIBLING ORDER, so a strip that is not its
   * treeitem's next sibling is a strip no hover ever shows. Nothing else can
   * check it: jsdom applies no stylesheet, so this asserts the shape the rule
   * needs rather than the rule's effect.
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
 * The rules that reveal them, read off the stylesheet
 *
 * jsdom applies none of it: `getComputedStyle` answers the initial value for
 * every property here and resolves no custom property at all, so the quiet
 * state, the reveal and the inertness are invisible to every test above. The
 * file is the only place they can be measured, so it is where they are.
 * ───────────────────────────────────────────────────────────────────────────
 */

/*
 * A TONE IS ONE ANSWER REACHING FIVE THINGS: the card's fill, its edge, its
 * halo, the ink of its name and the branch that arrives at it. Each of those
 * used to be a decision a consumer made for itself, which is how two charts in
 * one product came to tint the card and leave the branch neutral.
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
   * THE HUE IS A NAMED SET, and the stylesheet is what turns each name into the
   * four measured steps of that hue. A name with no rule behind it would draw a
   * card with no fill at all, which is the one failure a type cannot catch on
   * its own: the union and the stylesheet are two lists that have to agree.
   */
  test('every tone the type offers has its four steps and its branch', () => {
    for (const hue of ['purple', 'cyan', 'green', 'amber', 'rose', 'blue']) {
      const card = rule(`.crewlet-tree-canvas__card[data-tone='${hue}']`);
      // Matched rather than compared, because the package's own variable check
      // reads this file for token names too and would take a written-out one
      // here for a component declaring a token.
      const step = (name: string) =>
        new RegExp(`--crewlet-tree-canvas-card-${name}:\\s*var\\(--[\\w-]*${hue}[\\w-]*\\)`);
      for (const name of ['fill', 'line', 'halo', 'ink', 'accent']) {
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
   * A NODE IS OPAQUE, TONED OR NOT. The branches are drawn UNDER the cards, so
   * a card that is not painted over the page's own ground has the connectors
   * of the rank above running through its face and through its name. A TONED
   * card already went down as the ground plus its tint; a neutral one is the
   * ground plus the card's own step, which is the same pair. The console chart
   * lays an opaque rectangle under every card and says why.
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
   * A CELL OF THE ACTIONS COLUMN IS A POINTER TARGET AT EVERY DENSITY. The
   * column splits one rank into two cells, so the rank is floored at two
   * targets and the column's width at one; and the hairline down its edge is a
   * SHADOW rather than a border, because a border is inside the column's own
   * box and took a pixel off the width of every control in it. A browser is
   * where that is visible and jsdom is not one, so the three declarations that
   * hold it are read from the stylesheet. Measured in a browser at all three
   * densities: 24 by 24.
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
   * EVERY HAIRLINE INSIDE A NODE IS INSET, which is what the console chart
   * draws: its actions rule runs from 4 to `NODE_H - 4` and the divider
   * between its two cells from `ACT_X + 4` to `nw - 4`. Run edge to edge the
   * node read as a table of cells rather than as a card with a column beside
   * its name. And the rule still takes no width from the cells, which is why
   * it is drawn outside the column's box rather than as a border on it.
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
 * THE CURVE is what the console chart draws, and the component has to reach
 * `layoutConnectors` with it: a shape the caller asks for and the component
 * drops is a chart drawn in the wrong language with nothing to say so.
 */
describe('the connector shape', () => {
  const paths = (container: HTMLElement) =>
    [...container.querySelectorAll('.crewlet-tree-canvas__links path')].map(
      (path) => path.getAttribute('d') ?? '',
    );

  test('a chart that asks for nothing draws the rounded step', () => {
    const { container } = mount();
    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    // A step, or the bare vertical a child centred under its parent takes.
    // Never a cubic, which is the shape the other answer draws.
    expect(drawn.every((d) => !d.includes('C'))).toBe(true);
    expect(drawn.some((d) => d.includes('Q'))).toBe(true);
  });

  test('a chart that asks for the curve draws one cubic per branch', () => {
    const { container } = mount({ connector: 'curve' });
    const drawn = paths(container);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((d) => /^M [\d.-]+ [\d.-]+ C [^A-Z]+$/.test(d))).toBe(true);
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
   * EVERY CARD IS PLACED BY ITS TRANSFORM AND BY NOTHING ELSE. This rule said
   * `relative` for a while, one rule after the block above had said `absolute`
   * for the same element at the same specificity; the later word won, every
   * card stayed in normal flow, and the transform that places it was added to
   * wherever the stack of cards before it had already pushed it. jsdom
   * computes no position, so the suite could not see a chart whose Nth card
   * was drawn the height of the N-1 before it too low; the declaration is
   * read instead.
   */
  test('a card is placed by its transform, not by the cards before it', () => {
    expect(rule('.crewlet-tree-canvas__card')).toContain('position: absolute');
    expect(rule('.crewlet-tree-canvas__card')).not.toContain('position: relative');
  });

  /*
   * A BAND THAT TURNED OUT EMPTY COLLAPSES. The component draws no slot at all
   * for a caller that returns nothing, which is the contract; but a caller can
   * also return a component that itself renders nothing, and that is an element
   * as far as the component can tell. The rule catches what the contract
   * cannot, so no card ever carries a band of air.
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
   * A ROW's strip hangs off the ROW, not off the card's top right corner where
   * nine of them would land on top of one another. The row is the caller's
   * element, so the rule finds it rather than asking every caller to remember
   * to declare itself a containing block.
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
   * REVEALED BY FOCUS AS WELL AS BY HOVER, and by the selection, and while a
   * menu opened from the strip is up. That last one is not an extra: focus is
   * then inside a surface portalled out of the card, so neither `:hover` nor
   * `:focus-within` holds and the strip would vanish from under its own menu.
   */
  /*
   * A CARD'S OWN STRIP APPEARS WITH THE CARD, so pointing anywhere at a card
   * shows what can be done to it; a ROW's appears with its row, so an expanded
   * unit does not show nine menus at once. Keyed on the treeitem alone,
   * pointing at a unit's lead chip showed the add control below the card and
   * not the menu beside its name.
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
    const at = SHEET.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThan(-1);
    const guarded = SHEET.slice(at, SHEET.indexOf('\n}', SHEET.indexOf('{', at)));
    expect(guarded).toContain('.crewlet-tree-canvas__actions');
    expect(guarded).toContain('.crewlet-tree-canvas__under');
    expect(guarded).toContain('transition: none');
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

describe('where the ranks sit', () => {
  /*
   * THE `node` APPEARANCE IS AN ORG CHART, and a rank of an organization is a
   * row a reader scans across. This fixture's cards are as tall as the rows in
   * them, so a unit holding seats is taller than a seat: on shared ranks the
   * two still sit on one line, and on per-parent ranks the seats under the
   * shorter card ride up beside the taller one's. Both are correct and they
   * are different pictures, which is the whole of this decision.
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
   * on the scroller is space the outermost card's halo and focus ring are cut
   * off in. It arrives through a probe, like the gaps, so density scales it.
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
        ".crewlet-tree-canvas__links path[data-enter='waiting']",
    );
    expect(waiting).toContain('opacity: 0');
    expect(waiting).not.toContain('display: none');
  });

  test('reduced motion draws every card at once', () => {
    const at = SHEET.indexOf('@media (prefers-reduced-motion: reduce)', SHEET.indexOf('data-enter'));
    const guarded = SHEET.slice(at, SHEET.indexOf('\n}', SHEET.indexOf('{', at)));
    expect(guarded).toContain('data-enter');
    expect(guarded).toContain('opacity: 1');
    expect(guarded).toContain('animation: none');
  });

  /*
   * THE CONSOLE CHART'S SPACING, as the steps nearest its own: 50 across and a
   * rank a node's height down, with a margin around the chart. Read from the
   * stylesheet because the probes are what the layout measures and jsdom
   * computes no custom property at all.
   */
  /*
   * THE GAP A READER SEES IS THE SAME NUMBER IT ALWAYS WAS. The add strip used
   * to sit INSIDE the card and the rank gap was `--spacing-11` alone; the
   * strip hangs on the branch now, so the room it needs moved into the gap
   * with it. 80 + 24 is the 104px from a node's bottom edge to its children's
   * tops that the console chart draws as 100.
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
   * THE ADD HANGS BELOW THE CARD, on the branch its children come off, which
   * is where the console chart puts it (`pillY = fullH + 3`). Inside the card
   * it was a band of the card's own face with a hole punched in it, and the
   * branch started at the card's bottom edge 13px BELOW the mark, so the line
   * never reached the control sitting on it.
   *
   * AND IT IS OUT OF THE FLOW, so the card's measured box is the node itself:
   * nothing in this strip can relay the chart, whatever a hover does to it.
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
   * AND IT IS CENTRED ON THE NODE'S OWN AXIS, IN A TRACK OF ITS OWN. The
   * console chart centres the add on `nw / 2` and has nothing else on the
   * branch; a row of two controls centred TOGETHER put the add 14px right of
   * the axis on every node of a resting chart.
   *
   * THE TRACK IS THE PILL'S WIDEST FOOTPRINT, not `auto`. A pill OPENS out of
   * the flow, centred on its own mark, at one pointer target per choice: sized
   * to what a CLOSED pill needs, the track left a neighbour sitting exactly
   * where the second choice lands, and a reader reaching for it pressed "add a
   * unit" instead. Four targets is the widest pill `AddPill` takes.
   */
  test('the add sits on the axis whatever else is drawn beside it', () => {
    const uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css');
    // The strip's own two children, as a chart draws them: the expander and
    // the add. `AddPill` is not mounted here, because what the rule is keyed
    // on is the CLASS, and a chart that drew its own add under that class is
    // what these tracks are for.
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
   * THE ADD IS ON A RESTING CHART AND THE EXPANDER IS NOT. One is an
   * affordance saying a child can go here; the other is a control, and a
   * control per branch on a chart of a hundred nodes is a field of chrome over
   * a picture of an organization.
   */
  test('the add is drawn at rest and everything else in the strip is not', () => {
    // From the node appearance's own section: the same selector appears in the
    // reduced-motion block above it, where it only stills a transition.
    const section = SHEET.slice(SHEET.indexOf('THE `node` APPEARANCE'));
    expect(rule('.crewlet-tree-canvas--node .crewlet-tree-canvas__under')).toContain('opacity: 1');
    expect(section).toMatch(/__under > :not\(\.crewlet-add-pill\) \{[^}]*opacity: 0/);
  });
});

// ---------------------------------------------------------------------------
// A node being composed: the ghost
// ---------------------------------------------------------------------------

/*
 * WHAT THESE PROTECT. A ghost is a card the LAYOUT knows about and the DATA
 * does not, and every one of these is a way that could stop being true:
 *
 * - the tree is untouched by it, so no real node's level, position, set size
 *   or key moves and no key, type ahead or selection can land on it;
 * - the chart makes room for it where the new node will go, and draws the
 *   branch into it;
 * - the view eases onto it and is given back;
 * - focus goes into the form and comes back to the node it was added to;
 * - Escape cancels;
 * - a closed parent is opened, or the ghost is drawn where nobody can see it.
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
   * THE ONE THAT MATTERS MOST. A phantom in the NODE forest would be counted
   * by `aria-setsize`, reachable by an arrow and holdable by the selection,
   * and a screen reader would be told a unit has four children while three
   * exist. Read as the whole shape rather than as one number, so a ghost that
   * shifted any node's level, position or expansion fails here too.
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
   * THE CHART MAKES ROOM. The ghost is a card of the layout, placed after the
   * parent's own children, so the rank it lands in is the rank the new node
   * will land in and the siblings move aside for it. Its measured size is what
   * the room is made for: a form, not a name.
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
   * THE SAME, ON A CHART THAT DOES NOT FIT ITS PANE, which is the only shape
   * either of the two defects behind this shows up in, and neither was
   * catchable on the fixture above.
   *
   *  - THE VIEW WAS REMEMBERED TOO LATE. A ghost widens the chart, and a
   *    canvas answers content that changed shape by keeping what it holds
   *    reachable; asked for the view only once the ghost had been MEASURED,
   *    what came back was the chart as the ghost had left it.
   *  - FOCUS GOING BACK TO THE PARENT REVEALED IT. Focusing a node also pans
   *    the chart the least distance that brings it into view, which is the
   *    wrong thing one line after the reader's own view has been given back.
   *
   * Forty seats under the company is wider than this suite's 1200px pane at
   * any zoom, which is what makes both of them measurable.
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
   * AND IT IS NOT BLOWN UP TO GET THERE. A ghost holds a FORM, drawn at the
   * size its controls were designed at; a chart with few nodes has room to
   * zoom far past that, and the ease took it. Measured on the engine's own
   * two-node company: the add form was drawn at 233%, its 16px labels at 37px
   * and its buttons past a finger's width, with the chart around it off the
   * pane. The ease brings the reader to the form rather than magnifying it.
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
   * FOCUS GOES INTO THE FORM, on the first control in it and not on the ghost
   * that holds it. A hidden subtree holds nothing focusable, so this is also
   * the guard on the ghost being PLACED by the commit the form is focused on:
   * drawn from the frame being painted rather than from the layout, it had no
   * position for that one commit, and a reader arrived at a form with the
   * cursor nowhere.
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
   * AND IT LANDS ON THE FIRST LAYOUT THAT PLACES THE GHOST, not on the tick
   * the ghost first renders.
   *
   * A card the layout has not placed is drawn with `visibility: hidden`, and
   * `focus()` on anything inside an invisible element does nothing at all: it
   * returns having moved nothing, silently, and `visibility` INHERITS, so the
   * form carries no style of its own to say why. Asked once on that tick, the
   * form opened with the cursor on the node behind it and Escape reached
   * nothing.
   *
   * REDUCED MOTION IS WHERE THIS BITES, and the case asks for it, because it
   * is what the ordinary path masks: with the chart's motion on, the entrance
   * produces further commits and one of them lands the focus by accident.
   * Measured in a browser, where the failure is certain rather than likely.
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
   * AND A READER WHO HAS MOVED WITHIN THE FORM IS LEFT THERE. A chart relays
   * under an open form whenever a push changes the draft, and each relayout is
   * another pass at putting focus in it: pulled back every time, somebody who
   * had moved to the second field would be returned to the first half way
   * through typing.
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
   * ESCAPE LEAVES THE COMPOSITION FROM ANYWHERE IN THE CHART. It is a MODE the
   * chart is in, and a reader leaves a mode with Escape wherever they happen
   * to be: in the form they are typing in, or on a node behind it, which is
   * where the press that opened the composition can leave them.
   */
  /*
   * AND IT IS ASKED AGAIN WHEN THE CARD IS PLACED AND THE ATTEMPT STILL FAILS.
   *
   * This is the ordering a browser produces and jsdom does not. By the time
   * the card is placed the composing effect has stopped renewing the request,
   * because it renews only while the ghost is unplaced; so on that commit the
   * retry inside the focus effect is the ONLY thing that can ask again. The
   * case above cannot see it, because there the request is still being renewed
   * and either mechanism would do: measured, breaking the retry alone turned
   * nothing red.
   *
   * What makes it visible is the lag itself. The DOM is a commit behind the
   * layout in a browser, so the first attempt on a placed card is refused
   * although this component believes the card is there; `FOCUS_REFUSALS`
   * models exactly that and nothing else.
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
   * WIDER THAN A NODE, AND THE SPECIFICITY IS THE WHOLE OF IT. The `node`
   * appearance caps a card at its name's width with a two-class rule; written
   * as one class this rule lost the cascade and the ghost was drawn at 16.5rem
   * with the form spilling out of it. Measured through the cascade rather than
   * read out of the source, because the source is what looked right.
   */
  test('the ghost is drawn at a form width, not at a node width', () => {
    // `installSheets` rather than the themed one: what is measured here is a
    // LENGTH behind a component's own custom property, and only this one
    // substitutes a var()'s fallback. The colours are measured where they
    // live, as this helper's own doc says.
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
     * THE ONE HALF THE CASCADE CANNOT ANSWER. jsdom applies no `@media` rule
     * at all, whatever the condition, so what is in the block is read from
     * the source, EVERY PART OF IT NAMED: read as "the block mentions
     * composing somewhere" it passed with the ghost card itself dropped out
     * of it, because the branch selector inside the same block still said the
     * word. The half that IS drawn is measured below.
     */
    const at = SHEET.indexOf(
      '@media (prefers-reduced-motion: reduce)',
      SHEET.indexOf('__card--composing'),
    );
    const guarded = SHEET.slice(at, SHEET.indexOf('\n}\n', at));
    for (const selector of [
      '.crewlet-tree-canvas__card--composing,',
      ".crewlet-tree-canvas__links path[data-composing='true'] {",
      '.crewlet-tree-canvas__card--composing > * {',
      '.crewlet-tree-canvas__card--composing::after {',
    ]) {
      expect(guarded).toContain(selector);
    }
    expect(guarded.match(/animation: none/g)).toHaveLength(3);
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
  });
});
