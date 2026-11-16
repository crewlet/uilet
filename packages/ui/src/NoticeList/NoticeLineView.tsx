import { useState } from 'react';
import { cx } from '../utils/cx.js';
import type { NoticeLine } from './NoticeList.js';

/** A subject's specifics on one line, folded after `shown` behind "and N more". */
export function NoticeLineView({
  line,
  shown,
  andMore,
  className,
}: {
  line: NoticeLine;
  shown: number;
  andMore: (hidden: number) => string;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  // Folds only when it hides two or more, so "and 1 more" never takes the place of the one name.
  const folds = line.items.length > shown + 1 && !open;
  const items = folds ? line.items.slice(0, shown) : line.items;
  return (
    <p className={cx('crewlet-notice-list__line', className)}>
      {line.subject != null ? (
        <>
          <strong className="crewlet-notice-list__subject">{line.subject}</strong>
          {': '}
        </>
      ) : null}
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 ? ', ' : null}
          {item}
        </span>
      ))}
      {folds ? (
        <>
          {' '}
          <button type="button" className="crewlet-notice-list__and-more" onClick={() => setOpen(true)}>
            {andMore(line.items.length - shown)}
          </button>
        </>
      ) : null}
    </p>
  );
}
