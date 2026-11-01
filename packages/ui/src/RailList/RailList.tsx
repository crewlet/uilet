import type { MouseEvent, ReactNode } from 'react';
import { Card } from '../Card/index.js';
import { Select } from '../Select/index.js';
import { NavItem, SidebarNav, type NavItemProps } from '../SidebarNav/index.js';
import { Text } from '../Text/index.js';

/** One of the groups a directory files its items in, and the rail's row for it. */
export interface RailListItem {
  /** Unique among the items, and what `value` names. An empty key is a fine "All". */
  key: string;
  label: string;
  /** How many items the group holds: a quiet figure at the row's end, and after the label in the folded picker. */
  count?: number | undefined;
  /**
   * The group's own address, where the chosen group is kept in the page's
   * address: the row is then a link a reader can open in a new tab, and a
   * plain click still chooses it in place.
   */
  href?: string | undefined;
  /** One quiet line about the group, said over the list while it is chosen: what the group holds. */
  description?: ReactNode;
}

/** Every word the rail and its picker say, beyond the items' own labels. */
export interface RailListLabels {
  /** What a count counts, read after the figure as part of the row's name: "apps" makes "Chat, 6 apps". */
  counted: string;
  /** A group as the folded picker names it: "Chat (6)". */
  option: (label: string, count: number | undefined) => string;
}

export const RAIL_LIST_LABELS: RailListLabels = {
  counted: 'items',
  option: (label, count) => (count === undefined ? label : `${label} (${count.toLocaleString()})`),
};

export interface RailListProps {
  /** Names the rail's navigation and the picker it folds into: "Categories", "Template kinds". */
  label: string;
  /** The groups, in the order the rail lists them; an "All" group is one of them, usually the first. */
  items: readonly RailListItem[];
  /** The chosen group's key. */
  value: string;
  onChange: (key: string) => void;
  /**
   * The bar across the top of the card, over the rail and the list: a search
   * and filter chips. Where the card is too narrow for the rail, the picker
   * it folds into joins this bar. Given as a function, it is handed the
   * picker to place among its own controls; given as content, the picker
   * leads the bar. Left out, the bar is drawn only to hold the picker.
   */
  toolbar?: ReactNode | ((picker: ReactNode) => ReactNode);
  /** One quiet fact about the whole directory, under the rail's rows: what every item in it has in common. */
  note?: ReactNode;
  /** The list the chosen group shows: a grid, a list of tiles. */
  children: ReactNode;
  /** Draws each rail row's link, for a router that owns navigation (`SidebarNav`'s `renderLink`). */
  renderLink?: NavItemProps['renderLink'];
  labels?: Partial<RailListLabels> | undefined;
  className?: string | undefined;
}

/** A click the browser should keep: a new tab, a new window, a download. */
const elsewhere = (event: MouseEvent<HTMLElement>) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

/**
 * A directory in a card: a rail of the groups its items are filed in, beside
 * the list of the chosen group, so a long catalogue reads as a few short
 * lists: apps in what they are for, templates in their kinds, reports in
 * the teams that read them.
 *
 * THE RAIL IS THE APPLICATION'S RAIL, DENSER (`SidebarNav` `dense`), each
 * group a row with its count, the chosen one raised and `aria-current`, on a
 * hairline of its own beside the list, with an optional quiet note under its
 * rows. The chosen group's description, where it has one, stands over the
 * list on a hairline, so a reader knows what the short list is.
 *
 * IT FOLDS BY ITS OWN WIDTH, NOT THE WINDOW'S. Under 44rem of the card's
 * width the rail does not leave the list a readable column, so the rail goes
 * and a `Select` of the same groups, named the same, joins the bar across the
 * top. The same directory in a page and in a 560px sheet is one component
 * with nothing to set: the sheet is simply narrow.
 *
 * Controlled: the chosen group is the caller's, often kept in the page's
 * address (`href` on each group), so a group opened in a new tab and Back
 * both keep it.
 */
export function RailList({
  label,
  items,
  value,
  onChange,
  toolbar,
  note,
  children,
  renderLink,
  labels: overrides,
  className,
}: RailListProps) {
  const words: RailListLabels = overrides ? { ...RAIL_LIST_LABELS, ...overrides } : RAIL_LIST_LABELS;
  const chosen = items.find((item) => item.key === value);
  const about = chosen?.description;

  const picker = (
    <span className="crewlet-rail-list__picker">
      <Select
        ariaLabel={label}
        size="sm"
        width="auto"
        value={value}
        options={items.map((item) => ({ value: item.key, label: words.option(item.label, item.count), text: item.label }))}
        onChange={(next) => onChange(String(next))}
      />
    </span>
  );

  const bar =
    toolbar === undefined || toolbar === null ? (
      <div className="crewlet-rail-list__bar crewlet-rail-list__bar--picker-only">{picker}</div>
    ) : (
      <div className="crewlet-rail-list__bar">
        {typeof toolbar === 'function' ? (
          toolbar(picker)
        ) : (
          <>
            {picker}
            {toolbar}
          </>
        )}
      </div>
    );

  return (
    <Card padding="none" className={className}>
      <div className="crewlet-rail-list">
        {bar}
        <div className="crewlet-rail-list__body">
          <div className="crewlet-rail-list__rail">
            <SidebarNav label={label} dense>
              {items.map((item) => (
                <NavItem
                  key={item.key}
                  label={item.label}
                  href={item.href}
                  current={item.key === value}
                  count={item.count === undefined ? undefined : { value: item.count.toLocaleString(), label: words.counted }}
                  renderLink={renderLink}
                  onClick={(event) => {
                    // A link opened elsewhere is the browser's; a plain click chooses in place.
                    if (item.href !== undefined && elsewhere(event)) return;
                    event.preventDefault();
                    onChange(item.key);
                  }}
                />
              ))}
            </SidebarNav>
            {note !== undefined && note !== null && note !== false ? (
              <Text as="p" variant="caption" tone="tertiary" className="crewlet-rail-list__note">
                {note}
              </Text>
            ) : null}
          </div>
          <div className="crewlet-rail-list__list">
            {about !== undefined && about !== null && about !== false && about !== '' ? (
              <Text as="p" variant="caption" tone="secondary" className="crewlet-rail-list__about">
                {about}
              </Text>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}
