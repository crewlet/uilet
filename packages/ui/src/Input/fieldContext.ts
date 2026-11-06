import { createContext, useContext } from 'react';

/**
 * Whether the FormField around a control holds a refused value. A control
 * reads it as its default `error`, so a field marked invalid draws its error
 * edge without the caller wiring `error={field.invalid}` by hand.
 */
export const FormFieldInvalidContext = createContext(false);

/** The control's error state: its own `error` where given, else its field's. */
export function useFieldError(own: boolean | undefined): boolean {
  const field = useContext(FormFieldInvalidContext);
  return own ?? field;
}
