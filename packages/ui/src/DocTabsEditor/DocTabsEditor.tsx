import { useId, useState } from 'react';
import { ChevronDownGlyph, ChevronUpGlyph, GripVerticalGlyph, PencilGlyph, PlusGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { Input } from '../Input/index.js';
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
  /** The name of a tab's title field, by its position (from 1). */
  titleField: (position: number) => string;
  /** The name of the control that opens a tab's text; it is pressed while that text is open. */
  editText: (title: string) => string;
  remove: (title: string) => string;
  /** Why the last tab cannot be removed. */
  lastTab: string;
  moveUp: (title: string) => string;
  moveDown: (title: string) => string;
  atTop: (title: string) => string;
  atBottom: (title: string) => string;
  newTitle: string;
  add: string;
  /** Why Add waits for a title. */
  addNeedsTitle: string;
  untitled: string;
}

export const DOC_TABS_EDITOR_LABELS: DocTabsEditorLabels = {
  handle: (name) => `Move ${name}`,
  hint: 'Drag to move, or press the up or down arrow key.',
  moved: (name, position, total) => `${name} moved to position ${position} of ${total}.`,
  titleField: (position) => `Title of tab ${position}`,
  editText: (title) => `Edit the text of ${title}`,
  remove: (title) => `Remove ${title}`,
  lastTab: 'A doc keeps at least one tab.',
  moveUp: (title) => `Move ${title} up`,
  moveDown: (title) => `Move ${title} down`,
  atTop: (title) => `${title} is first.`,
  atBottom: (title) => `${title} is last.`,
  newTitle: 'New tab title',
  add: 'Add tab',
  addNeedsTitle: 'Give the new tab a title.',
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
 * The tabs of a document an editor arranges: each tab's title edited in place,
 * its text opened beside the list, moved by its handle, the arrow keys or the
 * move buttons, and removed; and a tab added after the one open.
 *
 * THE HOST OWNS THE TABS. Every change is reported and nothing is kept here
 * but the new tab's title as it is typed, so a draft the host merges or
 * resets is what the list shows. A title is held to the host's rules at its
 * field (`titleProblem`), said beside it rather than after a save.
 *
 * THE LAST TAB IS NOT REMOVED: a document keeps one, so its Remove says why
 * rather than disappearing.
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
  const [title, setTitle] = useState('');
  const id = useId();
  const last = reorder.order.length - 1;
  const add = () => {
    if (title.trim() === '' || addBlocked || disabled) return;
    onAdd(title.trim());
    setTitle('');
  };

  return (
    <div className={cx('crewlet-doc-tabs-editor', className)}>
      <VisuallyHidden id={reorder.hintId}>{reorder.hint}</VisuallyHidden>
      <ol className="crewlet-doc-tabs-editor__list" aria-label={label} {...reorder.containerProps}>
        {reorder.order.map((key, index) => {
          const item = byKey.get(key);
          if (!item) return null;
          const name = nameOf(key);
          const problem = titleProblem?.(item.title) ?? null;
          const problemId = `${id}-${index}-problem`;
          const open = key === selected;
          const { 'aria-label': handleName, ...handle } = reorder.handleProps(key);
          return (
            <li key={key} className={cx('crewlet-doc-tabs-editor__item', open && 'is-open')} {...reorder.itemProps(key)}>
              <IconButton
                size="sm"
                variant="ghost"
                className="crewlet-doc-tabs-editor__handle"
                label={handleName}
                icon={<GripVerticalGlyph size="md" />}
                disabled={disabled}
                {...handle}
              />
              <span className="crewlet-doc-tabs-editor__field">
                <Input
                  inputSize="sm"
                  value={item.title}
                  aria-label={labels.titleField(index + 1)}
                  error={problem !== null}
                  disabled={disabled}
                  {...(problem !== null ? { 'aria-describedby': problemId } : {})}
                  onChange={(event) => onRename(key, event.target.value)}
                />
                {problem !== null && (
                  <span id={problemId} className="crewlet-doc-tabs-editor__problem">
                    {problem}
                  </span>
                )}
              </span>
              <IconButton
                size="sm"
                variant={open ? 'secondary' : 'ghost'}
                pressed={open}
                label={labels.editText(name)}
                icon={<PencilGlyph size="sm" />}
                disabled={disabled}
                onClick={() => onSelect(key)}
              />
              <span className="crewlet-doc-tabs-editor__moves">
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={labels.moveUp(name)}
                  icon={<ChevronUpGlyph size="sm" />}
                  {...(index === 0 ? { disabledReason: labels.atTop(name) } : {})}
                  disabled={disabled}
                  onClick={() => reorder.move(key, -1)}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={labels.moveDown(name)}
                  icon={<ChevronDownGlyph size="sm" />}
                  {...(index === last ? { disabledReason: labels.atBottom(name) } : {})}
                  disabled={disabled}
                  onClick={() => reorder.move(key, 1)}
                />
              </span>
              <IconButton
                size="sm"
                variant="ghost"
                label={labels.remove(name)}
                icon={<TrashGlyph size="sm" />}
                {...(items.length <= 1 ? { disabledReason: labels.lastTab } : {})}
                disabled={disabled}
                onClick={() => onRemove(key)}
              />
            </li>
          );
        })}
      </ol>
      <div className="crewlet-doc-tabs-editor__add">
        <Input
          inputSize="sm"
          value={title}
          aria-label={labels.newTitle}
          placeholder={labels.newTitle}
          disabled={disabled}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add();
          }}
        />
        <Button
          size="small"
          variant="secondary"
          leadingIcon={<PlusGlyph size="sm" />}
          disabled={disabled}
          disabledReason={addBlocked ?? (title.trim() === '' ? labels.addNeedsTitle : undefined)}
          onClick={add}
        >
          {labels.add}
        </Button>
      </div>
    </div>
  );
}
