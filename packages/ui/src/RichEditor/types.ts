/**
 * The props, the handle and the words of `RichEditor`, apart from the engine,
 * so the shell that loads the engine lazily carries none of it.
 */

import type { ReactNode } from 'react';
import type { DocumentSize } from '../Document/index.js';
import { MARKDOWN_CALLOUT_NAMES, type MarkdownCalloutTone } from '../Markdown/index.js';

/** What an entry of the caller's own in the slash menu may do to the document. */
export interface RichEditorPanelApi {
  /** Inserts `text` linked to `href` where the slash was typed, and closes the panel. */
  insertLink(text: string, href: string): void;
  /** Closes the panel and gives the editor its focus back. */
  close(): void;
}

/**
 * An entry of the caller's own in the slash menu: "Link to a page", say. It
 * opens a panel the caller draws where the slash was typed, and the panel
 * inserts through the API it is handed.
 */
export interface RichEditorCommand {
  key: string;
  label: string;
  description?: string | undefined;
  icon?: ReactNode;
  /** Words the menu's filter also matches, beyond the label. */
  keywords?: readonly string[] | undefined;
  panel: (api: RichEditorPanelApi) => ReactNode;
}

export interface RichEditorHandle {
  focus(): void;
}

export interface RichEditorProps {
  /** The Markdown being edited. */
  value: string;
  /** Called with the body as Markdown after every change. */
  onChange: (value: string) => void;
  /** The field's accessible name: "The body of Runbook". */
  label: string;
  /** What an empty body says. */
  placeholder?: string | undefined;
  /** Draws the document read only, as during a merge the writer has to settle first. */
  disabled?: boolean | undefined;
  autoFocus?: boolean | undefined;
  /**
   * Where a picture's address is shown from, in place of the address itself,
   * or null for one that is not shown (it reads as its alt text). Without it a
   * picture is shown only from an address a reader may follow (`safeHref`).
   * The same rule the application's renderer reads with, so a picture shows
   * while it is edited exactly where it shows to a reader.
   */
  resolveImage?: ((src: string) => string | null) | undefined;
  /**
   * Changes when what `resolveImage` can answer has changed (a picture
   * finished loading), so every picture is drawn again.
   */
  imageVersion?: unknown;
  /** Command+Enter (Control+Enter elsewhere): the shortcut every composer saves on. */
  onSubmit?: (() => void) | undefined;
  /** Escape with no menu or panel open: the writer leaving the editor. */
  onEscape?: (() => void) | undefined;
  /** Entries of the caller's own, listed after the blocks in the slash menu. */
  commands?: readonly RichEditorCommand[] | undefined;
  /** The document's size, as `Document` takes it. */
  size?: DocumentSize | undefined;
  /** Drawn while the editor's code loads, in place of a skeleton: the body as it reads. */
  fallback?: ReactNode;
  labels?: RichEditorLabelOverrides | undefined;
  className?: string | undefined;
}

export type RichEditorBlock =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'ordered'
  | 'task'
  | 'quote'
  | 'callout'
  | 'code'
  | 'table'
  | 'divider'
  | 'image';

/** Every string the editor draws on its own. */
export interface RichEditorLabels {
  /** Read to a screen reader after the field's name: how to reach the menus. */
  description: string;
  /** What an empty body says, when the caller gives no placeholder. */
  placeholder: string;
  /** What an empty line says while the caret is on it. */
  emptyLine: string;
  slashMenu: string;
  slashEmpty: string;
  slashGroupBlocks: string;
  slashGroupInsert: string;
  blocks: Record<RichEditorBlock, { label: string; description: string }>;
  toolbar: string;
  bold: string;
  italic: string;
  strike: string;
  code: string;
  link: string;
  heading: (level: number) => string;
  linkPanel: string;
  linkAddress: string;
  linkText: string;
  linkApply: string;
  linkRemove: string;
  linkOpen: string;
  linkEdit: string;
  linkInvalid: string;
  linkRefused: string;
  imagePanel: string;
  imageAddress: string;
  imageAlt: string;
  imageAltHelp: string;
  imageInsert: string;
  imageEdit: string;
  imageRemove: string;
  tableBar: string;
  tableRow: string;
  tableColumn: string;
  rowAbove: string;
  rowBelow: string;
  rowDelete: string;
  columnLeft: string;
  columnRight: string;
  columnDelete: string;
  alignStart: string;
  alignCenter: string;
  alignEnd: string;
  tableDelete: string;
  codeLanguage: string;
  codeLanguagePlaceholder: string;
  calloutTone: string;
  calloutRemove: string;
  tones: Record<MarkdownCalloutTone, string>;
  taskDone: string;
  taskNotDone: string;
  loading: string;
  failed: string;
  failedDetail: string;
  retry: string;
}

export type RichEditorLabelOverrides = Partial<Omit<RichEditorLabels, 'blocks' | 'tones'>> & {
  blocks?: Partial<RichEditorLabels['blocks']> | undefined;
  tones?: Partial<RichEditorLabels['tones']> | undefined;
};

export const RICH_EDITOR_LABELS: RichEditorLabels = {
  description: 'Type a slash for blocks. Press Alt and F10 to reach the formatting toolbar.',
  placeholder: 'Write, or type a slash for blocks',
  emptyLine: 'Type / for blocks',
  slashMenu: 'Blocks',
  slashEmpty: 'No block matches',
  slashGroupBlocks: 'Blocks',
  slashGroupInsert: 'Insert',
  blocks: {
    paragraph: { label: 'Text', description: 'A plain paragraph' },
    heading1: { label: 'Heading 1', description: 'A section heading' },
    heading2: { label: 'Heading 2', description: 'A subsection heading' },
    heading3: { label: 'Heading 3', description: 'A smaller heading' },
    bullet: { label: 'Bulleted list', description: 'A simple list' },
    ordered: { label: 'Numbered list', description: 'A list in order' },
    task: { label: 'Task list', description: 'Items with a checkbox' },
    quote: { label: 'Quote', description: 'Words set off from the text' },
    callout: { label: 'Callout', description: 'A note that stands out' },
    code: { label: 'Code block', description: 'Code, with its language' },
    table: { label: 'Table', description: 'Rows and columns' },
    divider: { label: 'Divider', description: 'A line between sections' },
    image: { label: 'Image', description: 'A picture, by its address' },
  },
  toolbar: 'Formatting',
  bold: 'Bold',
  italic: 'Italic',
  strike: 'Strikethrough',
  code: 'Inline code',
  link: 'Link',
  heading: (level) => `Heading ${level}`,
  linkPanel: 'Link',
  linkAddress: 'Address',
  linkText: 'Text',
  linkApply: 'Apply',
  linkRemove: 'Remove link',
  linkOpen: 'Open link',
  linkEdit: 'Edit link',
  linkInvalid: 'Use an address that starts with https://, http://, mailto: or #/.',
  linkRefused: 'This address does not open from a page.',
  imagePanel: 'Image',
  imageAddress: 'Image address',
  imageAlt: 'Alt text',
  imageAltHelp: 'Describes the picture for anyone who cannot see it.',
  imageInsert: 'Insert image',
  imageEdit: 'Edit image',
  imageRemove: 'Remove image',
  tableBar: 'Table',
  tableRow: 'Row',
  tableColumn: 'Column',
  rowAbove: 'Insert row above',
  rowBelow: 'Insert row below',
  rowDelete: 'Delete row',
  columnLeft: 'Insert column left',
  columnRight: 'Insert column right',
  columnDelete: 'Delete column',
  alignStart: 'Align left',
  alignCenter: 'Align center',
  alignEnd: 'Align right',
  tableDelete: 'Delete table',
  codeLanguage: 'Code language',
  codeLanguagePlaceholder: 'Language',
  calloutTone: 'Callout type',
  calloutRemove: 'Remove callout',
  tones: MARKDOWN_CALLOUT_NAMES,
  taskDone: 'Mark as done',
  taskNotDone: 'Mark as not done',
  loading: 'Loading the editor',
  failed: 'The editor did not load',
  failedDetail: 'The page may have been updated while it was open. Try again, or reload the page.',
  retry: 'Try again',
};

export function richEditorLabels(overrides?: RichEditorLabelOverrides): RichEditorLabels {
  if (!overrides) return RICH_EDITOR_LABELS;
  return {
    ...RICH_EDITOR_LABELS,
    ...overrides,
    blocks: { ...RICH_EDITOR_LABELS.blocks, ...overrides.blocks },
    tones: { ...RICH_EDITOR_LABELS.tones, ...overrides.tones },
  } as RichEditorLabels;
}
