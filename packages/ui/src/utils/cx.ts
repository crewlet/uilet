/**
 * Joining a class list, once for the whole package.
 *
 * Every component had its own copy of `[a, b].filter(Boolean).join(' ')`, and
 * Skeleton declared a named one beside it. A helper spelled nine times is a
 * helper whose copies come to disagree about what a `0` means; this one drops
 * every falsy part, so a `count && 'has-count'` guard cannot render the number
 * into the class attribute.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
