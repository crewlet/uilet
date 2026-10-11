import { useId, type CSSProperties, type HTMLAttributes } from 'react';
import { themeGroups, themeRegistry, type ThemeId } from '@crewlethq/tokens';
import { useHighlightRest } from '../Listbox/index.js';
import { tabStop, useRoving } from '../Tabs/roving.js';
import { ThemeSwatch, type ThemeSwatchPair } from '../ThemeSwatch/index.js';
import { cx } from '../utils/cx.js';

/** A theme as the gallery offers it: the fields of a `themeRegistry` entry it reads. */
export interface ThemeGalleryTheme<T extends string = string> {
  id: T;
  name: string;
  /** A few words on what sets it apart, said with its name. */
  tag: string;
  /** The id of the group it is listed under. */
  group: string;
  swatch: ThemeSwatchPair;
}

/** A heading the themes are listed under, as `themeGroups` carries it. */
export interface ThemeGalleryGroup {
  id: string;
  name: string;
}

export interface ThemeGalleryProps<T extends string = ThemeId>
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /** The group's name, said on entering it. "Theme" by default. */
  label?: string | undefined;
  /** The theme in use. */
  value: T;
  /** The reader chose a theme: a click, Space or Enter, or an arrow key. */
  onValueChange: (id: T) => void;
  /**
   * The theme the pointer has come to rest on, for a preview beside the
   * gallery, and `null` when it leaves: told once the pointer has rested on a
   * card for `HIGHLIGHT_REST_MS`, so crossing the grid does not repaint the
   * preview at every card it passes.
   */
  onPreview?: ((id: T | null) => void) | undefined;
  /** The themes offered. Every theme `@crewlethq/tokens` ships, by default. */
  themes?: readonly ThemeGalleryTheme<T>[] | undefined;
  /** The headings they are listed under, in order. The registry's groups, by default. */
  groups?: readonly ThemeGalleryGroup[] | undefined;
  /** How many cards a row holds. Three by default. */
  columns?: number | undefined;
  /** Nothing can be chosen, and the gallery says so. */
  disabled?: boolean | undefined;
}

/**
 * The choice of a theme: every theme, each drawn as its two palettes, listed
 * under its group.
 *
 * A RADIO GROUP, because a theme is a setting and exactly one is in use: the
 * gallery is one tab stop, and the arrows move through it and choose as they
 * move, as the platform's own radio group does. They walk the cards in
 * reading order, across the groups, because the groups break the rows and an
 * arrow that jumped a row would land somewhere the reader is not looking.
 *
 * THE CHOSEN CARD IS SAID WITH ITS OWN BORDER, in the accent: one line round
 * the card, and the line means "this one". Focus draws its ring over that
 * border rather than outside it, so a focused card is never two outlines.
 *
 * POINTING PREVIEWS, CHOOSING APPLIES. `onPreview` is told the card the
 * pointer rests on, for a pane beside the gallery to show it in, so a reader
 * crossing the grid with the pointer does not repaint the whole window at
 * every card. The keys choose as they move, which is what applies.
 *
 * A CARD IS NAMED BY THE THEME'S NAME AND ITS TAG ("Abyss, Vivid violet"),
 * and described by its group's heading; the drawing is decoration, because
 * the name is printed under it.
 */
export function ThemeGallery<T extends string = ThemeId>({
  label = 'Theme',
  value,
  onValueChange,
  onPreview,
  themes = themeRegistry as unknown as readonly ThemeGalleryTheme<T>[],
  groups = themeGroups,
  columns = 3,
  disabled = false,
  className,
  style,
  ...rest
}: ThemeGalleryProps<T>) {
  const id = useId();

  // In the order the groups are listed, and a theme whose group is not among
  // them after every group, so nothing offered is dropped.
  const sections = [
    ...groups.map((group) => ({ group, items: themes.filter((theme) => theme.group === group.id) })),
    { group: null, items: themes.filter((theme) => !groups.some((group) => group.id === theme.group)) },
  ].filter((section) => section.items.length > 0);
  const flat = sections.flatMap((section) => section.items);

  const { buttons, onKeyDown, onFocusAt } = useRoving(
    flat.length,
    disabled ? null : (index) => onValueChange(flat[index]!.id),
  );
  const stop = tabStop(
    flat.map(() => ({ disabled })),
    flat.findIndex((theme) => theme.id === value),
  );
  const preview = useHighlightRest(onPreview ? (key) => onPreview(key as T | null) : undefined);

  let index = -1;
  return (
    <div
      {...rest}
      className={cx('crewlet-theme-gallery', className)}
      style={{ ...style, '--crewlet-theme-gallery-columns': columns } as CSSProperties}
      // Leaving the gallery is nowhere: the preview goes back to the theme in use.
      onMouseLeave={() => preview.now(null)}
    >
      <div
        className="crewlet-theme-gallery__groups"
        role="radiogroup"
        aria-label={label}
        aria-disabled={disabled || undefined}
      >
        {sections.map((section, position) => {
          const headingId = `${id}-group-${position}`;
          return (
            <div key={section.group?.id ?? '-'} className="crewlet-theme-gallery__group">
              {section.group ? (
                <span id={headingId} className="crewlet-theme-gallery__heading">
                  {section.group.name}
                </span>
              ) : null}
              <div className="crewlet-theme-gallery__cards">
                {section.items.map((theme) => {
                  index += 1;
                  const at = index;
                  const chosen = theme.id === value;
                  return (
                    <button
                      key={theme.id}
                      ref={(el) => {
                        buttons.current[at] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      aria-label={`${theme.name}, ${theme.tag}`}
                      aria-describedby={section.group ? headingId : undefined}
                      tabIndex={at === stop ? 0 : -1}
                      disabled={disabled}
                      className={cx('crewlet-theme-gallery__card', chosen && 'is-chosen')}
                      onClick={() => onValueChange(theme.id)}
                      onFocus={() => onFocusAt(at)}
                      onKeyDown={(event) => onKeyDown(event, true)}
                      onMouseEnter={() => preview.rest(theme.id)}
                    >
                      <ThemeSwatch swatch={theme.swatch} size="card" />
                      <span className="crewlet-theme-gallery__name">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
