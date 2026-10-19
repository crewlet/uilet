/**
 * The editor itself: ProseMirror, drawn as the document it edits, with the
 * slash menu, the selection toolbar, the link and picture panels and the
 * table bar around it. Loaded lazily by `RichEditor`, so nothing here is
 * fetched until somebody edits.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { EditorState, NodeSelection, TextSelection, type Command, type Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  ChevronDownGlyph,
  CodeGlyph,
  ExternalLinkGlyph,
  Heading1Glyph,
  Heading2Glyph,
  Heading3Glyph,
  ImageGlyph,
  InfoGlyph,
  ItalicGlyph,
  BoldGlyph,
  LinkGlyph,
  ListChecksGlyph,
  ListGlyph,
  ListOrderedGlyph,
  MinusGlyph,
  PencilGlyph,
  SquareCodeGlyph,
  StrikethroughGlyph,
  TableGlyph,
  TextAlignCenterGlyph,
  TextAlignEndGlyph,
  TextAlignStartGlyph,
  TextQuoteGlyph,
  TrashGlyph,
  TypeGlyph,
  UnlinkGlyph,
} from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { FormField, Input } from '../Input/index.js';
import { placePopup, usePopupLayer, viewportBounds, type PlacementRect } from '../Layer/index.js';
import { MARKDOWN_CALLOUT_TONES, safeHref, type MarkdownCalloutTone } from '../Markdown/index.js';
import { Menu } from '../Menu/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { readMarkdown, writeMarkdown, type MarkdownSource } from './codec.js';
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  alignColumn,
  columnAlign,
  deleteColumn,
  deleteRow,
  deleteTable,
  headingLevel,
  inCode,
  insertImage,
  insertRule,
  insertTable,
  linkAt,
  markActive,
  removeLink,
  setCalloutTone,
  setCodeBlock,
  setCodeLanguage,
  setLink,
  setList,
  setParagraph,
  tableAt,
  toggleCode,
  toggleEm,
  toggleHeading,
  toggleStrike,
  toggleStrong,
  unwrapAt,
  wrapCallout,
  wrapQuote,
} from './commands.js';
import { buildInputRules, buildKeymap } from './keys.js';
import { calloutView, codeBlockView, ImageViews, listItemView, SlotStore, tableView, type Slot } from './nodeviews.js';
import { clipboardPlugin, focusKey, focusPlugin, placeholderPlugin, slashKey, slashPlugin } from './plugins.js';
import { schema } from './schema.js';
import {
  richEditorLabels,
  type RichEditorBlock,
  type RichEditorCommand,
  type RichEditorHandle,
  type RichEditorLabels,
  type RichEditorProps,
} from './types.js';

const N = schema.nodes;
const M = schema.marks;

/** One entry of the slash menu. */
interface SlashItem {
  key: string;
  label: string;
  description?: string | undefined;
  icon: ReactNode;
  hint?: string | undefined;
  group: 'blocks' | 'insert';
  keywords: readonly string[];
  run?: Command;
  panel?: 'image' | { command: RichEditorCommand };
}

const BLOCKS: readonly {
  key: RichEditorBlock;
  icon: ReactNode;
  hint?: string;
  keywords: string[];
  run?: Command;
}[] = [
  { key: 'paragraph', icon: <TypeGlyph />, keywords: ['text', 'paragraph', 'plain'], run: setParagraph },
  { key: 'heading1', icon: <Heading1Glyph />, hint: '#', keywords: ['h1', 'title', 'heading'], run: toggleHeading(1) },
  { key: 'heading2', icon: <Heading2Glyph />, hint: '##', keywords: ['h2', 'subtitle', 'heading'], run: toggleHeading(2) },
  { key: 'heading3', icon: <Heading3Glyph />, hint: '###', keywords: ['h3', 'heading'], run: toggleHeading(3) },
  { key: 'bullet', icon: <ListGlyph />, hint: '-', keywords: ['bullet', 'unordered', 'list'], run: setList('bullet') },
  { key: 'ordered', icon: <ListOrderedGlyph />, hint: '1.', keywords: ['numbered', 'ordered', 'list'], run: setList('ordered') },
  { key: 'task', icon: <ListChecksGlyph />, hint: '[ ]', keywords: ['todo', 'task', 'checkbox', 'checklist'], run: setList('task') },
  { key: 'quote', icon: <TextQuoteGlyph />, hint: '>', keywords: ['quote', 'blockquote', 'citation'], run: wrapQuote },
  { key: 'callout', icon: <InfoGlyph />, keywords: ['callout', 'note', 'tip', 'warning', 'alert', 'admonition'], run: wrapCallout('note') },
  { key: 'code', icon: <SquareCodeGlyph />, hint: '```', keywords: ['code', 'snippet', 'pre'], run: setCodeBlock() },
  { key: 'table', icon: <TableGlyph />, keywords: ['table', 'grid', 'columns', 'rows'], run: insertTable() },
  { key: 'divider', icon: <MinusGlyph />, hint: '-'.repeat(3), keywords: ['divider', 'rule', 'separator', 'line', 'hr'], run: insertRule },
  { key: 'image', icon: <ImageGlyph />, keywords: ['image', 'picture', 'photo', 'figure'] },
];

/** What a slash item's filter matches: its label's words, and its keywords. */
function matches(item: SlashItem, query: string): number {
  const q = query.toLowerCase();
  if (!q) return 1;
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.split(/\s+/).some((word) => word.startsWith(q))) return 2;
  if (item.keywords.some((word) => word.startsWith(q))) return 1;
  return 0;
}

/** Re-render while the page scrolls or resizes, so a floating surface follows its anchor. */
function useViewportTick(active: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setTick((n) => n + 1));
    };
    window.addEventListener('scroll', tick, true);
    window.addEventListener('resize', tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', tick, true);
      window.removeEventListener('resize', tick);
    };
  }, [active]);
}

/** A rectangle around document positions, in viewport coordinates. */
function rectOf(view: EditorView, from: number, to = from): PlacementRect | null {
  try {
    const a = view.coordsAtPos(from);
    const b = view.coordsAtPos(to, -1);
    const left = Math.min(a.left, b.left);
    const top = Math.min(a.top, b.top);
    return { x: left, y: top, width: Math.max(1, Math.max(a.right, b.right) - left), height: Math.max(a.bottom, b.bottom) - top };
  } catch {
    // A position the view cannot measure (it is not laid out yet).
    return null;
  }
}

/** The pointer is coarse: the selection toolbar goes under a selection, clear of the system's own menu. */
function coarse(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * A surface placed beside an anchor rectangle, kept inside the viewport.
 * `popup` puts it on the layer stack, where Escape and a press outside close
 * it; a bar that follows the selection is not a popup and closes with it.
 */
function Floating({
  anchor,
  prefer = 'above',
  popup,
  center = false,
  className,
  children,
  ...rest
}: {
  anchor: PlacementRect;
  prefer?: 'above' | 'below';
  popup?: { onDismiss: () => void } | undefined;
  center?: boolean;
  className: string;
  children: ReactNode;
  role?: string;
  id?: string;
  'aria-label'?: string;
}) {
  const layer = usePopupLayer({ open: popup !== undefined, onDismiss: () => popup?.onDismiss() });
  const node = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const { x, y, width, height } = anchor;
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    const target = center ? { x: x + width / 2 - size.width / 2, y, width: size.width, height } : { x, y, width, height };
    const at = placePopup(target, size, viewportBounds(), 8, prefer);
    setPlace((prev) => (prev && prev.left === at.left && prev.top === at.top ? prev : { left: at.left, top: at.top }));
  }, [x, y, width, height, center, prefer]);
  return (
    <div
      {...rest}
      ref={(el) => {
        node.current = el;
        layer.panelRef(el);
      }}
      className={className}
      style={{
        left: place?.left ?? 0,
        top: place?.top ?? 0,
        visibility: place ? 'visible' : 'hidden',
        ...(popup ? { zIndex: layer.zIndex } : {}),
      }}
    >
      {children}
    </div>
  );
}

type Panel =
  | { kind: 'link'; from: number; to: number; href: string; creating: boolean }
  | { kind: 'image'; at: number; editing: { pos: number; src: string; alt: string } | null }
  | { kind: 'command'; command: RichEditorCommand; at: number };

/**
 * The engine's handle: the public one, and the view itself for this
 * package's own suites, which drive ProseMirror where jsdom has no layout to
 * drive a browser's input through.
 */
export interface EditorHandle extends RichEditorHandle {
  view(): EditorView | null;
}

export const Editor = forwardRef<EditorHandle, RichEditorProps>(function Editor(props, ref) {
  const {
    value,
    label,
    disabled = false,
    imageVersion,
    commands,
    size = 'md',
    className,
  } = props;
  const text = useMemo(() => richEditorLabels(props.labels), [props.labels]);
  const latest = useRef(props);
  latest.current = props;
  const labelsRef = useRef(text);
  labelsRef.current = text;

  const mount = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const source = useRef<MarkdownSource | null>(null);
  const emitted = useRef(value);
  const slashKeys = useRef<((event: KeyboardEvent) => boolean) | null>(null);
  const shift = useRef(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<EditorState | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [active, setActive] = useState(0);
  const [pointerDown, setPointerDown] = useState(false);
  const [barFocus, setBarFocus] = useState(false);
  const descriptionId = useId();
  const listboxId = useId();
  const slots = useMemo(() => new SlotStore(), []);
  const images = useMemo(() => new ImageViews(() => latest.current.resolveImage), []);
  const openSlots = useSyncExternalStore(slots.subscribe, slots.get, slots.get);

  const hooks = useRef<{ submit: () => boolean; link: () => boolean; toolbar: () => boolean }>({
    submit: () => {
      latest.current.onSubmit?.();
      return Boolean(latest.current.onSubmit);
    },
    link: () => false,
    toolbar: () => false,
  });

  const plugins = useMemo(
    () => [
      slashPlugin(slashKeys),
      buildInputRules(),
      ...buildKeymap({
        submit: () => hooks.current.submit(),
        link: () => hooks.current.link(),
        toolbar: () => hooks.current.toolbar(),
      }),
      history(),
      gapCursor(),
      focusPlugin,
      placeholderPlugin(() => ({
        empty: latest.current.placeholder ?? labelsRef.current.placeholder,
        line: labelsRef.current.emptyLine,
      })),
      clipboardPlugin(shift),
    ],
    [],
  );

  const stateFor = useCallback(
    (markdown: string) => {
      const loaded = readMarkdown(markdown);
      source.current = loaded.source;
      return EditorState.create({ doc: loaded.doc, plugins });
    },
    [plugins],
  );

  // THE VIEW, made once. Its props that follow React's are set below.
  useLayoutEffect(() => {
    const host = mount.current;
    if (!host) return;
    const initial = stateFor(latest.current.value);
    emitted.current = latest.current.value;
    const view = new EditorView(
      { mount: host },
      {
        state: initial,
        nodeViews: {
          code_block: codeBlockView(slots),
          callout: calloutView(slots),
          list_item: listItemView(() => ({ done: labelsRef.current.taskDone, notDone: labelsRef.current.taskNotDone })),
          table: tableView,
          image: images.view,
        },
        handleDOMEvents: {
          // The pointer, so the toolbar waits for a drag-selection to finish.
          mousedown: () => {
            setPointerDown(true);
            return false;
          },
        },
        dispatchTransaction(tr: Transaction) {
          const next = view.state.apply(tr);
          view.updateState(next);
          setState(next);
          if (tr.docChanged) {
            const markdown = writeMarkdown(next.doc, source.current ?? undefined);
            if (markdown !== emitted.current) {
              emitted.current = markdown;
              latest.current.onChange(markdown);
            }
          }
        },
      },
    );
    viewRef.current = view;
    setState(view.state);
    if (latest.current.autoFocus) view.focus();
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [images, slots, stateFor]);

  // A BODY CHANGED FROM OUTSIDE (a merge brought somebody's save in) is read
  // afresh; one this editor wrote is already its document.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === emitted.current) return;
    emitted.current = value;
    const next = stateFor(value);
    view.updateState(next);
    setState(next);
    setPanel(null);
  }, [value, stateFor]);

  useEffect(() => {
    images.refresh();
  }, [images, imageVersion, props.resolveImage]);

  const slash = state ? slashKey.getState(state) : undefined;
  const slashOpen = Boolean(slash?.open) && !disabled && panel === null;

  // The attributes the view's element carries follow React's state.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.setProps({
      editable: () => !disabled,
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        'aria-describedby': descriptionId,
        ...(disabled ? { 'aria-readonly': 'true' } : {}),
        ...(slashOpen ? { 'aria-controls': listboxId, 'aria-activedescendant': `${listboxId}-${active}` } : {}),
        class: cx(
          'crewlet-rich-editor__content',
          'crewlet-document',
          `crewlet-document--${size}`,
          'crewlet-document--measure',
        ),
        spellcheck: 'true',
      },
    });
  });

  useImperativeHandle(ref, () => ({ focus: () => viewRef.current?.focus(), view: () => viewRef.current }), []);

  useEffect(() => {
    if (!pointerDown) return;
    const up = () => setPointerDown(false);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [pointerDown]);

  const focused = state ? Boolean(focusKey.getState(state)) : false;
  const view = viewRef.current;
  const run = (command: Command) => {
    const v = viewRef.current;
    if (!v) return;
    command(v.state, v.dispatch, v);
    v.focus();
  };

  // --- the slash menu -------------------------------------------------------

  const items: SlashItem[] = useMemo(() => {
    const blocks: SlashItem[] = BLOCKS.map((b) => ({
      key: b.key,
      label: text.blocks[b.key].label,
      description: text.blocks[b.key].description,
      icon: b.icon,
      hint: b.hint,
      group: b.key === 'image' || b.key === 'table' || b.key === 'divider' ? 'insert' : 'blocks',
      keywords: b.keywords,
      ...(b.run ? { run: b.run } : { panel: 'image' as const }),
    }));
    const own: SlashItem[] = (commands ?? []).map((command) => ({
      key: `command:${command.key}`,
      label: command.label,
      description: command.description,
      icon: command.icon ?? <LinkGlyph />,
      group: 'insert',
      keywords: (command.keywords ?? []).map((k) => k.toLowerCase()),
      panel: { command },
    }));
    return [...blocks, ...own];
  }, [commands, text]);

  const shown: SlashItem[] = useMemo(() => {
    if (!slashOpen || !state || !slash) return [];
    // WHAT EACH ENTRY WOULD DO once the slash and its word are gone: an entry
    // that cannot apply there (a code block inside a list item) is not listed.
    const without = state.apply(state.tr.delete(slash.from, state.selection.from));
    return items
      .map((item) => ({ item, score: matches(item, slash.query) }))
      .filter(({ item, score }) => score > 0 && (!item.run || item.key === 'paragraph' || item.run(without)))
      .sort((a, b) => b.score - a.score || (a.item.group === b.item.group ? 0 : a.item.group === 'blocks' ? -1 : 1))
      .map(({ item }) => item);
  }, [items, slash, slashOpen, state]);

  useEffect(() => setActive(0), [slash?.query, slashOpen]);

  const choose = (item: SlashItem) => {
    const v = viewRef.current;
    const s = v ? slashKey.getState(v.state) : undefined;
    if (!v || !s?.open) return;
    v.dispatch(v.state.tr.delete(s.from, v.state.selection.from).setMeta(slashKey, { open: false }));
    const at = v.state.selection.from;
    if (item.panel === 'image') setPanel({ kind: 'image', at, editing: null });
    else if (item.panel) setPanel({ kind: 'command', command: item.panel.command, at });
    else if (item.run) item.run(v.state, v.dispatch, v);
    v.focus();
  };

  const closeSlash = () => {
    const v = viewRef.current;
    if (v && slashKey.getState(v.state)?.open) v.dispatch(v.state.tr.setMeta(slashKey, { open: false }));
  };

  slashKeys.current = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (slashOpen) {
        closeSlash();
        return true;
      }
      if (panel) {
        setPanel(null);
        return true;
      }
      if (latest.current.onEscape) {
        event.preventDefault();
        latest.current.onEscape();
        return true;
      }
      return false;
    }
    if (!slashOpen) return false;
    const count = shown.length;
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      if (count) setActive((i) => (i + 1) % count);
      return true;
    }
    if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      if (count) setActive((i) => (i - 1 + count) % count);
      return true;
    }
    if (event.key === 'Home' && count) {
      setActive(0);
      return true;
    }
    if (event.key === 'End' && count) {
      setActive(count - 1);
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const item = shown[active];
      if (!item) {
        closeSlash();
        return event.key === 'Tab';
      }
      choose(item);
      return true;
    }
    return false;
  };

  // --- links ----------------------------------------------------------------

  const openLink = (): boolean => {
    const v = viewRef.current;
    if (!v || disabled || inCode(v.state)) return false;
    const at = linkAt(v.state);
    const { from, to } = v.state.selection;
    if (at) setPanel({ kind: 'link', from: at.from, to: at.to, href: at.mark.attrs.href as string, creating: false });
    else setPanel({ kind: 'link', from, to, href: '', creating: from === to });
    return true;
  };
  hooks.current.link = openLink;
  hooks.current.toolbar = () => {
    const first = toolbarRef.current?.querySelector<HTMLElement>('button:not([disabled])');
    if (!first) return false;
    first.focus();
    return true;
  };

  const closePanel = () => {
    setPanel(null);
    viewRef.current?.focus();
  };

  // --- what shows -------------------------------------------------------------

  const selection = state?.selection;
  const textSelected = Boolean(selection && selection instanceof TextSelection && !selection.empty);
  const showFormat =
    Boolean(state && view) && !disabled && !panel && !slashOpen && (focused || barFocus) && textSelected && !pointerDown && !inCode(state!);
  const link = state && selection?.empty && focused && !panel && !slashOpen ? linkAt(state) : null;
  const table = state && (focused || barFocus) && !panel && !slashOpen && !disabled ? tableAt(state) : null;
  const imageSelected =
    state && selection instanceof NodeSelection && selection.node.type === N.image && (focused || barFocus) && !panel && !disabled
      ? selection
      : null;
  useViewportTick(Boolean(slashOpen || showFormat || link || table || panel || imageSelected));

  // A BAR KEEPS SHOWING WHILE FOCUS IS IN IT (a keyboard reached it with
  // Alt+F10, or a pointer pressed one of its menus), and Escape there goes
  // back to the document where the selection still is.
  const barScope = {
    onFocus: () => setBarFocus(true),
    onBlur: (event: { currentTarget: HTMLElement; relatedTarget: EventTarget | null }) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBarFocus(false);
    },
    onKeyDown: (event: { key: string; defaultPrevented: boolean; preventDefault: () => void }) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setBarFocus(false);
      viewRef.current?.focus();
    },
  };

  const formatBar = showFormat && view && state && selection ? (
    <Floating
      anchor={rectOf(view, selection.from, selection.to) ?? { x: 0, y: 0, width: 0, height: 0 }}
      prefer={coarse() ? 'below' : 'above'}
      center
      className="crewlet-rich-editor__bar"
    >
      <div ref={toolbarRef} {...barScope}>
        <Toolbar label={text.toolbar}>
          <span className="crewlet-rich-editor__group">
            {[1, 2, 3].map((level) => (
              <BarButton
                key={level}
                label={text.heading(level)}
                icon={level === 1 ? <Heading1Glyph /> : level === 2 ? <Heading2Glyph /> : <Heading3Glyph />}
                pressed={headingLevel(state) === level}
                onPress={() => run(toggleHeading(level))}
              />
            ))}
          </span>
          <span className="crewlet-rich-editor__group">
            <BarButton label={text.bold} icon={<BoldGlyph />} pressed={markActive(state, M.strong!)} onPress={() => run(toggleStrong)} />
            <BarButton label={text.italic} icon={<ItalicGlyph />} pressed={markActive(state, M.em!)} onPress={() => run(toggleEm)} />
            <BarButton
              label={text.strike}
              icon={<StrikethroughGlyph />}
              pressed={markActive(state, M.strike!)}
              onPress={() => run(toggleStrike)}
            />
            <BarButton label={text.code} icon={<CodeGlyph />} pressed={markActive(state, M.code!)} onPress={() => run(toggleCode)} />
          </span>
          <span className="crewlet-rich-editor__group">
            <BarButton label={text.link} icon={<LinkGlyph />} pressed={markActive(state, M.link!)} onPress={() => openLink()} />
          </span>
        </Toolbar>
      </div>
    </Floating>
  ) : null;

  const linkBubble =
    link && view && !showFormat ? (
      <Floating anchor={rectOf(view, link.from, link.to) ?? { x: 0, y: 0, width: 0, height: 0 }} prefer="below" className="crewlet-rich-editor__bubble">
        <LinkBubble
          href={link.mark.attrs.href as string}
          text={text}
          onEdit={() => openLink()}
          onRemove={() => run(removeLink)}
        />
      </Floating>
    ) : null;

  const tableBar =
    table && view && !showFormat ? (
      <Floating
        anchor={(view.nodeDOM(table.pos) as HTMLElement | null)?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 }}
        prefer="below"
        className="crewlet-rich-editor__bar"
      >
        <div {...barScope}>
          <TableBar text={text} align={state ? columnAlign(state) : null} run={run} />
        </div>
      </Floating>
    ) : null;

  const imageBar =
    imageSelected && view ? (
      <Floating anchor={rectOf(view, imageSelected.from, imageSelected.to) ?? { x: 0, y: 0, width: 0, height: 0 }} prefer="below" className="crewlet-rich-editor__bar">
        <div {...barScope}>
          <Toolbar label={text.imagePanel}>
            <BarButton
              label={text.imageEdit}
              icon={<PencilGlyph />}
              onPress={() =>
                setPanel({
                  kind: 'image',
                  at: imageSelected.from,
                  editing: {
                    pos: imageSelected.from,
                    src: imageSelected.node.attrs.src as string,
                    alt: imageSelected.node.attrs.alt as string,
                  },
                })
              }
            />
            <BarButton
              label={text.imageRemove}
              icon={<TrashGlyph />}
              onPress={() => run((s, d) => (d ? (d(s.tr.deleteSelection()), true) : true))}
            />
          </Toolbar>
        </div>
      </Floating>
    ) : null;

  const slashMenu =
    slashOpen && view && slash ? (
      <Floating
        anchor={rectOf(view, slash.from) ?? { x: 0, y: 0, width: 0, height: 0 }}
        prefer="below"
        popup={{ onDismiss: closeSlash }}
        className="crewlet-rich-editor__menu"
      >
        <div role="listbox" id={listboxId} aria-label={text.slashMenu} className="crewlet-rich-editor__options">
          {shown.length === 0 ? (
            <p className="crewlet-rich-editor__empty" role="presentation">
              {text.slashEmpty} “{slash.query}”
            </p>
          ) : (
            shown.map((item, i) => {
              const group = i === 0 || shown[i - 1]!.group !== item.group ? item.group : null;
              return (
                <SlashOption
                  key={item.key}
                  id={`${listboxId}-${i}`}
                  item={item}
                  heading={group === null ? null : group === 'blocks' ? text.slashGroupBlocks : text.slashGroupInsert}
                  selected={i === active}
                  onHover={() => setActive(i)}
                  onChoose={() => choose(item)}
                />
              );
            })
          )}
        </div>
      </Floating>
    ) : null;

  const panelAnchor = (at: number, to = at) => (view ? (rectOf(view, at, to) ?? { x: 0, y: 0, width: 0, height: 0 }) : { x: 0, y: 0, width: 0, height: 0 });
  const panelView =
    panel && view ? (
      <Floating
        anchor={panel.kind === 'link' ? panelAnchor(panel.from, panel.to) : panelAnchor(panel.at)}
        prefer="below"
        popup={{ onDismiss: closePanel }}
        className="crewlet-rich-editor__panel"
        role="dialog"
        aria-label={panel.kind === 'link' ? text.linkPanel : panel.kind === 'image' ? text.imagePanel : panel.command.label}
      >
        {panel.kind === 'link' ? (
          <LinkPanel
            text={text}
            href={panel.href}
            creating={panel.creating}
            existing={!panel.creating && panel.href !== ''}
            onApply={(href, words) => {
              const v = viewRef.current;
              if (!v) return;
              v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, panel.from, panel.to)));
              setLink(href, words)(v.state, v.dispatch);
              closePanel();
            }}
            onRemove={() => {
              const v = viewRef.current;
              if (!v) return;
              v.dispatch(v.state.tr.removeMark(panel.from, panel.to, M.link!));
              closePanel();
            }}
          />
        ) : panel.kind === 'image' ? (
          <ImagePanel
            text={text}
            initial={panel.editing}
            onApply={(src, alt) => {
              const v = viewRef.current;
              if (!v) return;
              if (panel.editing) {
                const node = v.state.doc.nodeAt(panel.editing.pos);
                if (node?.type === N.image) v.dispatch(v.state.tr.setNodeMarkup(panel.editing.pos, undefined, { ...node.attrs, src, alt }));
              } else {
                v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, Math.min(panel.at, v.state.doc.content.size))));
                insertImage(src, alt)(v.state, v.dispatch);
              }
              closePanel();
            }}
          />
        ) : (
          panel.command.panel({
            insertLink: (words, href) => {
              const v = viewRef.current;
              if (!v) return;
              v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, Math.min(panel.at, v.state.doc.content.size))));
              setLink(href, words)(v.state, v.dispatch);
              closePanel();
            },
            close: closePanel,
          })
        )}
      </Floating>
    ) : null;

  return (
    <div className={cx('crewlet-rich-editor', disabled && 'crewlet-rich-editor--disabled', className)}>
      <div ref={mount} className="crewlet-rich-editor__mount" />
      <VisuallyHidden id={descriptionId}>{text.description}</VisuallyHidden>
      {openSlots.map((slot) => createPortal(<SlotControls slot={slot} text={text} run={run} disabled={disabled} />, slot.element))}
      {slashMenu}
      {formatBar}
      {linkBubble}
      {tableBar}
      {imageBar}
      {panelView}
    </div>
  );
});

function BarButton({ label, icon, pressed, onPress }: { label: string; icon: ReactNode; pressed?: boolean; onPress: () => void }) {
  return (
    <IconButton
      size="sm"
      variant="ghost"
      label={label}
      icon={icon}
      pressed={pressed}
      // The press must not take the selection from the document it formats.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
    />
  );
}

function SlashOption({
  id,
  item,
  heading,
  selected,
  onHover,
  onChoose,
}: {
  id: string;
  item: SlashItem;
  heading: string | null;
  selected: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  const node = useRef<HTMLDivElement | null>(null);
  // THE MENU SCROLLS, NOT THE PAGE. `scrollIntoView` moves every scroller
  // above the option too, and on the menu's first paint (before it is placed)
  // that scrolled the document and carried the caret out from under it.
  useEffect(() => {
    const option = node.current;
    const menu = option?.closest<HTMLElement>('.crewlet-rich-editor__menu');
    if (!selected || !option || !menu) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
  }, [selected]);
  const pointer = {
    onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
    onMouseMove: onHover,
    onClick: onChoose,
  };
  return (
    <>
      {heading && (
        <div className="crewlet-rich-editor__group-heading" role="presentation">
          {heading}
        </div>
      )}
      <div
        ref={node}
        id={id}
        role="option"
        aria-selected={selected}
        className={cx('crewlet-rich-editor__option', selected && 'is-active')}
        // The keyboard is the editor's (the field keeps focus and names the
        // active option), so only the pointer is handled here.
        {...pointer}
      >
        <span className="crewlet-rich-editor__option-icon" aria-hidden="true">
          {item.icon}
        </span>
        <span className="crewlet-rich-editor__option-text">
          <span className="crewlet-rich-editor__option-label">{item.label}</span>
          {item.description && <span className="crewlet-rich-editor__option-description">{item.description}</span>}
        </span>
        {item.hint && (
          <span className="crewlet-rich-editor__option-hint" aria-hidden="true">
            {item.hint}
          </span>
        )}
      </div>
    </>
  );
}

function LinkBubble({ href, text, onEdit, onRemove }: { href: string; text: RichEditorLabels; onEdit: () => void; onRemove: () => void }) {
  const safe = safeHref(href);
  const internal = safe?.startsWith('#/') ?? false;
  return (
    <Toolbar label={text.linkPanel}>
      {safe ? (
        <a
          className="crewlet-rich-editor__bubble-link"
          href={safe}
          {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          title={text.linkOpen}
          onMouseDown={(event) => event.preventDefault()}
        >
          <span className="crewlet-rich-editor__bubble-href">{href}</span>
          {!internal && <ExternalLinkGlyph size="sm" />}
        </a>
      ) : (
        <span className="crewlet-rich-editor__bubble-refused">{text.linkRefused}</span>
      )}
      <BarButton label={text.linkEdit} icon={<PencilGlyph />} onPress={onEdit} />
      <BarButton label={text.linkRemove} icon={<UnlinkGlyph />} onPress={onRemove} />
    </Toolbar>
  );
}

function LinkPanel({
  text,
  href,
  creating,
  existing,
  onApply,
  onRemove,
}: {
  text: RichEditorLabels;
  href: string;
  creating: boolean;
  existing: boolean;
  onApply: (href: string, words: string) => void;
  onRemove: () => void;
}) {
  const [address, setAddress] = useState(href);
  const [words, setWords] = useState('');
  const [tried, setTried] = useState(false);
  const addressId = useId();
  const wordsId = useId();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  const safe = safeHref(address);
  const submit = () => {
    setTried(true);
    if (safe) onApply(safe, words);
  };
  return (
    <form
      className="crewlet-rich-editor__form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FormField label={text.linkAddress} htmlFor={addressId} error={tried && !safe ? text.linkInvalid : undefined}>
        <Input
          id={addressId}
          ref={field}
          inputSize="sm"
          value={address}
          error={tried && !safe}
          placeholder="https://"
          onChange={(event) => setAddress(event.target.value)}
        />
      </FormField>
      {creating && (
        <FormField label={text.linkText} htmlFor={wordsId} optional>
          <Input id={wordsId} inputSize="sm" value={words} onChange={(event) => setWords(event.target.value)} />
        </FormField>
      )}
      <div className="crewlet-rich-editor__form-actions">
        {existing && (
          <Button type="button" size="small" variant="ghost" onClick={onRemove}>
            {text.linkRemove}
          </Button>
        )}
        <Button type="submit" size="small" variant="primary">
          {text.linkApply}
        </Button>
      </div>
    </form>
  );
}

function ImagePanel({
  text,
  initial,
  onApply,
}: {
  text: RichEditorLabels;
  initial: { src: string; alt: string } | null;
  onApply: (src: string, alt: string) => void;
}) {
  const [src, setSrc] = useState(initial?.src ?? '');
  const [alt, setAlt] = useState(initial?.alt ?? '');
  const srcId = useId();
  const altId = useId();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  const address = src.trim();
  return (
    <form
      className="crewlet-rich-editor__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (address) onApply(address.replace(/\s/g, '%20'), alt.trim());
      }}
    >
      <FormField label={text.imageAddress} htmlFor={srcId}>
        <Input id={srcId} ref={field} inputSize="sm" value={src} onChange={(event) => setSrc(event.target.value)} />
      </FormField>
      <FormField label={text.imageAlt} htmlFor={altId} helper={text.imageAltHelp}>
        <Input id={altId} inputSize="sm" value={alt} onChange={(event) => setAlt(event.target.value)} />
      </FormField>
      <div className="crewlet-rich-editor__form-actions">
        <Button type="submit" size="small" variant="primary" disabledReason={address ? undefined : text.imageAddress}>
          {initial ? text.linkApply : text.imageInsert}
        </Button>
      </div>
    </form>
  );
}

function TableBar({ text, align, run }: { text: RichEditorLabels; align: string | null; run: (command: Command) => void }) {
  return (
    <Toolbar label={text.tableBar}>
      <span className="crewlet-rich-editor__group">
        <Menu
          label={text.tableRow}
          trigger={text.tableRow}
          trailingIcon={<ChevronDownGlyph size="sm" />}
          items={[
            { key: 'above', label: text.rowAbove, onSelect: () => run(addRowBefore) },
            { key: 'below', label: text.rowBelow, onSelect: () => run(addRowAfter) },
            { kind: 'separator', key: 'sep' },
            { key: 'delete', label: text.rowDelete, danger: true, onSelect: () => run(deleteRow) },
          ]}
        />
        <Menu
          label={text.tableColumn}
          trigger={text.tableColumn}
          trailingIcon={<ChevronDownGlyph size="sm" />}
          items={[
            { key: 'left', label: text.columnLeft, onSelect: () => run(addColumnBefore) },
            { key: 'right', label: text.columnRight, onSelect: () => run(addColumnAfter) },
            { kind: 'separator', key: 'sep' },
            { key: 'delete', label: text.columnDelete, danger: true, onSelect: () => run(deleteColumn) },
          ]}
        />
      </span>
      <span className="crewlet-rich-editor__group">
        <BarButton label={text.alignStart} icon={<TextAlignStartGlyph />} pressed={align === 'left'} onPress={() => run(alignColumn('left'))} />
        <BarButton label={text.alignCenter} icon={<TextAlignCenterGlyph />} pressed={align === 'center'} onPress={() => run(alignColumn('center'))} />
        <BarButton label={text.alignEnd} icon={<TextAlignEndGlyph />} pressed={align === 'right'} onPress={() => run(alignColumn('right'))} />
      </span>
      <span className="crewlet-rich-editor__group">
        <IconButton
          size="sm"
          variant="ghost-danger"
          label={text.tableDelete}
          icon={<TrashGlyph />}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(deleteTable)}
        />
      </span>
    </Toolbar>
  );
}

/** The controls a code block or a callout draws in its slot. */
function SlotControls({ slot, text, run, disabled }: { slot: Slot; text: RichEditorLabels; run: (command: Command) => void; disabled: boolean }) {
  if (slot.kind === 'code') {
    return (
      <input
        className="crewlet-rich-editor__lang"
        aria-label={text.codeLanguage}
        placeholder={text.codeLanguagePlaceholder}
        value={slot.node.attrs.lang as string}
        disabled={disabled}
        spellCheck={false}
        onChange={(event) => {
          const pos = slot.getPos();
          if (pos !== undefined) run(setCodeLanguage(pos, event.target.value));
        }}
        onKeyDown={(event) => {
          // Enter or Escape goes back into the code.
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            const pos = slot.getPos();
            if (pos !== undefined) run((s, d) => (d ? (d(s.tr.setSelection(TextSelection.create(s.doc, pos + 1))), true) : true));
          }
        }}
      />
    );
  }
  const tone = slot.node.attrs.tone as MarkdownCalloutTone;
  return (
    <Menu
      label={text.calloutTone}
      items={[
        ...MARKDOWN_CALLOUT_TONES.map((t) => ({
          key: t,
          label: text.tones[t],
          checked: t === tone,
          onSelect: () => {
            const pos = slot.getPos();
            if (pos !== undefined) run(setCalloutTone(pos, t));
          },
        })),
        { kind: 'separator' as const, key: 'sep' },
        {
          key: 'remove',
          label: text.calloutRemove,
          onSelect: () => {
            const pos = slot.getPos();
            if (pos !== undefined) run(unwrapAt(pos));
          },
        },
      ]}
      renderTrigger={(trigger) => (
        <button
          {...trigger}
          ref={trigger.ref as (el: HTMLButtonElement | null) => void}
          type="button"
          className="crewlet-rich-editor__tone"
          disabled={disabled}
          aria-label={`${text.calloutTone}: ${text.tones[tone]}`}
        >
          {text.tones[tone]}
          <ChevronDownGlyph size="sm" />
        </button>
      )}
    />
  );
}
