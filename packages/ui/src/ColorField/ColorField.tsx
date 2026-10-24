import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { FormField, Input } from '../Input/index.js';
import { cx } from '../utils/cx.js';
import { normalizeHex } from '../utils/hexColour.js';

export interface ColorFieldLabels {
  /** Why a typed value was refused, with what right looks like. */
  invalid: string;
  /** Why an emptied required field was refused. */
  missing: string;
  /** Names the colour picker beside the field: "Pick the Primary colour". */
  picker: (label: string) => string;
  /**
   * What the empty field shows: the shape a value takes, never a colour, which
   * an empty field would seem to hold.
   */
  placeholder: string;
}

const LABELS: ColorFieldLabels = {
  invalid: 'Enter the colour as # and six hex digits, such as #5b3df5.',
  missing: 'Choose a colour.',
  picker: (label) => `Pick the ${label} colour`,
  placeholder: '#rrggbb',
};

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
 * THE VALUE IS `#` AND SIX HEX DIGITS, and nothing else is ever reported: the
 * field holds what is being typed, and a value reaches `onChange` only once it
 * reads as a colour, lowercased, the one spelling the engine stores. A value
 * that does not read is refused when the reader leaves the field (Enter or
 * Tab), never while they are still typing it, with a sentence saying what
 * right looks like.
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
  const [draft, setDraft] = useState(committed);
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
    if ((normalizeHex(draft) ?? '') !== committed) {
      setDraft(committed);
      setLeft(false);
    }
  }

  const typed = draft.trim();
  const reads = normalizeHex(typed);
  const refusal =
    typed === '' ? (required ? text.missing : null) : reads === null ? text.invalid : null;
  const shown = error ?? (left ? refusal : null);
  const swatch = reads ?? (typed === '' ? null : committed || null);

  const take = (next: string) => {
    setDraft(next);
    const colour = normalizeHex(next);
    if (colour !== null) onChange(colour);
    else if (next.trim() === '' && !required) onChange('');
  };

  const settle = () => {
    setLeft(true);
    // A value that reads is shown in the spelling it was stored in.
    if (reads !== null && reads !== draft) setDraft(reads);
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
            maxLength={9}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            disabled={disabled}
            error={Boolean(shown)}
            aria-describedby={field.describedBy}
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
