/**
 * What a field that holds a secret to store (a token, a key) carries, so no
 * browser or password manager fills it with a saved login.
 *
 * `new-password` is the autocomplete value browsers honour on a password field,
 * where `off` is ignored. The data attributes are the opt-outs 1Password,
 * LastPass, Bitwarden and Dashlane read in its place.
 */
export const SECRET_INPUT_PROPS = {
  autoComplete: 'new-password',
  'data-1p-ignore': '',
  'data-lpignore': 'true',
  'data-bwignore': '',
  'data-form-type': 'other',
} as const;
