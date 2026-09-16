import type { ReactNode } from 'react';
import { Count } from '../Count/index.js';
import { tabId } from '../Tabs/index.js';
import { tabStop, useRoving } from '../Tabs/roving.js';
import { cx } from '../utils/cx.js';

export type SegmentedSize = 'sm' | 'md';

export interface SegmentedOption<T extends string = string> {
  value: T;
  /** What is drawn. An empty label makes the option icon-only. */
  label?: ReactNode;
  /**
   * What an icon-only option is CALLED. A `title` is a tooltip and a screen
   * reader is not shown one, so an option drawn as a glyph alone takes its
   * name from here, or from `title` where the two say the same thing.
   */
  srLabel?: string;
  icon?: ReactNode;
  title?: string;
  count?: number | null;
  disabled?: boolean;
  /**
   * A second line under the label. With one, the options are drawn as card
   * rows rather than chips, for a choice a reader has to read before making.
   */
  description?: ReactNode;
}

interface SegmentedShared<T extends string> {
  /** Names the group. A row of choices with no name is announced as a row of buttons. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: SegmentedSize | undefined;
  className?: string | undefined;
}

/**
 * What the row IS, which decides both its roles and when it reports a change.
 *
 * `radio` is a SETTING or a filter (the theme, the density, a lens with no
 * panel): announced as a radio group, and the arrows select as they move,
 * because a choice that is not in the URL costs nothing to change on every
 * keypress.
 *
 * `tabs` is a row of SECTIONS, and in this product a section pushes a history
 * entry: the arrows move focus and Enter or Space selects, so walking the row
 * with the keyboard does not leave an entry per keypress for Back to walk
 * back through. `panelId` names the [TabPanel] it controls.
 */
type SegmentedSemantics =
  | { semantics: 'tabs'; panelId: string }
  | { semantics: 'radio'; panelId?: undefined };

export type SegmentedControlProps<T extends string = string> = SegmentedShared<T> &
  SegmentedSemantics;

/**
 * A row of mutually exclusive choices.
 *
 * WHY IT IS NOT JUST TABS. The two rows look alike and are not alike: one is
 * a setting and one is a place. The engine drew its theme and density
 * controls as tabs, so a screen reader announced them as tabs, went looking
 * for the panels each one opened, and found none; and it drew its lens rows
 * as radios that selected on every arrow press, so walking a row with the
 * keyboard pushed a history entry per keystroke.
 *
 * It draws with the Tabs pill classes, because a row of choices should not
 * look like two different controls depending on which component a screen
 * reached for.
 */
export function SegmentedControl<T extends string = string>({
  label,
  options,
  value,
  onValueChange,
  size = 'md',
  className = '',
  semantics,
  panelId,
}: SegmentedControlProps<T>) {
  const radio = semantics === 'radio';
  const cards = options.some((option) => option.description !== undefined);
  const { buttons, onKeyDown } = useRoving(
    options.length,
    radio ? (index) => onValueChange(options[index]!.value) : null,
  );
  const selected = tabStop(
    options,
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );

  return (
    <div
      className={cx(
        'crewlet-tabs',
        /*
         * THE PILL CHROME IS NOT WORN IN CARDS MODE. A card row is not a chip
         * in a tinted container: the pill's own rules set the container's
         * background, border, padding and `width: fit-content`, and each
         * option's padding, radius and active chip. Left on, every one of
         * them still applied (the two stylesheets are single-class rules and
         * Tabs.css is bundled last), so the cards were drawn inside a pill
         * bar sized to its content, which is what the mode exists to avoid.
         */
        !cards && 'crewlet-tabs--pill',
        `crewlet-tabs--${size}`,
        'crewlet-segmented',
        cards && 'crewlet-segmented--cards',
        className,
      )}
      role={radio ? 'radiogroup' : 'tablist'}
      aria-label={label}
    >
      {options.map((option, index) => {
        const chosen = option.value === value;
        /*
         * WHAT IT IS CALLED, which is not always what it draws. `srLabel`
         * names the option whatever is on it, because a label of "S" is a
         * picture of a size rather than a word: the density row was announced
         * as "S", "M" and "L", which names nothing anybody can act on. A
         * `title` names an option that draws nothing but a glyph, and only
         * that one: a tooltip on an option that already has words would
         * replace them with a second phrasing of the same thing.
         */
        const named = option.srLabel ?? (option.label ? undefined : option.title);
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role={radio ? 'radio' : 'tab'}
            id={radio || !panelId ? undefined : tabId(panelId, option.value)}
            aria-checked={radio ? chosen : undefined}
            aria-selected={radio ? undefined : chosen}
            aria-controls={radio ? undefined : panelId}
            aria-label={named}
            tabIndex={index === selected ? 0 : -1}
            title={option.title}
            disabled={option.disabled}
            className={cx(
              'crewlet-tabs__tab',
              'crewlet-segmented__option',
              chosen && 'is-active',
              option.disabled && 'is-disabled',
            )}
            onClick={() => onValueChange(option.value)}
            /*
             * On the OPTION, not on the row. A radio group moves on all four
             * arrows, as the platform's own does; a horizontal row of tabs
             * moves on Left and Right only.
             */
            onKeyDown={(event) => onKeyDown(event, radio)}
          >
            {option.icon ? <span className="crewlet-tabs__icon">{option.icon}</span> : null}
            {option.label || option.description ? (
              <span className="crewlet-segmented__text">
                <span className="crewlet-tabs__label">{option.label}</span>
                {option.description ? (
                  <span className="crewlet-segmented__description">{option.description}</span>
                ) : null}
              </span>
            ) : null}
            {option.count != null ? <Count value={option.count} /> : null}
          </button>
        );
      })}
    </div>
  );
}
