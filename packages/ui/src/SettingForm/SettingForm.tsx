import type { FormEvent, FormHTMLAttributes, ReactNode } from 'react';
import { Button } from '../Button/index.js';
import { FormField, type FormFieldRender } from '../Input/index.js';
import { cx } from '../utils/cx.js';

/** Every string the form draws itself. */
export interface SettingFormLabels {
  save: string;
  cancel: string;
}

export const SETTING_FORM_LABELS: SettingFormLabels = { save: 'Save', cancel: 'Cancel' };

export interface SettingFormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children' | 'aria-label'> {
  /** The setting's name, as the control's label. */
  label: ReactNode;
  /** The control's id, which the label names. */
  htmlFor?: string | undefined;
  /** Whose setting it is, above the field where the label alone does not say: a seat's name. */
  subject?: ReactNode;
  /**
   * The control: a `NumberField`, a `DurationField`, a choice or a text field.
   * As a function it is handed the ids to wire, as `FormField` hands them.
   */
  children: ((field: FormFieldRender) => ReactNode) | ReactNode;
  /** What the value may be, short: "1 to 100". Said on the line under the control. */
  hint?: ReactNode;
  /** Why what is typed cannot be saved, short: "At least 1." */
  error?: ReactNode;
  /** The save's outcome, between the field and the buttons: a warning, a refusal, a conflict. */
  status?: ReactNode;
  /** Save was asked for: the button, or Enter in the field. Not called while Save is held. */
  onSave: () => void;
  onCancel: () => void;
  /** A save is in flight: Save spins. */
  saving?: boolean | undefined;
  /** Why Save does nothing now: said on the button, which stays reachable. */
  saveHeld?: string | undefined;
  /** Save's word for this press: "Save anyway" once a warning asked for a second one. */
  saveLabel?: string | undefined;
  labels?: Partial<SettingFormLabels> | undefined;
}

/**
 * The panel that changes one setting: its name over the control, what the
 * value may be and why a typed one cannot be saved under it, the save's
 * outcome, then Cancel and Save.
 *
 * ONE VALUE, SO ENTER SAVES, from the field, as any one-field form does;
 * Escape is the panel's to close. Save is never a dead button: held, it says
 * why on hover and focus.
 *
 * THE CONTROL CARRIES THE DEFAULT (a placeholder, a "Default" chip or
 * option), so no sentence under the field has to explain it.
 */
export function SettingForm({
  label,
  htmlFor,
  subject,
  children,
  hint,
  error,
  status,
  onSave,
  onCancel,
  saving = false,
  saveHeld,
  saveLabel,
  labels: overrides,
  className,
  ...rest
}: SettingFormProps) {
  const labels = { ...SETTING_FORM_LABELS, ...overrides };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || saveHeld !== undefined) return;
    onSave();
  };
  return (
    <form {...rest} noValidate aria-busy={saving || undefined} className={cx('crewlet-setting-form', className)} onSubmit={submit}>
      {subject ? <p className="crewlet-setting-form__subject">{subject}</p> : null}
      <FormField htmlFor={htmlFor} label={label} helper={hint} error={error}>
        {children}
      </FormField>
      {status ? <div className="crewlet-setting-form__status">{status}</div> : null}
      <div className="crewlet-setting-form__actions">
        <Button type="button" size="small" variant="ghost" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button
          type="submit"
          size="small"
          variant="primary"
          loading={saving}
          disabledReason={saveHeld}
          tooltip={saveHeld !== undefined}
        >
          {saveLabel ?? labels.save}
        </Button>
      </div>
    </form>
  );
}
