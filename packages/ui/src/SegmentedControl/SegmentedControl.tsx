import { useId, type ReactNode } from 'react';
import { Count } from '../Count/index.js';
import { tabId } from '../Tabs/index.js';
import { tabStop, useRoving } from '../Tabs/roving.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
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
 * keypress. A choice that IS in the URL costs a query per keypress, and
 * `activate` is where that row says so (see [SegmentedActivation]).
 *
 * `tabs` is a row of SECTIONS, and in this product a section pushes a history
 * entry: the arrows move focus and Enter or Space selects, so walking the row
 * with the keyboard does not leave an entry per keypress for Back to walk
 * back through. `panelId` names the [TabPanel] it controls.
 */
type SegmentedSemantics =
  | { semantics: 'tabs'; panelId: string; activate?: undefined; activateHint?: undefined }
  | {
      semantics: 'radio';
      panelId?: undefined;
      /** Whether the arrows choose the option they land on. Radio rows only. */
      activate?: SegmentedActivation | undefined;
      /**
       * The sentence a manual row is described by, or `null` for none where
       * the screen already says it elsewhere. Defaults to naming the key that
       * chooses, because a radio group that does not select as it moves is the
       * unusual one and nothing else on the row says so.
       */
      activateHint?: string | null | undefined;
    };

/**
 * Whether an arrow key CHOOSES the option it lands on, or only moves to it.
 *
 * `automatic` is the platform's own radio group and the default: the choice
 * changes as focus moves, which costs nothing where the choice costs nothing.
 *
 * `manual` moves focus alone, and Enter or Space chooses — which a real
 * button already turns into its own click. It is for the row whose choice is
 * NOT free: a single-choice filter that drives a URL parameter re-runs the
 * screen's query on every change, so arrowing across five options under
 * `automatic` fires five queries nobody asked for and re-renders the screen
 * under the reader four times on the way past. Those rows are not tabs
 * either — they open no panel and `semantics="tabs"` would have a screen
 * reader hunting for one — so the choice between the two semantics was never
 * the choice this answers.
 *
 * It is offered on a radio row only. A `tabs` row is manual already, for the
 * history entry its own doc describes, and an automatic one would be that
 * bug on request.
 */
export type SegmentedActivation = 'automatic' | 'manual';

/**
 * What a manual row says about itself, because nothing else does.
 *
 * A radio group that does NOT select as it moves is the unusual one: a reader
 * who knows the platform's own behaviour arrows to an option, hears it, and
 * has no reason to press anything else. The sentence is read after the
 * group's name, on the group, so it is heard once on the way in rather than
 * after every option on the way past.
 */
const ACTIVATE_HINT = 'Press Enter or Space to choose the option you land on.';

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
  activate = 'automatic',
  activateHint,
}: SegmentedControlProps<T>) {
  const radio = semantics === 'radio';
  const manual = radio && activate === 'manual';
  const cards = options.some((option) => option.description !== undefined);
  const { buttons, onKeyDown, onFocusAt, focused } = useRoving(
    options.length,
    radio && !manual ? (index) => onValueChange(options[index]!.value) : null,
    { followFocus: manual },
  );
  const chosenIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  /*
   * WHERE THE ONE TAB STOP SITS, which is not always the chosen option. Under
   * manual activation it is where focus last was: a reader who arrows two
   * options along without committing and Tabs away has to come back to the
   * option they left, and a stop left on the selection puts them back at the
   * start with no word that their moves were dropped.
   */
  const stop = tabStop(options, focused ?? chosenIndex);
  const hintId = useId();
  const hint = manual ? (activateHint === undefined ? ACTIVATE_HINT : activateHint) : null;

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
      aria-describedby={hint ? hintId : undefined}
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
            tabIndex={index === stop ? 0 : -1}
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
             * The stop follows a POINTER press too, and a Tab into the row,
             * not the arrow keys alone: a row where clicking an option and
             * arrowing to it left the tab stop in two different places
             * disagrees with itself about where the reader is.
             */
            onFocus={() => onFocusAt(index)}
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
      {/*
       * Inside the row, because the component is one element and a sibling
       * would change the box a caller lays out. It is out of flow, so it
       * takes no chip's worth of the pill bar and no row of the card grid.
       */}
      {hint ? <VisuallyHidden id={hintId}>{hint}</VisuallyHidden> : null}
    </div>
  );
}
