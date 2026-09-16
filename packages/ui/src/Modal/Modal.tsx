import {
  useCallback,
  useId,
  useRef,
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CloseGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { focusables, useBodyScrollLock, useLayerContainer, useModalLayer } from '../Layer/index.js';
import { cx } from '../utils/cx.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Which surface this is.
 *
 * `dialog` is sized for a question and centred over the page. `sheet` is the
 * side sheet: an editor with a dozen fields, a list or two and the refusals
 * beside them needs the full height of the window, and it needs the thing
 * being edited to stay in view at its side so the operator keeps their place.
 * A centred dialog grown to hold that covers the very card it is editing.
 */
export type ModalVariant = 'dialog' | 'sheet';

/**
 * Where a dialog sits in the window.
 *
 * `top` is the default and the one placement the engine's dashboard has: a
 * reader who just pressed a button is looking at the top half of the window,
 * and a surface that opens in the middle of the screen asks them to find it
 * again. It is also what a surface read while typing wants, which is why the
 * command palette has always asked for it.
 *
 * `center` is kept for a surface that is the whole of what the reader is doing
 * and has nothing above it to stay in touch with, such as a full-bleed viewer.
 */
export type ModalPlacement = 'center' | 'top';

/**
 * How much chrome the surface carries.
 *
 * `framed` is the default and is every editor, wizard and form: a head band
 * with the title and a close control, a body, and a foot band with the
 * actions.
 *
 * `prompt` is one question and one answer, and takes the bands off. The title
 * is drawn as the body's own first line, the actions hang off its bottom edge
 * with no rule and no ground, there is no glyph and no close control, and the
 * frame is narrower and centred. A prompt IS what the reader is doing, so it
 * has nothing behind it to stay in touch with; every band around it is
 * something the eye crosses before reaching the sentence. It changes the
 * dialog variant only: a sheet is never a prompt.
 */
export type ModalShape = 'framed' | 'prompt';

/**
 * What the surface IS to a screen reader. `alertdialog` is for a prompt that
 * interrupts to report or to confirm something consequential, and nothing
 * else: it asks a reader's software to announce the whole surface at once,
 * which is right for "delete this forever?" and wrong for an editor.
 */
export type ModalRole = 'dialog' | 'alertdialog';

/**
 * The attributes a caller may put on the frame.
 *
 * The three ARIA relationships are withheld on purpose. This component decides
 * all three (the title names the frame, `ariaLabel` names one without a title,
 * `describedBy` defaults to the subtitle), and a value arriving through the
 * rest props would be overwritten with no sign of it: a surface that looked
 * named in the source would ship unnamed. Refusing them in the type points the
 * caller at the props that are actually read.
 */
type FrameAttributes = Omit<
  HTMLAttributes<HTMLElement>,
  'title' | 'onSubmit' | 'role' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
>;

export interface ModalProps extends FrameAttributes {
  /** Controls visibility. While false the surface is not mounted at all. */
  open: boolean;
  /** Asked to close: Escape, the veil, or the close control. */
  onClose: () => void;
  /** The line that names the surface. It names the dialog whether or not it is drawn. */
  title?: ReactNode;
  /** A second line under the title. It describes the surface unless `describedBy` says otherwise. */
  subtitle?: ReactNode;
  /** A glyph beside the title. Decorative: the title carries the words. */
  icon?: ReactNode;
  /** Actions, at the inline end of the footer. */
  footer?: ReactNode;
  /** The footer's inline start: a secondary action, a count, a last-saved line. */
  footerStart?: ReactNode;
  /**
   * Actions in the HEAD, at its inline end, beside the title.
   *
   * What a side sheet's commit pair wants: a sheet's body is a tall column a
   * reader scrolls, and Apply at the bottom of it is a button they have to
   * travel the whole form to reach and travel back from. A dialog answered in
   * one glance keeps its actions in the foot, where the eye ends up.
   */
  headerActions?: ReactNode;
  children?: ReactNode;
  size?: ModalSize | undefined;
  variant?: ModalVariant | undefined;
  shape?: ModalShape | undefined;
  placement?: ModalPlacement | undefined;
  role?: ModalRole | undefined;
  /**
   * False while a request is in flight: Escape, the veil and the close
   * control all stop closing, so a stray press cannot abandon a write whose
   * outcome the reader has not seen.
   */
  dismissable?: boolean | undefined;
  /** A veil-only switch: the surface still closes on Escape and on its close control. */
  closeOnBackdrop?: boolean | undefined;
  showCloseButton?: boolean | undefined;
  /** Stacks the body's children in a column with a gap, which most forms want. */
  stackBody?: boolean | undefined;
  /** Drops the body's padding, for content that owns its own edges. */
  flush?: boolean | undefined;
  className?: string | undefined;
  /** Names a surface that draws no title. Ignored when `title` is given. */
  ariaLabel?: string | undefined;
  /** Describes the surface. Defaults to the subtitle. */
  describedBy?: string | undefined;
  /** Where focus starts, if not the first control in the body. */
  initialFocus?: (() => HTMLElement | null) | undefined;
  /** When given, the frame is a form and Enter in a field submits it. */
  onSubmit?: (() => void) | undefined;
  closeLabel?: string | undefined;
  /** Why the close control is unavailable while `dismissable` is false. */
  closeDisabledReason?: string | undefined;
}

/**
 * Modal: the one surface every dialog, prompt and side sheet in this package
 * is built from.
 *
 * WHAT IT OWNS: the veil, the frame, the name a screen reader announces, the
 * head, body and foot, and where focus starts. Escape, the veil press, the Tab
 * trap, where focus goes back, the stacking order and the body's scroll lock
 * belong to the layer stack, which every overlay here shares, so a prompt
 * raised over a sheet closes on its own Escape and leaves the sheet open.
 *
 * WHAT IT DELIBERATELY DOES NOT OWN: what the surface says, what its buttons
 * do, and whether closing is allowed right now. A surface mid-write passes
 * `dismissable={false}`.
 *
 * THE TITLE ALWAYS NAMES THE FRAME. It is linked by an id this component
 * mints, because a name passed by hand is a name a caller can forget: none of
 * conlet's sixteen dialogs passed one, and every one of them was announced as
 * "dialog" and nothing more.
 *
 * ITS CONTENTS ARE THEIR OWN OUTLINE. `aria-modal` puts everything behind the
 * veil out of reach, so a heading inside starts at 2 however deeply the
 * component that opened the surface was nested. The title itself is not a
 * heading: the dialog role announces it already, and a reader moving by
 * heading would meet it twice.
 */
export function Modal({ open, ...rest }: ModalProps) {
  const container = useLayerContainer();
  // The frame is a component of its own so its hooks run only while the
  // surface is open. A `useModalLayer` that ran while closed would take a
  // place in the stack for a surface nobody can see, and would capture the
  // focus to return to at the wrong moment entirely.
  //
  // IT IS KEYED ON ITS HOST, because a portal whose container changes is a new
  // mount: React tears the old subtree down and builds another, so the panel
  // the stack was handed when the surface opened is replaced by a different
  // element, and focus is left on the page body behind the veil. A `LayerHost`
  // publishes its target one commit after it first renders, so a surface that
  // opens in the same commit as its host is exactly that case.
  return open && container ? <ModalFrame key={hostKey(container)} container={container} {...rest} /> : null;
}

/**
 * A number per portal host, the same one every time, so the key above changes
 * only when the host does.
 *
 * A map rather than an attribute on the element itself: the host belongs to
 * `LayerHost`, and a component that draws into somebody else's element does
 * not get to write on it.
 */
const hostKeys = new WeakMap<HTMLElement, number>();
let hostsSeen = 0;

function hostKey(host: HTMLElement): number {
  const known = hostKeys.get(host);
  if (known !== undefined) return known;
  hostsSeen += 1;
  hostKeys.set(host, hostsSeen);
  return hostsSeen;
}

/**
 * Whether a slot was handed something to draw.
 *
 * Not `!== undefined`, because that is not how a caller says "nothing here":
 * `footer={null}` and `title={ready && name}` are both ordinary, and read as
 * present they draw an empty footer band and, worse, point `aria-labelledby`
 * at an empty element. That leaves the surface with no name at all AND
 * suppresses the `ariaLabel` that would have given it one, which is the exact
 * failure this component was rebuilt to remove. React's own rule is the one
 * used here: null, undefined, false and the empty string draw nothing.
 */
export function given(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== '';
}

function ModalFrame({
  container,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  footerStart,
  headerActions,
  children,
  size = 'sm',
  variant = 'dialog',
  shape = 'framed',
  placement,
  role = 'dialog',
  dismissable = true,
  closeOnBackdrop = true,
  showCloseButton = true,
  stackBody = false,
  flush = false,
  className,
  ariaLabel,
  describedBy,
  initialFocus,
  onSubmit,
  closeLabel = 'Close',
  closeDisabledReason = 'Closing is unavailable until this finishes.',
  ...rest
}: Omit<ModalProps, 'open'> & { container: HTMLElement }) {
  const id = useId();
  const titleId = `${id}-title`;
  const subtitleId = `${id}-subtitle`;
  /*
   * A prompt is a dialog with its bands taken off: its title is drawn inside
   * the body, it draws no close control (the Cancel beside it is the same
   * door), and it opens centred, because unlike every other surface here
   * there is nothing behind it the reader is keeping their place in. A sheet
   * is never one, so the shape is read only on the dialog variant.
   */
  const prompt = shape === 'prompt' && variant === 'dialog';
  const banded = !prompt;
  const sheet = variant === 'sheet';
  const place = placement ?? (prompt ? 'center' : 'top');
  const frame = useRef<HTMLElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const foot = useRef<HTMLDivElement | null>(null);
  const start = useRef(initialFocus);
  start.current = initialFocus;

  /*
   * THE BODY FIRST, then the footer, then the frame itself, and never the
   * close control that comes first in the markup. A surface that opens with
   * focus on Close has made closing the first thing it asks, which is wrong
   * for an editor and merely rude for a prompt. The frame is the last resort
   * so a screen reader announces the surface rather than carrying on behind
   * the veil.
   */
  const where = useCallback(() => {
    const chosen = start.current?.();
    if (chosen) return chosen;
    const inBody = body.current ? focusables(body.current)[0] : undefined;
    if (inBody) return inBody;
    const inFoot = foot.current ? focusables(foot.current)[0] : undefined;
    return inFoot ?? frame.current;
  }, []);

  const layer = useModalLayer({ onClose, dismissable, initialFocus: where });
  useBodyScrollLock(true);

  const labelledBy = given(title) ? titleId : undefined;
  const described = describedBy ?? (given(subtitle) ? subtitleId : undefined);
  const frameProps = {
    ...rest,
    ref: (el: HTMLElement | null) => {
      frame.current = el;
      layer.panelRef(el);
    },
    className: cx(
      'crewlet-modal',
      `crewlet-modal--${variant}`,
      variant === 'dialog' ? `crewlet-modal--${size}` : undefined,
      prompt ? 'crewlet-modal--prompt' : undefined,
      className,
    ),
    role,
    'aria-modal': true,
    'aria-labelledby': labelledBy,
    'aria-label': labelledBy === undefined ? ariaLabel : undefined,
    'aria-describedby': described,
    tabIndex: -1,
  };

  const closes = banded && showCloseButton;
  const content = (
    <>
      {banded && (given(title) || given(subtitle) || given(headerActions) || closes) ? (
        <div className={cx('crewlet-modal__header', sheet ? 'crewlet-modal__header--sheet' : undefined)}>
          {given(icon) ? (
            <span className="crewlet-modal__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="crewlet-modal__heading">
            {given(title) ? (
              <p
                className={cx('crewlet-modal__title', sheet ? 'crewlet-modal__title--sheet' : undefined)}
                id={titleId}
              >
                {title}
              </p>
            ) : null}
            {given(subtitle) ? (
              <p className="crewlet-modal__subtitle" id={subtitleId}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {given(headerActions) ? <div className="crewlet-modal__actions">{headerActions}</div> : null}
          {closes ? (
            <IconButton
              className="crewlet-modal__close"
              label={closeLabel}
              icon={<CloseGlyph size="md" />}
              onClick={onClose}
              disabledReason={dismissable ? undefined : closeDisabledReason}
            />
          ) : null}
        </div>
      ) : null}
      {given(children) || (prompt && given(title)) ? (
        <div
          ref={body}
          className={cx(
            'crewlet-modal__body',
            stackBody ? 'crewlet-modal__body--stacked' : undefined,
            flush ? 'crewlet-modal__body--flush' : undefined,
            sheet ? 'crewlet-modal__body--sheet' : undefined,
          )}
        >
          {/*
           * A prompt's title is its body's first line, and carries the same id
           * the band's would: the frame is named by its title either way, so
           * taking the band off never takes the name with it.
           */}
          {prompt && given(title) ? (
            <p className="crewlet-modal__prompt-title" id={titleId}>
              {title}
            </p>
          ) : null}
          {/* A dialog's contents are their own outline: see the component doc. */}
          <HeadingLevelProvider level={2}>{children}</HeadingLevelProvider>
        </div>
      ) : null}
      {given(footer) || given(footerStart) ? (
        <div
          ref={foot}
          className={cx('crewlet-modal__footer', sheet ? 'crewlet-modal__footer--sheet' : undefined)}
        >
          {given(footerStart) ? <div className="crewlet-modal__footer-start">{footerStart}</div> : null}
          <div className="crewlet-modal__footer-end">{footer}</div>
        </div>
      ) : null}
    </>
  );

  return createPortal(
    <div
      /*
       * The veil is handed to the stack only while it may close the surface.
       * `closeOnBackdrop` is a veil-only switch, so withholding the element is
       * exactly what it means: Escape and the close control still work, and
       * the stack has nothing to match a press against.
       */
      ref={closeOnBackdrop ? layer.veilRef : undefined}
      className={cx(
        'crewlet-modal-overlay',
        `crewlet-modal-overlay--${variant}`,
        `crewlet-modal-overlay--${place}`,
        // Fixed against the window, absolute inside a LayerHost: a fullscreen
        // container paints only its own subtree, so a surface drawn there
        // covers the container rather than a viewport it cannot reach.
        container === document.body ? 'crewlet-modal-overlay--fixed' : 'crewlet-modal-overlay--in-host',
      )}
      role="presentation"
      style={{ zIndex: layer.zIndex }}
    >
      {/*
        THE DIALOG IS THE DIV, AND THE FORM IS INSIDE IT. A `<form>` accepts
        only `search`, `none` and `presentation` as an explicit role, so a
        frame written as `<form role="dialog" aria-modal>` is a conformance
        failure axe reports on every surface in the product that submits (the
        node editor, every confirmation). The form draws no box of its own
        (`display: contents`), so the frame's own column still has the head,
        the body and the footer as its children, and Enter from any control
        inside still submits, which is the whole reason it is a form.
      */}
      <div {...frameProps}>
        {onSubmit ? (
          <form
            className="crewlet-modal__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {content}
          </form>
        ) : (
          content
        )}
      </div>
    </div>,
    container,
  );
}
