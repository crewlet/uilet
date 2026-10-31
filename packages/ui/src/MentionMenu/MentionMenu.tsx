import type { ReactNode, Ref } from 'react';
import { PersonRow } from '../PersonRow/index.js';
import { cx } from '../utils/cx.js';

/** One thing a composer can mention: a person, an agent, a room, or everyone. */
export interface MentionOption {
  id: string;
  /** What is inserted when it is taken: "@pm", "#engineering". */
  insert: string;
  /** Its name in the list. */
  label: string;
  /** A second piece of identity after the name: a title, a handle, a room's topic. */
  detail?: string | undefined;
  /** A face (an `Avatar` with its status) or a glyph (a room's, `@channel`'s). */
  mark?: ReactNode;
  /** A trailing word: "Working", "Needs you", "Not in this room". */
  note?: ReactNode;
}

/** The words the menu draws, for a host that sets its own. */
export interface MentionMenuLabels {
  /** The keyboard hints at the foot. A touch screen has no keys, so the foot is hidden there. */
  hints: readonly string[];
}

export const MENTION_MENU_LABELS: MentionMenuLabels = {
  hints: ['↑↓ to move', 'Enter or Tab to choose', 'Esc to close'],
};

export interface MentionMenuProps {
  /**
   * The listbox's id. Each option's id is `${id}-${index}`, which is what the
   * field points at with `aria-activedescendant`. With `useListbox`, pass the
   * hook's `listId`, and its `optionId(index)` names the same rows.
   */
  id: string;
  /** What the list offers, as its heading and its name: "People and agents", "Rooms". */
  label: string;
  options: readonly MentionOption[];
  /** The highlighted option's index. */
  active: number;
  /** Taking an option, on a press (the press's default is prevented, so the field keeps focus). */
  onPick: (option: MentionOption, index: number) => void;
  /** The pointer moved onto an option. */
  onHover: (index: number) => void;
  /**
   * The list element: `useListbox`'s `listRef`, so the highlighted row is kept
   * in view as the arrows move and a press outside the list closes it.
   */
  listRef?: Ref<HTMLUListElement> | undefined;
  /** The foot. Left out, it carries the keyboard hints; `null` draws none. */
  footer?: ReactNode;
  labels?: Partial<MentionMenuLabels> | undefined;
  className?: string | undefined;
}

/**
 * The suggestions a composer opens on "@" or "#": people and agents with
 * their faces and what they are doing, rooms with their glyphs, and everyone
 * in the room.
 *
 * A LISTBOX THE FIELD OWNS. Focus stays in the message box, which points at
 * the highlighted row with `aria-activedescendant`, so typing goes on while
 * the list narrows. `useListbox` gives the keys (the arrows wrap, Enter and
 * Tab take the row, Escape closes the list and nothing else); the host spreads
 * `role="combobox"`, `aria-controls`, `aria-expanded` and
 * `aria-activedescendant` on its field, and finds the word being typed with
 * `mentionQuery`.
 *
 * DRAWN ABOVE THE COMPOSER, never over what is being typed: it is placed
 * against the nearest positioned box round the field, as wide as the field
 * and no wider than a list is read (`--crewlet-mention-menu-width`).
 *
 * ITS ROWS ARE `PersonRow`s, so a face, a name and its detail sit where every
 * other list of people in the product puts them.
 */
export function MentionMenu({ id, label, options, active, onPick, onHover, listRef, footer, labels: overrides, className }: MentionMenuProps) {
  const labels = overrides ? { ...MENTION_MENU_LABELS, ...overrides } : MENTION_MENU_LABELS;
  const foot =
    footer === undefined ? (
      <div className="crewlet-mention-menu__footer">
        {labels.hints.map((hint) => (
          <span key={hint}>{hint}</span>
        ))}
      </div>
    ) : footer === null ? null : (
      <div className="crewlet-mention-menu__footer">{footer}</div>
    );
  return (
    <div className={cx('crewlet-mention-menu', className)}>
      <div className="crewlet-mention-menu__label" aria-hidden="true">
        {label}
      </div>
      <ul ref={listRef} id={id} role="listbox" aria-label={label} className="crewlet-mention-menu__list">
        {options.map((option, index) => (
          <PersonRow
            key={option.id}
            as="option"
            id={`${id}-${index}`}
            density="compact"
            avatar={option.mark}
            name={option.label}
            detail={option.detail}
            meta={option.note}
            selected={index === active}
            highlighted={index === active}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(option, index);
            }}
            onMouseEnter={() => onHover(index)}
          />
        ))}
      </ul>
      {foot}
    </div>
  );
}

/** The mention being typed at the caret. */
export interface MentionQuery {
  trigger: '@' | '#';
  /** The words typed after the trigger, possibly none. */
  query: string;
  /** Where the trigger stands in the text, which is where a taken option is inserted from. */
  start: number;
}

/**
 * The "@word" or "#word" that ends at the caret, if the caret is in one. A
 * trigger counts at the start of the text or after whitespace, so an address
 * ("ada@crewlet.com") or a heading mark inside a word opens nothing.
 */
export function mentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const match = /(^|\s)([@#])([\p{L}\p{N}_-]*)$/u.exec(before);
  if (!match) return null;
  const query = match[3] ?? '';
  return { trigger: match[2] as '@' | '#', query, start: before.length - query.length - 1 };
}
