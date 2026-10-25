import { useId, useRef, useState, type ReactNode } from 'react';
import { Combobox } from '../Combobox/index.js';
import { FormField } from '../Input/FormField.js';
import { InputAffix } from '../Input/Input.js';
import { Textarea } from '../Input/Textarea.js';
import { Select } from '../Select/index.js';
import {
  completeReference,
  isWholeReference,
  rankReferences,
  referenceAt,
  urlSchemeOf,
  type ReferenceQuery,
} from './references.js';

/**
 * What a value field holds, which decides its control and what it does to a
 * value on its way through.
 *
 * - `text`: free text, spaces kept.
 * - `multiline`: prose in a textarea, every space and newline kept, spell check on.
 * - `secret`: a credential, masked unless the value is a whole reference.
 * - `url`: an address, wearing an `https://` affix, whitespace dropped.
 * - `id` and `email`: one token, whitespace dropped.
 * - `choice` and `handle`: one of `choices`, picked from a listbox.
 */
export type ValueFieldKind = 'text' | 'multiline' | 'secret' | 'url' | 'id' | 'choice' | 'handle' | 'email';

/** One option of a `choice` or `handle` field. */
export interface ValueFieldChoice {
  value: string;
  label: string;
  /** A sentence saying what picking this one does: drawn under the option, and on the help line once chosen. */
  hint?: string | undefined;
}

/** The words a value field draws itself. */
export interface ValueFieldLabels {
  /** Names the completion list. "Secrets" by default. */
  references: string;
  /** The choice placeholder while nothing is chosen. "Choose one" by default. */
  choose: string;
}

const DEFAULT_LABELS: ValueFieldLabels = {
  references: 'Secrets',
  choose: 'Choose one',
};

export interface ValueFieldProps {
  label: string;
  /** A mark drawn before the label, such as a third party's own logo. */
  mark?: ReactNode;
  kind?: ValueFieldKind | undefined;
  value: string;
  onChange: (value: string) => void;
  /** Where the value comes from, or what shape it takes. */
  help?: ReactNode;
  /** Why the last value was refused. */
  error?: ReactNode;
  placeholder?: string | undefined;
  /** What a `choice` or `handle` field offers; ignored by every other kind. */
  choices?: readonly ValueFieldChoice[] | undefined;
  disabled?: boolean | undefined;
  /**
   * Whether an answer is required. REQUIRED IS THE UNMARKED DEFAULT: `false`
   * says "(optional)" beside the label, `true` sets `aria-required` and draws
   * nothing unless `markRequired` says the requiredness is news. Most fields
   * on a form are required, and marking them all is noise that teaches a
   * reader to skip the note.
   */
  required?: boolean | undefined;
  /**
   * Says "(required)" beside the label, for a field whose requiredness is
   * NEWS: one that appeared because of an answer above it. Read only with
   * `required`.
   */
  markRequired?: boolean | undefined;
  autoFocus?: boolean | undefined;
  /**
   * The stored entry names offered when somebody types `$`, completed into a
   * whole `${NAME}`. NAMES ONLY: a value never reaches the field, so a list
   * that could not be assembled leaves the field exactly as it was.
   */
  references?: readonly string[] | undefined;
  /**
   * Called as the completion list is about to open, so the caller can make
   * sure the names are current. On the way in only, never per keystroke.
   */
  onReferencesNeeded?: (() => void) | undefined;
  /**
   * Whether a value is exactly one reference, which keeps a `secret` field
   * readable and lets a `url` field's affix step aside. [isWholeReference]
   * by default; a product with its own reference grammar passes it here.
   */
  isReference?: ((value: string) => boolean) | undefined;
  /** How many lines a `multiline` field shows before it scrolls. Three by default. */
  rows?: number | undefined;
  /** Show the help line only while the field has focus. See [FormField]. */
  helperOnFocus?: boolean | undefined;
  labels?: Partial<ValueFieldLabels> | undefined;
  className?: string | undefined;
}

/**
 * A labelled value: [FormField] with the control a kind of value needs, and
 * the rules every form holding such values otherwise rewrites.
 *
 * A SECRET FIELD IS A PASSWORD FIELD, and that is not decoration: `type` is
 * what keeps the value out of an autofill store, out of a screenshot and out
 * of the accessibility tree as text.
 *
 * A REFERENCE IS NOT A CREDENTIAL, so it is not masked. A secret whose value
 * is wholly a `${NAME}` holds the NAME of a stored entry, and the reader has
 * to be able to see which entry it points at. Typing over it masks again the
 * moment it stops being a whole reference, so a credential is never on screen.
 *
 * TYPING `$` OFFERS THE STORED ENTRIES, from `references`, ranked closest
 * first and written in as a whole `${NAME}` with the caret after it. Tab and
 * Enter take the highlighted name, Escape closes the list and keeps what was
 * typed, and a press outside closes only the list.
 *
 * A URL FIELD WEARS ITS SCHEME. An `https://` affix sits inside the box, is
 * read once as part of the value, and is written into it. It steps aside for
 * a value that carries `http://` and for one starting with `$` (a reference
 * carries its own scheme once it resolves), and a pasted `https://` is not
 * doubled onto it.
 *
 * A SINGLE TOKEN TAKES NO WHITESPACE. A `url`, `id` or `email` drops it as it
 * is typed or pasted: a space around one is invisible in the box and fatal
 * wherever it is used. No field asserts `type="email"`, because the browser
 * would refuse a reference for having no "@" in it; `inputMode` still offers
 * the right keyboard.
 *
 * A CHOICE IS THE LISTBOX, which can draw each choice's hint under it. The
 * chosen one's hint also joins the help line, and a stored answer the list
 * no longer offers keeps a row of its own rather than vanishing into a
 * different selection.
 */
export function ValueField({
  label,
  mark,
  kind = 'text',
  value,
  onChange,
  help,
  error,
  placeholder,
  choices,
  disabled,
  required,
  markRequired,
  autoFocus,
  references,
  onReferencesNeeded,
  isReference = isWholeReference,
  rows = 3,
  helperOnFocus,
  labels,
  className,
}: ValueFieldProps) {
  const words = { ...DEFAULT_LABELS, ...labels };
  const id = useId();
  const affixId = `${id}-affix`;
  const picker = kind === 'choice' || kind === 'handle';

  const reference = isReference(value);
  const masked = kind === 'secret' && !reference;
  const tight = kind === 'url' || kind === 'id' || kind === 'email';
  const own = kind === 'url' ? urlSchemeOf(value) : '';
  // ANY LEADING `$`, not only a whole reference: a person types one character
  // at a time, and a rule that waited for a complete reference would prepend
  // the affix on the first keystroke and never let go. Behind a scheme a `$`
  // is just the rest of the address, and the affix is carrying that scheme.
  const referenceBase = own === '' && value.trimStart().startsWith('$');
  const affix = kind === 'url' && own !== 'http://' && !referenceBase ? 'https://' : '';
  const shown = affix ? value.slice(own.length) : value;

  // --- completing a ${NAME} ---------------------------------------------- //
  //
  // WIRED TO THE PLAIN BOX ONLY. A url field's box holds a different string
  // from the value, and every field a reference goes in whole is a plain one.
  const box = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState<ReferenceQuery | null>(null);
  const offered = typing && references?.length ? rankReferences(references, typing.query) : [];

  /** Re-reads what is under the caret after anything that can move it. */
  function reconsider(text: string, caretAt: number | null) {
    if (affix) return;
    // A MASKED BOX REPORTS NO CARET (browsers refuse `selectionStart` on a
    // password input), so the offer reads to the end of what is typed.
    const caret = masked || caretAt === null ? text.length : caretAt;
    const next = referenceAt(text, caret);
    if (next && !typing) onReferencesNeeded?.();
    setTyping(next);
  }

  function reconsiderFrom(input: HTMLInputElement) {
    reconsider(input.value, masked ? null : input.selectionStart);
  }

  /** Writes the chosen name in and puts the caret after it. */
  function choose(name: string) {
    const input = box.current;
    if (!input || !typing) return;
    const caret = masked ? input.value.length : (input.selectionStart ?? input.value.length);
    const next = completeReference(input.value, caret, typing, name);
    setTyping(null);
    onChange(next.value);
    // AFTER REACT HAS WRITTEN THE VALUE, or the caret is placed in the old
    // string and lands wherever the new one puts it.
    queueMicrotask(() => {
      input.setSelectionRange(next.caret, next.caret);
      input.focus();
    });
  }

  /** What the box holds becomes the whole value again, and is reported. */
  function changed(raw: string): string {
    const typed = tight ? raw.replace(/\s+/g, '') : raw;
    let next = typed;
    if (affix) {
      const carried = urlSchemeOf(typed);
      // The same two escapes the affix makes: a value carrying `http://`, and
      // one becoming a reference while the affix is only offering a scheme.
      const escapes = carried === 'http://' || (own === '' && typed.trimStart().startsWith('$'));
      next = escapes ? typed : affix + typed.slice(carried.length);
    }
    onChange(next);
    return next;
  }

  const options = picker ? choiceOptions(choices, value) : [];
  const chosen = picker ? choices?.find((choice) => choice.value === value) : undefined;
  const helper: ReactNode =
    chosen?.hint && help ? (
      <>
        {help} {chosen.hint}
      </>
    ) : (
      (chosen?.hint ?? help)
    );

  return (
    <FormField
      htmlFor={id}
      className={className}
      label={
        mark ? (
          <span className="crewlet-value-field__label">
            {mark}
            {label}
          </span>
        ) : (
          label
        )
      }
      // NOT `required`, which would draw an asterisk on every field. See the prop.
      optional={required === false}
      requiredNews={required === true && markRequired === true}
      helper={helper}
      helperOnFocus={helperOnFocus}
      error={error}
      // The affix is part of the value, so the reader hears it ahead of the help.
      describedBy={affix ? affixId : undefined}
    >
      {(field) =>
        picker ? (
          <Select
            id={field.id}
            value={value}
            onChange={(next) => onChange(String(next))}
            options={options}
            placeholder={words.choose}
            disabled={disabled === true}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the caller opens its form at this field
            autoFocus={autoFocus}
            error={field.invalid}
            required={required === true}
            aria-describedby={field.describedBy}
          />
        ) : kind === 'multiline' ? (
          <Textarea
            id={field.id}
            rows={rows}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            // ON, unlike every other kind: a misspelling in prose is a defect
            // in what ships, where in an identifier the check is only noise.
            spellCheck
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the caller opens its form at this field
            autoFocus={autoFocus}
            aria-describedby={field.describedBy}
            aria-required={required === true || undefined}
            error={field.invalid}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Combobox
            id={field.id}
            ref={box}
            // A REFERENCE READS AS A NAME, in the face a stored entry's name wears.
            appearance={reference ? 'reference' : 'default'}
            type={masked ? 'password' : 'text'}
            inputMode={kind === 'email' ? 'email' : kind === 'url' ? 'url' : undefined}
            value={shown}
            placeholder={placeholder}
            disabled={disabled}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the caller opens its form at this field
            autoFocus={autoFocus}
            error={field.invalid}
            aria-describedby={field.describedBy}
            aria-required={required === true || undefined}
            leading={affix ? <InputAffix text={affix} id={affixId} /> : undefined}
            label={words.references}
            mono
            tabCommits
            options={offered.map((name) => ({ value: name }))}
            onCommit={(option) => choose(option.value)}
            open={offered.length > 0}
            onOpenChange={(open) => {
              if (!open) setTyping(null);
            }}
            onValueChange={(raw) => {
              const next = changed(raw);
              reconsider(next, box.current?.selectionStart ?? null);
            }}
            // EVERY WAY THE CARET MOVES, not only typing: clicking into an
            // existing `${NAME}` or arrowing back over one is how somebody
            // edits the reference they already have.
            onKeyUp={(event) => reconsiderFrom(event.currentTarget)}
            onClick={(event) => reconsiderFrom(event.currentTarget)}
            onBlur={() => setTyping(null)}
          />
        )
      }
    </FormField>
  );
}

/**
 * The options a choice offers. A STORED ANSWER THE LIST DOES NOT OFFER keeps
 * a row of its own, first, so a form that narrowed its choices does not open
 * on a different answer and then save it.
 */
function choiceOptions(choices: readonly ValueFieldChoice[] | undefined, value: string) {
  const all = choices ?? [];
  const rows = all.map((choice) => ({ value: choice.value, label: choice.label, description: choice.hint }));
  if (value !== '' && !all.some((choice) => choice.value === value)) {
    return [{ value, label: value }, ...rows];
  }
  return rows;
}
