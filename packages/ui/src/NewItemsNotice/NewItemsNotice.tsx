import { useEffect, useRef, type ButtonHTMLAttributes } from 'react';
import { useAnnouncer } from '../Announcer/index.js';
import { cx } from '../utils/cx.js';

/** "1 new turn", "4 new turns". Replaced through `label` where an s is wrong. */
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export interface NewItemsNoticeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
  /** How many are being held back. The notice draws nothing at zero. */
  count: number;
  /** The singular noun: "new turn", "new phase". Pluralised with an s by default. */
  noun: string;
  /** Let them in. The caller owns the splice, and the scroll if there is one. */
  onShow: () => void;
  /** The whole sentence on the pill. */
  label?: ((count: number, noun: string) => string) | undefined;
  /** What a reader is told when the notice appears. */
  announcement?: ((count: number, noun: string) => string) | undefined;
}

/**
 * Work that finished while somebody was reading, held until they ask for it.
 *
 * WHY IT EXISTS AT ALL. Splicing finished rows in at the top pushes the page
 * down by a card mid-sentence, which on a busy company happens every few
 * seconds: the same complaint as a chat that scrolls while you are reading
 * history. The list only moves when the reader says so.
 *
 * IT ANNOUNCES ONCE, when it appears, and not again as the count climbs. A
 * reader who cannot see the pill still has to be told that work is being held;
 * being told again every few seconds, while they are reading the thing they
 * stayed on the page for, is the interruption this component exists to
 * prevent. The number on the pill is current for whenever they reach it.
 */
export function NewItemsNotice({
  count,
  noun,
  onShow,
  label = (n, word) => `Show ${plural(n, word)} that finished while you were reading`,
  announcement = (n, word) => `${plural(n, word)} finished while you were reading.`,
  className,
  ...rest
}: NewItemsNoticeProps) {
  const announce = useAnnouncer();
  const showing = count > 0;
  const said = useRef(false);

  useEffect(() => {
    if (!showing) {
      // Reset when the reader lets them in, so the next batch is announced.
      said.current = false;
      return;
    }
    if (said.current) return;
    said.current = true;
    announce(announcement(count, noun));
  }, [showing, count, noun, announce, announcement]);

  if (!showing) return null;

  return (
    <button {...rest} type="button" className={cx('crewlet-new-items', className)} onClick={onShow}>
      {label(count, noun)}
    </button>
  );
}
