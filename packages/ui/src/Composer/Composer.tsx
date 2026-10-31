import { forwardRef, useId, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Kbd } from '../Kbd/index.js';
import { Textarea } from '../Input/index.js';
import { isComposing } from '../Layer/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** The share of `maxLength` at which the counter appears. */
export const COMPOSER_COUNTER_AT = 0.8;

/**
 * Which key sends. `mod-enter` (Command+Enter, Control+Enter elsewhere) is for
 * a brief or a reply that is often several lines, where Enter writes a line;
 * `enter` is for a question, which is one line far more often than not, as
 * every chat surface sends it: Enter sends and Shift+Enter writes a line.
 */
export type ComposerSubmitKey = 'mod-enter' | 'enter';

/** The box's look: `default`, a form's field, or `chat`, a conversation's message box. */
export type ComposerAppearance = 'default' | 'chat';

export interface ComposerProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onSubmit' | 'children'> {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called on the send key (`submitOn`). Never while the composer is
   * disabled, and never on an Enter that ends an input method's composition.
   */
  onSubmit?: (() => void) | undefined;
  /** Which key sends. `mod-enter` by default; see `ComposerSubmitKey`. */
  submitOn?: ComposerSubmitKey | undefined;
  /** Names the field for a screen reader, since it carries no visible label. */
  label: string;
  /**
   * `chat` is a conversation's message box, on the transcript's own type and
   * ground (the `--crewlet-chat-*` scale): the large corner, the transcript's
   * ground with the row wash and a small shadow, the words at the chat step, a
   * footer with no rule of its own, a tool whose menu is open drawn pressed,
   * and the formatting row's glyphs quiet until the box is in use.
   */
  appearance?: ComposerAppearance | undefined;
  /** The footer's controls, at its end: Cancel and Submit. */
  actions?: ReactNode;
  /**
   * Tools at the footer's START, before the actions: what a chat composer
   * offers beside sending (attach, emoji, a mention, drafting with the
   * assistant). They stand where the eye starts, under the words, and the
   * send control keeps the corner.
   */
  tools?: ReactNode;
  /**
   * A row along the box's top, inside its edge and before everything else: a
   * formatting `Toolbar` (bold, italic, a list) that acts on the words below.
   * Pass a `Toolbar` with its own name; the row is laid out, not labelled.
   */
  toolbar?: ReactNode;
  /**
   * A control on the field's own row, at its end: the send button of a chat
   * composer (`SendButton`). With one, the field starts at one line and grows
   * to six before it scrolls, and the control stays on the last line.
   */
  trailing?: ReactNode;
  /**
   * What travels with the message, drawn above the field inside the
   * composer's edge: a row of `Tag`s, such as the page a question is asked
   * about. It is a group named by `attachmentsLabel`, before the field in
   * reading order, so a reader meets what is attached before what they type.
   */
  attachments?: ReactNode;
  /** Names the attachments group. "Attached to this message" by default. */
  attachmentsLabel?: string | undefined;
  /**
   * The composer cannot send right now, and why, in a few words ("Offline",
   * "You can ask again in 30 seconds"). The whole composer takes the disabled
   * field's look, the reason stands as the placeholder (so it keeps one line)
   * and describes the field, and a draft already in it stays. Implies
   * `disabled`.
   */
  disabledReason?: string | undefined;
  className?: string | undefined;
}

/**
 * A message written in place: a borderless field that grows with its text,
 * and a footer strip holding the tools, the send shortcut, a counter and the
 * actions, in one box that takes the focus ring as a whole. A formatting row
 * (`toolbar`) may stand along the box's top, above the words it acts on.
 *
 * THE FOOTER IS DRAWN ONLY WITH SOMETHING IN IT. With no shortcut, counter or
 * actions there is no strip at all, and one holding only the shortcut's hint
 * goes on a phone, where the hint is not drawn, rather than stand there empty.
 * A composer that sends on Enter draws no hint: Enter is what every chat field
 * already does, and the send button beside the field says the rest.
 *
 * THE COUNTER IS DRAWN ONLY NEAR THE LIMIT, from [COMPOSER_COUNTER_AT] of
 * `maxLength`: a count under every short reply is noise, and a field that
 * stops taking text with no warning reads as a broken keyboard.
 *
 * THE BOX OWNS THE ONE FOCUS RING, by pointer and by keyboard; the field
 * inside never draws its own, so a click in the field never shows two rings.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value,
    onChange,
    onSubmit,
    submitOn = 'mod-enter',
    label,
    appearance = 'default',
    actions,
    tools,
    toolbar,
    trailing,
    attachments,
    attachmentsLabel = 'Attached to this message',
    disabledReason,
    disabled: disabledProp,
    placeholder,
    maxLength,
    className,
    rows,
    onKeyDown,
    'aria-describedby': describedBy,
    ...rest
  },
  ref,
) {
  const reasonId = useId();
  const disabled = Boolean(disabledProp) || disabledReason !== undefined;
  const inline = present(trailing);
  const near = maxLength !== undefined && value.length >= maxLength * COMPOSER_COUNTER_AT;
  const hasActions = present(actions) || present(tools);
  const hint = onSubmit !== undefined && submitOn === 'mod-enter';

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !onSubmit || disabled || event.key !== 'Enter') return;
    // An input method's Enter picks a word; it never sends what is half typed.
    if (isComposing(event)) return;
    const mod = event.metaKey || event.ctrlKey;
    const sends = submitOn === 'enter' ? !event.shiftKey || mod : mod;
    if (!sends) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div
      className={cx(
        'crewlet-composer',
        appearance === 'chat' && 'crewlet-composer--chat',
        inline && 'crewlet-composer--inline',
        disabled && 'is-disabled',
        className,
      )}
    >
      {present(toolbar) ? <div className="crewlet-composer__toolbar">{toolbar}</div> : null}
      {present(attachments) ? (
        <div role="group" aria-label={attachmentsLabel} className="crewlet-composer__attachments">
          {attachments}
        </div>
      ) : null}
      <div className="crewlet-composer__row">
        <Textarea
          ref={ref}
          className="crewlet-composer__field"
          aria-label={label}
          aria-describedby={disabledReason === undefined ? describedBy : cx(describedBy, reasonId)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={keyDown}
          maxLength={maxLength}
          rows={rows ?? (inline ? 1 : 3)}
          disabled={disabled}
          placeholder={disabledReason ?? placeholder}
          autoResize
          {...rest}
        />
        {inline ? <div className="crewlet-composer__trailing">{trailing}</div> : null}
      </div>
      {disabledReason === undefined ? null : <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden>}
      {hint || near || hasActions ? (
        <div className="crewlet-composer__footer" data-hint-only={(!near && !hasActions) || undefined}>
          {present(tools) ? <div className="crewlet-composer__tools">{tools}</div> : null}
          {hint ? (
            <span className="crewlet-composer__hint">
              <Kbd keys={['Mod', 'Enter']} subtle /> to send
            </span>
          ) : null}
          {near ? (
            <span className="crewlet-composer__counter" aria-live="polite">
              {`${value.length.toLocaleString()} / ${maxLength.toLocaleString()}`}
            </span>
          ) : null}
          <span className="crewlet-composer__spacer" />
          {actions}
        </div>
      ) : null}
    </div>
  );
});

function present(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false;
}
