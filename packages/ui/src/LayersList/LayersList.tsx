import type { KeyboardEvent, ReactNode } from 'react';
import { useRoving } from '../Tabs/roving.js';
import { cx } from '../utils/cx.js';

/** One entry of the list: what it names and the id it is picked by. */
export interface LayersListItem {
  id: string;
  label: string;
}

export interface LayersListLabels {
  /**
   * An entry's accessible name where the list opens entries (`onOpen`), so a
   * reader hears how: "Hero, press Enter or double-click to open".
   */
  openable: (label: string) => string;
}

export const LAYERS_LIST_LABELS: LayersListLabels = {
  openable: (label) => `${label}, press Enter or double-click to open`,
};

export interface LayersListProps {
  /** The list's accessible name, such as "Boards". */
  label: string;
  items: readonly LayersListItem[];
  /** The entry picked on the surface the list stands beside; null or absent is none. */
  selected?: string | null | undefined;
  /** A press picks an entry: a click, or Space on the one with focus. */
  onSelect?: ((id: string) => void) | undefined;
  /** Enter or a double-click opens an entry. Absent, entries are only picked. */
  onOpen?: ((id: string) => void) | undefined;
  /** What stands over the list, such as its count ("14 boards"). It does not scroll. */
  heading?: ReactNode;
  labels?: Partial<LayersListLabels> | undefined;
  className?: string | undefined;
}

/**
 * The list of a canvas's items beside it, as a design tool's layers are: a
 * board picked on the canvas is marked here, and one picked here is picked
 * there. The caller holds the selection and hands it to both.
 *
 * QUIET UNTIL IT IS CURRENT. Entries are one line in the secondary ink; the
 * picked one takes the primary ink and the accent edge every current row in
 * the system takes (the document outline's open entry), and the edge is held
 * on every entry in its resting colour, so nothing moves when the pick does.
 * A long name is cut to one line with the whole of it as the native tip: a
 * layer list is scanned down its left edge, and a name that wrapped made its
 * neighbours hard to find.
 *
 * ITS LETTERS STAND ON ITS CONTAINER'S EDGE. The entries' padding and edge
 * hang into the gutter beside the list, so the names line up with whatever
 * stands above the list (a count, a bar) and only an entry's hover and the
 * current entry's mark reach past that line.
 *
 * ONE TAB STOP. The list is one control: Tab passes it, the arrows and Home
 * and End move inside it without picking (manual activation, so a reader can
 * look along the list without moving the canvas), Space or a click picks,
 * and Enter or a double-click opens. The stop is the picked entry, or the
 * one focus last left.
 *
 * IT SCROLLS ON ITS OWN, under a heading that stays, when it holds more
 * entries than the height it is given; it never grows the page.
 */
export function LayersList({
  label,
  items,
  selected = null,
  onSelect,
  onOpen,
  heading,
  labels,
  className,
}: LayersListProps) {
  const text = { ...LAYERS_LIST_LABELS, ...labels };
  const roving = useRoving(items.length, null, { followFocus: true });
  const picked = items.findIndex((item) => item.id === selected);
  // No entry is ever disabled, so the stop is the picked entry or the first.
  const stop = roving.focused ?? Math.max(0, picked);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === 'Enter' && onOpen) {
      event.preventDefault();
      onOpen(id);
      return;
    }
    roving.onKeyDown(event, true);
  };

  return (
    <nav className={cx('crewlet-layers-list', className)} aria-label={label}>
      {heading !== undefined && heading !== null ? (
        <div className="crewlet-layers-list__heading">{heading}</div>
      ) : null}
      <ol className="crewlet-layers-list__items">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              ref={(el) => {
                roving.buttons.current[index] = el;
              }}
              className="crewlet-layers-list__item"
              aria-label={onOpen ? text.openable(item.label) : undefined}
              aria-current={item.id === selected ? 'true' : undefined}
              title={item.label}
              tabIndex={index === stop ? 0 : -1}
              onFocus={() => roving.onFocusAt(index)}
              onClick={() => onSelect?.(item.id)}
              onDoubleClick={onOpen ? () => onOpen(item.id) : undefined}
              onKeyDown={(event) => onKeyDown(event, item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
