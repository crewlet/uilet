import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { CheckGlyph, ChevronLeftGlyph, ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { announce } from '../Announcer/index.js';
import { IconButton } from '../IconButton/index.js';
import { isComposing } from '../Layer/index.js';
import { useListbox } from '../Listbox/index.js';
import { Tag, type TagVariant } from '../Tag/index.js';
import { cx } from '../utils/cx.js';

export interface TagsInputOption {
  /** What is stored when the option is taken. */
  value: string;
  /** What is drawn, on the chip and in the list. The value itself when left out. */
  label?: string | undefined;
  /** Options sharing a group are listed under its name, in first-seen order. */
  group?: string | undefined;
  /** A short second line of identity, such as a handle. */
  description?: string | undefined;
}

export interface TagsInputProps {
  /** The values held, in the order they were chosen. */
  value: string[];
  /** Called with the next list when one is added, removed or moved. */
  onChange: (next: string[]) => void;
  /**
   * What may be chosen. With options the field is a combobox over a
   * multiselectable listbox; without them it is the free-text chip field it
   * has always been.
   */
  options?: readonly TagsInputOption[] | undefined;
  /**
   * Whether a value the options do not offer may be typed in. Default true,
   * which is what the field did before it had options at all.
   */
  allowCustom?: boolean | undefined;
  /**
   * Whether the ORDER of the chips is meaning: a provider fallback chain is
   * read first to last, so it gets Move controls and Alt+Arrow.
   */
  ordered?: boolean | undefined;
  placeholder?: string | undefined;
  /** Variant applied to each rendered Tag. */
  tagVariant?: TagVariant | undefined;
  /** Monospace flag forwarded to each Tag, for machine values such as IP ranges. */
  monospace?: boolean | undefined;
  /** Keys that submit the current input as a new value. Defaults to Enter and comma. */
  submitKeys?: string[] | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  /** id forwarded to the underlying input, for a label or a FormField. */
  id?: string | undefined;
  /** Reject duplicate values (case-insensitive). Defaults to true. */
  dedupe?: boolean | undefined;
  /** Names the list of chosen values and the listbox. */
  label?: string | undefined;
  /**
   * Names the FIELD, where nothing else does. A field inside a [FormField]
   * takes its name from that label through `id`; one standing on its own has
   * none at all without this.
   */
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
  /** Focus the field on mount, for a form opened AT it. The list stays closed. */
  focusOnMount?: boolean | undefined;
  /** The line shown when a search matches nothing. */
  emptyMessage?: ((query: string) => string) | undefined;
  /** The name of a chip's Remove control. */
  removeLabel?: ((label: string) => string) | undefined;
  /** The names of a chip's Move controls, in an `ordered` field. */
  moveEarlierLabel?: ((label: string) => string) | undefined;
  moveLaterLabel?: ((label: string) => string) | undefined;
  /** What is said when a value is added, removed or moved. */
  addedMessage?: ((label: string) => string) | undefined;
  /** What is said when a paste adds several at once. */
  pastedMessage?: ((count: number) => string) | undefined;
  removedMessage?: ((label: string) => string) | undefined;
  movedMessage?: ((label: string, position: number, count: number) => string) | undefined;
  /** Names the chip list. */
  chosenLabel?: ((label: string) => string) | undefined;
}

export interface TagsInputHandle {
  focus: () => void;
}

const textOf = (option: TagsInputOption): string => option.label ?? option.value;

/**
 * Several values in one field, as removable chips.
 *
 * TWO FIELDS IN ONE, and the difference is what it is offered. With no
 * `options` it is the free-text chip field: type a value, press Enter or
 * comma, get a chip. With them it is a searchable multi-select, which is the
 * one thing a native `<select multiple>` cannot do usefully: that control is
 * a scrolling box that loses its whole selection to a stray click.
 *
 * THE RULES IT KEEPS.
 *
 * - FOCUS STAYS IN THE FIELD. The highlighted option is pointed at with
 *   `aria-activedescendant`, and every option says whether it is chosen with
 *   `aria-selected` inside an `aria-multiselectable` listbox.
 * - ENTER TOGGLES AND KEEPS THE LIST AND THE QUERY, so several neighbours in
 *   one filtered list are chosen without retyping. Tab leaves the field, as
 *   every form control does.
 * - ESCAPE CLOSES THE LIST AND NOTHING ELSE. A second Escape reaches the
 *   dialog or sheet around it.
 * - BACKSPACE IN AN EMPTY QUERY REMOVES THE LAST VALUE, as in every token
 *   field, and says so.
 * - A CHOSEN VALUE THE OPTIONS DO NOT OFFER is shown as itself rather than
 *   dropped: a reference to something since renamed has to stay visible until
 *   somebody removes it on purpose.
 * - EVERY ADDITION, REMOVAL AND MOVE IS ANNOUNCED, through the shared
 *   `Announcer`, because a chip appearing above the box is otherwise silent.
 * - AFTER A REMOVE, FOCUS GOES TO THE NEXT CHIP, else the previous one, else
 *   the field. A control that removes itself and drops focus on the page body
 *   ends a keyboard user's pass through the form.
 * - NOTHING IS TAKEN MID-COMPOSITION. While an input method is composing a
 *   word, Enter, comma and Backspace are its own.
 * - IT DOES NOT COMMIT ON BLUR IN OPTIONS MODE. A query is a search there, not
 *   a value, so leaving the field with one typed adds nothing.
 */
export const TagsInput = forwardRef<TagsInputHandle, TagsInputProps>(function TagsInput(
  {
    value,
    onChange,
    options,
    allowCustom = true,
    ordered = false,
    placeholder = 'Add a tag, press Enter or comma',
    tagVariant = 'neutral',
    monospace = false,
    submitKeys = ['Enter', ','],
    disabled = false,
    className = '',
    id,
    dedupe = true,
    label = 'Values',
    focusOnMount = false,
    emptyMessage = (query) => `Nothing matches "${query}"`,
    removeLabel = (name) => `Remove ${name}`,
    moveEarlierLabel = (name) => `Move ${name} earlier`,
    moveLaterLabel = (name) => `Move ${name} later`,
    addedMessage = (name) => `Added ${name}`,
    pastedMessage = (count) => `Added ${count} values`,
    removedMessage = (name) => `Removed ${name}`,
    movedMessage = (name, position, count) => `Moved ${name} to position ${position} of ${count}`,
    chosenLabel = (name) => `Chosen: ${name}`,
    'aria-label': ariaLabel,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  },
  ref,
) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLInputElement | null>(null);
  const chips = useRef<HTMLUListElement | null>(null);
  const list = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  useImperativeHandle(ref, () => ({ focus: () => field.current?.focus() }));

  /*
   * FOCUS ON MOUNT, from an effect rather than the `autoFocus` attribute: a
   * form opened AT this field starts on it, and the attribute only acts on a
   * document's first render, so a drawer mounting its body a second time comes
   * up with focus on the page body.
   */
  useEffect(() => {
    if (focusOnMount) field.current?.focus();
  }, [focusOnMount]);

  const picking = options !== undefined;
  const byValue = useMemo(
    () => new Map((options ?? []).map((option) => [option.value, option])),
    [options],
  );
  const nameOf = (held: string): string => {
    const option = byValue.get(held);
    return option ? textOf(option) : held;
  };

  const needle = draft.trim().toLowerCase();
  const offered = useMemo(() => {
    if (!picking) return [];
    const all = options ?? [];
    if (needle === '') return [...all];
    return all.filter(
      (option) =>
        textOf(option).toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle) ||
        (option.description ?? '').toLowerCase().includes(needle),
    );
  }, [options, picking, needle]);

  /* Grouped for the eye; the flat order is the order the keys walk. */
  const groups = useMemo(() => {
    const out: { name: string | undefined; items: TagsInputOption[] }[] = [];
    for (const option of offered) {
      const group = out.find((candidate) => candidate.name === option.group);
      if (group) group.items.push(option);
      else out.push({ name: option.group, items: [option] });
    }
    return out;
  }, [offered]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const showing = picking && open && !disabled;
  const lists = showing && flat.length > 0;
  // Open with nothing to offer and nothing typed draws nothing at all, and an
  // Escape then belongs to the surface around the field.
  const nothingMatches = showing && flat.length === 0 && needle !== '';

  /*
   * WHERE FOCUS GOES AFTER THE LIST CHANGES, applied once the change has been
   * rendered. Moving focus inside the handler aims it at the chips that are
   * still on screen: the row that took the removed one's place does not exist
   * yet, and a chip that reordered is about to be moved in the DOM, which
   * drops focus on the page body on the way.
   */
  const wanted = useRef<{ index: number; prefer: 'remove' | 'earlier' | 'later' } | null>(null);

  useLayoutEffect(() => {
    const want = wanted.current;
    if (!want) return;
    wanted.current = null;
    const list = chips.current;
    const control = (index: number, prefer: 'remove' | 'earlier' | 'later') => {
      const chip = list?.querySelector(`[data-chip="${index}"]`);
      if (!chip) return null;
      // A chip that reached an end has that Move control disabled, so focus
      // takes its other one rather than falling to the page.
      const order =
        prefer === 'remove'
          ? ['button:not([data-move])']
          : prefer === 'earlier'
            ? ['[data-move="earlier"]', '[data-move="later"]', 'button:not([data-move])']
            : ['[data-move="later"]', '[data-move="earlier"]', 'button:not([data-move])'];
      for (const selector of order) {
        const el = chip.querySelector<HTMLButtonElement>(selector);
        if (el && !el.disabled) return el;
      }
      return null;
    };
    (control(want.index, want.prefer) ?? control(want.index - 1, want.prefer) ?? field.current)?.focus();
  });

  function add(raw: string) {
    const next = raw.trim();
    if (!next || disabled) return;
    if (dedupe && value.some((held) => held.toLowerCase() === next.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    announce(addedMessage(nameOf(next)));
    setDraft('');
  }

  function toggle(option: TagsInputOption) {
    if (disabled) return;
    if (value.includes(option.value)) {
      onChange(value.filter((held) => held !== option.value));
      announce(removedMessage(textOf(option)));
      return;
    }
    onChange([...value, option.value]);
    announce(addedMessage(textOf(option)));
  }

  function removeAt(index: number) {
    if (disabled) return;
    const held = value[index];
    if (held === undefined) return;
    onChange(value.filter((_, at) => at !== index));
    announce(removedMessage(nameOf(held)));
    wanted.current = { index, prefer: 'remove' };
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (disabled || to < 0 || to >= value.length) return;
    const next = [...value];
    [next[index], next[to]] = [next[to]!, next[index]!];
    onChange(next);
    announce(movedMessage(nameOf(value[index]!), to + 1, value.length));
    wanted.current = { index: to, prefer: by === -1 ? 'earlier' : 'later' };
  }

  /*
   * ALT+ARROW MOVES THE CHIP the keyboard is on, which is what a reorder is
   * for somebody not using a pointer. Both pairs are taken: the chips read
   * left to right, so Left and Right are the direction on screen, and Up and
   * Down are what every other reorderable list in the product answers to.
   *
   * Listened for on EVERY control the chip has, not only its Move ones: at an
   * end one Move control is disabled and a chip's other control is its
   * Remove, so a reader who had tabbed to either of those pressed Alt+Arrow
   * and got nothing from exactly the chip they were standing on. The Tag
   * carries it for its own Remove, which is inside it.
   */
  function chipKeys(event: KeyboardEvent<HTMLElement>, index: number) {
    if (!event.altKey || isComposing(event)) return;
    const back = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (!back && event.key !== 'ArrowDown' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(index, back ? -1 : 1);
  }

  const listbox = useListbox({
    id: fieldId,
    open: lists || nothingMatches,
    count: flat.length,
    onCommit: (index) => {
      const option = flat[index];
      if (option) toggle(option);
    },
    onClose: () => setOpen(false),
  });

  /*
   * THE HIGHLIGHTED ROW STAYS IN VIEW, by scrolling the list element and
   * nothing else. The shared model reveals `[aria-selected="true"]`, which in
   * a multi-select is every CHOSEN row rather than the highlighted one, so on
   * its own it drags the view back to the first choice on every arrow press
   * and does nothing at all while nothing is chosen. Declared after the hook
   * so it is the effect that runs last and therefore the one that wins.
   */
  useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !row) return;
    const bounds = box.getBoundingClientRect();
    const spot = row.getBoundingClientRect();
    if (spot.top < bounds.top) box.scrollTop -= bounds.top - spot.top;
    else if (spot.bottom > bounds.bottom) box.scrollTop += spot.bottom - bounds.bottom;
  }, [listbox.active, flat.length, lists]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // A word still being composed owns every key, Backspace included: it
    // deletes from the composition, not from the values already chosen.
    if (isComposing(event)) return;
    if (picking && !showing && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (listbox.onKeyDown(event)) return;
    if (submitKeys.includes(event.key)) {
      // A query with nothing highlighted is a search, not a request to save
      // the form around the field.
      event.preventDefault();
      if (picking && !allowCustom) {
        setOpen(true);
        return;
      }
      add(draft);
      return;
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      event.preventDefault();
      const last = value.length - 1;
      onChange(value.slice(0, last));
      announce(removedMessage(nameOf(value[last]!)));
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    if (picking) return;
    const text = event.clipboardData.getData('text');
    if (!text.includes(',') && !text.includes('\n')) return;
    event.preventDefault();
    const parts = text
      .split(/[,\n]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const seen = dedupe ? new Set(value.map((held) => held.toLowerCase())) : null;
    const added: string[] = [];
    for (const part of parts) {
      if (seen?.has(part.toLowerCase())) continue;
      added.push(part);
      seen?.add(part.toLowerCase());
    }
    if (added.length === 0) return;
    onChange([...value, ...added]);
    announce(added.length === 1 ? addedMessage(added[0]!) : pastedMessage(added.length));
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
    if (picking) setOpen(true);
  }

  /*
   * Stable chip keys. The value is the identity where values are unique,
   * which they are by default; with `dedupe` off, the occurrence counts too,
   * so two identical chips stay two chips.
   */
  const seen = new Map<string, number>();
  const keyed = value.map((held) => {
    const nth = seen.get(held) ?? 0;
    seen.set(held, nth + 1);
    return { held, key: nth === 0 ? held : `${held}#${nth}` };
  });

  let index = -1;
  const rows = groups.map((group, position) => {
    const items = group.items.map((option) => {
      index += 1;
      const at = index;
      const chosen = value.includes(option.value);
      return (
        <div
          key={option.value}
          id={listbox.optionId(at)}
          role="option"
          aria-selected={chosen}
          data-active={at === listbox.active || undefined}
          className={cx('crewlet-listbox__option', at === listbox.active && 'is-highlight')}
          {...listbox.optionHandlers(at)}
        >
          {/*
            WHAT IS ALREADY CHOSEN, in the list rather than only above it. The
            shared register tints the row the arrows are on, and Enter toggles
            without moving it, so pressing Enter on a row changed nothing a
            reader could see in the list at all: the only record of the choice
            was a chip appearing outside it.
          */}
          <span className="crewlet-tags-input__option-tick" aria-hidden="true">
            {chosen ? <CheckGlyph size="sm" /> : null}
          </span>
          <span className="crewlet-tags-input__option-label">{textOf(option)}</span>
          {option.description ? (
            <span className="crewlet-listbox__hint">{option.description}</span>
          ) : null}
        </div>
      );
    });
    if (group.name === undefined) return items;
    // By position, not by name: an id is one token, and a group called "Go to
    // Market" would be three to aria-labelledby.
    const headingId = `${fieldId}-group-${position}`;
    return (
      <div key={group.name} role="group" aria-labelledby={headingId}>
        <div className="crewlet-listbox__heading" id={headingId} role="presentation">
          {group.name}
        </div>
        {items}
      </div>
    );
  });

  return (
    <div className={cx('crewlet-tags-input', disabled && 'is-disabled', className)}>
      {value.length > 0 ? (
        <ul ref={chips} className="crewlet-tags-input__chips" aria-label={chosenLabel(label)}>
          {keyed.map(({ held, key }, at) => (
            <li
              key={key}
              data-chip={at}
              className="crewlet-tags-input__chip"
            >
              {ordered ? (
                <>
                  <IconButton
                    size="sm"
                    data-move="earlier"
                    label={moveEarlierLabel(nameOf(held))}
                    icon={<ChevronLeftGlyph />}
                    disabled={disabled || at === 0}
                    onClick={() => move(at, -1)}
                    onKeyDown={(event) => chipKeys(event, at)}
                  />
                  <IconButton
                    size="sm"
                    data-move="later"
                    label={moveLaterLabel(nameOf(held))}
                    icon={<ChevronRightGlyph />}
                    disabled={disabled || at === value.length - 1}
                    onClick={() => move(at, 1)}
                    onKeyDown={(event) => chipKeys(event, at)}
                  />
                </>
              ) : null}
              <Tag
                variant={tagVariant}
                monospace={monospace}
                onRemove={disabled ? undefined : () => removeAt(at)}
                removeAriaLabel={removeLabel(nameOf(held))}
                onKeyDown={ordered ? (event) => chipKeys(event, at) : undefined}
              >
                {nameOf(held)}
              </Tag>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="crewlet-tags-input__field" ref={listbox.anchorRef}>
        <input
          ref={field}
          id={fieldId}
          className="crewlet-tags-input__box"
          type="text"
          role={picking ? 'combobox' : undefined}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          aria-autocomplete={picking ? 'list' : undefined}
          aria-expanded={picking ? lists : undefined}
          aria-controls={lists ? listbox.listId : undefined}
          aria-activedescendant={lists ? listbox.optionId(listbox.active) : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={onInputChange}
          onClick={() => picking && setOpen(true)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            // A QUERY IS NOT A VALUE. In options mode leaving the field with
            // one typed adds nothing; in free-text mode the draft is the value.
            if (picking) setOpen(false);
            else add(draft);
          }}
        />
        {lists ? (
          <div
            ref={(el) => {
              list.current = el;
              listbox.listRef(el);
            }}
            id={listbox.listId}
            className="crewlet-tags-input__list crewlet-listbox"
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
          >
            {rows}
          </div>
        ) : null}
        {nothingMatches ? (
          <div ref={listbox.listRef} className="crewlet-tags-input__list">
            <div className="crewlet-listbox__empty">{emptyMessage(draft.trim())}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
});
