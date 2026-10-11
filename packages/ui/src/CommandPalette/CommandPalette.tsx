import { useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeftGlyph, SearchGlyph } from '@crewlethq/icons/glyphs';
import { Count } from '../Count/index.js';
import { Input } from '../Input/index.js';
import { Kbd } from '../Kbd/index.js';
import { isComposing } from '../Layer/stack.js';
import { useHighlightRest, useListbox } from '../Listbox/index.js';
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
  /**
   * Taking the row. The surface closes after it, which is what a launcher's
   * row means; a row that leads somewhere INSIDE the surface (into a step) or
   * waits on an answer the reader is owed returns `false` to keep it open.
   */
  onSelect: () => boolean | void;
}

export interface CommandPaletteGroup {
  id: string;
  /** The heading over the group, and the name a screen reader gives it. */
  label: string;
  items: CommandPaletteItem[];
}

/**
 * A STEP the palette has gone into: a second list in place of the results,
 * for a choice the first one led to (which project to file into, which theme
 * to use). The caller hands over the step's own rows as `groups` and its own
 * query; this draws where the reader is and the way back.
 */
export interface CommandPaletteStep {
  /** What the step chooses, on the chip at the field's start: "Change theme". */
  label: string;
  /**
   * Back to where the step was opened from: the chip, Escape, and Backspace in
   * an empty field. The palette stays open; closing is the veil's and the
   * caller's chord.
   */
  onBack: () => void;
  /**
   * The id of the row the step's list opens on: the choice already in effect,
   * so a step that previews its rows opens on what is on screen rather than
   * previewing its first row. The first row without it.
   */
  startAt?: string | undefined;
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
    /**
     * Draws an `Esc` keycap at the END of the field, the approved design's
     * reminder of how the surface closes. Off by default: it names a key, so
     * it belongs on a surface a keyboard reaches, and an application that also
     * opens the palette from a touch target decides whether that is the one
     * every reader of it has. The key itself always closes the surface; this
     * only draws it.
     */
    escapeHint?: boolean | undefined;
    /** Said when the query matches nothing. Name the kind of nothing it is. */
    emptyMessage?: string | undefined;
    /** Said while the rows handed over answer a scope the reader has left. */
    pendingMessage?: string | undefined;
    /** Names the result list itself. */
    resultsLabel?: string | undefined;
    /**
     * The step the palette is in, or none. In a step the field starts with a
     * chip naming it, which goes back on a press, and Escape and Backspace in
     * an empty field go back rather than closing the surface.
     */
    step?: CommandPaletteStep | undefined;
    /**
     * Told where the highlight COMES TO REST, and `null` when the list empties,
     * the pointer leaves it or the surface closes: at once for a key, and once
     * the pointer has rested on a row for `HIGHLIGHT_REST_MS`. What a step that
     * previews its rows listens to.
     */
    onHighlight?: ((item: CommandPaletteItem | null) => void) | undefined;
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
 * A STEP IS A SECOND LIST, NOT A SECOND SURFACE (`step`). The field stays
 * where it is, so focus and the reader's place survive going in and coming
 * back; its search glyph gives way to a chip naming the step, and the keys
 * that would close the surface go back instead: Escape, and Backspace in an
 * empty field, which is where a reader who has erased their query is asking to
 * go. The veil still closes it, as does the caller's own chord.
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
  escapeHint = false,
  emptyMessage = 'Nothing matches that search.',
  pendingMessage = 'Searching…',
  resultsLabel = 'Results',
  scopes,
  scope,
  onScopeChange,
  groupsScope,
  scopesLabel = 'Search in',
  step,
  onHighlight,
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
      if (item.onSelect() !== false) onClose();
    },
    onClose,
  });

  /*
   * WHERE THE HIGHLIGHT RESTS, for a caller that previews it. Keyed by the
   * row's id, so new row objects for the same rows tell nothing new. A move
   * the POINTER made waits for the pointer to rest (see useHighlightRest);
   * every other move (a key, a new query, a step's own list) is told at once.
   */
  const offeredNow = useRef(flat);
  offeredNow.current = flat;
  const highlight = useHighlightRest(
    onHighlight ? (key) => onHighlight(key === null ? null : (offeredNow.current.find((item) => item.id === key) ?? null)) : undefined,
  );
  const byPointer = useRef(false);
  const restingKey = flat[listbox.active]?.id ?? null;
  useEffect(() => {
    const pointer = byPointer.current;
    byPointer.current = false;
    if (restingKey === null) highlight.now(null);
    else if (pointer) highlight.rest(restingKey);
    else highlight.now(restingKey);
  }, [restingKey, highlight]);

  /*
   * A STEP OPENS ON ITS OWN ROW, and coming back puts the highlight where it
   * was. Decided while rendering, not in an effect, so the frame that shows the
   * new list already shows the right row and the highlight is never told the
   * row it happened to be left on: an effect would tell a previewing caller
   * the stale row first, and the screen would flash it.
   */
  const stepKey = step?.label ?? null;
  const [shownStep, setShownStep] = useState(stepKey);
  const [before, setBefore] = useState(0);
  if (stepKey !== shownStep) {
    setShownStep(stepKey);
    if (shownStep === null) setBefore(listbox.active);
    const start = step?.startAt === undefined ? -1 : flat.findIndex((item) => item.id === step.startAt);
    listbox.setActive(stepKey === null ? before : Math.max(start, 0));
  }

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
    if (step && !isComposing(event) && !event.altKey && !event.ctrlKey && !event.metaKey) {
      // Prevented, which is also what keeps the layer stack from taking
      // Escape as "close" (see Layer/stack.ts).
      if (event.key === 'Escape' || (event.key === 'Backspace' && query === '')) {
        event.preventDefault();
        step.onBack();
        return;
      }
    }
    if (listbox.onKeyDown(event)) return;
    if (!scopes || scopes.length === 0 || isComposing(event)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let by = 0;
    if (event.key === 'Tab') by = event.shiftKey ? -1 : 1;
    else if (query === '' && !event.shiftKey && event.key === 'ArrowRight') by = 1;
    else if (query === '' && !event.shiftKey && event.key === 'ArrowLeft') by = -1;
    if (by === 0) return;
    // Prevented, which is also what tells the modal's trap the key is taken.
    event.preventDefault();
    const at = scopes.findIndex((candidate) => candidate.id === scope);
    const next = scopes[(at + by + scopes.length) % scopes.length];
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
      {/*
       * THE FIELD ROW IS THE DESIGN'S: a search glyph at its start, the query,
       * and the optional Esc keycap at its end. Both are drawn in the field's
       * own slots, which take no pointer, so a press anywhere on the row still
       * lands in the text. Both are hidden from assistive technology: the
       * glyph is the word "search" the field is already named with, and the
       * keycap restates what a dialog's Escape does by definition, so read
       * aloud each is the name of something the reader already has.
       *
       * IN A STEP the glyph gives way to a chip naming the step. The chip is
       * a control, so it sits in the bar beside the field rather than in a
       * slot. The field keeps its place in the tree either way, so going into
       * a step and back keeps focus and the caret where the reader left them.
       */}
      <div className={cx('crewlet-palette__bar', step && 'is-step')}>
        {step ? (
          <button
            type="button"
            className="crewlet-palette__step"
            // Never a stop, like a scope: the field drives the surface, and
            // Escape and Backspace are its way back.
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={step.onBack}
          >
            <ChevronLeftGlyph size="sm" />
            {/* Named "Back from Change theme": what a press does, and the
                words on the chip, which a name has to contain. */}
            <VisuallyHidden>Back from</VisuallyHidden> {step.label}
          </button>
        ) : null}
        <Input
          appearance="command"
          containerClassName="crewlet-palette__field"
          leading={step ? undefined : <SearchGlyph size="sm" />}
          trailing={
            escapeHint ? (
              <Kbd subtle aria-hidden className="crewlet-palette__escape">
                Esc
              </Kbd>
            ) : undefined
          }
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            // A new query is a new list: the best match leads it.
            listbox.setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          // In a step the field searches the step's list, and is named for it.
          aria-label={step ? step.label : label}
          aria-expanded
          aria-controls={listbox.listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? listbox.optionId(active) : undefined}
          aria-describedby={current ? tabId(current.id) : undefined}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
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
        // THE POINTER LEAVING IS NOWHERE, for a caller previewing the
        // highlight. The highlight itself stays, so the keys carry on.
        onMouseLeave={() => highlight.now(null)}
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
                    onMouseEnter={() => {
                      // Back onto the row the highlight never left: nothing
                      // moves, so the rest starts here (see the effect above).
                      if (mine === active) highlight.rest(item.id);
                      else byPointer.current = true;
                      listbox.optionHandlers(mine).onMouseEnter();
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (item.onSelect() !== false) onClose();
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
