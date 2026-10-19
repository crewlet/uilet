/**
 * The kit's custom elements and its one script call.
 *
 *   <crewlet-sheet collection="vendors" sort="-score" frozen="1">
 *     <crewlet-column field="vendor" type="text" label="Vendor"></crewlet-column>
 *     <crewlet-column field="score" type="number" label="Score" format="0.0"></crewlet-column>
 *   </crewlet-sheet>
 *
 *   import { mountSheet } from '/_crewlet/kit/<version>/kit.js';
 *   mountSheet(document.querySelector('#grid'), { collection: 'vendors' });
 *
 * LIGHT DOM, not shadow DOM: the tokens cascade into the sheet, and the page's
 * own stylesheet can sit beside it with `var(--color-*)`. The sheet renders
 * into a container it appends, so the `<crewlet-column>` children it reads
 * stay where the author wrote them.
 */

import { createRoot, type Root } from 'react-dom/client';
import type { SheetColumn, SheetSort } from '@crewlethq/ui/SheetModel';
import { COLUMN_ATTRIBUTES, columnFromAttributes, parseSort } from './bind.js';
import { KitSheet } from './KitSheet.js';
import { readyRuntime, whenRuntime, type KitRuntime } from './runtime.js';

export interface SheetOptions {
  /** The datastore collection the sheet edits. */
  collection: string;
  /** The columns to draw, in order; the collection's schema when absent. */
  columns?: readonly SheetColumn[] | undefined;
  /** The initial order. */
  sort?: SheetSort | null | undefined;
  /** How many leading columns stay in view while the sheet scrolls sideways. */
  frozen?: number | undefined;
  /** Draws the sheet read only, whatever the reader may do. */
  readOnly?: boolean | undefined;
  /** The grid's accessible name. */
  label?: string | undefined;
  /** The most the sheet grows to in px; it is as tall as its rows below that, and its rows scroll past it. */
  height?: number | undefined;
  /** The runtime to bind to; `window.crewlet` when absent. */
  runtime?: KitRuntime | undefined;
}

export interface MountedSheet {
  /** Draws the sheet again with changed options. */
  update(options: SheetOptions): void;
  /** Takes the sheet down and releases its subscriptions. */
  unmount(): void;
}

/**
 * Draws a sheet into an element of the page, bound to the runtime, and hands
 * back the handle that updates it or takes it down. Rendering waits for the
 * runtime when the kit was loaded before it.
 */
export function mountSheet(element: Element, options: SheetOptions): MountedSheet {
  const container = element.ownerDocument.createElement('div');
  container.className = 'crewlet-kit-sheet__root';
  element.append(container);
  const root: Root = createRoot(container);
  let current = options;
  // Set only once the runtime's handshake has completed: until then it
  // declares no capability, and a sheet drawn then would say so for good.
  let runtime: KitRuntime | null = null;
  let gone = false;

  const draw = () => {
    if (gone || !runtime) return;
    root.render(
      <KitSheet
        runtime={runtime}
        collection={current.collection}
        columns={current.columns && current.columns.length > 0 ? current.columns : null}
        sort={current.sort ?? null}
        frozen={current.frozen}
        readOnly={current.readOnly}
        label={current.label}
        height={current.height}
      />,
    );
  };

  const bind = (found: Promise<KitRuntime>) => {
    void found.then((ready) => {
      runtime = ready;
      draw();
    });
  };
  bind(options.runtime ? readyRuntime(options.runtime) : whenRuntime(element.ownerDocument.defaultView ?? window));

  return {
    update(next) {
      current = next;
      if (next.runtime && next.runtime !== runtime) bind(readyRuntime(next.runtime));
      draw();
    },
    unmount() {
      gone = true;
      root.unmount();
      container.remove();
    },
  };
}

/** A column of the sheet it sits in. Inert: the sheet reads its attributes. */
export class CrewletColumnElement extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return COLUMN_ATTRIBUTES;
  }

  attributeChangedCallback(): void {
    this.closest('crewlet-sheet')?.dispatchEvent(new Event('crewlet-columnchange'));
  }

  /** This column as the sheet draws it, or null for one with no field. */
  toColumn(): SheetColumn | null {
    return columnFromAttributes((name) => this.getAttribute(name));
  }
}

const SHEET_ATTRIBUTES = ['collection', 'sort', 'frozen', 'readonly', 'label', 'height'] as const;

/** A sheet bound to one of the page's datastore collections. */
export class CrewletSheetElement extends HTMLElement {
  private mounted: MountedSheet | null = null;
  private readonly observer: MutationObserver | null = typeof MutationObserver === 'function' ? new MutationObserver(() => this.refresh()) : null;

  static get observedAttributes(): readonly string[] {
    return SHEET_ATTRIBUTES;
  }

  connectedCallback(): void {
    this.addEventListener('crewlet-columnchange', this.onColumnChange);
    this.observer?.observe(this, { childList: true });
    this.refresh();
  }

  disconnectedCallback(): void {
    this.removeEventListener('crewlet-columnchange', this.onColumnChange);
    this.observer?.disconnect();
    this.mounted?.unmount();
    this.mounted = null;
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.refresh();
  }

  private readonly onColumnChange = () => this.refresh();

  /** The options the element's attributes and columns say. */
  options(): SheetOptions | null {
    const collection = this.getAttribute('collection')?.trim();
    if (!collection) return null;
    const columns = [...this.children]
      .filter((child): child is CrewletColumnElement => child instanceof CrewletColumnElement)
      .map((child) => child.toColumn())
      .filter((column): column is SheetColumn => column !== null);
    const frozen = Number(this.getAttribute('frozen'));
    const height = Number(this.getAttribute('height'));
    const options: SheetOptions = {
      collection,
      columns,
      sort: parseSort(this.getAttribute('sort')),
      readOnly: this.hasAttribute('readonly'),
    };
    if (this.hasAttribute('frozen') && Number.isInteger(frozen) && frozen >= 0) options.frozen = frozen;
    if (this.hasAttribute('height') && Number.isFinite(height) && height > 0) options.height = height;
    const label = this.getAttribute('label')?.trim();
    if (label) options.label = label;
    return options;
  }

  private refresh(): void {
    const options = this.options();
    if (!options) {
      this.mounted?.unmount();
      this.mounted = null;
      return;
    }
    if (this.mounted) this.mounted.update(options);
    else this.mounted = mountSheet(this, options);
  }
}

/** Defines the kit's elements once, in the registry of the window given. */
export function defineElements(registry: CustomElementRegistry = customElements): void {
  if (!registry.get('crewlet-column')) registry.define('crewlet-column', CrewletColumnElement);
  if (!registry.get('crewlet-sheet')) registry.define('crewlet-sheet', CrewletSheetElement);
}
