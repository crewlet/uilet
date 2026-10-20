import { forwardRef, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Kbd } from '../Kbd/index.js';
import { Textarea } from '../Input/index.js';
import { cx } from '../utils/cx.js';

/** The share of `maxLength` at which the counter appears. */
export const COMPOSER_COUNTER_AT = 0.8;

export interface ComposerProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onSubmit' | 'children'> {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called on Command+Enter (Control+Enter elsewhere). With it, the footer
   * carries the shortcut's hint.
   */
  onSubmit?: (() => void) | undefined;
  /** Names the field for a screen reader, since it carries no visible label. */
  label: string;
  /** The footer's controls, at its end: Cancel and Submit. */
  actions?: ReactNode;
  className?: string | undefined;
}

/**
 * A message written in place: a borderless field that grows with its text,
 * and a footer strip holding the send shortcut, a counter and the actions, in
 * one box that takes the focus ring as a whole.
 *
 * THE FOOTER IS DRAWN ONLY WITH SOMETHING IN IT. With no shortcut, counter or
 * actions there is no strip at all, and one holding only the shortcut's hint
 * goes on a phone, where the hint is not drawn, rather than stand there empty.
 *
 * THE COUNTER IS DRAWN ONLY NEAR THE LIMIT, from [COMPOSER_COUNTER_AT] of
 * `maxLength`: a count under every short reply is noise, and a field that
 * stops taking text with no warning reads as a broken keyboard.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSubmit, label, actions, maxLength, className, rows = 3, onKeyDown, ...rest },
  ref,
) {
  const near = maxLength !== undefined && value.length >= maxLength * COMPOSER_COUNTER_AT;
  const hasActions = actions !== undefined && actions !== null && actions !== false;
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !onSubmit) return;
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };
  return (
    <div className={cx('crewlet-composer', className)}>
      <Textarea
        ref={ref}
        className="crewlet-composer__field"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={keyDown}
        maxLength={maxLength}
        rows={rows}
        autoResize
        {...rest}
      />
      {onSubmit || near || hasActions ? (
        <div className="crewlet-composer__footer" data-hint-only={(!near && !hasActions) || undefined}>
          {onSubmit ? (
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
