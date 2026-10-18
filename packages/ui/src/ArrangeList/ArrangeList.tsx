import type { ReactNode } from 'react';
import { ChevronDownGlyph, ChevronUpGlyph, GripVerticalGlyph } from '@crewlethq/icons/glyphs';
import { Checkbox } from '../Checkbox/index.js';
import { IconButton } from '../IconButton/index.js';
import { Switch } from '../Switch/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { useReorder, type ReorderLabels } from '../Reorder/index.js';
import { cx } from '../utils/cx.js';

export interface ArrangeItem {
  /** The identity, stable across moves. */
  key: string;
  /** What the reader calls it; also the toggle's and the handle's name. */
  label: string;
  /** One line on what it shows, under the label. */
  description?: ReactNode;
  /** A glyph before the label. */
  icon?: ReactNode;
  /** Whether it is on. */
  shown: boolean;
  /**
   * Why it cannot be turned off, when it cannot. The toggle stays reachable
   * and says so, rather than going `disabled` and dropping out of the reading
   * order.
   */
  fixed?: string | undefined;
  /** A control of the item's own at the row's end, before the move buttons. */
  trailing?: ReactNode;
}

export interface ArrangeListLabels extends ReorderLabels {
  moveUp: (name: string) => string;
  moveDown: (name: string) => string;
  atTop: (name: string) => string;
  atBottom: (name: string) => string;
}

export const DEFAULT_ARRANGE_LABELS: ArrangeListLabels = {
  handle: (name) => `Move ${name}`,
  hint: 'Drag to move, or press the up or down arrow key.',
  moved: (name, position, total) => `${name} moved to position ${position} of ${total}.`,
  moveUp: (name) => `Move ${name} up`,
  moveDown: (name) => `Move ${name} down`,
  atTop: (name) => `${name} is first.`,
  atBottom: (name) => `${name} is last.`,
};

export interface ArrangeListProps {
  /** What the list arranges, for its accessible name: "Cards on Home". */
  label: string;
  items: readonly ArrangeItem[];
  onReorder: (keys: string[]) => void;
  onShownChange: (key: string, shown: boolean) => void;
  /**
   * `switch` when a change applies as it is made, `checkbox` when it is read
   * on a Save. See `Switch` for why the two are not interchangeable.
   */
  toggle?: 'switch' | 'checkbox' | undefined;
  /** Draw the move buttons beside the handle. On by default. */
  moveButtons?: boolean | undefined;
  labels?: Partial<ArrangeListLabels> | undefined;
  className?: string | undefined;
}

/**
 * A list a reader puts in order and switches items on and off in: the
 * sections of a page, the columns of a table, the figures on a summary row.
 *
 * LIFTED OUT OF DATATABLE'S COLUMN SETTINGS, where these rules were first
 * written, so every "choose and arrange" panel reads the same: a handle that
 * is a named control, the arrow keys on it, Move up and Move down beside it,
 * a move announced, and a toggle that can refuse with a reason.
 *
 * AN ITEM SWITCHED OFF KEEPS ITS PLACE. Turning something off is not
 * removing it, so it stays in the list, in order, drawn quieter; turning it
 * back on puts it back where it was.
 *
 * THE ENDS ARE NOT DISABLED. Move up on the first item is `aria-disabled`
 * with a reason (`disabledReason`), because a disabled button drops focus to
 * the page and the reader who moved an item to the top loses their place by
 * doing it.
 */
export function ArrangeList({
  label,
  items,
  onReorder,
  onShownChange,
  toggle = 'switch',
  moveButtons = true,
  labels: overrides,
  className,
}: ArrangeListProps) {
  const labels = { ...DEFAULT_ARRANGE_LABELS, ...overrides };
  const byKey = new Map(items.map((item) => [item.key, item]));
  const nameOf = (key: string) => byKey.get(key)?.label ?? key;
  const reorder = useReorder({
    keys: items.map((item) => item.key),
    onReorder,
    nameOf,
    labels,
  });
  const last = reorder.order.length - 1;

  return (
    <>
      <VisuallyHidden id={reorder.hintId}>{reorder.hint}</VisuallyHidden>
      <ul
        className={cx('crewlet-arrange-list', className)}
        aria-label={label}
        {...reorder.containerProps}
      >
        {reorder.order.map((key, index) => {
          const item = byKey.get(key);
          if (!item) return null;
          const { 'aria-label': handleName, ...handle } = reorder.handleProps(key);
          const fixed = item.fixed !== undefined && item.shown ? item.fixed : undefined;
          const Toggle = toggle === 'switch' ? Switch : Checkbox;
          return (
            <li
              key={key}
              className={cx('crewlet-arrange-list__item', !item.shown && 'is-off')}
              {...reorder.itemProps(key)}
            >
              <IconButton
                size="sm"
                variant="ghost"
                className="crewlet-arrange-list__handle"
                label={handleName}
                icon={<GripVerticalGlyph size="md" />}
                {...handle}
              />
              <Toggle
                className="crewlet-arrange-list__toggle"
                label={
                  item.icon ? (
                    <span className="crewlet-arrange-list__label">
                      <span className="crewlet-arrange-list__icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                  ) : (
                    item.label
                  )
                }
                description={fixed ?? item.description}
                checked={item.shown}
                {...(fixed ? { 'aria-disabled': true } : {})}
                onChange={(event) => {
                  if (fixed) {
                    event.preventDefault();
                    return;
                  }
                  onShownChange(key, event.target.checked);
                }}
              />
              {item.trailing ? <span className="crewlet-arrange-list__trailing">{item.trailing}</span> : null}
              {moveButtons ? (
                <span className="crewlet-arrange-list__moves">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label={labels.moveUp(item.label)}
                    icon={<ChevronUpGlyph size="sm" />}
                    {...(index === 0 ? { disabledReason: labels.atTop(item.label) } : {})}
                    onClick={() => reorder.move(key, -1)}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label={labels.moveDown(item.label)}
                    icon={<ChevronDownGlyph size="sm" />}
                    {...(index === last ? { disabledReason: labels.atBottom(item.label) } : {})}
                    onClick={() => reorder.move(key, 1)}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
