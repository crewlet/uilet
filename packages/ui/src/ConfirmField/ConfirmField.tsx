import type { ReactNode } from 'react';
import { FormField, Input } from '../Input/index.js';
import { InlineCode } from '../InlineCode/index.js';

/**
 * Whether what was typed confirms the phrase: the phrase exactly, with the
 * whitespace a paste carries at either end ignored.
 *
 * EXACT, CASE INCLUDED. The phrase is a login or a name the gesture removes,
 * and a confirmation that accepted a near miss would confirm a different
 * value than the one shown.
 */
export function confirmMatches(typed: string, phrase: string): boolean {
  return phrase !== '' && typed.trim() === phrase;
}

export interface ConfirmFieldProps {
  /** What the reader types back: a login, a name, a key. */
  phrase: string;
  /** What has been typed so far. */
  value: string;
  onValueChange: (next: string) => void;
  /**
   * The label, built around the phrase. The phrase arrives already drawn as
   * inline code, which keeps its own case inside the label's capitals.
   * Defaults to "Type {phrase} to confirm".
   */
  label?: ((phrase: ReactNode) => ReactNode) | undefined;
  /** A sentence under the field, such as what happens once it matches. */
  helper?: ReactNode;
  /** Takes focus when it appears, which is right inside a dialog opened for it. */
  autoFocus?: boolean | undefined;
  className?: string | undefined;
}

const defaultLabel = (phrase: ReactNode) => <>Type {phrase} to confirm</>;

/**
 * Type a value back to confirm a gesture that cannot be undone.
 *
 * A FORM FIELD LIKE EVERY OTHER, with the spacing and the label register of
 * the fields around it. The phrase inside the label is inline code, and inline
 * code in a label keeps its case: set in the label's capitals, a login such as
 * `jane.founder` read as JANE.FOUNDER, and typing that kept the confirm button
 * disabled with no word why.
 *
 * Spelling checks and autocorrection are off, because the value is a literal
 * the reader copies character by character, and a corrected one is a
 * different value. Pair it with [confirmMatches], which is what decides
 * whether the gesture may go ahead.
 */
export function ConfirmField({
  phrase,
  value,
  onValueChange,
  label = defaultLabel,
  helper,
  autoFocus,
  className,
}: ConfirmFieldProps) {
  return (
    <FormField label={label(<InlineCode>{phrase}</InlineCode>)} helper={helper} className={className}>
      {(field) => (
        <Input
          id={field.id}
          aria-describedby={field.describedBy}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- a confirmation dialog opens for this field alone
          autoFocus={autoFocus}
          width="full"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    </FormField>
  );
}
