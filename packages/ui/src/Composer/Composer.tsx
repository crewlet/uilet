import { forwardRef, useId, useRef, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { useDictationSlot } from '../Dictation/slot.js';
import type { DictationSource } from '../Dictation/types.js';
import { Textarea } from '../Input/index.js';
import { SendKeysHint, useSendOnEnter, type SendKeysLabels } from '../SendKeys/index.js';
import { useComposedRef } from '../utils/composedRef.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** The share of `maxLength` at which the counter appears. */
export const COMPOSER_COUNTER_AT = 0.8;

/** The box's look: `default`, a form's field, or `chat`, a conversation's message box. */
export type ComposerAppearance = 'default' | 'chat';

export interface ComposerProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onSubmit' | 'children'> {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called on the send key (`isSendPress`): never while disabled or
   * `canSubmit` is false, mid composition, or on a touch keyboard's Return.
   */
  onSubmit?: (() => void) | undefined;
  /**
   * Whether a send would be taken now; when not, the send key does nothing.
   * By default, whether the field holds more than blank space.
   */
  canSubmit?: boolean | undefined;
  /**
   * Draws the send hint in the footer. True by default; the field's
   * description names the keys either way.
   */
  sendHint?: boolean | undefined;
  /** The send hint's words, for a box whose Enter saves rather than sends. */
  sendLabels?: SendKeysLabels | undefined;
  /** Names the field for a screen reader, since it carries no visible label. */
  label: string;
  /**
   * `chat` is a conversation's message box, on the transcript's own type and
   * ground (the `--crewlet-chat-*` scale).
   */
  appearance?: ComposerAppearance | undefined;
  /** The footer's controls, at its end: Cancel and Submit. */
  actions?: ReactNode;
  /** Tools at the footer's start, before the actions (attach, emoji, mention). */
  tools?: ReactNode;
  /**
   * A formatting `Toolbar` along the box's top that acts on the words below.
   * Pass a `Toolbar` with its own name; the row is laid out, not labelled.
   */
  toolbar?: ReactNode;
  /**
   * A control at the end of the field's row (`SendButton`). With one, the
   * field starts at one line and grows to six before it scrolls.
   */
  trailing?: ReactNode;
  /**
   * What travels with the message (a row of `Tag`s), drawn above the field as
   * a group named by `attachmentsLabel`, before the field in reading order.
   */
  attachments?: ReactNode;
  /** Names the attachments group. "Attached to this message" by default. */
  attachmentsLabel?: string | undefined;
  /**
   * Why the composer cannot send right now, in a few words. Shown as the
   * placeholder and the field's description; keeps the draft. Implies `disabled`.
   */
  disabledReason?: string | undefined;
  /**
   * Turns on dictation: a mic and a microphone menu just before the send
   * control. Spoken words show at the caret as provisional text, and Accept
   * (or Enter) writes them into the draft with one `onChange`; Escape cancels.
   */
  dictation?: DictationSource | undefined;
  className?: string | undefined;
}

/**
 * A message written in place: a field that grows with its text and a footer
 * of tools, send hint, counter and actions, in one box that owns the focus ring.
 * The footer is drawn only with something in it; the counter only near the limit.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value,
    onChange,
    onSubmit,
    canSubmit,
    sendHint = true,
    sendLabels,
    label,
    appearance = 'default',
    actions,
    tools,
    toolbar,
    trailing,
    attachments,
    attachmentsLabel = 'Attached to this message',
    disabledReason,
    dictation,
    disabled: disabledProp,
    placeholder,
    maxLength,
    className,
    rows,
    onKeyDown,
    role,
    'aria-describedby': describedBy,
    ...rest
  },
  ref,
) {
  const reasonId = useId();
  const dictatingId = useId();
  const disabled = Boolean(disabledProp) || disabledReason !== undefined;
  const inline = present(trailing);
  const near = maxLength !== undefined && value.length >= maxLength * COMPOSER_COUNTER_AT;
  const field = useRef<HTMLTextAreaElement | null>(null);
  const fieldRef = useComposedRef(ref, field);
  const dictate = useDictationSlot(dictation, {
    label,
    field,
    value,
    onChange,
    heldReason: disabled ? (disabledReason ?? '') : undefined,
  });
  const live = dictate?.live ?? false;
  const active = dictate?.active ?? false;
  const hasActions = present(actions) || present(tools) || (dictate !== null && !inline);
  // A disabled composer names no send keys: there is no send for them to make.
  const send = useSendOnEnter({
    onSend: disabled ? undefined : onSubmit,
    canSend: canSubmit ?? value.trim() !== '',
    labels: sendLabels,
  });
  // While dictation starts or runs, Enter is its own: the send keys are neither drawn nor described.
  const hint = sendHint && send.describedBy !== undefined && !active;

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Dictation answers first, so its Enter and Escape never send or close a caller's editor.
    if (dictate?.keyDown(event)) return;
    onKeyDown?.(event);
    send.onKeyDown(event);
  };

  return (
    <div
      className={cx(
        'crewlet-composer',
        appearance === 'chat' && 'crewlet-composer--chat',
        inline && 'crewlet-composer--inline',
        value === '' && 'is-empty',
        disabled && 'is-disabled',
        live && 'is-dictating',
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
          ref={fieldRef}
          className="crewlet-composer__field"
          aria-label={label}
          role={role}
          // Said outright for the textbox a textarea is; a mention list is
          // pointed at with aria-autocomplete, never a combobox role.
          aria-multiline={role === undefined || role === 'textbox' ? true : undefined}
          aria-describedby={
            cx(describedBy, !active && send.describedBy, disabledReason === undefined ? undefined : reasonId, live && dictatingId) || undefined
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={keyDown}
          maxLength={maxLength}
          rows={rows ?? (inline ? 1 : 3)}
          disabled={disabled}
          placeholder={live ? '' : (disabledReason ?? placeholder)}
          autoResize
          {...rest}
          readOnly={active || rest.readOnly}
        />
        {dictate?.layer}
        {inline ? (
          <div className="crewlet-composer__trailing">
            {dictate?.controls}
            {live ? null : trailing}
          </div>
        ) : null}
      </div>
      {dictate?.note}
      {send.description}
      {disabledReason === undefined ? null : <VisuallyHidden id={reasonId}>{disabledReason}</VisuallyHidden>}
      {live ? <VisuallyHidden id={dictatingId}>{dictate?.describe}</VisuallyHidden> : null}
      {hint || near || hasActions ? (
        <div className="crewlet-composer__footer" data-hint-only={(!near && !hasActions) || undefined}>
          {present(tools) ? (
            <div className="crewlet-composer__tools" inert={live}>
              {tools}
            </div>
          ) : null}
          {hint ? <SendKeysHint className="crewlet-composer__hint" labels={sendLabels} aria-hidden /> : null}
          {near ? (
            <span className="crewlet-composer__counter" aria-live="polite">
              {`${value.length.toLocaleString()} / ${maxLength.toLocaleString()}`}
            </span>
          ) : null}
          <span className="crewlet-composer__spacer" />
          {inline ? null : dictate?.controls}
          {live && !inline ? null : actions}
        </div>
      ) : null}
    </div>
  );
});

function present(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false;
}
