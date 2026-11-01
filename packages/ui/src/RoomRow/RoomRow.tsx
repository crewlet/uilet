import { Fragment, type ReactNode } from 'react';
import { ListItem, type ListItemProps } from '../List/index.js';
import { cx } from '../utils/cx.js';

export interface RoomRowProps
  extends Omit<ListItemProps, 'children' | 'href' | 'onClick' | 'asChild' | 'leading' | 'trailing' | 'tone' | 'dangerLabel'> {
  /** The room's own address: the whole row opens it. */
  href: string;
  /**
   * The room's kind, as its glyph at the small step (a hash, a lock, a team's
   * mark). Decorative: the name says which room it is, and a kind that matters
   * to the reader is said in `tags` or `facts`.
   */
  mark: ReactNode;
  /** The room's name. A long one wraps rather than running under the action. */
  name: ReactNode;
  /** Small labels after the name: `Tag`s such as "Joined" or "Archived". */
  tags?: ReactNode;
  /** What the room is about now. One line, cut with an ellipsis. */
  topic?: ReactNode;
  /**
   * The quiet facts under it, in order: how many are in it, when it last
   * spoke, a sentence about who may join. Joined with a middle dot that a
   * screen reader skips; an empty or missing fact is left out.
   */
  facts?: readonly ReactNode[] | undefined;
}

/**
 * A room as a directory of rooms lists it: its kind's mark and its name with
 * its state, what it is about, a line of facts, and one control at the row's
 * end (Join, Open) beside the row's own link.
 *
 * A LIST ROW, NOT A CARD. It is `List.Item` with its words arranged for a
 * room, so a list of rooms is drawn by `List` (`variant="divided"`) and takes
 * the list's hairlines, hover and focus ring, and a row is the same height as
 * every other list in the product.
 *
 * TWO CONTROLS, NEVER ONE INSIDE THE OTHER. The whole row is a link to the
 * room; the action stands beside it (`List.Item`'s `action`), so Tab reaches
 * each and the link's name is the room's words without "Join" in it. What
 * pressing the action came to, when it needs saying, is the row's `note`,
 * under both.
 */
export function RoomRow({ href, mark, name, tags, topic, facts, className, ...rest }: RoomRowProps) {
  const shown = (facts ?? []).filter((fact) => fact !== undefined && fact !== null && fact !== false && fact !== '');
  return (
    <ListItem {...rest} href={href} className={cx('crewlet-room-row', className)}>
      {/*
        A SPACE BETWEEN EVERY PART, as a text node: the link's name is its
        parts joined with nothing put between them, so "launch", a "Joined"
        tag and the topic were announced as "launchJoinedFriday's release".
      */}
      <span className="crewlet-room-row__name">
        <span className="crewlet-room-row__mark" aria-hidden="true">
          {mark}
        </span>
        <span className="crewlet-room-row__title">{name}</span>
        {tags === undefined || tags === null ? null : <> {tags}</>}
      </span>
      {topic === undefined || topic === null || topic === '' ? null : (
        <>
          {' '}
          <span className="crewlet-room-row__topic">{topic}</span>
        </>
      )}
      {shown.length === 0 ? null : (
        <>
          {' '}
          <span className="crewlet-room-row__facts">
            {shown.map((fact, index) => (
              // KEYED BY PLACE: the facts are positional and drawn whole each time.
              <Fragment key={index}>
                {index === 0 ? null : (
                  <>
                    {/*
                      THE SPACES ARE TEXT NODES beside the dot, so a screen
                      reader, which skips the hidden dot, still hears two facts
                      and not one run-together word ("3 memberslast message").
                    */}{' '}
                    <span className="crewlet-room-row__sep" aria-hidden="true">
                      ·
                    </span>{' '}
                  </>
                )}
                {fact}
              </Fragment>
            ))}
          </span>
        </>
      )}
    </ListItem>
  );
}
