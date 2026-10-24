import type { ReactNode } from 'react';
import { ArrowUpRightGlyph } from '@crewlethq/icons/glyphs';
import { Link } from '../Link/index.js';
import { cx } from '../utils/cx.js';

/** Who last changed a value, and where. */
export interface SetBy {
  /** Who changed it: a seat, a person, the operator. */
  actor: string;
  /** When, already said as a relative time ("2h ago"); the caller formats it. */
  ago?: string | undefined;
  /** The page of the turn that changed it. Drawn as "turn" with an outward arrow. */
  turnHref?: string | undefined;
  /**
   * The change EMPTIED the field rather than filling it. "Nobody set a due
   * date" and "ada took the due date off" are different facts about the same
   * blank cell, and only the second is something a change log witnessed.
   */
  cleared?: boolean | undefined;
}

export interface SetByLineProps {
  setBy: SetBy;
  /**
   * The properties this one line covers, when it covers more than its own: a
   * create sets several fields at once, and identical by-lines under each of
   * them are one sentence copied out several times.
   */
  fields?: readonly string[] | undefined;
  /** The word the turn link is drawn with. */
  turnLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * "Status", "Status and Priority", "Status, Priority and Type".
 *
 * BY HAND RATHER THAN `Intl.ListFormat`, which is locale-keyed: `en-US`
 * writes the serial comma and `en-GB` does not, so the string drawn would
 * depend on the reader's browser and no test could name it.
 */
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Who set a value, in the one wording the whole product uses: "set by ada ·
 * 2h ago · turn", the last word a link to the turn that did it.
 *
 * ONE WORDING. A header's fact line and a properties rail beside it state the
 * same provenance, and phrased two ways on one screen a bare handle under a
 * value reads as who wrote the row rather than who set the field.
 *
 * THE TURN LINK IS ONE TOKEN: the word and its arrow are one atomic box, so
 * the arrow never lands on a line of its own.
 */
export function SetByLine({ setBy, fields, turnLabel = 'turn', className }: SetByLineProps) {
  return (
    <span className={cx('crewlet-set-by', className)}>
      {fields && fields.length > 1 ? <>{listOf(fields)} · </> : null}
      {setBy.cleared ? 'cleared by ' : 'set by '}
      {setBy.actor}
      {setBy.ago ? ` · ${setBy.ago}` : ''}
      {setBy.turnHref ? (
        <>
          {' · '}
          <Link className="crewlet-set-by__turn" href={setBy.turnHref} size="inherit">
            {turnLabel} <ArrowUpRightGlyph size="xs" aria-hidden="true" />
          </Link>
        </>
      ) : null}
    </span>
  );
}

/** One fact about an object, in its header's fact line. */
export interface ObjectFact {
  label: string;
  /** The value. A fact with no value (null, undefined or "") is not drawn at all. */
  value: ReactNode;
  /** A page the value links to. */
  href?: string | undefined;
  /** Who last changed it. */
  setBy?: SetBy | undefined;
  /**
   * Where the value came from, for a fact a reader can reasonably doubt:
   * whether it was measured or derived, and what it covers. Only for facts
   * where the answer is not obvious; a note on every value is a line nobody
   * reads.
   */
  note?: ReactNode;
  /**
   * A STACKED READING rather than a phrase (an expression on one line, what
   * it means on the next), drawn whole and never clamped. For a value whose
   * length the caller bounds.
   */
  whole?: boolean | undefined;
  /**
   * ONE TOKEN (a wire type, a trace id), which no reader can use broken in
   * two: two tracks and one line, cut with an ellipsis only where two tracks
   * are still too narrow. Put the whole value in a `title`.
   */
  token?: boolean | undefined;
  /**
   * A SET OF CHIPS (a node's roles): two tracks, wrapped between chips and
   * never inside one, and never clamped.
   */
  set?: boolean | undefined;
}

export interface FactLineProps {
  facts: readonly ObjectFact[];
  className?: string | undefined;
}

/**
 * An object's facts as one line of label-over-value cells.
 *
 * TWO BANDS: the labels share a row across the line and the values' first
 * lines share the next. A fact's note and its by-line follow its own value in
 * one cell, rather than a band of notes a neighbour's two-line value pushes
 * away from it. A value gets two lines before it is cut, because a short
 * phrase cut at one ("not running on this no…") loses the part that said
 * where.
 *
 * NEVER "SET BY" UNDER NOTHING. A fact with no value is dropped, its
 * attribution with it.
 */
export function FactLine({ facts, className }: FactLineProps) {
  const shown = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== '');
  if (shown.length === 0) return null;
  return (
    <div className={cx('crewlet-fact-line', className)}>
      {shown.map((fact) => (
        <span
          key={fact.label}
          className={cx(
            'crewlet-fact-line__fact',
            fact.token && 'crewlet-fact-line__fact--token',
            fact.set && 'crewlet-fact-line__fact--set',
          )}
        >
          <span className="crewlet-fact-line__label">{fact.label}</span>
          <span className="crewlet-fact-line__body">
            <span
              className={cx(
                'crewlet-fact-line__value',
                fact.token
                  ? 'crewlet-fact-line__value--token'
                  : !fact.whole && !fact.set && 'crewlet-fact-line__value--clamp',
              )}
            >
              {fact.href ? (
                <Link href={fact.href} size="inherit">
                  {fact.value}
                </Link>
              ) : (
                fact.value
              )}
            </span>
            {fact.note ? <span className="crewlet-fact-line__note">{fact.note}</span> : null}
            {fact.setBy ? <SetByLine setBy={fact.setBy} className="crewlet-fact-line__set-by" /> : null}
          </span>
        </span>
      ))}
    </div>
  );
}

export type ObjectHeaderSize = 'page' | 'peek';

export interface ObjectHeaderProps {
  /** The eyebrow: what kind of thing this is ("Person", "Turn"). */
  kind: ReactNode;
  /** A glyph beside the kind. A component, not a name. */
  icon?: ReactNode;
  /**
   * The object's own mark, drawn large on a plate beside everything else: a
   * vendor's or a product's mark on an integration's page. Decorative, since
   * the title names the object; a header without one keeps its one column.
   */
  mark?: ReactNode;
  /** The key, handle or id, in the mono face. */
  identifier?: ReactNode;
  /**
   * Whose the object is, where that is part of its identity and is a NAME
   * rather than a key (the seat a schedule is declared on). In the eyebrow, in
   * the reader's words and the eyebrow's ink.
   */
  within?: ReactNode;
  /** The object's name. */
  title: ReactNode;
  /** The object's state: glyphs or pills, never identity. Several is the ordinary case. */
  status?: ReactNode;
  /**
   * The facts a reader scans. Pass none where a properties rail stacked under
   * the header states the same properties: one column saying them twice is not
   * a second reading. The header draws exactly what it is handed.
   */
  facts?: readonly ObjectFact[] | undefined;
  /**
   * What the object says about itself, in a sentence its author wrote: drawn
   * under the title at the compact step in the secondary ink, at most two
   * lines.
   */
  description?: ReactNode;
  /** What the reader can do with the object. */
  actions?: ReactNode;
  /** A page's header, or the tighter one a peek or a hover card draws. */
  size?: ObjectHeaderSize | undefined;
  className?: string | undefined;
}

/**
 * The header of an object, on its page, in a peek and in a hover card.
 *
 * ONE COMPONENT, because a reader scans the same facts in the same order
 * wherever the object appears; a page that put the state first and a peek
 * that put the owner first would make the reader learn the object again every
 * time it changed frame.
 *
 * THE TITLE IS A LEVEL-TWO HEADING in every frame: on a page the last crumb is
 * the `h1` and names the same object, and in a peek the page already has one.
 * It gets two lines and no more, because it is the one part of the head row
 * that can be shortened without saying something else; the state marks and
 * the actions wrap onto a line of their own instead of each giving up a few
 * characters.
 */
export function ObjectHeader({
  kind,
  icon,
  mark,
  identifier,
  within,
  title,
  status,
  facts,
  description,
  actions,
  size = 'page',
  className,
}: ObjectHeaderProps) {
  const body = (
    <>
      <div className="crewlet-object-header__eyebrow">
        {icon ? (
          <span className="crewlet-object-header__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span>{kind}</span>
        {/* The mono face and nothing else: inline code is a chip, and a chip
            inside the quietest line on the screen is a second surface in it. */}
        {identifier ? <span className="crewlet-object-header__id crewlet-object-header__id--mono">{identifier}</span> : null}
        {within ? <span className="crewlet-object-header__id">{within}</span> : null}
      </div>
      <div className="crewlet-object-header__head">
        <h2 className="crewlet-object-header__title">{title}</h2>
        {status ? <div className="crewlet-object-header__status">{status}</div> : null}
        {actions ? <div className="crewlet-object-header__actions">{actions}</div> : null}
      </div>
      {description ? <p className="crewlet-object-header__description">{description}</p> : null}
      {facts ? <FactLine facts={facts} /> : null}
    </>
  );
  return (
    <header
      className={cx(
        'crewlet-object-header',
        `crewlet-object-header--${size}`,
        mark ? 'crewlet-object-header--marked' : null,
        className,
      )}
    >
      {mark ? (
        <>
          <span className="crewlet-object-header__mark" aria-hidden="true">
            {mark}
          </span>
          <div className="crewlet-object-header__body">{body}</div>
        </>
      ) : (
        body
      )}
    </header>
  );
}
