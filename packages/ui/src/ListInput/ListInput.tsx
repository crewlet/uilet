import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ArrowDownGlyph,
  ArrowUpGlyph,
  GripVerticalGlyph,
  PlusGlyph,
  XGlyph,
} from '@crewlethq/icons/glyphs';
import { announce } from '../Announcer/index.js';
import { Button } from '../Button/index.js';
import { CharacterCount, characterCountState, countCharacters } from '../CharacterCount/index.js';
import { IconButton } from '../IconButton/index.js';
import { FormField, Input, Textarea } from '../Input/index.js';
import { Kbd } from '../Kbd/index.js';
import { isComposing } from '../Layer/index.js';
import { useReorder } from '../Reorder/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * The list a form would save: `value` with the new-item box's text appended,
 * trimmed, when there is any.
 *
 * WHY A FORM NEEDS IT. Text typed into the new-item box is not an item until
 * Enter adds it, and a writer who types a policy and presses the form's Save
 * expects it saved, not silently dropped. An owner that holds the box's text
 * (`draft` and `onDraftChange`) counts it as unsaved and saves it with this,
 * so the rule is written once rather than by each form.
 */
export function withDraft(value: readonly string[], draft: string | undefined): string[] {
  const text = (draft ?? '').trim();
  return text === '' ? [...value] : [...value, text];
}

/** What a caller can ask the list to do from outside it. */
export interface ListInputHandle {
  /**
   * Puts the focus in the item at `index` (in `value`'s order), with the caret
   * at its end: the first item a failed save refused, or the one a conflict
   * kept. Does nothing for an index the list does not hold.
   */
  focusItem: (index: number) => void;
  /** Puts the focus in the new-item box, when the list is not full. */
  focusNew: () => void;
}

export interface ListInputProps {
  /** The list's name, such as "Responsibilities". It is the group's legend. */
  label: string;
  /** One item's name in lower case, such as "responsibility". Every control is named with it. */
  itemName: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  /**
   * The text in the new-item box, held by the owner. Left out, the list holds
   * it itself. Hold it wherever a form saves the list: text typed and not yet
   * added is part of what the writer means to save, so the owner counts it
   * as a change and saves it (`withDraft`) rather than dropping it.
   */
  draft?: string | undefined;
  /** Every change to the new-item box's text, an add clearing it included. */
  onDraftChange?: ((next: string) => void) | undefined;
  /**
   * The legend is kept for assistive technology and drawn for nobody, for a
   * list whose name is already the heading right above it (a card titled
   * "Standing policies"). The add control stays where it is.
   */
  hideLabel?: boolean | undefined;
  /** Items are paragraphs: Shift+Enter makes a newline. */
  multiline?: boolean | undefined;
  /** Where the values come from, or what shape they take. */
  helper?: ReactNode | undefined;
  /** Show the helper only while the list has focus, as `FormField`'s `helperOnFocus`. */
  helperOnFocus?: boolean | undefined;
  /** Why the last value was refused. */
  error?: ReactNode | undefined;
  /** Shown in the new-item box. */
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  /** Says "(optional)" beside the legend. */
  optional?: boolean | undefined;
  /** Draws the Enter keycap inside the new-item box, which is what adds one. */
  enterHint?: boolean | undefined;
  /**
   * Puts the focus in the new-item box when the list mounts, for a form
   * opened to change THIS list ("Edit policies"): the reader lands where the
   * next item is written rather than on the form's first field. It is taken
   * during mount, so a dialog the list opens in keeps it rather than moving
   * focus to its own first control. Named as `TagsInput`'s is.
   */
  focusOnMount?: boolean | undefined;
  /**
   * Each row carries a grip it can be DRAGGED by, as well as Move up and Move
   * down. Off by default. The grip is a pointer's affordance only, hidden from
   * a screen reader and out of the tab order, because the keyboard already
   * has the whole of reordering (Alt+Up and Alt+Down from the item, and the
   * two buttons) and a third control per row that does the same thing is a
   * row a keyboard has to Tab through for nothing.
   */
  reorderByDrag?: boolean | undefined;
  /**
   * The most items the list holds. Once it is full the new-item box gives way
   * to a sentence saying so (`fullMessage`), the add control does nothing,
   * and every item stays editable, movable and removable.
   */
  maxItems?: number | undefined;
  /**
   * The most characters one item holds, counted on its TRIMMED text as a
   * server judging the saved list does, and as code points (see
   * `countCharacters`). A SOFT limit, as `FormField`'s
   * `limit` is: an item past it keeps what was typed, draws its count in the
   * danger ink and is marked invalid; the new-item box refuses to add one,
   * and shows its count from nine tenths of the way.
   */
  maxLength?: number | undefined;
  /**
   * Removing an item leaves a row where it was, saying so, with Undo (which
   * puts it back where it was, with the focus in it) and Dismiss. The focus
   * goes to Undo. The row goes on the list's next change or on Dismiss, so an
   * Undo never restores an item into a list that has moved on.
   */
  undoRemove?: boolean | undefined;
  /**
   * A refusal of one item, said under it and linked to it, which marks it
   * invalid: a server's word about policy 3, or a rule only the caller knows.
   * Called for every item on every render, with its index and its value.
   */
  itemError?: ((index: number, value: string) => ReactNode) | undefined;
  /** What the list says in place of the new-item box once it is full. */
  fullMessage?: ((max: number) => string) | undefined;
  /** The name of the control beside the legend that appends what the box holds. */
  addLabel?: ((itemName: string) => string) | undefined;
  itemLabel?: ((name: string, position: string) => string) | undefined;
  newItemLabel?: ((itemName: string) => string) | undefined;
  moveUpLabel?: ((itemName: string, position: string) => string) | undefined;
  moveDownLabel?: ((itemName: string, position: string) => string) | undefined;
  removeLabel?: ((itemName: string, position: string) => string) | undefined;
  addedMessage?: ((itemName: string, position: string) => string) | undefined;
  removedMessage?: ((itemName: string, position: string) => string) | undefined;
  movedMessage?: ((itemName: string, position: number, count: number) => string) | undefined;
  /** The row a removed item leaves (`undoRemove`): "Policy 3 removed." */
  removedNotice?: ((name: string, position: number) => string) | undefined;
  undoLabel?: string | undefined;
  dismissLabel?: string | undefined;
  restoredMessage?: ((itemName: string, position: string) => string) | undefined;
}

let minted = 0;
const mint = () => `item-${(minted += 1)}`;

const capitalized = (text: string): string =>
  text.charAt(0).toLocaleUpperCase() + text.slice(1);

type Target = 'input' | 'up' | 'down' | 'add' | 'undo';

/**
 * An ordered list of strings, edited in place.
 *
 * WHY IT EXISTS. A seat's responsibilities, a unit's goals and a company's
 * policies are ordered lists of sentences, and the order is meaning: the
 * first policy is read first. A comma-separated text box loses the commas
 * inside a sentence, and one row per item with no way to reorder turns "move
 * this up" into deleting and retyping it.
 *
 * THE RULES IT KEEPS.
 *
 * - ENTER ADDS. In the new-item box, Enter appends what was typed (trimmed at
 *   the ends) and leaves focus in the box for the next one. In an item, Enter
 *   moves on to the next item, or to the new-item box after the last. It is
 *   never allowed to submit the form the list sits in: finishing a sentence
 *   is not saving the editor.
 * - SHIFT+ENTER IS A NEWLINE in a multiline list, where an item is a paragraph.
 * - A KEY AN INPUT METHOD IS COMPOSING WITH IS ITS OWN: the Enter that accepts
 *   a word neither adds the item nor moves on, and Alt+Arrow does not reorder
 *   under a half-built word.
 * - EVERY ITEM IS EDITED WHERE IT IS, as its own labelled control ("Goal 2 of
 *   3"), with Move up, Move down and Remove beside it.
 * - ALT+UP AND ALT+DOWN MOVE THE FOCUSED ITEM, and focus moves with it. After
 *   a Move button, focus stays on that item's button, or on its other one when
 *   the item reached an end, so pressing it again keeps working.
 * - REMOVING an item moves focus to the item that took its place, else the one
 *   before, else the new-item box, so focus never falls to the page.
 * - EVERY CHANGE IS ANNOUNCED, because a move or a removal is otherwise silent
 *   to anybody not watching the rows.
 * - AN ITEM KEEPS ITS ELEMENT ACROSS A MOVE, so a caret and an input method's
 *   composition survive reordering. Two identical sentences are still two
 *   items.
 *
 * Ported from the engine dashboard's `ui/ListField.tsx`.
 */
export const ListInput = forwardRef<ListInputHandle, ListInputProps>(function ListInput({
  label,
  itemName,
  value,
  onChange,
  draft: ownedDraft,
  onDraftChange,
  hideLabel = false,
  multiline = false,
  helper,
  helperOnFocus,
  error,
  placeholder,
  disabled = false,
  optional,
  enterHint = true,
  focusOnMount = false,
  reorderByDrag = false,
  maxItems,
  maxLength,
  undoRemove = false,
  itemError,
  fullMessage = (max) => `The list is full at ${max}. Remove one to add another.`,
  addLabel = (name) => `Add ${name}`,
  itemLabel = (name, position) => `${name} ${position}`,
  newItemLabel = (name) => `New ${name}`,
  moveUpLabel = (name, position) => `Move ${name} ${position} up`,
  moveDownLabel = (name, position) => `Move ${name} ${position} down`,
  removeLabel = (name, position) => `Remove ${name} ${position}`,
  addedMessage = (name, position) => `Added ${name} ${position}`,
  removedMessage = (name, position) => `Removed ${name} ${position}`,
  movedMessage = (name, position, count) => `Moved ${name} to position ${position} of ${count}`,
  removedNotice = (name, position) => `${name} ${position} removed.`,
  undoLabel = 'Undo',
  dismissLabel = 'Dismiss',
  restoredMessage = (name, position) => `Restored ${name} ${position}`,
}: ListInputProps, ref) {
  /*
   * THE NEW-ITEM BOX'S TEXT, the owner's when it holds it. Held here alone it
   * was invisible to the form around the list, so a policy typed and not yet
   * added was dropped by Save without a word and missed by every "unsaved
   * changes" check.
   */
  const [heldDraft, setHeldDraft] = useState('');
  const draft = ownedDraft ?? heldDraft;
  const setDraft = (next: string) => {
    if (ownedDraft === undefined) setHeldDraft(next);
    onDraftChange?.(next);
  };

  /** An item just removed, while it can still be put back (`undoRemove`). */
  const [removed, setRemoved] = useState<{ id: string; text: string; index: number } | null>(null);

  /*
   * IDENTITY PER ITEM, kept beside the strings. Two identical sentences are
   * two items, and an item that moves keeps its element, so a caret and a
   * composition survive the reorder. Re-minted only when the list's LENGTH
   * changes under an owner that did not go through `emit`, which is what a
   * reducer copying the array looks like from here.
   */
  const ids = useRef<string[]>([]);
  const emitted = useRef<readonly string[] | null>(null);
  if (value !== emitted.current && value.length !== ids.current.length) {
    ids.current = value.map(mint);
    // The list was replaced from outside: an Undo would put an item back
    // into a list it was never removed from.
    if (removed !== null) setRemoved(null);
  }

  const inputs = useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement>());
  const ups = useRef(new Map<string, HTMLButtonElement>());
  const downs = useRef(new Map<string, HTMLButtonElement>());
  const addBox = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const undoButton = useRef<HTMLButtonElement | null>(null);
  const focusNext = useRef<{ id: string; target: Target } | null>(null);

  const focusField = (el: HTMLInputElement | HTMLTextAreaElement | undefined | null) => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  };
  useImperativeHandle(ref, () => ({
    focusItem: (index) => {
      const id = ids.current[index];
      if (id !== undefined) focusField(inputs.current.get(id));
    },
    focusNew: () => addBox.current?.focus(),
  }));

  // ONCE, ON MOUNT: a list that grabbed the focus on every render would take
  // it back from the item the reader moved to.
  const focusAtMount = useRef(focusOnMount);
  useLayoutEffect(() => {
    if (focusAtMount.current) addBox.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    focusNext.current = null;
    if (want.target === 'add') {
      addBox.current?.focus();
      return;
    }
    if (want.target === 'undo') {
      undoButton.current?.focus();
      return;
    }
    const up = ups.current.get(want.id);
    const down = downs.current.get(want.id);
    const box = inputs.current.get(want.id);
    const order =
      want.target === 'up' ? [up, down, box] : want.target === 'down' ? [down, up, box] : [box];
    order.find((el) => el && !(el as HTMLButtonElement).disabled)?.focus();
  });

  /**
   * Every change to the list goes through here, and every change but the one
   * that leaves it takes the removed row down: "the next change" is any of
   * them, an edit of another item's words included.
   */
  function emit(next: string[], nextIds: string[], said?: string, leaving: typeof removed = null) {
    ids.current = nextIds;
    emitted.current = next;
    setRemoved(leaving);
    onChange(next);
    if (said) announce(said);
  }

  const name = capitalized(itemName);
  const count = value.length;
  const listId = useId();
  const full = maxItems !== undefined && count >= maxItems;
  /** How long a text is against the limit: TRIMMED, as the saved list will hold it. */
  const measured = (text: string) => countCharacters(text.trim());
  const overLimit = (text: string) =>
    maxLength !== undefined && characterCountState(measured(text), maxLength) === 'over';
  const draftRefused = draft.trim() === '' || overLimit(draft);
  const draftCount = maxLength !== undefined && characterCountState(measured(draft), maxLength) !== 'within';

  /*
   * DRAGGING REORDERS THE SAME IDS the buttons do, through the kit's one
   * reorder hook, so a dragged item keeps its element (and its caret) exactly
   * as a moved one does. Called whether or not dragging is on, as a hook must
   * be; with it off nothing it returns is spread.
   */
  const reorder = useReorder({
    keys: ids.current,
    nameOf: () => itemName,
    onReorder: (nextIds) => {
      const byId = new Map(ids.current.map((id, at) => [id, value[at]!]));
      emit(
        nextIds.map((id) => byId.get(id)!),
        nextIds,
      );
    },
    labels: { moved: (_, position, total) => movedMessage(itemName, position, total) },
  });
  const drags = reorderByDrag && !disabled;
  const order = drags ? reorder.order : ids.current;

  function add() {
    const text = draft.trim();
    if (!text || disabled || full || overLimit(text)) return;
    const id = mint();
    const filled = maxItems !== undefined && count + 1 >= maxItems;
    emit(
      [...value, text],
      [...ids.current, id],
      addedMessage(itemName, `${count + 1} of ${count + 1}`) + (filled ? `. ${fullMessage(maxItems!)}` : ''),
    );
    setDraft('');
    // The box goes once the list is full, so the focus goes to what was just
    // written rather than to a control that is no longer there.
    focusNext.current = filled ? { id, target: 'input' } : { id: '', target: 'add' };
  }

  function move(index: number, by: -1 | 1, target: Target) {
    const to = index + by;
    if (disabled || to < 0 || to >= count) return;
    const next = [...value];
    const nextIds = [...ids.current];
    [next[index], next[to]] = [next[to]!, next[index]!];
    [nextIds[index], nextIds[to]] = [nextIds[to]!, nextIds[index]!];
    focusNext.current = { id: nextIds[to]!, target };
    emit(next, nextIds, movedMessage(itemName, to + 1, count));
  }

  /** The item that took `index`'s place, else the one before, else the new-item box. */
  const neighbourOf = (nextIds: readonly string[], index: number): { id: string; target: Target } => {
    const neighbour = nextIds[index] ?? nextIds[index - 1];
    return neighbour ? { id: neighbour, target: 'input' } : { id: '', target: 'add' };
  };

  function remove(index: number) {
    if (disabled) return;
    const next = value.filter((_, at) => at !== index);
    const nextIds = ids.current.filter((_, at) => at !== index);
    const leaving = undoRemove ? { id: ids.current[index]!, text: value[index]!, index } : null;
    focusNext.current = leaving ? { id: '', target: 'undo' } : neighbourOf(nextIds, index);
    /*
     * SAID ONCE. With an Undo row the focus lands on Undo, which is described
     * by the row's own sentence, so announcing the removal as well said it
     * twice in a row.
     */
    emit(next, nextIds, leaving ? undefined : removedMessage(itemName, `${index + 1} of ${count}`), leaving);
  }

  function restore() {
    if (!removed || disabled) return;
    const at = Math.min(removed.index, count);
    const next = [...value];
    const nextIds = [...ids.current];
    next.splice(at, 0, removed.text);
    nextIds.splice(at, 0, removed.id);
    focusNext.current = { id: removed.id, target: 'input' };
    emit(next, nextIds, restoredMessage(itemName, `${at + 1} of ${count + 1}`));
  }

  function dismiss() {
    if (!removed) return;
    focusNext.current = neighbourOf(ids.current, removed.index);
    setRemoved(null);
  }

  /** Enter that should act rather than insert: always in one line, without Shift in many. */
  const acts = (event: KeyboardEvent) =>
    event.key === 'Enter' && !(multiline && event.shiftKey) && !isComposing(event);

  function itemKeys(event: KeyboardEvent, index: number) {
    if (isComposing(event)) return;
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      move(index, event.key === 'ArrowUp' ? -1 : 1, 'input');
      return;
    }
    if (!acts(event)) return;
    event.preventDefault();
    const next = ids.current[index + 1];
    if (next) inputs.current.get(next)?.focus();
    else addBox.current?.focus();
  }

  const control = (props: {
    label: string;
    value: string;
    onChange: (next: string) => void;
    onKeyDown: (event: KeyboardEvent) => void;
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
    placeholder?: string | undefined;
    trailing?: ReactNode;
    invalid?: boolean;
    describedBy?: string | undefined;
  }) =>
    /*
     * ONE LINE THAT GROWS, never a fixed block of rows. A list of sentences
     * read as a list wants each item on its own line; a two-row textarea per
     * item made three of them 256px where the console draws 111, and the
     * second row was empty in every one of them. `autoResize` starts at one
     * line and takes as many as the sentence needs.
     */
    multiline ? (
      <Textarea
        rows={1}
        autoResize
        aria-label={props.label}
        value={props.value}
        placeholder={props.placeholder}
        disabled={disabled}
        spellCheck
        trailing={props.trailing}
        error={props.invalid ?? false}
        aria-describedby={props.describedBy}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={props.onKeyDown}
        ref={props.ref}
      />
    ) : (
      <Input
        aria-label={props.label}
        value={props.value}
        placeholder={props.placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck
        trailing={props.trailing}
        error={props.invalid ?? false}
        aria-describedby={props.describedBy}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={props.onKeyDown}
        ref={props.ref}
      />
    );

  return (
    <FormField
      as="fieldset"
      label={hideLabel ? <VisuallyHidden>{label}</VisuallyHidden> : label}
      optional={optional}
      helper={helper}
      helperOnFocus={helperOnFocus}
      error={error}
      className="crewlet-list-input"
      /*
       * THE ADD CONTROL SITS BESIDE THE LEGEND, which is where the console
       * puts it and where the eye is when the list is empty. It appends what
       * the box below holds and gives the box the focus back, so pressing it
       * twice adds twice without a journey between.
       */
      labelAction={
        <IconButton
          size="sm"
          variant="soft-brand"
          label={addLabel(itemName)}
          icon={<PlusGlyph />}
          disabled={disabled || full || draftRefused}
          onClick={add}
        />
      }
    >
      {/*
       * THE BOX FIRST, THE LIST UNDER IT, as the console draws it and as the
       * order reads: this is where an item is written, and what follows is
       * what has been written. The list above the box put the answer before
       * the question and pushed the box further down the form with every item
       * added.
       */}
      {full ? (
        /*
         * A FULL LIST SAYS SO WHERE THE BOX WAS, rather than drawing a box
         * that takes nothing. A disabled box is a control a reader reaches
         * and cannot use with no word of why; the sentence is the why, and
         * every item above it still edits, moves and goes.
         */
        <p className="crewlet-list-input__full">{fullMessage(maxItems!)}</p>
      ) : (
        <div className="crewlet-list-input__add">
          {control({
            label: newItemLabel(itemName),
            value: draft,
            placeholder,
            invalid: overLimit(draft.trim()),
            describedBy: draftCount ? `${listId}-draft-count` : undefined,
            /*
             * THE COUNT TAKES THE KEYCAP'S PLACE once the limit is near: both
             * say what pressing Enter will do, and past the limit the answer
             * is nothing, which the count says and the keycap would not.
             */
            trailing: draftCount ? (
              <CharacterCount id={`${listId}-draft-count`} length={measured(draft)} max={maxLength!} />
            ) : enterHint ? (
              <Kbd subtle>Enter</Kbd>
            ) : undefined,
            onChange: setDraft,
            onKeyDown: (event) => {
              if (!acts(event)) return;
              event.preventDefault();
              add();
            },
            ref: (el) => {
              addBox.current = el;
            },
          })}
        </div>
      )}
      {count > 0 || removed !== null ? (
        <ol className="crewlet-list-input__items" {...(drags ? reorder.containerProps : {})}>
          {withRemoved(
            order.map((key) => {
              /*
               * ONE SOURCE FOR THE ROW: its position, its labels and its Move
               * buttons all read the item's place in `value`. A drag's preview
               * moves the row and leaves its number with it until the drop.
               */
              const index = ids.current.indexOf(key);
              const item = value[index] ?? '';
              const position = `${index + 1} of ${count}`;
              const length = maxLength === undefined ? 0 : measured(item);
              const counted = maxLength !== undefined && characterCountState(length, maxLength) !== 'within';
              const refusal = itemError?.(index, item);
              const refused = refusal !== undefined && refusal !== null && refusal !== false && refusal !== '';
              const countId = `${listId}-${key}-count`;
              const errorId = `${listId}-${key}-error`;
              const described = [counted ? countId : null, refused ? errorId : null].filter(Boolean).join(' ');
              /*
               * The drag's own props, without the name and the description:
               * the grip is the pointer's alone (see `reorderByDrag`), so it
               * is named to nobody and takes no Tab.
               */
              const { draggable, onDragStart, onDragEnd } = reorder.handleProps(key);
              return (
                <li
                  key={key}
                  className={cx('crewlet-list-input__item', drags && 'crewlet-list-input__item--draggable')}
                  {...(drags ? reorder.itemProps(key) : {})}
                >
                  {drags ? (
                    <span
                      className="crewlet-list-input__handle"
                      aria-hidden="true"
                      draggable={draggable}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    >
                      <GripVerticalGlyph size="sm" />
                    </span>
                  ) : null}
                  {/*
                   * THE POSITION, DRAWN. The order is the meaning here, so the
                   * list says which item is first rather than leaving it to be
                   * counted. It is decoration to a reader's software: the
                   * control beside it is already named "Goal 2 of 3".
                   */}
                  <span className="crewlet-list-input__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  {/*
                   * THE FIELD IS ALWAYS WRAPPED, whether or not it has a count
                   * or a refusal under it: a wrapper that appeared with the
                   * first refusal would remount the control mid-keystroke and
                   * drop the caret of the reader who just typed past the
                   * limit.
                   */}
                  <span className="crewlet-list-input__field">
                    {control({
                      label: itemLabel(name, position),
                      value: item,
                      invalid: refused || overLimit(item),
                      describedBy: described || undefined,
                      onChange: (next) => {
                        const list = [...value];
                        list[index] = next;
                        emit(list, ids.current);
                      },
                      onKeyDown: (event) => itemKeys(event, index),
                      ref: (el) => {
                        if (el) inputs.current.set(key, el);
                        else inputs.current.delete(key);
                      },
                    })}
                    {counted || refused ? (
                      <span className="crewlet-list-input__note">
                        {refused ? (
                          <span id={errorId} className="crewlet-list-input__error">
                            {refusal}
                          </span>
                        ) : (
                          <span />
                        )}
                        {counted ? <CharacterCount id={countId} length={length} max={maxLength!} /> : null}
                      </span>
                    ) : null}
                  </span>
                  {/*
                   * REMOVE IS THE ROW'S OWN CONTROL. Move up and Move down are
                   * drawn only while the row is under the pointer or holds the
                   * focus, because three controls per row is what turned a list
                   * of sentences into a grid of buttons, and the console draws
                   * one. They are never hidden from the keyboard: focus inside
                   * the row reveals them before Tab can reach them, and the
                   * pair is on Alt+Up and Alt+Down from the item itself, which
                   * is the only way to reorder without the pointer anyway.
                   */}
                  <span className="crewlet-list-input__actions">
                    <span className="crewlet-list-input__move">
                      <IconButton
                        size="sm"
                        label={moveUpLabel(itemName, position)}
                        icon={<ArrowUpGlyph />}
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1, 'up')}
                        ref={(el) => {
                          if (el) ups.current.set(key, el);
                          else ups.current.delete(key);
                        }}
                      />
                      <IconButton
                        size="sm"
                        label={moveDownLabel(itemName, position)}
                        icon={<ArrowDownGlyph />}
                        disabled={disabled || index === count - 1}
                        onClick={() => move(index, 1, 'down')}
                        ref={(el) => {
                          if (el) downs.current.set(key, el);
                          else downs.current.delete(key);
                        }}
                      />
                    </span>
                    <IconButton
                      size="sm"
                      variant="ghost-danger"
                      label={removeLabel(itemName, position)}
                      icon={<XGlyph />}
                      disabled={disabled}
                      onClick={() => remove(index)}
                    />
                  </span>
                </li>
              );
            }),
          )}
        </ol>
      ) : null}
    </FormField>
  );

  /**
   * The rows, with the removed item's row where it was. It is a row of the
   * list rather than a toast elsewhere, because "removed" is a fact about
   * that place in the order, and Undo puts the item back there.
   */
  function withRemoved(rows: ReactElement[]): ReactElement[] {
    if (removed === null) return rows;
    const noticeId = `${listId}-removed`;
    const row = (
      <li key={`removed-${removed.id}`} className="crewlet-list-input__removed">
        <span id={noticeId} className="crewlet-list-input__removed-text">
          {removedNotice(name, removed.index + 1)}
        </span>
        <span className="crewlet-list-input__actions">
          <Button
            ref={undoButton}
            size="small"
            variant="ghost"
            aria-describedby={noticeId}
            disabled={disabled}
            onClick={restore}
          >
            {undoLabel}
          </Button>
          <IconButton
            size="sm"
            label={dismissLabel}
            icon={<XGlyph />}
            aria-describedby={noticeId}
            onClick={dismiss}
          />
        </span>
      </li>
    );
    const at = Math.min(removed.index, rows.length);
    return [...rows.slice(0, at), row, ...rows.slice(at)];
  }
});
