import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { FormField, Input, InputAffix } from '../Input/index.js';
import { cx } from '../utils/cx.js';
import { normalizeHex, parseColourInput } from '../utils/hexColour.js';

export interface ColorFieldLabels {
  /** Why a typed value was refused, with what right looks like. */
  invalid: string;
  /** Why an emptied required field was refused. */
  missing: string;
  /** Names the colour picker beside the field: "Pick the Primary colour". */
  picker: (label: string) => string;
  /**
   * What the empty field shows after its `#`: the shape a value takes, never
   * a colour, which an empty field would seem to hold.
   */
  placeholder: string;
  /** Said for the `#` drawn at the start of the field, which is not part of what is typed. */
  prefix: string;
}

const LABELS: ColorFieldLabels = {
  invalid: 'Enter six hex digits, such as 5b3df5, or rgb(91, 61, 245).',
  missing: 'Choose a colour.',
  picker: (label) => `Pick the ${label} colour`,
  placeholder: 'rrggbb',
  prefix: 'Hex colour, after #',
};

/** What the field shows for a stored colour: its six digits, after the drawn `#`. */
const digits = (colour: string) => colour.replace(/^#/, '');

/** A typed value as the field holds it: a leading `#` is the drawn one's, so it is dropped. */
const typedText = (value: string) => value.replace(/^\s*#/, '');

/** Six hex digits, the one form reported while the reader is still typing. */
const SIX_DIGITS = /^[0-9a-f]{6}$/i;

/** What the native picker opens on when the field holds no colour yet: its own default, black. */
const PICKER_START = '#000000';

export interface ColorFieldProps {
  /** The colour's role, which is the field's name: "Primary". */
  label: string;
  /**
   * The colour as it stands, `#rrggbb`, or `''` for none. Controlled: the
   * field reports a new value only once it is one.
   */
  value: string;
  /**
   * A new colour: lowercase `#rrggbb`, or `''` when an optional field is
   * emptied. Never called with a value that is not one, so a host never
   * stores half a hex code.
   */
  onChange: (value: string) => void;
  /** An answer is required: emptying the field is refused rather than reported. */
  required?: boolean | undefined;
  /** Says "(optional)" beside the label. */
  optional?: boolean | undefined;
  /** Where the colour is used: "Links, buttons and accents". */
  helper?: ReactNode;
  /**
   * A refusal from elsewhere (the engine's), drawn as the field's error. The
   * field's own refusal of a value it cannot read is drawn without it.
   */
  error?: ReactNode;
  disabled?: boolean | undefined;
  /** The text field's name, for a form that posts. */
  name?: string | undefined;
  id?: string | undefined;
  className?: string | undefined;
  labels?: Partial<ColorFieldLabels> | undefined;
}

/**
 * A colour a person chooses: a hex field, a swatch that opens the platform's
 * colour picker, and the reason a value was refused.
 *
 * THE `#` IS THE FIELD'S, drawn at its start, so a person types the six hex
 * digits alone; a pasted `#rrggbb` loses its own `#` to it. When the reader
 * leaves the field (Enter or Tab) what they wrote is read as a colour:
 * `rrggbb`, the three digit shorthand, or `rgb(r, g, b)` (commas or spaces),
 * each normalised to the one spelling the engine stores, lowercase
 * `#rrggbb`. Anything else is refused then, never while they are still
 * typing, with a sentence saying what right looks like.
 *
 * ONLY A COLOUR IS EVER REPORTED. Six hex digits reach `onChange` as they are
 * typed, so a preview follows the field; the shorthand and `rgb()` reach it
 * when the reader leaves, since `abc` on its way to `abcdef` is not the colour
 * they mean. An optional field emptied reports `''`.
 *
 * THE SWATCH IS THE PICKER. It is the platform's own colour input, drawn as
 * the chip of the colour the field holds and named for it, so it is a real,
 * labelled control a keyboard reaches; picking a colour there writes it into
 * the field. With no colour yet, the swatch is the hatch of none.
 */
export function ColorField({
  label,
  value,
  onChange,
  required = false,
  optional,
  helper,
  error,
  disabled = false,
  name,
  id,
  className,
  labels,
}: ColorFieldProps) {
  const text = { ...LABELS, ...labels };
  const autoId = useId();
  const fieldId = id ?? autoId;
  const committed = normalizeHex(value) ?? '';
  const [draft, setDraft] = useState(digits(committed));
  const [seen, setSeen] = useState(committed);
  const [left, setLeft] = useState(false);

  /*
   * A NEW VALUE FROM THE HOST (Cancel, a reset, a change pushed from
   * elsewhere) replaces the draft, unless the draft already reads as that
   * value: a reader typing `#5B3DF5` is not interrupted by their own value
   * coming back as `#5b3df5`.
   */
  if (committed !== seen) {
    setSeen(committed);
    if ((parseColourInput(draft) ?? '') !== committed) {
      setDraft(digits(committed));
      setLeft(false);
    }
  }

  const typed = draft.trim();
  const reads = parseColourInput(typed);
  const refusal =
    typed === '' ? (required ? text.missing : null) : reads === null ? text.invalid : null;
  const shown = error ?? (left ? refusal : null);
  const swatch = reads ?? (typed === '' ? null : committed || null);
  // A functional notation stands on its own: the drawn `#` would read as part of it.
  const functional = /^rgb/i.test(typed);
  const prefixId = `${fieldId}-prefix`;

  const take = (next: string) => {
    const held = typedText(next);
    setDraft(held);
    if (SIX_DIGITS.test(held.trim())) onChange(normalizeHex(`#${held.trim()}`)!);
    else if (held.trim() === '' && !required) onChange('');
  };

  const settle = () => {
    setLeft(true);
    if (reads === null) return;
    // A value that reads is stored, and shown in the spelling it was stored in.
    if (reads !== committed) onChange(reads);
    if (digits(reads) !== draft) setDraft(digits(reads));
  };

  return (
    <FormField
      label={label}
      htmlFor={fieldId}
      required={required}
      optional={optional}
      helper={helper}
      error={shown ?? undefined}
      className={cx('crewlet-color-field', className)}
    >
      {(field) => (
        <span className="crewlet-color-field__row">
          <span
            className={cx('crewlet-color-field__swatch', swatch === null && 'is-empty', disabled && 'is-disabled')}
            style={swatch ? ({ '--crewlet-color-field-value': swatch } as CSSProperties) : undefined}
          >
            <input
              type="color"
              className="crewlet-color-field__picker"
              value={swatch ?? PICKER_START}
              disabled={disabled}
              aria-label={text.picker(label)}
              onChange={(event) => {
                setLeft(true);
                take(event.target.value);
              }}
            />
          </span>
          <Input
            id={field.id}
            name={name}
            appearance="reference"
            width="sm"
            value={draft}
            placeholder={text.placeholder}
            leading={functional ? undefined : <InputAffix text="#" id={prefixId} sentence={text.prefix} />}
            maxLength={24}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            disabled={disabled}
            error={Boolean(shown)}
            aria-describedby={[functional ? null : prefixId, field.describedBy].filter(Boolean).join(' ') || undefined}
            aria-required={required || undefined}
            onChange={(event) => take(event.target.value)}
            onBlur={settle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') settle();
            }}
          />
        </span>
      )}
    </FormField>
  );
}
