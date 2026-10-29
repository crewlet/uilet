import { createElement, useCallback, useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { Disclosure } from '../Disclosure/index.js';
import { useMediaMatch } from '../MediaMatch/index.js';
import { PageHeader } from '../PageHeader/index.js';
import { Stepper, type StepperStep } from '../Stepper/index.js';
import { cx } from '../utils/cx.js';
import {
  HeadingLevelProvider,
  headingTag,
  nextHeadingLevel,
  useHeadingLevel,
  type HeadingLevel,
} from '../utils/headingLevel.js';

export interface SetupWizardLabels {
  /** Where the reader is, above the steps on a phone, before the step's name: "Step 3 of 6". */
  progress: (position: number, total: number) => string;
  /** The disclosure the aside folds into on a phone: "Preview". */
  asideToggle: string;
  /**
   * The phone's row of steps while it hides some and takes the keyboard to
   * scroll: what that stop is, in words of its own. The navigation around it
   * is already named by `stepsLabel`, and the list inside it too, so the row
   * repeating that name was the same words three times over.
   */
  stepsRow?: string;
}

const LABELS: Required<SetupWizardLabels> = {
  progress: (position, total) => `Step ${position} of ${total}`,
  asideToggle: 'Preview',
  stepsRow: 'All steps, scrolls sideways',
};

export interface SetupWizardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onSelect'> {
  /** What is being set up: "Set up your brand". The page's heading. */
  title: ReactNode;
  /**
   * The title's heading level. It follows the surrounding level by default,
   * as `PageHeader` does; the step's heading is one level under it, and the
   * step's own content and the aside start one level under that.
   */
  headingLevel?: HeadingLevel | undefined;
  /** Where the page sits, above the title: a `Breadcrumb` "Company › Brand › Set up". */
  trail?: ReactNode;
  /** The draft's state, beside the actions: an `EditingStatus` "Draft saved 2 min ago". */
  status?: ReactNode;
  /** What leaves the wizard: Exit. */
  actions?: ReactNode;
  /** Every step, in order, as `Stepper` takes them (with a status and a description each where it has one). */
  steps: readonly StepperStep[];
  /** The step shown, by its id. */
  current: string;
  /** The furthest step visited, by its id, so the steps up to it stay buttons after walking back. `current` by default. */
  reached?: string | undefined;
  /** Called with a visited step's id when the reader picks it in the rail. Left out, the rail is words only. */
  onSelect?: ((id: string) => void) | undefined;
  /** What the steps are, for the navigation landmark and the list: "Setup steps". */
  stepsLabel: string;
  /** The step's heading: "Colours". */
  heading: ReactNode;
  /** One sentence under the heading saying why the step matters. */
  lead?: ReactNode;
  /** The step's content: its fields. */
  children: ReactNode;
  /** Beside the content on a wide page, under it on a narrower one, folded into a disclosure on a phone: a live preview. */
  aside?: ReactNode;
  /** What the aside is, for its complementary landmark: "Preview of your draft". Required with `aside`. */
  asideLabel?: string | undefined;
  /** The step's other actions, at the end of the footer row before the primary one: Back, Skip for now. */
  footer?: ReactNode;
  /**
   * The step's primary action, last in the footer row: Continue, Create,
   * Save changes. It keeps one width on every step, so a longer word on the
   * last step moves nothing beside it, and on a phone it takes the whole
   * width of its row, under the thumb.
   */
  primaryAction?: ReactNode;
  /** What stands at the start of the footer row, apart from the step's actions: Exit. */
  footerStart?: ReactNode;
  /**
   * The content takes the content's and the aside's columns together (1000px
   * at most) rather than one 640px column, for a step that lays out columns
   * of its own (a review of every step beside a preview). Its footer ends
   * where every other step's does. Meant for a step with no `aside`.
   */
  wide?: boolean | undefined;
  labels?: Partial<SetupWizardLabels> | undefined;
}

/** Under this the rail becomes a row of steps above the content, and the aside a disclosure. */
const PHONE = `(width < ${breakpoint.phone})`;

/** The phone's row of steps: whether it overflows its scroller, and which physical edges hide steps. */
interface StepRow {
  overflows: boolean;
  left: boolean;
  right: boolean;
}

const STILL_ROW: StepRow = { overflows: false, left: false, right: false };

/**
 * Which edges of a scroller hide part of its row, read off the drawn boxes of
 * its steps against its own, so it holds in either direction.
 * Half a pixel of slack absorbs a fractional layout.
 */
function stepRowOf(scroller: HTMLElement): StepRow {
  const steps = scroller.querySelectorAll<HTMLElement>('li');
  if (steps.length === 0) return STILL_ROW;
  const box = scroller.getBoundingClientRect();
  const boxes = [...steps].map((step) => step.getBoundingClientRect());
  const left = Math.min(...boxes.map((r) => r.left)) < box.left - 0.5;
  const right = Math.max(...boxes.map((r) => r.right)) > box.right + 0.5;
  return { overflows: scroller.scrollWidth > scroller.clientWidth + 0.5 || left || right, left, right };
}

/**
 * Scrolls the row so a step that took focus stands clear of the faded edges,
 * where the fade would dim its focus ring. A browser scrolls a focused element
 * into view only when none of it shows, so a step half under the fade stayed
 * there. The fade's width is the scroller's `scroll-padding-inline`, which the
 * stylesheet sets to it; by the drawn boxes, so it holds in either direction.
 */
function clearOfFade(scroller: HTMLElement, step: HTMLElement) {
  const fade = Number.parseFloat(getComputedStyle(scroller).scrollPaddingInlineStart) || 0;
  const box = scroller.getBoundingClientRect();
  const drawn = step.getBoundingClientRect();
  const pastRight = drawn.right - (box.right - fade);
  const pastLeft = box.left + fade - drawn.left;
  if (pastRight > 0) scroller.scrollLeft += pastRight;
  else if (pastLeft > 0) scroller.scrollLeft -= pastLeft;
}

/**
 * A setup a person walks step by step on a page of its own: a brand, an
 * integration, a company.
 *
 * FIVE PARTS, EACH A LANDMARK OR A HEADING. The header is the page's title
 * (a `PageHeader`) with the trail above it and the draft's status and the way
 * out beside it. The rail is a `nav` holding a vertical `Stepper`, with every
 * visited step a button. The content is a `section` named by the step's
 * heading, with a lead sentence and the step's fields in one column of at
 * most 640px. The aside is a complementary landmark named by `asideLabel`,
 * held in view beside the content. The footer holds the step's actions at the
 * end of its row (and `footerStart`, the way out, at its start) at the bottom
 * of the view, above the device's safe area, and at the end of a scroll rests
 * on the scroller's bottom edge rather than above the shell's room under the
 * content (`--crewlet-app-shell-content-end`). A step that lays out columns
 * of its own takes the content's and the aside's columns with `wide`.
 *
 * THREE SHAPES. On a wide page the rail, the content and the aside stand side
 * by side (240px, the content up to 640px, 320px), the aside right beside the
 * content however wide the window, and the header and the footer ending where
 * the parts do. Where the wizard has under 70rem of its own width, which is a
 * 1024px window beside the application's rail, the aside moves under the
 * content and the rail stays: a container query, because the room is the
 * page's and not the window's, as in `AsideLayout`. Under the
 * phone breakpoint the rail becomes one row of steps above the content that
 * scrolls sideways with the current step kept in view (eight steps wrapped
 * into three rows of pills), faded at an edge that hides steps and reachable
 * by the keyboard while it does, under a line that says "Step 3 of 6 ·
 * Colours" and a thin bar of how far along; the aside folds into a
 * disclosure, so the fields come first; and the footer's actions share two
 * rows, the primary action (`primaryAction`) the whole width of the second.
 * Which element a phone draws is decided
 * in `useMediaMatch`, the one subscription for that question; how it is laid
 * out is decided in the stylesheet, at the same breakpoint token.
 *
 * IT FILLS ITS SCREEN when its parent is a flex column as tall as the view
 * (an `AppShell`'s content, or any `display: flex; flex-direction: column`
 * box with that height): it grows into the room, the content's row takes a
 * short step's slack, and the footer rests at the bottom on every step. In a
 * block parent it is as tall as its content, and the footer still holds at
 * the bottom of the view while a long step scrolls under it.
 *
 * FOCUS FOLLOWS THE STEP. When the step changes, focus moves to its heading,
 * so a keyboard or screen reader user starts on the new step rather than on a
 * Continue button that now belongs to it; the first render takes no focus.
 */
export function SetupWizard({
  title,
  headingLevel,
  trail,
  status,
  actions,
  steps,
  current,
  reached,
  onSelect,
  stepsLabel,
  heading,
  lead,
  children,
  aside,
  asideLabel,
  footer,
  primaryAction,
  footerStart,
  wide = false,
  labels,
  className,
  ...rest
}: SetupWizardProps) {
  const text = { ...LABELS, ...labels };
  const phone = useMediaMatch(PHONE);
  const context = useHeadingLevel();
  const titleLevel = headingLevel ?? context;
  const stepLevel = nextHeadingLevel(titleLevel);
  const contentLevel = nextHeadingLevel(stepLevel);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const [row, setRow] = useState<StepRow>(STILL_ROW);
  const shown = useRef(current);

  useEffect(() => {
    if (shown.current === current) return;
    shown.current = current;
    headingRef.current?.focus();
  }, [current]);

  // WHICH EDGES OF THE PHONE'S ROW HIDE STEPS, and whether it scrolls at all, read off the drawn boxes.
  const measure = useCallback(() => {
    const scroller = stepsRef.current;
    if (!scroller) return;
    const next = stepRowOf(scroller);
    setRow((was) => (was.overflows === next.overflows && was.left === next.left && was.right === next.right ? was : next));
  }, []);

  // ON A PHONE THE CURRENT STEP STAYS IN VIEW in the row of steps, which scrolls rather than wraps.
  useEffect(() => {
    if (!phone) return;
    const scroller = stepsRef.current;
    const here = scroller?.querySelector<HTMLElement>('[aria-current="step"]')?.closest<HTMLElement>('li');
    if (!scroller || !here) return;
    // BY THE DRAWN BOXES, never by offsets: an offset counts from the start
    // edge, and in a right-to-left page scrollLeft runs from zero down, so a
    // position built from offsets scrolled the other way. The distance between
    // the two centres is the same physical distance in either direction.
    const box = scroller.getBoundingClientRect();
    const step = here.getBoundingClientRect();
    scroller.scrollLeft += step.left + step.width / 2 - (box.left + box.width / 2);
    measure();
  }, [phone, current, measure]);

  useEffect(() => {
    if (!phone) return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phone, measure]);

  if (aside !== undefined && aside !== null && !asideLabel) {
    throw new TypeError('SetupWizard needs an asideLabel with an aside: it names the aside’s landmark');
  }

  const position = steps.findIndex((step) => step.id === current);
  const step = steps[position];

  const stepper = (
    <Stepper
      label={stepsLabel}
      steps={steps}
      current={current}
      reached={reached}
      onSelect={onSelect}
      tone="brand"
      orientation={phone ? 'horizontal' : 'vertical'}
    />
  );

  const asideBlock =
    aside === undefined || aside === null ? null : (
      <aside className="crewlet-setup-wizard__aside" aria-label={asideLabel}>
        <HeadingLevelProvider level={contentLevel}>{aside}</HeadingLevelProvider>
      </aside>
    );

  return (
    <div
      {...rest}
      className={cx(
        'crewlet-setup-wizard',
        asideBlock === null && 'crewlet-setup-wizard--no-aside',
        wide && 'crewlet-setup-wizard--wide',
        className,
      )}
    >
      <div className="crewlet-setup-wizard__frame">
        <div className="crewlet-setup-wizard__head">
          {trail ? <div className="crewlet-setup-wizard__trail">{trail}</div> : null}
          <PageHeader
            title={title}
            headingLevel={titleLevel}
            actions={
              status || actions ? (
                <>
                  {status ? <span className="crewlet-setup-wizard__status">{status}</span> : null}
                  {actions}
                </>
              ) : undefined
            }
          />
        </div>

        <nav className="crewlet-setup-wizard__rail" aria-label={stepsLabel}>
          {phone && step ? (
            <>
              <p className="crewlet-setup-wizard__position">
                {text.progress(position + 1, steps.length)}
                <span aria-hidden="true">{' · '}</span>
                <span className="crewlet-setup-wizard__position-step">{step.label}</span>
              </p>
              {/* How far along, drawn: the line above says it in words. */}
              <span
                className="crewlet-setup-wizard__progress"
                aria-hidden="true"
                style={{ '--crewlet-setup-wizard-progress': String((position + 1) / steps.length) } as CSSProperties}
              />
            </>
          ) : null}
          {phone ? (
            // A ROW THAT OVERFLOWS IS A SCROLLER THE KEYBOARD CAN REACH: it
            // takes focus and a name only while it hides steps, since a pill
            // that only labels its step takes no focus of its own. Its focus
            // ring is drawn by the frame around it, which the edge fade does
            // not reach (SetupWizard.css).
            <div className="crewlet-setup-wizard__steps-frame">
              <div
                ref={stepsRef}
                className="crewlet-setup-wizard__steps"
                data-fade-left={row.left ? '' : undefined}
                data-fade-right={row.right ? '' : undefined}
                onScroll={measure}
                onFocus={(event) => {
                  // THE ROW'S OWN STEP: an `li` around the whole wizard is not one.
                  const step = event.target.closest<HTMLElement>('li');
                  if (event.target === event.currentTarget || !step || !event.currentTarget.contains(step)) return;
                  clearOfFade(event.currentTarget, step);
                  measure();
                }}
                {...(row.overflows ? { tabIndex: 0, role: 'group', 'aria-label': text.stepsRow } : {})}
              >
                {stepper}
              </div>
            </div>
          ) : (
            stepper
          )}
        </nav>

        <section className="crewlet-setup-wizard__content" aria-labelledby={headingId}>
          {createElement(
            headingTag(stepLevel),
            { id: headingId, ref: headingRef, tabIndex: -1, className: 'crewlet-setup-wizard__heading' },
            heading,
          )}
          {lead ? <p className="crewlet-setup-wizard__lead">{lead}</p> : null}
          <div className="crewlet-setup-wizard__body">
            <HeadingLevelProvider level={contentLevel}>{children}</HeadingLevelProvider>
          </div>
        </section>

        {asideBlock === null ? null : phone ? (
          <Disclosure className="crewlet-setup-wizard__preview" title={text.asideToggle} headingLevel={stepLevel}>
            {asideBlock}
          </Disclosure>
        ) : (
          asideBlock
        )}

        <footer className="crewlet-setup-wizard__footer">
          {footerStart ? <div className="crewlet-setup-wizard__footer-start">{footerStart}</div> : null}
          <div className="crewlet-setup-wizard__footer-end">
            {footer}
            {primaryAction ? <span className="crewlet-setup-wizard__primary">{primaryAction}</span> : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
