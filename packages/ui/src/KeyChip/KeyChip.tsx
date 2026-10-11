import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import { highlightMatch } from '../utils/highlight.js';

export interface KeyChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The key as the system mints it: `FAIR`, `ENG`, `SPLIT`. */
  children: string;
  /**
   * What a search typed. The letters it matched are drawn bold: the start of
   * the key first, then anywhere in it.
   */
  highlight?: string | undefined;
}

/**
 * A project's key, drawn as the small mono chip every surface draws it as: a
 * row in the rail, a crumb, a row in a switcher, a cell in a directory.
 *
 * ONE CHIP. It was drawn by hand twice, by the rail's row and by the
 * dashboard's own stylesheet, with two radii and two paddings for one fact.
 *
 * It is text, not a control, and carries no role: the key is read as part of
 * whatever it labels, so a row reads "FAIR Product and Engineering".
 */
export function KeyChip({ children, highlight, className, ...rest }: KeyChipProps) {
  return (
    <span {...rest} className={cx('crewlet-key-chip', className)}>
      {highlightMatch(children, highlight, 'start', 'crewlet-key-chip__match')}
    </span>
  );
}
