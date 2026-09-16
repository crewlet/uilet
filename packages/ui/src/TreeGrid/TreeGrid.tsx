/**
 * A hierarchy as rows and columns: the view a keyboard or a screen reader user
 * works fastest in, and the one a narrow screen falls back to.
 *
 * A TREEGRID, NOT A TREE. Every row says its level, position and expansion
 * like a treeitem, and its cells are navigable like a grid's. A row holds
 * focus by default and its keys act on the node (Enter activates, Delete or
 * Backspace removes, the ContextMenu key or Shift+F10 opens its actions);
 * Right opens a closed row or steps into its cells, Left steps back out,
 * closes the row or climbs to its parent, Up and Down keep the column. A cell
 * holding a control focuses the control itself, so what the cell does is one
 * Enter away, and the grid's one tab stop is wherever focus is: a press that
 * opens a cell's menu moves it to that cell, and the row's chevron, which is
 * pointer only and hidden from assistive technology, takes no focus at all.
 *
 * NAVIGATION KEYS ARE CAPTURED, so they reach the grid before the control that
 * holds focus in a cell: ArrowDown on a menu button would otherwise open the
 * menu instead of moving to the next row. An open menu keeps its keys because
 * it is in no row: it renders in the layer over the grid, and React carries
 * its keys up through this handler with a target no row contains.
 *
 * THE MENUS OPEN OVER THE GRID, NOT INSIDE IT. The grid scrolls sideways at
 * narrow widths, and a box that scrolls on one axis clips on both, so a menu
 * drawn under its trigger in the last rows would be cut off and would scroll
 * the grid down instead of opening. The frame publishes a LayerHost over the
 * scroller, and a sideways scroll tells that layer so an open surface follows
 * its trigger or closes with it.
 *
 * Ported from the generic half of the engine dashboard's org builder outline.
 */

import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { LAYER_REPOSITION_EVENT, LayerHost, focusables } from '../Layer/index.js';
import { LayerNodeBridge } from '../Canvas/layerNode.js';
import { IconButton } from '../IconButton/index.js';
import {
  treeExpandable,
  treeItemAction,
  treeLevel,
  treeNext,
  treePosInSet,
  treePrevious,
  treeSetSize,
  treeStep,
  useTreeState,
  type TreeInput,
  type TreeItemAction,
  type TreeViewHandle,
} from '../Tree/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface TreeGridColumn {
  key: string;
  /** The column's name. */
  header: string;
  /**
   * Read but not seen, for a column whose heading would be noise in the sight
   * of it and is still the only thing a screen reader has (an actions column).
   */
  headerHidden?: boolean | undefined;
  /** This column's grid track. One flexible column by default. */
  width?: string | undefined;
}

/** A row that holds only controls, such as an inline Add row. */
export interface TreeGridAddRow {
  /** The row's accessible name, since its cells are all controls: "Add to Platform". */
  label: string;
  /** How many cells it has, which is what End and Right count to. */
  cells: number;
}

/** What a cell needs from the grid it is drawn in. */
export interface TreeGridContext {
  expanded(id: string): boolean;
  expandable(id: string): boolean;
  toggle(id: string): void;
  /**
   * Whether this cell holds the grid's one tab stop. A control in a cell takes
   * `tabIndex` from it; a cell with no control takes the stop itself.
   */
  tabStop(id: string, column: number): boolean;
  /** Says a press opened a control in this cell, so the tab stop follows focus into it. */
  opened(id: string, column: number): void;
  /**
   * The props that make a press anywhere in a pointer-only strip land on the
   * row rather than on the control it hit.
   */
  press(id: string): { onMouseDown(event: MouseEvent<HTMLElement>): void };
  menuOpen(id: string): boolean;
  setMenuOpen(id: string, open: boolean): void;
}

/** Every string the grid renders on its own. */
export interface TreeGridLabels {
  /** The pointer-only chevron's tooltip, given the row's own label. */
  expand: (label: string) => string;
  collapse: (label: string) => string;
}

const LABELS: TreeGridLabels = {
  expand: (label) => `Expand ${label}`,
  collapse: (label) => `Collapse ${label}`,
};

/**
 * The control a cell hands its tab stop to: the first focusable element in it
 * that is not hidden from assistive technology. The chevron is hidden, which
 * is what keeps it out of this answer.
 *
 * WHAT COUNTS AS FOCUSABLE IS THE LAYER STACK'S ANSWER, not a list of the
 * elements a grid happens to hold today. A cell whose control is a link, an
 * input, a chooser or an element made focusable with `tabindex` is a cell the
 * grid has to step into as readily as one holding a menu trigger, and a
 * control it could not find would leave the stop on the cell with nothing for
 * Enter to do. A second selector here would be a second idea of what a
 * keyboard reaches, disagreeing with the trap about a disabled button.
 */
function controlIn(cell: HTMLElement): HTMLElement | null {
  return focusables(cell).find((el) => !el.closest('[aria-hidden="true"]')) ?? null;
}

export interface TreeGridProps {
  /** The accessible name of the grid, such as "Organization outline". */
  label: string;
  columns: readonly TreeGridColumn[];
  /**
   * The hierarchy: every row, nested. An add row is one of these too.
   *
   * Keep it stable across renders (a `useMemo` over what it is derived from).
   * A fresh array each render rebuilds the model, and with it the visible
   * order, on every push a parent takes.
   */
  rows: readonly TreeInput[];
  /**
   * Draws one cell. `column` is its one based position, which is also its
   * `aria-colindex`, so a caller reads its own `columns` by `column - 1`. The
   * first cell is drawn after the chevron strip, inside the same cell.
   */
  renderCell: (id: string, column: number, grid: TreeGridContext) => ReactNode;
  /**
   * Whether a cell holds a control that takes the grid's tab stop for itself
   * (a menu trigger, a chooser, a button). It is asked per row as well as per
   * column, because one column often holds a control on some rows and plain
   * text on others.
   */
  cellHasControl?: ((id: string, column: number) => boolean) | undefined;
  /**
   * Carries out Enter (activate) or Delete and Backspace (remove) on a row.
   * Return false when the row has no such action, so the key travels on.
   *
   * Called only while the ROW itself holds focus, never from inside a cell,
   * and never on an add row. The Menu key is not here: which menu is open is
   * this component's state, so it opens the row's own menu itself when
   * `hasRowMenu` says there is one.
   */
  onRowKey?: ((id: string, action: Exclude<TreeItemAction, 'menu'>) => boolean) | undefined;
  /**
   * Any other key the caller claims on a row, such as Alt with an arrow to
   * reorder it. Asked FIRST, while the row itself holds focus, and never on an
   * add row; return true when it was handled, and the grid swallows the key.
   */
  onRowKeyDown?: ((id: string, event: KeyboardEvent<HTMLElement>) => boolean) | undefined;
  /** Whether a row has a menu the ContextMenu key and Shift+F10 can open. */
  hasRowMenu?: ((id: string) => boolean) | undefined;
  /**
   * Whether a row is an add row, and what it is called. An add row is a row of
   * the grid like any other, so it counts in its siblings' position and set
   * size; it just holds controls rather than a node's own data.
   */
  addRow?: ((id: string) => TreeGridAddRow | null) | undefined;
  /** The selected row, drawn as `aria-selected`. */
  selectedId?: string | null | undefined;
  /**
   * Selection follows focus. Called with every row focus reaches except an add
   * row, which names no node.
   */
  onSelect?: ((id: string) => void) | undefined;
  /** Sets `aria-readonly`: the rows can be read and navigated but not edited. */
  readOnly?: boolean | undefined;
  labels?: Partial<TreeGridLabels> | undefined;
  ref?: Ref<TreeViewHandle> | undefined;
  className?: string | undefined;
}

export function TreeGrid({
  label,
  columns,
  rows: forest,
  renderCell,
  cellHasControl,
  onRowKey,
  onRowKeyDown,
  hasRowMenu,
  addRow,
  selectedId = null,
  onSelect,
  readOnly,
  labels,
  ref,
  className,
}: TreeGridProps) {
  const text = { ...LABELS, ...labels };
  const tree = useTreeState(forest, selectedId);
  const { model, expanded, rows, active, setActive, toggle } = tree;

  /** The column of the active row that holds focus; `null` when the row itself does. */
  const [column, setColumn] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // Read through refs, so the callbacks below stay stable whatever a parent
  // re-renders: a grid of a few hundred rows re-creates none of them per push.
  const current = useRef({ addRow, onSelect });
  current.current = { addRow, onSelect };
  const isAddRow = (id: string) => current.current.addRow?.(id) ?? null;

  // ---- focus -----------------------------------------------------------------
  const rowEls = useRef(new Map<string, HTMLElement>());
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const rowRef = (id: string) => {
    let callback = refs.current.get(id);
    if (!callback) {
      callback = (el) => {
        if (el) rowEls.current.set(id, el);
        else rowEls.current.delete(id);
      };
      refs.current.set(id, callback);
    }
    return callback;
  };

  // A FOCUS REQUEST IS TAKEN BY THE RENDER IT CAUSES, AND BY NO OTHER. Focus
  // moves once the row it names is rendered (a row inside a node just opened,
  // a row an operation just added, a row a reorder just moved, which a browser
  // blurs as it moves it), so the request is state: each one is a new value,
  // so even a request for the row already active causes a render, and the
  // effect acts on that value once. A request held anywhere else would move no
  // focus when nothing else changed (an undo from a toolbar asking for its
  // node), then pull focus back to that row on whatever render came next,
  // wherever the operator had gone since.
  const [request, setRequest] = useState<{ readonly id: string; readonly column: number | null } | null>(null);
  const focusAt = useCallback(
    (id: string, col: number | null) => {
      if (current.current.addRow?.(id) == null) current.current.onSelect?.(id);
      setActive(id);
      setColumn(col);
      setRequest({ id, column: col });
    },
    [setActive],
  );
  useLayoutEffect(() => {
    const row = request ? rowEls.current.get(request.id) : undefined;
    if (!request || !row) return;
    if (request.column === null) {
      row.focus();
      return;
    }
    const cell = row.querySelector<HTMLElement>(`[aria-colindex="${request.column}"]`);
    const control = cell ? controlIn(cell) : null;
    (control ?? cell ?? row).focus();
  }, [request]);

  const focusRef = useRef<(id: string) => void>(() => {});
  focusRef.current = (id: string) => {
    if (!model.parent.has(id)) return;
    tree.open(id);
    focusAt(id, null);
  };
  const { expandAll, collapseAll } = tree;
  useImperativeHandle(
    ref,
    () => ({ focusNode: (id: string) => focusRef.current(id), expandAll, collapseAll }),
    [expandAll, collapseAll],
  );

  // ---- keys -------------------------------------------------------------------
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-tree-id]');
    if (!row) return;
    const id = row.getAttribute('data-tree-id')!;
    const onRow = target === row;
    const cellIndex = target.closest("[role='gridcell']")?.getAttribute('aria-colindex');
    const col = onRow || !cellIndex ? null : Number(cellIndex);
    const add = isAddRow(id);
    const cells = add ? add.cells : columns.length;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    if (onRow && add === null) {
      if (onRowKeyDown?.(id, event)) {
        handled();
        return;
      }
      const action = treeItemAction(event);
      if (action === 'menu') {
        if (hasRowMenu?.(id)) {
          handled();
          setMenuFor(id);
        }
        return;
      }
      if (action !== null) {
        if (onRowKey?.(id, action)) handled();
        return;
      }
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const sameColumn = (next: string | null) => {
      if (next === null) return;
      const other = isAddRow(next);
      const width = other ? other.cells : columns.length;
      focusAt(next, col === null ? null : Math.min(col, width));
    };

    if (col !== null) {
      switch (event.key) {
        case 'ArrowRight':
          handled();
          if (col < cells) focusAt(id, col + 1);
          return;
        case 'ArrowLeft':
          handled();
          focusAt(id, col > 1 ? col - 1 : null);
          return;
        case 'Home':
          handled();
          focusAt(id, 1);
          return;
        case 'End':
          handled();
          focusAt(id, cells);
          return;
        case 'ArrowDown':
          handled();
          sameColumn(treeNext(model, expanded, id));
          return;
        case 'ArrowUp':
          handled();
          sameColumn(treePrevious(model, expanded, id));
          return;
        default:
          // Enter and Space belong to the control in the cell.
          return;
      }
    }

    // A row: Right opens a closed row, and steps into an open or leaf row's cells.
    if (event.key === 'ArrowRight' && !(treeExpandable(model, id) && !expanded.has(id))) {
      handled();
      focusAt(id, 1);
      return;
    }
    if (add !== null && event.key === 'Enter') {
      handled();
      focusAt(id, 1);
      return;
    }
    const step = treeStep(tree, id, event);
    if (step === undefined) return;
    handled();
    if (step === null) return;
    if ('toggle' in step) toggle(step.toggle);
    else focusAt(step.focus, null);
  }

  // ---- the layer over the scroller ---------------------------------------------
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const onScroll = () => layer?.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT));

  // ---- rows ---------------------------------------------------------------------
  /** Whether the active cell of `id` is column `col`: its control is then the tab stop. */
  const stop = (id: string, col: number) => id === active && column === col;
  // A POINTER OPENING A CELL'S CONTROL MOVES THE TAB STOP TO IT. The control
  // keeps the focus the press gave it and hands it back when the menu closes,
  // so the grid's one tab stop has to be that cell rather than the row it sits
  // in. Focus is not moved here: the control is taking it.
  const grid: TreeGridContext = {
    expanded: (id) => expanded.has(id),
    expandable: (id) => treeExpandable(model, id),
    toggle,
    tabStop: stop,
    opened: (id, col) => {
      setActive(id);
      setColumn(col);
    },
    press: (id) => ({
      onMouseDown: (event) => {
        // The press must not focus the control it landed on: see the module doc.
        event.preventDefault();
        focusAt(id, null);
      },
    }),
    menuOpen: (id) => menuFor === id,
    setMenuOpen: (id, open) => setMenuFor((was) => (open ? id : was === id ? null : was)),
  };

  const template = columns.map((one) => one.width ?? 'minmax(0, 1fr)').join(' ');

  return (
    <div className={cx('crewlet-tree-grid', className)}>
      <LayerHost className="crewlet-tree-grid__layer">
        <div className="crewlet-tree-grid__scroller" onScroll={onScroll}>
          <div
            role="treegrid"
            aria-label={label}
            aria-colcount={columns.length}
            aria-readonly={readOnly || undefined}
            className="crewlet-tree-grid__grid"
            style={{ '--crewlet-tree-grid-columns': template } as CSSProperties}
            onKeyDownCapture={onKeyDownCapture}
          >
            <div role="rowgroup" className="crewlet-tree-grid__head">
              <div role="row" className="crewlet-tree-grid__row">
                {columns.map((one, index) => (
                  <div role="columnheader" aria-colindex={index + 1} key={one.key}>
                    {one.headerHidden ? <VisuallyHidden>{one.header}</VisuallyHidden> : one.header}
                  </div>
                ))}
              </div>
            </div>
            <div role="rowgroup">
              {rows.map((id) => {
                const add = isAddRow(id);
                const cells = add ? add.cells : columns.length;
                const expandable = treeExpandable(model, id);
                const open = expanded.has(id);
                const name = model.label.get(id) ?? '';
                return (
                  /* The row's keys are the GRID's, captured at the treegrid so
                     one handler serves every row and reaches a cell's control
                     first. A listener on the row itself would be a second
                     place for them to live. */
                  /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- see above */
                  <div
                    key={id}
                    role="row"
                    data-tree-id={id}
                    ref={rowRef(id)}
                    tabIndex={id === active && column === null ? 0 : -1}
                    aria-level={treeLevel(model, id)}
                    aria-setsize={treeSetSize(model, id)}
                    aria-posinset={treePosInSet(model, id)}
                    aria-expanded={expandable ? open : undefined}
                    aria-selected={add ? undefined : id === selectedId}
                    aria-label={add ? add.label : undefined}
                    className={cx('crewlet-tree-grid__row', add && 'crewlet-tree-grid__row--add')}
                    style={{ '--crewlet-tree-grid-depth': treeLevel(model, id) - 1 } as CSSProperties}
                    onClick={(event) => {
                      // A press on a control in the row is the control's; a
                      // press on the row itself selects it and takes focus.
                      if ((event.target as HTMLElement).closest("button, [role='menu']")) return;
                      focusAt(id, null);
                    }}
                  >
                    {Array.from({ length: cells }, (_, index) => {
                      const col = index + 1;
                      return (
                        <div
                          key={col}
                          role="gridcell"
                          aria-colindex={col}
                          tabIndex={stop(id, col) && !cellHasControl?.(id, col) ? 0 : -1}
                          className="crewlet-tree-grid__cell"
                        >
                          {col === 1 && (
                            /* THE PRESS LANDS ON THE ROW. The chevron is a
                               pointer-only control hidden from assistive
                               technology (the keyboard opens and closes a row
                               with Right and Left), and focus inside a hidden
                               subtree is focus nowhere, so the press is stopped
                               from focusing it and the row takes the focus. */
                            <span
                              className="crewlet-tree-grid__toggle"
                              /* ONE GLYPH, TURNED. Two drawings swapped is a
                                 cut where opening a row is a movement, and the
                                 chevron that turns is what every tree in the
                                 console draws. The state is on the span so the
                                 rule can turn the mark without the control
                                 around it moving. */
                              data-open={open ? '' : undefined}
                              aria-hidden="true"
                              {...grid.press(id)}
                            >
                              {expandable && (
                                <IconButton
                                  size="sm"
                                  label={open ? text.collapse(name) : text.expand(name)}
                                  icon={<ChevronRightGlyph />}
                                  tabIndex={-1}
                                  onClick={() => toggle(id)}
                                />
                              )}
                            </span>
                          )}
                          {renderCell(id, col, grid)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <LayerNodeBridge onNode={setLayer} />
      </LayerHost>
    </div>
  );
}
