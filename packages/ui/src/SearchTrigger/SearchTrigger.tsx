import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

export interface SearchTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** What it is called, drawn inside the box and used as its name. */
  label?: string | undefined;
  /** The shortcut hint, as a Kbd with `keys`. */
  shortcut?: ReactNode;
  /**
   * The shortcut in the syntax `aria-keyshortcuts` takes, such as
   * `"Control+K Meta+K /"`. A screen reader reads it with the control, which
   * is the only place a reader who cannot see the keycaps learns the shortcut
   * exists.
   */
  keyshortcuts?: string | undefined;
  /** The leading glyph. A magnifier by default. */
  icon?: ReactNode;
}

/**
 * The control that opens search, drawn as the field it is standing in for.
 *
 * IT IS A BUTTON, not an input. What it opens is a palette with its own field,
 * and a box that takes focus and then throws the first keystroke away is worse
 * than one that never looked like a field at all.
 *
 * ITS NAME IS ON THE BUTTON, not in its text. The narrow layout hides the
 * label and the hint and leaves the glyph, and content under `display: none`
 * names nothing: the dashboard this comes from had a search button that a
 * screen reader announced as "button" at every width under the breakpoint.
 */
export const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(function SearchTrigger(
  { label = 'Search', shortcut, keyshortcuts, icon, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={cx('crewlet-search-trigger', className)}
      aria-label={label}
      aria-keyshortcuts={keyshortcuts}
    >
      <span className="crewlet-search-trigger__icon">{icon ?? <SearchGlyph size="sm" />}</span>
      <span className="crewlet-search-trigger__label">{label}</span>
      {shortcut ? <span className="crewlet-search-trigger__shortcut">{shortcut}</span> : null}
    </button>
  );
});
