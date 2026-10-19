/**
 * The blocks that draw more than their element while they are edited: a code
 * block's language, a callout's tone, a task's box, a picture's file, a
 * table's scroller.
 *
 * Each is the element shape the reader's renderer emits, so `Document` sets it
 * the same way, plus a CONTROL SLOT that is not part of the content
 * (`contenteditable="false"`). The editor draws its React controls into those
 * slots through portals ([SlotStore]), so a code block's language field is a
 * design system field rather than markup built here.
 */

import type { Node as PMNode } from 'prosemirror-model';
import type { EditorView, NodeView, ViewMutationRecord } from 'prosemirror-view';
import { safeHref } from '../Markdown/index.js';
import { toggleTask } from './commands.js';

/** A control slot a node view opened, for the editor to draw into. */
export interface Slot {
  kind: 'code' | 'callout';
  element: HTMLElement;
  node: PMNode;
  getPos: () => number | undefined;
}

/** The open slots, which the editor subscribes to and draws portals into. */
export class SlotStore {
  private slots = new Set<Slot>();
  private listeners = new Set<() => void>();
  private snapshot: Slot[] = [];

  add(slot: Slot): void {
    this.slots.add(slot);
    this.emit();
  }

  remove(slot: Slot): void {
    this.slots.delete(slot);
    this.emit();
  }

  changed(): void {
    this.emit();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = (): Slot[] => this.snapshot;

  private emit(): void {
    this.snapshot = [...this.slots];
    for (const listener of this.listeners) listener();
  }
}

function slotElement(className: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  el.contentEditable = 'false';
  return el;
}

/** A node view whose slot holds React controls: events there are the controls', not the editor's. */
class SlotView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private slot: Slot;

  constructor(
    private node: PMNode,
    private store: SlotStore,
    getPos: () => number | undefined,
    build: () => { dom: HTMLElement; contentDOM: HTMLElement; slot: HTMLElement; kind: Slot['kind'] },
  ) {
    const built = build();
    this.dom = built.dom;
    this.contentDOM = built.contentDOM;
    this.slot = { kind: built.kind, element: built.slot, node, getPos };
    store.add(this.slot);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.slot.node = node;
    this.paint(node);
    this.store.changed();
    return true;
  }

  paint(node: PMNode): void {
    if (node.type.name === 'callout') this.dom.setAttribute('data-callout', node.attrs.tone as string);
    if (node.type.name === 'code_block') {
      const pre = this.contentDOM.parentElement;
      if (node.attrs.lang) pre?.setAttribute('data-lang', node.attrs.lang as string);
      else pre?.removeAttribute('data-lang');
    }
  }

  stopEvent(event: Event): boolean {
    return this.slot.element.contains(event.target as Node);
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    return this.slot.element.contains(mutation.target);
  }

  destroy(): void {
    this.store.remove(this.slot);
  }
}

export function codeBlockView(store: SlotStore) {
  return (node: PMNode, _view: EditorView, getPos: () => number | undefined): NodeView => {
    const view = new SlotView(node, store, getPos, () => {
      const dom = document.createElement('div');
      dom.className = 'crewlet-rich-editor__code';
      const slot = slotElement('crewlet-rich-editor__code-bar');
      const pre = document.createElement('pre');
      pre.className = 'md-code';
      const code = document.createElement('code');
      pre.appendChild(code);
      dom.append(slot, pre);
      return { dom, contentDOM: code, slot, kind: 'code' };
    });
    view.paint(node);
    return view;
  };
}

export function calloutView(store: SlotStore) {
  return (node: PMNode, _view: EditorView, getPos: () => number | undefined): NodeView => {
    const view = new SlotView(node, store, getPos, () => {
      const dom = document.createElement('div');
      dom.setAttribute('role', 'note');
      const slot = slotElement('crewlet-rich-editor__callout-bar');
      slot.setAttribute('data-callout-label', '');
      const body = document.createElement('div');
      body.setAttribute('data-callout-body', '');
      dom.append(slot, body);
      return { dom, contentDOM: body, slot, kind: 'callout' };
    });
    view.paint(node);
    return view;
  };
}

/**
 * A list item, and a task item's box. The box is the same native checkbox
 * the reader's renderer draws, and here it can be pressed: a press ticks the
 * task without moving the caret.
 */
export function listItemView(labels: () => { done: string; notDone: string }) {
  return (node: PMNode, view: EditorView, getPos: () => number | undefined): NodeView => {
    const li = document.createElement('li');
    if (node.attrs.checked === null) return { dom: li, contentDOM: li };
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.contentEditable = 'false';
    const body = document.createElement('div');
    body.className = 'md-task-body';
    li.append(box, body);
    const paint = (checked: boolean) => {
      box.checked = checked;
      box.setAttribute('aria-label', checked ? labels().notDone : labels().done);
    };
    paint(Boolean(node.attrs.checked));
    box.addEventListener('mousedown', (event) => event.preventDefault());
    box.addEventListener('click', (event) => {
      event.preventDefault();
      const pos = getPos();
      if (pos === undefined || !view.editable) return;
      toggleTask(pos)(view.state, view.dispatch);
    });
    let current = node;
    return {
      dom: li,
      contentDOM: body,
      update(next) {
        if (next.type !== current.type || (next.attrs.checked === null) !== (current.attrs.checked === null)) return false;
        current = next;
        paint(Boolean(next.attrs.checked));
        return true;
      },
      stopEvent: (event) => event.target === box,
      ignoreMutation: (mutation) => mutation.target === box,
    };
  };
}

/** A table inside the scroller the reader's renderer wraps it in. */
export function tableView(node: PMNode): NodeView {
  const dom = document.createElement('div');
  dom.className = 'md-table';
  const table = document.createElement('table');
  const body = document.createElement('tbody');
  table.appendChild(body);
  dom.appendChild(table);
  void node;
  return { dom, contentDOM: body };
}

/** How a picture's address is shown: a doc's are files of its version. */
export type ImageResolver = (src: string) => string | null;

/**
 * A picture, shown from where the application says (a doc's file, through an
 * object URL) or, without a resolver, from an address a reader may follow.
 * One it cannot show reads as its alt text, as it does to a reader.
 */
export class ImageViews {
  private views = new Set<{ node: PMNode; paint: () => void }>();

  constructor(private resolve: () => ImageResolver | undefined) {}

  /** Paint every picture again, when what the resolver can answer has changed. */
  refresh(): void {
    for (const view of this.views) view.paint();
  }

  view = (node: PMNode): NodeView => {
    const dom = document.createElement('span');
    dom.className = 'crewlet-rich-editor__image';
    const entry = {
      node,
      paint: () => {
        const src = entry.node.attrs.src as string;
        const alt = entry.node.attrs.alt as string;
        const resolver = this.resolve();
        const shown = resolver ? resolver(src) : safeHref(src);
        dom.replaceChildren();
        if (shown) {
          const img = document.createElement('img');
          img.alt = alt;
          img.src = shown;
          img.draggable = false;
          dom.appendChild(img);
        } else {
          const text = document.createElement('span');
          text.className = 'crewlet-rich-editor__image-alt';
          text.textContent = alt || src;
          dom.appendChild(text);
        }
      },
    };
    entry.paint();
    this.views.add(entry);
    return {
      dom,
      update: (next) => {
        if (next.type !== entry.node.type) return false;
        const same = next.attrs.src === entry.node.attrs.src && next.attrs.alt === entry.node.attrs.alt;
        entry.node = next;
        if (!same) entry.paint();
        return true;
      },
      destroy: () => {
        this.views.delete(entry);
      },
    };
  };
}
