import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  BoldGlyph,
  CodeGlyph,
  Heading2Glyph,
  Heading3Glyph,
  ItalicGlyph,
  ListChecksGlyph,
  ListGlyph,
  ListOrderedGlyph,
  TableGlyph,
} from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { tabId } from '../Tabs/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { cx } from '../utils/cx.js';
import {
  formatMarkdown,
  insertMarkdown,
  type MarkdownEdit,
  type MarkdownFormat,
  type MarkdownSelection,
} from './format.js';

export type MarkdownEditorMode = 'write' | 'preview';

/** Every string the editor draws on its own. */
export interface MarkdownEditorLabels {
  /** The formatting bar's name. */
  toolbar: string;
  /** The Write and Preview switch's name. */
  view: string;
  write: string;
  preview: string;
  /** What Preview shows for an empty body. */
  empty: string;
  /** Each control's name, which is also its tooltip. */
  formats: Record<MarkdownFormat, string>;
}

const LABELS: MarkdownEditorLabels = {
  toolbar: 'Formatting',
  view: 'Editor view',
  write: 'Write',
  preview: 'Preview',
  empty: 'Nothing to preview yet.',
  formats: {
    heading2: 'Heading',
    heading3: 'Subheading',
    bold: 'Bold',
    italic: 'Italic',
    code: 'Code',
    bulletList: 'Bulleted list',
    numberedList: 'Numbered list',
    checklist: 'Checklist',
    table: 'Table',
  },
};

/** The bar's controls, in the groups a separator draws between them. */
const GROUPS: readonly (readonly MarkdownFormat[])[] = [
  ['heading2', 'heading3'],
  ['bold', 'italic', 'code'],
  ['bulletList', 'numberedList', 'checklist', 'table'],
];

const GLYPHS: Record<MarkdownFormat, ReactNode> = {
  heading2: <Heading2Glyph />,
  heading3: <Heading3Glyph />,
  bold: <BoldGlyph />,
  italic: <ItalicGlyph />,
  code: <CodeGlyph />,
  bulletList: <ListGlyph />,
  numberedList: <ListOrderedGlyph />,
  checklist: <ListChecksGlyph />,
  table: <TableGlyph />,
};

/** The strings a caller may change; each format's name can be changed alone. */
export type MarkdownEditorLabelOverrides = Partial<Omit<MarkdownEditorLabels, 'formats'>> & {
  formats?: Partial<MarkdownEditorLabels['formats']> | undefined;
};

/** What a control the caller adds to the bar may do to the editor. */
export interface MarkdownEditorApi {
  /**
   * Which view is showing. A control that edits the source is disabled in
   * Preview, as the bar's own controls are, because there is no caret there.
   */
  readonly mode: MarkdownEditorMode;
  /** Replaces the selection with `text` and leaves the caret after it, as a paste would. */
  insert(text: string): void;
  /** Applies a format, exactly as the bar's own control for it does. */
  format(format: MarkdownFormat): void;
  /** Moves focus into the field. */
  focus(): void;
}

export interface MarkdownEditorProps {
  /** The markdown being edited. */
  value: string;
  onChange: (value: string) => void;
  /** The field's accessible name: "The page, in markdown". */
  label: string;
  /**
   * Draws the preview of `value`. The renderer is the application's, because
   * what a body may contain is a decision about its own content; wrap what it
   * returns in `Document` and the preview is set exactly as the page will be.
   */
  renderPreview: (value: string) => ReactNode;
  placeholder?: string | undefined;
  /** The view, when the caller holds it. Uncontrolled, the editor opens on Write. */
  mode?: MarkdownEditorMode | undefined;
  defaultMode?: MarkdownEditorMode | undefined;
  onModeChange?: ((mode: MarkdownEditorMode) => void) | undefined;
  /**
   * Controls of the caller's own, drawn on the bar after the formatting
   * controls: a "Link a page" picker, say. They are handed the editor, so a
   * picker inserts at the writer's caret rather than at the end.
   */
  actions?: ((editor: MarkdownEditorApi) => ReactNode) | undefined;
  /** The strip under the field: a word count, a size against a limit. */
  footer?: ReactNode;
  /** Command+Enter (Control+Enter elsewhere), the shortcut every composer in the system saves on. */
  onSubmit?: (() => void) | undefined;
  disabled?: boolean | undefined;
  /** Draws the field as refused, for a body over its limit. */
  invalid?: boolean | undefined;
  /** How many lines the field stands at before it scrolls. */
  rows?: number | undefined;
  /** The field's id, for a label or a description elsewhere on the screen. */
  id?: string | undefined;
  'aria-describedby'?: string | undefined;
  labels?: MarkdownEditorLabelOverrides | undefined;
  ref?: Ref<MarkdownEditorApi> | undefined;
  className?: string | undefined;
}

/**
 * Writing markdown: a formatting bar, the source in a monospace field, and a
 * Preview that draws it as the reader will see it.
 *
 * THE SOURCE IS WHAT IS EDITED, never a rich-text model of it. The engine
 * stores markdown and nothing else, so a writer sees exactly what will be
 * saved, a paste of markdown stays markdown, and nothing converts between two
 * formats on the way to a save.
 *
 * THE BAR WRITES MARKDOWN AT THE CARET, the way a person would type it, and
 * every control is a toggle (see format.ts). A press keeps the field's own
 * selection: the control never takes focus from the field, and the field gets
 * focus back with the selection where the format left it, so pressing Bold
 * and carrying on typing types inside the bold.
 *
 * ONE TAB STOP FOR THE BAR. It is a `Toolbar`: Tab reaches it once, the arrows
 * walk its controls, and Write and Preview are the last stop, a tab list whose
 * panel is the field or the preview.
 */
export function MarkdownEditor({
  value,
  onChange,
  label,
  renderPreview,
  placeholder,
  mode: controlled,
  defaultMode = 'write',
  onModeChange,
  actions,
  footer,
  onSubmit,
  disabled = false,
  invalid = false,
  rows = 14,
  id,
  'aria-describedby': describedBy,
  labels,
  ref,
  className,
}: MarkdownEditorProps) {
  const text = { ...LABELS, ...labels, formats: { ...LABELS.formats, ...labels?.formats } };
  const [own, setOwn] = useState<MarkdownEditorMode>(defaultMode);
  const mode = controlled ?? own;
  const setMode = (next: MarkdownEditorMode) => {
    if (controlled === undefined) setOwn(next);
    onModeChange?.(next);
  };

  const panelId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  // THE SELECTION A FORMAT LEFT, applied once the value it belongs to has
  // rendered. Set on the field before the render, it would land in the old
  // text and be moved by React writing the new one.
  const pending = useRef<MarkdownSelection | null>(null);
  useLayoutEffect(() => {
    const el = field.current;
    const selection = pending.current;
    if (!el || !selection) return;
    pending.current = null;
    el.focus();
    el.setSelectionRange(selection.start, selection.end);
  }, [value]);

  const selection = (): MarkdownSelection => {
    const el = field.current;
    return el ? { start: el.selectionStart, end: el.selectionEnd } : { start: value.length, end: value.length };
  };
  const apply = (edit: MarkdownEdit) => {
    if (edit.value === value) return;
    pending.current = edit.selection;
    onChange(edit.value);
  };
  const editor: MarkdownEditorApi = {
    mode,
    insert: (inserted) => apply(insertMarkdown(value, selection(), inserted)),
    format: (format) => apply(formatMarkdown(value, selection(), format)),
    focus: () => field.current?.focus(),
  };
  useImperativeHandle(ref, () => editor);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const command = event.metaKey || event.ctrlKey;
    if (!command || event.altKey) return;
    if (event.key === 'Enter' && onSubmit) {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      editor.format(key === 'b' ? 'bold' : 'italic');
    }
  };

  // A GROUP THAT WRAPS STARTS ITS LINE WITHOUT ITS RULE. The hairline that
  // parts a group from the one before it is drawn on the group's own start
  // edge, so on a bar narrow enough to wrap (a phone's) it stood alone at the
  // start of the second line and parted the group from nothing. Each group is
  // measured against the one before it whenever the bar or a group changes
  // size, and one that starts a line is marked for the stylesheet.
  const groups = useRef<(HTMLSpanElement | null)[]>([]);
  const hasActions = actions !== undefined;
  useLayoutEffect(() => {
    const spans = groups.current.filter((span): span is HTMLSpanElement => span !== null);
    const bar = spans[0]?.parentElement;
    if (!bar || spans.length < 2 || typeof ResizeObserver === 'undefined') return undefined;
    const mark = () => {
      spans.forEach((span, index) => {
        const previous = spans[index - 1];
        const wrapped = previous !== undefined && span.getBoundingClientRect().top >= previous.getBoundingClientRect().bottom;
        span.toggleAttribute('data-wrapped', wrapped);
      });
    };
    const observer = new ResizeObserver(mark);
    observer.observe(bar);
    for (const span of spans) observer.observe(span);
    return () => observer.disconnect();
  }, [hasActions]);

  const writing = mode === 'write';
  return (
    <div
      className={cx(
        'crewlet-markdown-editor',
        invalid && 'crewlet-markdown-editor--invalid',
        disabled && 'crewlet-markdown-editor--disabled',
        className,
      )}
      style={{ '--crewlet-markdown-editor-rows': rows } as CSSProperties}
    >
      <Toolbar label={text.toolbar} className="crewlet-markdown-editor__bar">
        {GROUPS.map((group, index) => (
          <span
            key={index}
            ref={(span) => {
              groups.current[index] = span;
            }}
            className="crewlet-markdown-editor__group"
          >
            {group.map((format) => (
              <IconButton
                key={format}
                size="sm"
                variant="ghost"
                label={text.formats[format]}
                icon={GLYPHS[format]}
                disabled={disabled || !writing}
                // The press must not take focus from the field: the format is
                // applied to the field's selection, and focus goes back there.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.format(format)}
              />
            ))}
          </span>
        ))}
        {actions && (
          <span
            ref={(span) => {
              groups.current[GROUPS.length] = span;
            }}
            className="crewlet-markdown-editor__group"
          >
            {actions(editor)}
          </span>
        )}
        <span className="crewlet-markdown-editor__spacer" />
        <SegmentedControl
          semantics="tabs"
          panelId={panelId}
          size="sm"
          label={text.view}
          options={[
            { value: 'write', label: text.write },
            { value: 'preview', label: text.preview },
          ]}
          value={mode}
          onValueChange={setMode}
        />
      </Toolbar>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(panelId, mode)}
        className="crewlet-markdown-editor__panel"
      >
        {writing ? (
          <textarea
            ref={field}
            id={id}
            className="crewlet-markdown-editor__field"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label={label}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            spellCheck
          />
        ) : (
          <div className="crewlet-markdown-editor__preview">
            {value.trim() === '' ? <p className="crewlet-markdown-editor__empty">{text.empty}</p> : renderPreview(value)}
          </div>
        )}
      </div>
      {footer !== undefined && footer !== null && <div className="crewlet-markdown-editor__footer">{footer}</div>}
    </div>
  );
}
