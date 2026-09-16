/**
 * The control that adds a child: one mark at rest, a split pill of choices
 * under the pointer.
 *
 * WHY NOT A MENU. What goes under a node of an org chart is two or three
 * kinds of thing, and the choice between them is the whole of the decision. A
 * menu spends a click and a surface of its own on asking it, lands a list over
 * the chart, and takes the answer somewhere the eye was not looking. The pill
 * asks it in place: the mark the pointer arrived at grows into the choices,
 * each one is where the mark was, and the answer is the same press that would
 * have opened the menu. It is the console org chart's own gesture, and this is
 * that gesture as a component.
 *
 * QUIET AT REST, AND SMALL. What a resting chart draws for this is one disc on
 * the branch, at about a third of a node's height: it says a child can go here
 * and says nothing else. Everything that makes it a control (the boundary, the
 * full ink, the choices) arrives when it is reached. The hue is the node
 * ramp's GREEN, which is the console chart's own answer and the one thing on
 * that chart drawn in it, so "the green plus" names a control rather than
 * describing one.
 *
 * ONE GESTURE, TWO SURFACES. A chart draws it on a branch (`sm`, `split`) and
 * a table row draws it beside the row's other controls (`md`, `inline`). They
 * were two components once, with two sizes, two grounds, two border alphas and
 * an animation on one of them, which is what a reader met as two different
 * controls doing one thing.
 *
 * HOVER PREVIEWS, A PRESS LOCKS. Moving onto the mark opens the pill so the
 * choices can be read without committing to anything, and moving off closes
 * it again; pressing the mark holds it open, so the choices can be read at
 * leisure, and only a press somewhere else, Escape, or a choice closes it. The
 * two are one state with a lock on it rather than two behaviours, because a
 * pill that closed under the pointer after a press is a pill that loses the
 * click a reader is about to make.
 *
 * THE OPEN IS A SPRING AND THE CLOSE IS A RECOIL. It grows from the width of
 * the mark to the width of the pill, which is the mark SPLITTING rather than a
 * surface appearing over it, and that is the whole reason the gesture reads as
 * one thing. Under `prefers-reduced-motion: reduce` it simply is open or
 * closed: nothing is hidden and no choice is slower to reach.
 *
 * THE KEYBOARD NEVER NEEDS IT. It is a disclosure and it behaves as one (the
 * mark carries `aria-expanded`, a press opens it and moves focus onto the
 * first choice, Escape closes it and gives focus back), but a chart that puts
 * this in a pointer-only strip owes its keyboard reader the same choices
 * somewhere reachable, in the node's own menu. Both are the same list.
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * How long the pill takes to open or to close, in milliseconds.
 *
 * It is here as well as in the stylesheet because the closing pill has to stay
 * MOUNTED for exactly as long as its own animation, and a component cannot
 * read a duration token. The two are checked against each other by this
 * folder's suite rather than remembered.
 */
export const ADD_PILL_MS = 200;

/** One choice of what to add. */
export interface AddPillSection {
  key: string;
  /** What this choice adds: "Add a unit". Its accessible name and its tooltip. */
  label: string;
  /** The mark drawn in the section. An SVG glyph, sized by the pill. */
  icon: ReactNode;
  onSelect(): void;
  /** Drawn and announced, and refuses the press: see the design system's read-only rule. */
  disabled?: boolean | undefined;
  /**
   * Unavailable, and WHY. A reason rather than a flag, for the same reason
   * `IconButton` takes one: a choice that is not on offer right now still has
   * to be reachable and still has to say what would put it back. It refuses
   * the press like `disabled` and is read after the choice's own name.
   */
  disabledReason?: string | undefined;
}

export interface AddPillProps {
  /**
   * The resting mark's accessible name, which is what the pill belongs to:
   * "Add to Engineering". Nine controls on one chart all called "Add" are nine
   * controls a reader tells apart by looking at where they are.
   */
  label: string;
  /**
   * The choices, in the order they are drawn across the pill. Two to four: the
   * pill is as wide as a pointer target per section, and past four it is wider
   * than the node it hangs under.
   */
  sections: readonly AddPillSection[];
  /**
   * How big the control is.
   *
   * `sm` is a BRANCH's: a disc about a third of a node's height inside a
   * pointer target, which is what a chart at rest can carry one of per node.
   * `md` is a ROW's: one control step, drawn at the size it is hit, beside the
   * other controls at the end of a table row.
   */
  size?: 'sm' | 'md' | undefined;
  /**
   * Where the choices appear.
   *
   * `split` is the chart's: the pill grows out of the mark, centred on it, so
   * each choice is within a few pixels of what the pointer arrived at. Use it
   * where the mark stands alone on a branch. `inline` is the row's: the mark
   * stays put and the choices open beside it, so the controls the row already
   * draws are not covered by a pill over them.
   */
  layout?: 'split' | 'inline' | undefined;
  /** Focus stays out of the pill, for a chart that puts it in a pointer-only strip. */
  tabIndex?: number | undefined;
  /** Called when a press opens the pill, for a grid whose one tab stop follows focus. */
  onOpen?: (() => void) | undefined;
  className?: string | undefined;
}

/** What the pill is doing: see the module doc. */
type Phase = 'closed' | 'preview' | 'locked' | 'closing';

export function AddPill({
  label,
  sections,
  size = 'sm',
  layout = 'split',
  tabIndex,
  onOpen,
  className,
}: AddPillProps) {
  const [phase, setPhase] = useState<Phase>('closed');
  const ids = useId();
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const group = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const open = phase === 'preview' || phase === 'locked';

  const close = useCallback((restore: boolean) => {
    if (closing.current !== null) clearTimeout(closing.current);
    setPhase((was) => (was === 'closed' ? was : 'closing'));
    closing.current = setTimeout(() => {
      setPhase((was) => (was === 'closing' ? 'closed' : was));
      closing.current = null;
    }, ADD_PILL_MS);
    if (restore) mark.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (closing.current !== null) clearTimeout(closing.current);
    },
    [],
  );

  // A PRESS ANYWHERE ELSE CLOSES IT, which is what makes the lock safe to
  // offer: a reader who pressed the mark and then went somewhere else does not
  // leave a pill open behind them. Listened for while open and never otherwise.
  useEffect(() => {
    if (!open) return undefined;
    const elsewhere = (event: globalThis.MouseEvent) => {
      if (!group.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', elsewhere);
    return () => document.removeEventListener('mousedown', elsewhere);
  }, [open, close]);

  const press = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (phase === 'locked') {
      close(false);
      return;
    }
    onOpen?.();
    setPhase('locked');
    // The press came from a pointer or from Enter on the mark; either way the
    // choices are now what the reader is acting on, so focus goes to them.
    requestAnimationFrame(() => first.current?.focus());
  };

  /*
   * ON EACH CONTROL rather than on the group around them, because the group is
   * a plain box: a key handler there is a key handler a keyboard reader can
   * never reach, and the linter is right to refuse it. Every element the key
   * can arrive at is a button, and they all take the same one.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Escape' || phase === 'closed') return;
    event.stopPropagation();
    close(true);
  };

  // Leaving the pill with the KEYBOARD closes it, for the same reason a press
  // elsewhere does. Leaving it with the pointer is `onMouseLeave` below, and
  // only when it is not locked.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!open) return;
    const to = event.relatedTarget as Node | null;
    if (to !== null && group.current?.contains(to)) return;
    if (to !== null) close(false);
  };

  return (
    <div
      className={cx('crewlet-add-pill', className)}
      data-phase={phase}
      data-size={size}
      data-layout={layout}
      ref={group}
      onBlur={onBlur}
      onMouseLeave={() => {
        if (phase === 'preview') close(false);
      }}
    >
      <button
        type="button"
        className="crewlet-add-pill__mark"
        aria-label={label}
        title={label}
        aria-expanded={open}
        tabIndex={tabIndex}
        ref={mark}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPhase((was) => (was === 'locked' ? was : 'preview'))}
        onClick={press}
      >
        {/* THE DISC, as an element for the reason the dividers are: it is the
            MASK that stops the branch being drawn through the plus, so what it
            is painted with is a promise, and a pseudo element is the one
            drawing no cascade can report. */}
        <span className="crewlet-add-pill__disc" aria-hidden="true" />
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
      {phase !== 'closed' && (
        <div className="crewlet-add-pill__sections" aria-hidden={phase === 'closing' || undefined}>
          {sections.map((section, at) => {
            const refused = section.disabled === true || section.disabledReason !== undefined;
            return (
              <Fragment key={section.key}>
                {/* THE DIVIDER IS AN ELEMENT, not a boundary on the button's own box. The
                    console chart draws two lines inset from the pill's ends, and a border
                    cannot be shorter than the box it is on: the box here is a POINTER TARGET
                    half as tall again as the pill, so the line ran past the pill at both
                    ends. It is also the one thing in the pill a press must not land on. */}
                {at > 0 && <span className="crewlet-add-pill__divider" aria-hidden="true" />}
                <button
                  type="button"
                  className="crewlet-add-pill__section"
                  aria-label={section.label}
                  title={section.label}
                  aria-disabled={refused || undefined}
                  aria-describedby={
                    section.disabledReason === undefined ? undefined : `${ids}-${section.key}`
                  }
                  tabIndex={tabIndex}
                  ref={at === 0 ? first : undefined}
                  onKeyDown={onKeyDown}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (refused) return;
                    close(false);
                    section.onSelect();
                  }}
                >
                  {section.icon}
                </button>
              </Fragment>
            );
          })}
          {/* The reasons LAST, so that a refusal nobody can see never comes
              between two sections: the divider between them is drawn by an
              adjacent-sibling rule, and an element in the gap would take it
              away. Each is out of the flow, so none of them is a cell. */}
          {sections.map((section) =>
            section.disabledReason === undefined ? null : (
              <VisuallyHidden key={`why-${section.key}`} id={`${ids}-${section.key}`}>
                {section.disabledReason}
              </VisuallyHidden>
            ),
          )}
        </div>
      )}
    </div>
  );
}
