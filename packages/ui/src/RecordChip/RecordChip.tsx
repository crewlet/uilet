import type { ReactNode } from 'react';
import { Popover } from '../Popover/index.js';
import { cx } from '../utils/cx.js';

export interface RecordChipProps {
  /** The record's short key, set in mono: "GOP-11". */
  code?: string | undefined;
  /**
   * What the chip says where the record has no key ("QA", "Decisions waiting
   * on you"). With a key, the key is what the chip says.
   */
  label?: string | undefined;
  /** The record's full name, at the head of the peek: "Android 12 crash when lesson audio starts". */
  title: string;
  /** The record's kind as a glyph, before the key. Decoration. */
  glyph?: ReactNode;
  /** What the peek holds under the name: a few facts, a short table. */
  children?: ReactNode;
  /** The peek's controls, at its foot: the way to the record, a download. */
  actions?: ReactNode;
  /** One line of context in the peek's head, under the name: "Task · In progress". */
  meta?: ReactNode;
  className?: string | undefined;
}

/**
 * A record named inside a sentence, as a chip that opens a PEEK: its name, a
 * few facts and the way to it, without leaving the sentence.
 *
 * WHY IT EXISTS. An answer that names GOP-11 and also draws a card for it says
 * the same record twice, the card a long way under the sentence that needed
 * it. The chip puts the record where the words already are, and costs the
 * line no height: it is the text's own size, on its baseline, exactly one of
 * the line's own lines tall, hairline included.
 *
 * WHAT IT MAY POINT AT. The host draws a chip only for a record it read and
 * resolved itself; the words around it are prose, and a chip is never made
 * from a key the prose merely spells.
 *
 * A BUTTON THAT OPENS A DIALOG. The peek is a named `Popover` dialog, so focus
 * moves into it when it opens. Escape, Tab out of it, or a control inside it
 * that closes it hands focus back to the chip; a press outside closes it and
 * leaves focus where that press put it. A key chip's name is the key and the
 * record's name after it, so a reader moving by control hears what it opens;
 * a label chip's name is its label, which already names the record.
 *
 * A LONG LABEL IS CUT AT THE LINE'S END and carries its whole text as the
 * chip's title, so a pointer reader can still read it.
 */
export function RecordChip({ code, label, title, glyph, children, actions, meta, className }: RecordChipProps) {
  const said = code ?? label ?? title;
  const hasBody = !(children === undefined || children === null || children === false);
  const hasActions = !(actions === undefined || actions === null || actions === false);
  return (
    <Popover
      label={code ? `${code} ${title}` : title}
      align="start"
      className="crewlet-record-chip__peek"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={cx('crewlet-record-chip', code ? 'crewlet-record-chip--code' : null, className)}
          data-open={open || undefined}
          // A KEY IS NAMED BY THE RECORD IT STANDS FOR: the key first, as
          // drawn, then the name. A label is a name already and is its own,
          // never said twice ("Decisions waiting on you (8), Decisions...").
          aria-label={code ? `${code}, ${title}` : undefined}
          // A LABEL MAY BE CUT at the line's end; its whole text is the
          // pointer reader's. A key is short and never is.
          title={code ? undefined : said}
          onClick={toggle}
        >
          {glyph === undefined || glyph === null ? null : (
            <span className="crewlet-record-chip__glyph" aria-hidden="true">
              {glyph}
            </span>
          )}
          <span className="crewlet-record-chip__text">{said}</span>
        </button>
      )}
    >
      <div className="crewlet-record-chip__head">
        {glyph === undefined || glyph === null ? null : (
          <span className="crewlet-record-chip__head-glyph" aria-hidden="true">
            {glyph}
          </span>
        )}
        <div className="crewlet-record-chip__head-words">
          <p className="crewlet-record-chip__name">
            {code ? <span className="crewlet-record-chip__name-code">{code}</span> : null}
            {code ? ' ' : null}
            {title}
          </p>
          {meta === undefined || meta === null ? null : <p className="crewlet-record-chip__meta">{meta}</p>}
        </div>
      </div>
      {hasBody ? <div className="crewlet-record-chip__body">{children}</div> : null}
      {hasActions ? <div className="crewlet-record-chip__actions">{actions}</div> : null}
    </Popover>
  );
}
