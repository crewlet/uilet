import { Children, Fragment, type ReactNode } from 'react';

const PATH = /(?<=\/)/;
// An `@` or `.` breaks only after a name, never where it opens one (`.env`, `@scope`).
const ADDRESS = /(?<=\/|[^\s/@.][@.])/;

/**
 * A path's or address's words with a `<wbr>` after every `/` (and, with
 * `addresses`, every `@` and `.` of an email or a host name), so a long one
 * breaks at a separator rather than mid-name. Only plain text is split, and a
 * copy of the words is unchanged.
 */
export function pathBreaks(children: ReactNode, { addresses = false }: { addresses?: boolean } = {}): ReactNode {
  const parts = Children.toArray(children);
  if (!parts.every((part) => typeof part === 'string' || typeof part === 'number')) return children;
  const runs = parts.join('').split(addresses ? ADDRESS : PATH);
  if (runs.length < 2) return children;
  return runs.map((run, i) => (
    <Fragment key={i}>
      {run}
      {i < runs.length - 1 ? <wbr /> : null}
    </Fragment>
  ));
}
