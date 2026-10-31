import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronDownGlyph } from '@crewlethq/icons/glyphs';
import { ChatDivider } from '../ChatDivider/index.js';
import { cx } from '../utils/cx.js';

export interface ChatDayProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
  /** The day, as the reader says it: "Today", "Yesterday", "Monday, October 27". It names the day for a screen reader too. */
  label: string;
  /**
   * The host's own control in the pill's place, such as a Jump to menu whose
   * trigger is a `ChatDayPill`. Left out, the day draws its label as a plain
   * pill.
   */
  pill?: ReactNode;
  /**
   * The New line's word ("New"), for a day whose FIRST message is the first
   * one the reader has not read. It is drawn on the day's own rule, as one
   * line, rather than as a second line under it.
   */
  unread?: string | undefined;
  /** The day's rows, oldest first. */
  children?: ReactNode;
}

/**
 * A day of a conversation under its date.
 *
 * - THE DAY'S RULE is a hairline across the whole list, in the flow where the
 *   day starts. It scrolls away with the day like any row.
 * - THE DAY'S PILL sits on the rule while the rule is in view, then stays
 *   pinned a little under the top of the list while any of the day is in it,
 *   floating over the rows: only the pill covers them, never a band across
 *   the list. It is pinned within its own day, so the next day's pill pushes
 *   it out from below as that day reaches the top.
 * - THE PIN IS A VARIABLE, `--crewlet-chat-day-pin`, so a host with a bar
 *   floating over the top of the list (an unread banner) moves the pills
 *   down past it while the bar shows.
 *
 * A GROUP TO A SCREEN READER, named by its day, so a reader moving through a
 * long log by group hears where each day starts. The pill's words are the
 * same name, drawn; the rule is decoration, unless it carries the New line,
 * which is a separator of its own.
 */
export function ChatDay({ label, pill, unread, className, children, ...rest }: ChatDayProps) {
  return (
    <div {...rest} role="group" aria-label={label} className={cx('crewlet-chat-day', className)}>
      <div className="crewlet-chat-day__label">{pill ?? <span className="crewlet-chat-day__pill">{label}</span>}</div>
      <div className="crewlet-chat-day__rule">{unread ? <ChatDivider variant="unread" label={unread} /> : null}</div>
      {children}
    </div>
  );
}

export interface ChatDayPillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The day's words on the pill. */
  label: string;
}

/**
 * The day's pill as a control, for a day whose pill does something: spread
 * with a menu's trigger props it opens that menu, and draws the chevron that
 * says so (`<Menu renderTrigger={(props) => <ChatDayPill {...props} label="Today" />}>`).
 * The same size, fill and ring as the plain pill a `ChatDay` draws on its own.
 *
 * Filled with the transcript's own ground and ringed with a hairline and a
 * small shadow, so it reads as lifted off the messages it passes over.
 */
export const ChatDayPill = forwardRef<HTMLButtonElement, ChatDayPillProps>(function ChatDayPill(
  { label, className, type = 'button', ...rest },
  ref,
) {
  const opensMenu = rest['aria-haspopup'] !== undefined && rest['aria-haspopup'] !== false && rest['aria-haspopup'] !== 'false';
  return (
    <button {...rest} ref={ref} type={type} className={cx('crewlet-chat-day__pill', 'crewlet-chat-day__pill--button', className)}>
      {label}
      {opensMenu ? <ChevronDownGlyph size="xs" /> : null}
    </button>
  );
});
