import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDownGlyph, ArrowUpGlyph, EllipsisGlyph, GripVerticalGlyph, PencilGlyph, PlusGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { Input } from '../Input/index.js';
import { Menu, type MenuEntry } from '../Menu/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { useReorder, type ReorderLabels } from '../Reorder/index.js';
import { cx } from '../utils/cx.js';

/** One tab as the editor lists it. */
export interface DocTabsEditorItem {
  /** Stable identity: the tab's file. */
  key: string;
  title: string;
}

export interface DocTabsEditorLabels extends ReorderLabels {
  /** The list's visible heading. */
  heading: string;
  /** The name of a tab's title field while it is renamed, by its position (from 1). */
  titleField: (position: number) => string;
  /** The name of a tab's menu of actions. */
  actions: (title: string) => string;
  rename: string;
  moveUp: string;
  moveDown: string;
  remove: string;
  /** The name of the control that starts a new tab. */
  add: string;
  /** The name and placeholder of the new tab's title field. */
  newTitle: string;
  untitled: string;
}

export const DOC_TABS_EDITOR_LABELS: DocTabsEditorLabels = {
  handle: (name) => `Move ${name}`,
  hint: 'Drag to move, or press the up or down arrow key.',
  moved: (name, position, total) => `${name} moved to position ${position} of ${total}.`,
  heading: 'Tabs',
  titleField: (position) => `Title of tab ${position}`,
  actions: (title) => `Actions for ${title}`,
  rename: 'Rename',
  moveUp: 'Move up',
  moveDown: 'Move down',
  remove: 'Remove',
  add: 'Add tab',
  newTitle: 'New tab title',
  untitled: 'Untitled tab',
};

export interface DocTabsEditorProps {
  /** What the list is, for its accessible name: "Tabs of On-call handbook". */
  label: string;
  items: readonly DocTabsEditorItem[];
  /** The tab whose text is open. */
  selected: string;
  onSelect: (key: string) => void;
  onRename: (key: string, title: string) => void;
  onReorder: (keys: string[]) => void;
  onRemove: (key: string) => void;
  /** Adds a tab after the selected one. */
  onAdd: (title: string) => void;
  /** Why a title cannot be saved, said at its field; null for a title that can. */
  titleProblem?: ((title: string) => string | null) | undefined;
  /** Why no tab can be added now (a doc at its most tabs), shown on Add. */
  addBlocked?: string | undefined;
  disabled?: boolean | undefined;
  labels?: Partial<DocTabsEditorLabels> | undefined;
  className?: string | undefined;
}

/**
 * The tabs of a document an editor arranges, drawn as the list a reader's
 * outline is: each tab a row that opens its text beside the list, the open
 * one marked, and what else a tab can do (rename, move, remove) in the row's
 * own menu, so a list of six tabs reads as six titles rather than thirty
 * controls.
 *
 * A TITLE IS RENAMED IN PLACE. Rename (or a double press on the title) turns
 * the row's title into its field, where Enter or leaving the field keeps the
 * title and Escape puts back the one it had. A title the host refuses
 * (`titleProblem`) is said under it, while it is renamed and after, since the
 * host will not save it either.
 *
 * A NEW TAB IS NAMED BEFORE IT EXISTS. Add opens a field under the open tab,
 * where the new tab will land; Enter, or leaving a field that holds a title,
 * reports the title, and Escape or an empty field adds nothing, so the host
 * never names a tab's file after a placeholder.
 *
 * THE HOST OWNS THE TABS. Every change is reported and nothing is kept here
 * but which row is being renamed and the new tab's title as it is typed, so a
 * draft the host merges or resets is what the list shows. The handle moves a
 * tab by pointer or by the arrow keys, and the menu moves it a step for
 * anyone who reaches neither.
 *
 * THE LAST TAB IS NOT REMOVED: a document keeps one, so its Remove is shown
 * unavailable rather than missing.
 */
export function DocTabsEditor({
  label,
  items,
  selected,
  onSelect,
  onRename,
  onReorder,
  onRemove,
  onAdd,
  titleProblem,
  addBlocked,
  disabled = false,
  labels: overrides,
  className,
}: DocTabsEditorProps) {
  const labels: DocTabsEditorLabels = { ...DOC_TABS_EDITOR_LABELS, ...overrides };
  const byKey = new Map(items.map((item) => [item.key, item]));
  const nameOf = (key: string) => byKey.get(key)?.title.trim() || labels.untitled;
  const reorder = useReorder({ keys: items.map((item) => item.key), onReorder, nameOf, labels });
  const [renaming, setRenaming] = useState<string | null>(null);
  // The title a rename started from, which Escape puts back.
  const before = useRef('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const id = useId();
  const last = reorder.order.length - 1;
  // A new tab lands after the open one, so its field is drawn there.
  const addAfter = reorder.order.includes(selected) ? selected : reorder.order[last];

  const startRename = (key: string) => {
    before.current = byKey.get(key)?.title ?? '';
    setRenaming(key);
  };
  const renameKeys = (key: string) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      setRenaming(null);
    } else if (event.key === 'Escape') {
      // Escape ends the rename and nothing beneath it, since the host's own
      // Escape may leave the whole edit.
      event.preventDefault();
      event.stopPropagation();
      onRename(key, before.current);
      setRenaming(null);
    }
  };

  const add = () => {
    const t = title.trim();
    setAdding(false);
    setTitle('');
    if (t !== '' && !addBlocked && !disabled) onAdd(t);
  };
  const addKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setAdding(false);
      setTitle('');
    }
  };

  const addRow =
    adding && !disabled ? (
      <li key="new" className="crewlet-doc-tabs-editor__item crewlet-doc-tabs-editor__item--new">
        <span className="crewlet-doc-tabs-editor__field">
          <Input
            inputSize="sm"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- drawn by a press of Add, for this title alone
            autoFocus
            value={title}
            aria-label={labels.newTitle}
            placeholder={labels.newTitle}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={addKeys}
            onBlur={add}
          />
        </span>
      </li>
    ) : null;

  return (
    <div className={cx('crewlet-doc-tabs-editor', className)}>
      <div className="crewlet-doc-tabs-editor__head">
        <p className="crewlet-doc-tabs-editor__heading" aria-hidden="true">
          {labels.heading}
        </p>
        <IconButton
          size="sm"
          variant="ghost"
          label={labels.add}
          icon={<PlusGlyph size="sm" />}
          disabled={disabled}
          {...(addBlocked ? { disabledReason: addBlocked } : {})}
          onClick={() => setAdding(true)}
        />
      </div>
      <VisuallyHidden id={reorder.hintId}>{reorder.hint}</VisuallyHidden>
      <ol className="crewlet-doc-tabs-editor__list" aria-label={label} {...reorder.containerProps}>
        {reorder.order.flatMap((key, index) => {
          const item = byKey.get(key);
          if (!item) return [];
          const name = nameOf(key);
          const problem = titleProblem?.(item.title) ?? null;
          const problemId = `${id}-${index}-problem`;
          const open = key === selected;
          const editing = renaming === key && !disabled;
          const { 'aria-label': handleName, ...handle } = reorder.handleProps(key);
          const actions: MenuEntry[] = [
            {
              key: 'rename',
              label: labels.rename,
              icon: <PencilGlyph size="sm" />,
              disabled,
              onSelect: () => startRename(key),
            },
            { kind: 'separator', key: 'moves' },
            {
              key: 'up',
              label: labels.moveUp,
              icon: <ArrowUpGlyph size="sm" />,
              disabled: disabled || index === 0,
              onSelect: () => reorder.move(key, -1),
            },
            {
              key: 'down',
              label: labels.moveDown,
              icon: <ArrowDownGlyph size="sm" />,
              disabled: disabled || index === last,
              onSelect: () => reorder.move(key, 1),
            },
            { kind: 'separator', key: 'end' },
            {
              key: 'remove',
              label: labels.remove,
              icon: <TrashGlyph size="sm" />,
              danger: true,
              disabled: disabled || items.length <= 1,
              onSelect: () => onRemove(key),
            },
          ];
          const row = (
            <li
              key={key}
              className={cx('crewlet-doc-tabs-editor__item', open && 'is-open', editing && 'is-renaming')}
              {...reorder.itemProps(key)}
            >
              <IconButton
                size="sm"
                variant="ghost"
                className="crewlet-doc-tabs-editor__handle"
                label={handleName}
                icon={<GripVerticalGlyph size="sm" />}
                disabled={disabled}
                {...handle}
              />
              <span className="crewlet-doc-tabs-editor__field">
                {editing ? (
                  <Input
                    inputSize="sm"
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- drawn by a press of Rename, for this title alone
                    autoFocus
                    value={item.title}
                    aria-label={labels.titleField(index + 1)}
                    error={problem !== null}
                    {...(problem !== null ? { 'aria-describedby': problemId } : {})}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => onRename(key, event.target.value)}
                    onKeyDown={renameKeys(key)}
                    onBlur={() => setRenaming(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="crewlet-doc-tabs-editor__open"
                    aria-current={open ? 'true' : undefined}
                    {...(problem !== null ? { 'aria-describedby': problemId } : {})}
                    disabled={disabled}
                    onClick={() => onSelect(key)}
                    onDoubleClick={() => startRename(key)}
                  >
                    {name}
                  </button>
                )}
                {problem !== null && (
                  <span id={problemId} className="crewlet-doc-tabs-editor__problem">
                    {problem}
                  </span>
                )}
              </span>
              {!editing && (
                <span className="crewlet-doc-tabs-editor__actions">
                  <Menu label={labels.actions(name)} icon={<EllipsisGlyph size="sm" />} align="end" items={actions} />
                </span>
              )}
            </li>
          );
          return key === addAfter && addRow ? [row, addRow] : [row];
        })}
      </ol>
    </div>
  );
}
