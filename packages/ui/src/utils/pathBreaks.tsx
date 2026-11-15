import { Children, Fragment, type ReactNode } from 'react';

/**
 * A path's or address's words with a `<wbr>` after every `/`, so a long one
 * breaks at a separator rather than mid-name. Only plain text is split, and a
 * copy of the words is unchanged.
 */
export function pathBreaks(children: ReactNode): ReactNode {
  const parts = Children.toArray(children);
  if (!parts.every((part) => typeof part === 'string' || typeof part === 'number')) return children;
  const text = parts.join('');
  if (!text.includes('/')) return children;
  const runs = text.split(/(?<=\/)/);
  return runs.map((run, i) => (
    <Fragment key={i}>
      {run}
      {i < runs.length - 1 ? <wbr /> : null}
    </Fragment>
  ));
}
