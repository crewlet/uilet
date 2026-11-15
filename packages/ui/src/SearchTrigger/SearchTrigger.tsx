import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/**
 * Where the field stands, which decides its ground, its height and whether it
 * ever gives up its words.
 *
 * `rail` is the approved design's: the whole width of the sidebar, on the
 * frame, so it takes the SHEET's ground one rung up, and it keeps its label
 * and its hint at every width, because under the shell breakpoint the rail is
 * a drawer as wide as it ever was.
 *
 * `toolbar` stands in a bar on the sheet, so it takes the CARD's ground, at
 * the height of the controls beside it and a width of its own
 * (`--crewlet-search-trigger-width`); under the shell breakpoint it drops its
 * label and its hint and keeps the glyph, because a bar is where the room
 * runs out.
 */
export type SearchTriggerVariant = 'rail' | 'toolbar';

export interface SearchTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** What it is called: drawn inside the box, and the button's whole name. */
  label?: string | undefined;
  /** Where it stands. The sidebar field by default. See the type. */
  variant?: SearchTriggerVariant | undefined;
  /** The shortcut hint, as a Kbd with `keys`. Decoration: name the keys in `keyshortcuts`. */
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
 * IT IS NAMED BY ITS WORDS, and by nothing else. An `aria-label` replaced
 * them, and the keycap beside them is text in the same box (a checker counts
 * it as shown, hidden from a screen reader or not), so the name never
 * contained what the box shows and a person who says what they see could not
 * reach it. The keycap is decoration: the shortcut reaches a screen reader
 * through `aria-keyshortcuts`, the one place a reader who cannot see the caps
 * learns it.
 *
 * FOLDED, THE WORDS ARE CLIPPED, NOT REMOVED. The toolbar form's narrow
 * layout leaves the glyph alone in the box, and its words stay the button's
 * name out of sight: content under `display: none` names nothing, and the
 * dashboard this comes from had a search button a screen reader announced as
 * "button" at every width under the breakpoint.
 */
export const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(function SearchTrigger(
  { label = 'Search', variant = 'rail', shortcut, keyshortcuts, icon, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={cx('crewlet-search-trigger', `crewlet-search-trigger--${variant}`, className)}
      aria-keyshortcuts={keyshortcuts}
    >
      <span className="crewlet-search-trigger__icon" aria-hidden="true">
        {icon ?? <SearchGlyph size="sm" />}
      </span>
      <span className="crewlet-search-trigger__label">{label}</span>
      {shortcut ? (
        <span className="crewlet-search-trigger__shortcut" aria-hidden="true">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
});
