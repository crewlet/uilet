import type { HTMLAttributes } from 'react';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** Draws the keycap quieter, for a hint that sits inside a field. */
  subtle?: boolean | undefined;
}

/**
 * Kbd, a keyboard key drawn as a keycap. Used for shortcut hints and, inside
 * a field's trailing slot, to tell the operator that a key does something
 * here: "Enter" beside a field that adds a value to a list, for example.
 */
export const Kbd = ({ subtle = false, className = '', children, ...rest }: KbdProps) => (
  <kbd {...rest} className={['crewlet-kbd', subtle ? 'crewlet-kbd--subtle' : '', className].filter(Boolean).join(' ')}>
    {children}
  </kbd>
);
