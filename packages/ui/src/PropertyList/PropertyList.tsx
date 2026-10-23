import { Fragment, useId, type ReactNode } from 'react';
import { DescriptionList, DescriptionListItem } from '../DescriptionList/index.js';
import { EmptyValue } from '../EmptyValue/index.js';
import { Link } from '../Link/index.js';
import { SetByLine, type SetBy } from '../ObjectHeader/index.js';
import { cx } from '../utils/cx.js';

/** One fact about an object, as a labelled row of its properties. */
export interface PropertyListItem {
  /** What the property is called. Also the row's identity within its group. */
  label: string;
  /**
   * The value. Absent (null, undefined or "") draws the dash: the property
   * exists and holds nothing. `0` and `false` are values and are drawn.
   */
  value?: ReactNode;
  /** A page the value links to. */
  href?: string | undefined;
  /** Who last changed it. Never drawn under an absent value, unless the change cleared it. */
  setBy?: SetBy | undefined;
  /**
   * Which change set the value, where the by-line alone cannot tell two apart:
   * one actor making two edits that both read "2h ago" are still two changes.
   * Consecutive rows share one by-line only when their by-lines and this agree.
   */
  change?: string | undefined;
  /** Said on hover, where a label needs a sentence the list has no room for. */
  title?: string | undefined;
  /**
   * The label is an IDENTIFIER rather than a word (an environment variable's
   * name, a tag's key), and wears the mono face. A value that is an identifier
   * is the caller's to set.
   */
  identifierLabel?: boolean | undefined;
}

/** A run of properties under one heading. */
export interface PropertyListGroup {
  /** The section heading. Left out, the rows run on without one. */
  name?: string | undefined;
  items: readonly PropertyListItem[];
  /**
   * Said in place of the rows when every one of them is absent: a group nobody
   * has filled in anywhere is one fact, not one dash per row. Set it only where
   * the whole group genuinely means one thing when empty ("Nothing scheduled:
   * no dates, no estimate, no size"); without it every dash stays.
   */
  whenAllAbsent?: string | undefined;
}

/**
 * How a group's heading is set. `eyebrow` is the small capitals of a rail
 * beside an object; `sentence` is sentence case, for a column whose other
 * sections are titled that way.
 */
export type PropertyListHeadings = 'eyebrow' | 'sentence';

export interface PropertyListProps {
  groups: readonly PropertyListGroup[];
  headings?: PropertyListHeadings | undefined;
  /** What an absent value is read as, in place of the dash. */
  emptyLabel?: string | undefined;
  /** The word a by-line's turn link is drawn with. See `SetByLine`. */
  turnLabel?: string | undefined;
  /** Names the list for a screen reader, where nothing above it does. */
  'aria-label'?: string | undefined;
  className?: string | undefined;
}

/**
 * NULL, UNDEFINED AND THE EMPTY STRING, and nothing else: `0` and `false` are
 * values a property can legitimately hold, and a truthiness test would draw
 * both as "nothing set".
 */
function absent(value: ReactNode): boolean {
  return value === null || value === undefined || value === '';
}

/** The by-line this row actually draws, which an absence suppresses. */
function drawnSetBy(item: PropertyListItem): SetBy | undefined {
  if (!item.setBy) return undefined;
  if (absent(item.value) && !item.setBy.cleared) return undefined;
  return item.setBy;
}

/** One by-line and the properties it speaks for. */
interface Attribution {
  setBy: SetBy;
  labels: string[];
}

/**
 * Where each group's by-lines go: one entry per row, filled only at the LAST
 * row of each run that shares one change.
 *
 * THE LAST rather than the first, because the line is a footnote to the
 * values above it; under the first row it would interrupt the run it
 * describes.
 *
 * A ROW THAT DRAWS NO LINE BREAKS THE RUN rather than being passed over. A
 * line naming "Status and Type" drawn under Type, with a Priority between them
 * that it does not cover, is a claim a reader has to check; two shorter lines
 * are not.
 */
function attributions(items: readonly PropertyListItem[]): (Attribution | undefined)[] {
  const out: (Attribution | undefined)[] = items.map(() => undefined);
  let start = -1;
  let key = '';
  const close = (end: number) => {
    if (start < 0) return;
    out[end] = {
      setBy: drawnSetBy(items[start]!)!,
      labels: items.slice(start, end + 1).map((item) => item.label),
    };
    start = -1;
    key = '';
  };
  items.forEach((item, i) => {
    const line = drawnSetBy(item);
    if (!line) {
      close(i - 1);
      return;
    }
    // EVERY PART OF THE LINE, and the change behind it: a key that let two
    // rows merge on less would draw one row's time or turn under both.
    const next = [line.actor, line.ago, line.turnHref, line.cleared, item.change].join('\u0000');
    if (start >= 0 && next === key) return;
    close(i - 1);
    start = i;
    key = next;
  });
  close(items.length - 1);
  return out;
}

/**
 * An object's own facts, as labelled rows in sections, beside or under it.
 *
 * ONE TERM COLUMN DOWN THE WHOLE LIST. Each group is its own description list,
 * so a screen reader hears each section as a list named by its heading, and
 * each is a subgrid of the one grid, so the labels of every section share a
 * single column instead of restarting it per section. The column is the
 * description list's own measure (`--crewlet-description-list-term`), so a
 * page that sets it once lines this list up with every key-value card on it.
 *
 * AN ABSENT VALUE IS A DECISION, not a default, and the caller makes it in
 * one of four ways that are not interchangeable:
 *
 *   - the row is LEFT OUT: this object has no such property at all;
 *   - the row is a DASH (`value` absent): the property exists and holds nothing;
 *   - the row SAYS SOMETHING: the emptiness means something a reader should know;
 *   - the WHOLE GROUP says one thing (`whenAllAbsent`), because every property
 *     in it is absent. Its heading stays: the group exists and is empty, which
 *     is a different claim from an object that has no such group.
 *
 * ONE ATTRIBUTION PER CHANGE, NOT PER ROW. A create sets several fields at
 * once, and identical by-lines under each of them are one sentence copied out
 * several times. A run of consecutive rows set by one change draws ONE line,
 * naming what it covers, under the last of them. AND NEVER UNDER AN ABSENCE:
 * provenance under a dash claims somebody set nothing. The exception is a
 * change that emptied the field, which reads "cleared by".
 */
export function PropertyList({
  groups,
  headings = 'eyebrow',
  emptyLabel = 'Not set',
  turnLabel,
  'aria-label': ariaLabel,
  className,
}: PropertyListProps) {
  const id = useId();
  return (
    <div
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      className={cx('crewlet-property-list', `crewlet-property-list--${headings}`, className)}
    >
      {groups.map((group, index) => {
        const headingId = `${id}-group-${index}`;
        const collapsed = group.whenAllAbsent !== undefined && group.items.every((item) => absent(item.value));
        const lines = collapsed ? [] : attributions(group.items);
        return (
          <Fragment key={group.name ?? index}>
            {group.name ? (
              <div id={headingId} className="crewlet-property-list__heading">
                {group.name}
              </div>
            ) : null}
            {collapsed ? (
              <p className="crewlet-property-list__empty">{group.whenAllAbsent}</p>
            ) : (
              <DescriptionList
                className="crewlet-property-list__group"
                aria-labelledby={group.name ? headingId : undefined}
              >
                {group.items.map((item, row) => {
                  const line = lines[row];
                  return (
                    <DescriptionListItem
                      key={item.label}
                      term={
                        item.title || item.identifierLabel ? (
                          <span
                            title={item.title}
                            className={item.identifierLabel ? 'crewlet-property-list__identifier' : undefined}
                          >
                            {item.label}
                          </span>
                        ) : (
                          item.label
                        )
                      }
                    >
                      <Value item={item} emptyLabel={emptyLabel} />
                      {line ? (
                        <SetByLine
                          setBy={line.setBy}
                          fields={line.labels}
                          turnLabel={turnLabel}
                          className="crewlet-property-list__set-by"
                        />
                      ) : null}
                    </DescriptionListItem>
                  );
                })}
              </DescriptionList>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function Value({ item, emptyLabel }: { item: PropertyListItem; emptyLabel: string }) {
  if (absent(item.value)) return <EmptyValue label={emptyLabel} />;
  if (item.href) {
    return (
      <Link href={item.href} size="inherit">
        {item.value}
      </Link>
    );
  }
  return <>{item.value}</>;
}
