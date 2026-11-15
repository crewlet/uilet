import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/**
 * Where the field stands. `rail` spans the sidebar and keeps its words at every
 * width; `toolbar` sits in a bar at the controls' height and drops its label
 * and hint under the shell breakpoint, keeping the glyph.
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
   * The shortcut for `aria-keyshortcuts`, such as `"Control+K Meta+K /"`: the
   * only way a reader who cannot see the keycaps learns it exists.
   */
  keyshortcuts?: string | undefined;
  /** The leading glyph. A magnifier by default. */
  icon?: ReactNode;
}

/**
 * The button that opens search, drawn as the field it stands in for. It is
 * named by its visible words alone, and folded it clips them rather than
 * removing them, so it keeps that name at every width.
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
