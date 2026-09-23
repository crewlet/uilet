import { useId, useMemo, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Count } from '../Count/index.js';
import { Input } from '../Input/index.js';
import { isComposing } from '../Layer/stack.js';
import { useListbox } from '../Listbox/index.js';
import { Modal } from '../Modal/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

export interface CommandPaletteItem {
  /** Stable across a re-query: it keys the row and names its option element. */
  id: string;
  /** A glyph, drawn beside the label. Decorative: the label carries the words. */
  icon?: ReactNode;
  label: ReactNode;
  /**
   * What the row is, read straight after its label in the quiet ink: a path, a
   * state, who owns it. It runs on the label's line and is cut with it.
   */
  hint?: ReactNode;
  /**
   * What sits at the row's END: a short fact (the space a page is in) or a
   * `Kbd` naming the accelerator that runs the row from anywhere in the
   * surface. It only DRAWS the key: the chord itself is the application's, on
   * the palette's `onKeyDown`, like the chord that opens it.
   */
  meta?: ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteGroup {
  id: string;
  /** The heading over the group, and the name a screen reader gives it. */
  label: string;
  items: CommandPaletteItem[];
}

/** One scope the search can be narrowed to: a tab over the results. */
export interface CommandPaletteScope {
  /** Stable identity: the value `scope`, `onScopeChange` and `groupsScope` carry. */
  id: string;
  label: string;
  /** How many results the scope holds, drawn as a `Count` beside its label. */
  count?: number | undefined;
}

/**
 * Scopes come as a SET or not at all. A scope row without its controlled value
 * is a tablist with nothing selected; one without `groupsScope` is a palette
 * that cannot tell the results it was handed from the results it asked for,
 * which is the one thing the row makes possible to get wrong.
 */
export type CommandPaletteScopeProps =
  | {
      scopes?: undefined;
      scope?: undefined;
      onScopeChange?: undefined;
      groupsScope?: undefined;
      scopesLabel?: undefined;
    }
  | {
      /** The scopes, in the order the row draws them and Tab walks them. */
      scopes: CommandPaletteScope[];
      /** The scope the reader has chosen. */
      scope: string;
      onScopeChange: (scope: string) => void;
      /**
       * THE SCOPE `groups` WAS COMPUTED FOR. While it is not `scope`, the rows
       * are withheld and the list says it is searching, so results that arrive
       * after the reader moved on are never offered under the scope they left.
       */
      groupsScope: string;
      /** Names the row of scopes. */
      scopesLabel?: string | undefined;
    };

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
export type CommandPaletteProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'role' | 'onSubmit' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> &
  CommandPaletteScopeProps & {
    open: boolean;
    onClose: () => void;
    /** Names the surface and its field. */
    label?: string | undefined;
    query: string;
    onQueryChange: (query: string) => void;
    /** What is offered right now. The caller does the searching and the ranking. */
    groups: CommandPaletteGroup[];
    placeholder?: string | undefined;
    /**
     * What the surface says BEFORE its results, outside the list: an answer
     * written from what the rows point at, a notice about the search itself.
     * It is a polite live region, so what arrives in it is read without moving
     * the highlight, and it is never an option: Enter still takes the row the
     * arrows are on.
     */
    lead?: ReactNode;
    /** The key legend under the results, usually `Kbd` keycaps with a word each. */
    footer?: ReactNode;
    /** Said when the query matches nothing. Name the kind of nothing it is. */
    emptyMessage?: string | undefined;
    /** Said while the rows handed over answer a scope the reader has left. */
    pendingMessage?: string | undefined;
    /** Names the result list itself. */
    resultsLabel?: string | undefined;
  };

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
 * THE SCOPES ARE TABS NOBODY TABS TO. Focus never leaves the field, so the
 * scope row is driven FROM it: Tab and Shift+Tab step through the scopes, and
 * so do the left and right arrows while the field is empty (with text in it
 * they move the caret, which is their job first). Each is still a real `tab` in
 * a real `tablist` whose `tabpanel` is the results, and a press on one picks it
 * without taking focus from the field. What the row costs is Tab's usual job,
 * which in a surface whose only stop is the field was wrapping focus back to
 * where it already was. The change is SAID, in a hidden status line, because a
 * tab selected from somewhere else is otherwise silent.
 *
 * A SCOPE THAT HAS MOVED ON WITHHOLDS THE ROWS OF THE ONE BEFORE. A caller that
 * searches asynchronously still holds the last scope's results for as long as
 * the next search takes, and a palette that drew them would put an agent under
 * "Tasks" and let Enter open it. So the rows say which scope they answer
 * (`groupsScope`), and until that is the chosen one the list is busy and
 * offers nothing. A query that moved on WITHIN a scope is not held back the
 * same way: the rows for "flak" are a fair answer while "flaky" is in flight.
 *
 * THE LEAD IS NOT IN THE LIST. A listbox takes options and groups, and an
 * answer written above the rows is neither, so it sits outside, in its own
 * polite live region, mounted empty so the first words to arrive are read. It
 * shares the one scroller with the rows, because an answer tall enough to need
 * scrolling would otherwise squeeze the list to nothing. Anything a reader
 * should be able to ACT on belongs in a row, where the arrows reach it.
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
 * definition for. The accelerators a row's `meta` draws are the same: an Enter
 * held with Command, Control or Option is never taken as Enter on the
 * highlighted row, so ⌘Enter reaches the caller alone.
 */
export function CommandPalette(props: CommandPaletteProps) {
  // Mounted only while open, so a new session starts on the first result
  // rather than on whatever the last one was left highlighting.
  return props.open ? <Palette {...props} /> : null;
}

function Palette({
  open: _open,
  onClose,
  label = 'Search',
  query,
  onQueryChange,
  groups,
  placeholder = 'Search',
  lead,
  footer,
  emptyMessage = 'Nothing matches that search.',
  pendingMessage = 'Searching…',
  resultsLabel = 'Results',
  scopes,
  scope,
  onScopeChange,
  groupsScope,
  scopesLabel = 'Search in',
  className,
  ...rest
}: CommandPaletteProps) {
  const id = useId();

  // Rows computed for a scope the reader has left are not offered at all.
  const stale = scopes !== undefined && groupsScope !== scope;

  // Flattened once, so the listbox's index and a row's own position are one
  // number rather than two that have to agree.
  const shown = useMemo(() => (stale ? [] : groups), [stale, groups]);
  const flat = useMemo(() => shown.flatMap((group) => group.items), [shown]);

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

  const tabId = (scopeId: string) => `${id}-scope-${scopeId}`;
  const panelId = `${id}-panel`;
  const current = scopes?.find((candidate) => candidate.id === scope);

  function choose(next: string) {
    if (!onScopeChange || next === scope) return;
    onScopeChange(next);
    // A new scope is a new list: its best match leads it.
    listbox.setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (listbox.onKeyDown(event)) return;
    if (!scopes || scopes.length === 0 || isComposing(event)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let step = 0;
    if (event.key === 'Tab') step = event.shiftKey ? -1 : 1;
    else if (query === '' && !event.shiftKey && event.key === 'ArrowRight') step = 1;
    else if (query === '' && !event.shiftKey && event.key === 'ArrowLeft') step = -1;
    if (step === 0) return;
    // Prevented, which is also what tells the modal's trap the key is taken.
    event.preventDefault();
    const at = scopes.findIndex((candidate) => candidate.id === scope);
    const next = scopes[(at + step + scopes.length) % scopes.length];
    if (next) choose(next.id);
  }

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
      // The legend sits at the footer's inline START, which is where the footer
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
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-label={label}
        aria-expanded
        aria-controls={listbox.listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? listbox.optionId(active) : undefined}
        aria-describedby={current ? tabId(current.id) : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {scopes ? (
        <div className="crewlet-palette__scopes" role="tablist" aria-label={scopesLabel}>
          {scopes.map((candidate) => {
            const selected = candidate.id === scope;
            return (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                id={tabId(candidate.id)}
                className={cx('crewlet-palette__scope', selected && 'is-active')}
                aria-selected={selected}
                aria-controls={panelId}
                // Never a stop: the field drives the row (see the doc above).
                tabIndex={-1}
                // A press that moved focus to the tab would take it from the
                // field, and with it the highlight and the reader's typing.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(candidate.id)}
              >
                {candidate.label}
                {candidate.count !== undefined ? <Count value={candidate.count} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {/*
       * THE ONE SCROLLER, holding the lead and the rows together. It is what
       * the listbox keeps the highlighted row in view inside, so it takes the
       * listbox's `listRef` while the listbox element keeps the list's id.
       */}
      <div
        className="crewlet-palette__results"
        ref={listbox.listRef}
        {...(scopes
          ? { id: panelId, role: 'tabpanel', 'aria-labelledby': current ? tabId(current.id) : undefined }
          : {})}
      >
        {/*
         * MOUNTED EMPTY, so the live region exists before its first words do:
         * a region that arrives already holding its text is one a screen
         * reader never saw change, and it reads nothing.
         */}
        <div className="crewlet-palette__lead" aria-live="polite">
          {lead}
        </div>
        <div
          className="crewlet-palette__list"
          id={listbox.listId}
          role="listbox"
          aria-label={resultsLabel}
          aria-busy={stale || undefined}
        >
          {shown.map((group) => (
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
                   * this pattern is defined NOT to have. A combobox points at
                   * its active option with `aria-activedescendant`, which
                   * requires that the option itself never take focus, and the
                   * keys that take a row (Enter) are handled on the field,
                   * where the rule cannot see them. Making a row focusable
                   * would put one tab stop per result between the field and
                   * itself, which is the defect this replaced. The axe run in
                   * the suite beside this file is what actually holds the
                   * surface accessible.
                   */
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={item.id}
                    id={listbox.optionId(mine)}
                    className="crewlet-listbox__option crewlet-palette__row"
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
                    <span className="crewlet-palette__text">
                      <span className="crewlet-palette__label">{item.label}</span>
                      {item.hint !== undefined ? (
                        <>
                          {' '}
                          <span className="crewlet-palette__hint">{item.hint}</span>
                        </>
                      ) : null}
                    </span>
                    {item.meta !== undefined ? <span className="crewlet-palette__meta">{item.meta}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/*
         * OUTSIDE the listbox, not in it. A listbox takes options and groups; a
         * sentence inside one is a child of a kind the role does not allow,
         * and a reader's software is entitled to skip it.
         */}
        {flat.length === 0 ? (
          <p className="crewlet-palette__empty">{stale ? pendingMessage : emptyMessage}</p>
        ) : null}
      </div>
      {current ? (
        <VisuallyHidden>
          <span role="status">
            <span key={current.id}>{current.label}</span>
          </span>
        </VisuallyHidden>
      ) : null}
    </Modal>
  );
}
