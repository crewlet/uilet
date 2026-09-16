import { useId, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import { Input } from '../Input/index.js';
import { useListbox } from '../Listbox/index.js';
import { Modal } from '../Modal/index.js';
import { cx } from '../utils/cx.js';

export interface CommandPaletteItem {
  /** Stable across a re-query: it keys the row and names its option element. */
  id: string;
  /** A glyph, drawn beside the label. Decorative: the label carries the words. */
  icon?: ReactNode;
  label: ReactNode;
  /** What the row is, at its end: a path, a kind, a state. */
  hint?: ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteGroup {
  id: string;
  /** The heading over the group, and the name a screen reader gives it. */
  label: string;
  items: CommandPaletteItem[];
}

/**
 * Rest props reach the Modal's frame, which is what lets an application put
 * its own chord on the surface (see the component doc).
 *
 * `role` and `onSubmit` are not among them: the surface is a dialog, and a
 * palette announced as anything else is one a screen reader cannot get out of;
 * a palette takes an answer from its list, not from a form submission. Nor are
 * the three ARIA relationships, which the Modal decides: `label` names this
 * surface and its field together.
 */
export interface CommandPaletteProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    'children' | 'role' | 'onSubmit' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
  > {
  open: boolean;
  onClose: () => void;
  /** Names the surface and its field. */
  label?: string | undefined;
  query: string;
  onQueryChange: (query: string) => void;
  /** What is offered right now. The caller does the searching and the ranking. */
  groups: CommandPaletteGroup[];
  placeholder?: string | undefined;
  /** The hints under the results, usually `Kbd` keycaps. */
  footer?: ReactNode;
  /** Said when the query matches nothing. Name the kind of nothing it is. */
  emptyMessage?: string | undefined;
  /** Names the result list itself. */
  resultsLabel?: string | undefined;
}

/**
 * One search surface for a whole product: screens, records, and any id pasted
 * out of a log.
 *
 * IT KNOWS NOTHING ABOUT WHAT IT SEARCHES. The caller ranks and groups, and
 * hands over rows; what this owns is the surface, the keyboard and the way a
 * screen reader hears it. The alternative, a component that took a data source,
 * would need one ranking rule per product and would still be wrong for the
 * next one.
 *
 * IT IS A COMBOBOX. Focus stays in the field and the arrows move a highlight
 * through the results, which the field names with `aria-activedescendant`, so a
 * screen reader hears each result as it is reached. Results drawn as buttons
 * instead put up to forty tab stops between the field and itself, and the
 * highlight moved in silence.
 *
 * THE LIST IS THE SURFACE'S OWN BODY, not a popup above it (`popup: false`).
 * Registered as a popup, the list would take Escape from the stack and take the
 * veil's press on `pointerdown`, closing the palette before that press's click
 * and letting the click land on whatever the veil was covering.
 *
 * A ROW OPENS ON ITS CLICK, not on the press. Nothing here closes on blur, so
 * there is no reason to act early, and a surface gone on the press would leave
 * the release to land on the screen beneath it. The press itself is still
 * prevented, so it does not move focus off the field: a combobox that loses its
 * input names no highlight, and typing reaches nothing.
 *
 * THE CHORD THAT OPENS IT IS THE APPLICATION'S, not this component's. Pass an
 * `onKeyDown`: it reaches the frame, which is every key pressed inside the
 * surface, and closing from there is one line the caller already has the
 * definition for.
 */
export function CommandPalette({ open, ...rest }: CommandPaletteProps) {
  // Mounted only while open, so a new session starts on the first result
  // rather than on whatever the last one was left highlighting.
  return open ? <Palette {...rest} /> : null;
}

function Palette({
  onClose,
  label = 'Search',
  query,
  onQueryChange,
  groups,
  placeholder = 'Search',
  footer,
  emptyMessage = 'Nothing matches that search.',
  resultsLabel = 'Results',
  className,
  ...rest
}: Omit<CommandPaletteProps, 'open'>) {
  const id = useId();

  // Flattened once, so the listbox's index and a row's own position are one
  // number rather than two that have to agree.
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const listbox = useListbox({
    id,
    open: true,
    count: flat.length,
    popup: false,
    onCommit: (at) => {
      const item = flat[at];
      if (!item) return;
      item.onSelect();
      onClose();
    },
    onClose,
  });

  const active = listbox.active;
  let index = -1;

  return (
    <Modal
      {...rest}
      open
      onClose={onClose}
      placement="top"
      size="md"
      ariaLabel={label}
      showCloseButton={false}
      flush
      className={cx('crewlet-palette', className)}
      // The hints sit at the footer's inline START, which is where the footer
      // already draws quiet text; the end slot is for actions, and a palette
      // has none.
      footerStart={footer}
    >
      <Input
        appearance="command"
        containerClassName="crewlet-palette__field"
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          // A new query is a new list: the best match leads it.
          listbox.setActive(0);
        }}
        onKeyDown={listbox.onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-label={label}
        aria-expanded
        aria-controls={listbox.listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? listbox.optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <div
        className="crewlet-palette__results"
        ref={listbox.listRef}
        id={listbox.listId}
        role="listbox"
        aria-label={resultsLabel}
      >
        {groups.map((group) => (
          // Named by the id of its own heading, never by the heading's text:
          // `aria-label` would repeat words already on screen, and
          // `aria-labelledby` given a name with a space in it splits on it.
          <div key={group.id} role="group" aria-labelledby={`${id}-group-${group.id}`}>
            <div className="crewlet-listbox__heading" id={`${id}-group-${group.id}`} role="presentation">
              {group.label}
            </div>
            {group.items.map((item) => {
              index += 1;
              const mine = index;
              return (
                /*
                 * NOT A BUTTON, and not focusable: focus never leaves the
                 * field, so a row is reached by the arrows and by the pointer.
                 *
                 * The two rules turned off here are both asking for the shape
                 * this pattern is defined NOT to have. A combobox points at its
                 * active option with `aria-activedescendant`, which requires
                 * that the option itself never take focus, and the keys that
                 * take a row (Enter) are handled on the field, where the rule
                 * cannot see them. Making a row focusable would put one tab
                 * stop per result between the field and itself, which is the
                 * defect this replaced. The axe run in the suite beside this
                 * file is what actually holds the surface accessible.
                 */
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                <div
                  key={item.id}
                  id={listbox.optionId(mine)}
                  className="crewlet-listbox__option"
                  role="option"
                  aria-selected={mine === active}
                  onMouseEnter={listbox.optionHandlers(mine).onMouseEnter}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                >
                  {item.icon !== undefined ? (
                    <span className="crewlet-palette__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="crewlet-palette__label">{item.label}</span>
                  {item.hint !== undefined ? <span className="crewlet-listbox__hint">{item.hint}</span> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/*
       * OUTSIDE the listbox, not in it. A listbox takes options and groups; a
       * sentence inside one is a child of a kind the role does not allow, and
       * a reader's software is entitled to skip it.
       */}
      {flat.length === 0 ? <p className="crewlet-palette__empty">{emptyMessage}</p> : null}
    </Modal>
  );
}
