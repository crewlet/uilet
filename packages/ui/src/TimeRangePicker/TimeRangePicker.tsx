/**
 * The windows a screen offers, as one row of choices, and a window of the
 * reader's own behind Custom.
 *
 * # Beside `TimeWindowPicker`, not instead of it
 *
 * Both choose a window of time; they are two shapes of that choice, and the
 * shape is the screen's. This one is INLINE: every window the screen can
 * answer is a segment in the toolbar, one press away and always in view,
 * which is right for a screen whose reader moves between "1h" and "7d" all
 * day (a live strip, a spend chart, an event log). `TimeWindowPicker` is a
 * TRIGGER that opens a panel of presets, a custom duration and a calendar,
 * which is right where the window is set once and the toolbar has no room.
 *
 * Their values differ for the same reason: this one never interprets a
 * window. The screen's own vocabulary is its options (`1h`, `today`, `7d`,
 * whatever the screen calls them), and a custom window is handed back as the
 * two strings the reader typed, for the screen to read on its own clock: an
 * operator's company day starts at midnight in the company's zone, which no
 * shared value model can know. `TimeWindowPicker` resolves its own value on
 * the reader's clock or UTC.
 *
 * # What it guarantees
 *
 * The options are drawn in the order given, so two screens offering
 * overlapping sets read left to right the same way. The custom window's
 * tooltip carries the chosen interval rather than its label, since two
 * timestamps do not fit in a segment and a segment whose width changed with
 * its value would reflow the toolbar every time. The dialog is prefilled with
 * the window on screen, because a reader opening it almost always wants to
 * move one edge. Each way the two fields can be wrong is its own sentence,
 * and Apply is the form's submit button, so Enter in either field applies.
 */

import { useState, type CSSProperties } from 'react';
import { ClockGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import { FormField, Input } from '../Input/index.js';
import { Modal } from '../Modal/index.js';
import { SegmentedControl, type SegmentedOption } from '../SegmentedControl/index.js';

/** The value that stands for a window of the reader's own. An option may not use it. */
export const TIME_RANGE_CUSTOM = 'custom';
export type TimeRangeCustomValue = typeof TIME_RANGE_CUSTOM;

/** One window the screen offers. */
export interface TimeRangeOption<V extends string> {
  /** The screen's own name for it: `1h`, `today`, `7d`. */
  value: V;
  /** What the segment says: "1h", "Today". */
  label: string;
  /** What it means, as its tooltip: "The last hour". */
  title?: string | undefined;
}

/**
 * How a custom window is named.
 *
 * - `instants`: two moments to the minute, `YYYY-MM-DDTHH:MM`; the end comes
 *   after the start.
 * - `days`: two whole days, `YYYY-MM-DD`, both inclusive; the last is on or
 *   after the first. For a screen whose answer has no unit smaller than a
 *   day, where minutes would offer a precision the answer cannot have.
 */
export type TimeRangeCustomMode = 'instants' | 'days';

export interface TimeRangeCustom {
  mode: TimeRangeCustomMode;
  /**
   * The Custom segment's tooltip: the window chosen, while one is ("Apr 3 to
   * Apr 9"), or what pressing it does.
   */
  title: string;
  /** The first field's value when the dialog opens: the start of the window on screen. */
  start: string;
  /** The second field's: its end. */
  end: string;
  /**
   * The sentence under the first field, which both fields are measured in:
   * "In your time zone.", "Company days, in Europe/Berlin."
   */
  helper?: string | undefined;
  /**
   * A check of the screen's own, run once both fields are well formed and in
   * order: the window as the screen's clock reads it. A sentence refuses it;
   * nothing (or an empty string) accepts it.
   */
  validate?: ((start: string, end: string) => string | undefined) | undefined;
  /** The two fields, as typed, once the window is accepted. */
  onApply: (start: string, end: string) => void;
}

/** Every string the picker renders on its own. */
export interface TimeRangePickerLabels {
  custom: string;
  dialogTitle: string;
  start: string;
  end: string;
  firstDay: string;
  lastDay: string;
  cancel: string;
  apply: string;
  startNotInstant: string;
  endNotInstant: string;
  endNotAfterStart: string;
  firstNotDay: string;
  lastNotDay: string;
  lastBeforeFirst: string;
}

export const TIME_RANGE_PICKER_LABELS: TimeRangePickerLabels = {
  custom: 'Custom',
  dialogTitle: 'Custom window',
  start: 'From',
  end: 'To',
  firstDay: 'First day',
  lastDay: 'Last day',
  cancel: 'Cancel',
  apply: 'Apply',
  startNotInstant: 'The start is not a date and time.',
  endNotInstant: 'The end is not a date and time.',
  endNotAfterStart: 'The end must be after the start.',
  firstNotDay: 'The first day is not a date.',
  lastNotDay: 'The last day is not a date.',
  lastBeforeFirst: 'The last day must be on or after the first.',
};

export interface TimeRangePickerProps<V extends string> {
  /** The windows this screen can answer, in the order a reader reads them. */
  options: readonly TimeRangeOption<V>[];
  /** The window on screen: one of the options, or `TIME_RANGE_CUSTOM` for a window of the reader's own. */
  value: V | TimeRangeCustomValue;
  /** One of the options was chosen. */
  onChange: (value: V) => void;
  /** Offers a window of the reader's own, behind a Custom segment. */
  custom?: TimeRangeCustom | undefined;
  /** Names the group. */
  label?: string | undefined;
  labels?: Partial<TimeRangePickerLabels> | undefined;
  className?: string | undefined;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Whether a `YYYY-MM-DD` names a day the calendar has (no February 30th). */
function realDay(year: string, month: string, day: string): boolean {
  const at = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return at.getUTCFullYear() === Number(year) && at.getUTCMonth() === Number(month) - 1 && at.getUTCDate() === Number(day);
}

/** A field's value as a sortable key, or null where it is not the shape the mode asks for. */
export function timeRangeFieldKey(value: string, mode: TimeRangeCustomMode): string | null {
  if (mode === 'days') {
    const day = DAY.exec(value);
    return day && realDay(day[1]!, day[2]!, day[3]!) ? value : null;
  }
  const instant = INSTANT.exec(value);
  if (!instant || !realDay(instant[1]!, instant[2]!, instant[3]!)) return null;
  if (Number(instant[4]) > 23 || Number(instant[5]) > 59 || Number(instant[6] ?? 0) > 59) return null;
  // Seconds made explicit, so "10:00" and "10:00:00" compare as one moment.
  return instant[6] === undefined ? `${value}:00` : value;
}

/**
 * Why a custom window is refused, or an empty string where it is accepted.
 * Each way the fields can be wrong is its own sentence: "Invalid" over a form
 * of two fields tells a reader to check both.
 */
export function timeRangeProblem(
  start: string,
  end: string,
  mode: TimeRangeCustomMode,
  labels: TimeRangePickerLabels = TIME_RANGE_PICKER_LABELS,
  validate?: (start: string, end: string) => string | undefined,
): string {
  const from = timeRangeFieldKey(start, mode);
  const to = timeRangeFieldKey(end, mode);
  if (mode === 'days') {
    if (from === null) return labels.firstNotDay;
    if (to === null) return labels.lastNotDay;
    if (to < from) return labels.lastBeforeFirst;
  } else {
    if (from === null) return labels.startNotInstant;
    if (to === null) return labels.endNotInstant;
    if (to <= from) return labels.endNotAfterStart;
  }
  return validate?.(start, end) ?? '';
}

export function TimeRangePicker<V extends string>({
  options,
  value,
  onChange,
  custom,
  label = 'Time range',
  labels,
  className,
}: TimeRangePickerProps<V>) {
  const words = { ...TIME_RANGE_PICKER_LABELS, ...labels };
  const [editing, setEditing] = useState(false);
  const segments: SegmentedOption<V | TimeRangeCustomValue>[] = options.map((option) => ({
    value: option.value,
    label: option.label,
    ...(option.title === undefined ? null : { title: option.title }),
  }));
  if (custom) segments.push({ value: TIME_RANGE_CUSTOM, label: words.custom, title: custom.title });

  return (
    <>
      <SegmentedControl<V | TimeRangeCustomValue>
        semantics="radio"
        activate="manual"
        label={label}
        value={value}
        className={className}
        onValueChange={(next) => (next === TIME_RANGE_CUSTOM ? setEditing(true) : onChange(next as V))}
        options={segments}
      />
      {editing && custom ? (
        <CustomWindow
          custom={custom}
          labels={words}
          onClose={() => setEditing(false)}
          onApply={(start, end) => {
            custom.onApply(start, end);
            setEditing(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Two fields, prefilled with the window on screen, in a dialog whose Apply is its submit button. */
function CustomWindow({
  custom,
  labels,
  onClose,
  onApply,
}: {
  custom: TimeRangeCustom;
  labels: TimeRangePickerLabels;
  onClose: () => void;
  onApply: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(custom.start);
  const [end, setEnd] = useState(custom.end);
  const days = custom.mode === 'days';
  const problem = timeRangeProblem(start, end, custom.mode, labels, custom.validate);
  const type = days ? 'date' : 'datetime-local';

  return (
    <Modal
      open
      title={labels.dialogTitle}
      icon={<ClockGlyph size="md" />}
      // Two date fields read in one glance are narrower than the smallest
      // dialog step, so the width is the one the package publishes for it.
      style={{ '--crewlet-modal-width': '420px' } as CSSProperties}
      stackBody
      onClose={onClose}
      onSubmit={() => {
        if (problem === '') onApply(start, end);
      }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button variant="primary" type="submit" disabled={problem !== ''}>
            {labels.apply}
          </Button>
        </>
      }
    >
      {/* The helper belongs to BOTH fields and is said once, under the
          first: it is what both are measured in. */}
      <FormField label={days ? labels.firstDay : labels.start} helper={custom.helper}>
        {(field) => (
          <Input
            id={field.id}
            type={type}
            width="full"
            value={start}
            aria-describedby={field.describedBy}
            onChange={(event) => setStart(event.target.value)}
          />
        )}
      </FormField>
      <FormField label={days ? labels.lastDay : labels.end}>
        {(field) => (
          <Input
            id={field.id}
            type={type}
            width="full"
            value={end}
            aria-describedby={field.describedBy}
            onChange={(event) => setEnd(event.target.value)}
          />
        )}
      </FormField>
      {problem ? (
        // An alert: it is the sentence standing between the reader and a
        // disabled Apply, so it reaches them where they are typing.
        <Callout variant="danger" role="alert">
          {problem}
        </Callout>
      ) : null}
    </Modal>
  );
}
