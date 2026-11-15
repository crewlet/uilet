import { Children, Fragment, type ReactNode } from 'react';

/**
 * A path's or an address's words with a break opportunity after every `/`,
 * so a line that cannot hold it ends at a separator ("…/v1/" then "reports")
 * rather than wherever the pixels ran out ("…/v1/report" then "s"). A browser
 * offers none inside `https://example.com/a/b`: to a line breaker the whole
 * address is one word, so without these it breaks mid-name.
 *
 * Only plain text is split; anything else is handed back as given. A `<wbr>`
 * adds no character, so a copy of the words is the words.
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
