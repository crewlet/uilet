import { useLayoutEffect, useRef, useState, type FocusEvent, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { RotateCcwGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { Button } from '../Button/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { IconButton } from '../IconButton/index.js';
import { GridHeadCell } from '../DataGrid/parts.js';
import { CopyStatus, copyGlyph } from '../Copyable/CopyButton.js';
import { useClipboard } from '../utils/useClipboard.js';
import { returnFocus } from '../utils/focusModality.js';

/** The words the four columns are named by, for assistive technology and the header row. */
export interface SettingsTableColumns {
  setting?: string | undefined;
  value?: string | undefined;
  source?: string | undefined;
  /** The row-end column of controls, which draws no word and is still read. */
  actions?: string | undefined;
}

export interface SettingsTableProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Draws the column heads, as every DataGrid does. On by default; off, the
   * names are still the table's column headers for assistive technology.
   */
  header?: boolean | undefined;
  /** The column names. Defaults to Setting, Value, Source and Actions. */
  columns?: SettingsTableColumns | undefined;
  children?: ReactNode;
}

const COLUMNS: Required<SettingsTableColumns> = {
  setting: 'Setting',
  value: 'Value',
  source: 'Source',
  actions: 'Actions',
};

const noSort = () => undefined;

/**
 * A table of settings: what each is called, the value in force, where that
 * value comes from, and the controls that change it at the row's end.
 *
 * DATAGRID'S ANATOMY, NOT A SECOND LOOK. The head, the rows, the cells, the
 * hairlines, the row height and the hover are DataGrid's own classes, so a
 * card of settings and a card of records read as one kind of table.
 *
 * ONE COLUMN GRID FOR EVERY TABLE ON A PAGE. The tracks are fractions of the
 * table's width (`--crewlet-settings-table-columns`) and the controls' track
 * is a fixed width, so cards of one width stacked down a page put every value,
 * every source and every pencil on one vertical line.
 *
 * A TABLE, BECAUSE IT IS ONE: announced with its column names, each row
 * headed by its setting's name.
 */
export function SettingsTable({ header = true, columns, className, children, ...rest }: SettingsTableProps) {
  const names = { ...COLUMNS, ...columns };
  return (
    <div {...rest} role="table" className={cx('crewlet-data-grid', 'crewlet-settings-table', className)}>
      <div
        role="row"
        className={cx(
          'crewlet-data-grid__head',
          'crewlet-settings-table__head',
          !header && 'crewlet-settings-table__head--hidden',
        )}
      >
        <GridHeadCell column={{ key: 'setting', header: names.setting }} sort={null} sortable={false} onSort={noSort} />
        <GridHeadCell column={{ key: 'value', header: names.value }} sort={null} sortable={false} onSort={noSort} />
        <GridHeadCell column={{ key: 'source', header: names.source }} sort={null} sortable={false} onSort={noSort} />
        <GridHeadCell
          column={{ key: 'actions', header: '', action: true, label: names.actions }}
          sort={null}
          sortable={false}
          onSort={noSort}
        />
      </div>
      <div role="rowgroup" className="crewlet-data-grid__body crewlet-settings-table__body">
        {children}
      </div>
    </div>
  );
}

/** Every string a row draws itself. */
export interface SettingsTableRowLabels {
  /** The reset control's name. */
  reset: string;
  /** The question the reset asks first, with the default where the row names one. */
  confirm: (defaultLabel: ReactNode) => ReactNode;
  /** The confirmation's button. */
  confirmReset: string;
  cancel: string;
}

export const SETTINGS_TABLE_ROW_LABELS: SettingsTableRowLabels = {
  reset: 'Reset to default',
  confirm: (defaultLabel) => (defaultLabel === undefined || defaultLabel === null ? 'Reset to the default?' : <>Reset to {defaultLabel}?</>),
  confirmReset: 'Reset',
  cancel: 'Cancel',
};

export interface SettingsTableRowProps extends HTMLAttributes<HTMLDivElement> {
  /** What the setting is called, in a reader's words. */
  label: ReactNode;
  /**
   * The setting's address in the document it is written in
   * (`turn_engine.max_iterations`). Not drawn as words: a copy control after
   * the name shows it on hover and focus and puts it on the clipboard.
   */
  settingKey?: string | undefined;
  /** The value in force, in its own unit. Drawn in tabular figures. */
  children?: ReactNode;
  /** Where the value comes from: "Default", "Changed from 10". */
  source?: ReactNode;
  /** The value differs from its default: the source carries a mark. */
  changed?: boolean | undefined;
  /** The controls at the row's end: the pencil that opens the setting's editor. */
  actions?: ReactNode;
  /**
   * Puts the setting back to its default. Offered as a control before the
   * actions while `changed`, and called only once a short inline question
   * ("Reset to 10?") is answered.
   */
  onReset?: (() => void) | undefined;
  /** The default, in the value column's words, for that question. */
  defaultLabel?: ReactNode;
  /** Why this reader may not reset it: the control is drawn held with the reason, never hidden. */
  resetHeld?: string | undefined;
  labels?: Partial<SettingsTableRowLabels> | undefined;
}

/** One setting: its name (and key), its value, its source and its controls. */
export function SettingsTableRow({
  label,
  settingKey,
  source,
  changed = false,
  actions,
  onReset,
  defaultLabel,
  resetHeld,
  labels: overrides,
  className,
  children,
  ...rest
}: SettingsTableRowProps) {
  const labels = { ...SETTINGS_TABLE_ROW_LABELS, ...overrides };
  const offered = changed && onReset !== undefined;
  const [asking, setAsking] = useState(false);
  const confirming = asking && offered;
  const resetButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const actionsCell = useRef<HTMLDivElement>(null);
  // Where focus goes once the question closes, or once the reset control it was on goes.
  const settleFocus = useRef(false);
  const resetHeldFocus = useRef(false);

  useLayoutEffect(() => {
    if (confirming) {
      confirmButton.current?.focus();
      return;
    }
    if (!settleFocus.current && !(resetHeldFocus.current && !offered)) return;
    settleFocus.current = false;
    resetHeldFocus.current = false;
    returnFocus(resetButton.current ?? actionsCell.current?.querySelector<HTMLElement>('button') ?? null);
  }, [confirming, offered]);

  const close = (reset: boolean) => {
    settleFocus.current = true;
    setAsking(false);
    if (reset) onReset?.();
  };

  // THE QUESTION GOES with Escape, or as focus leaves it.
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close(false);
  };
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setAsking(false);
  };

  return (
    <div
      {...rest}
      role="row"
      data-changed={changed ? '' : undefined}
      data-confirming={confirming ? '' : undefined}
      className={cx('crewlet-data-grid__row', 'crewlet-settings-table__row', className)}
    >
      <div role="rowheader" className="crewlet-data-grid__cell crewlet-settings-table__setting">
        <span className="crewlet-settings-table__label">{label}</span>
        {settingKey === undefined ? null : <SettingKey settingKey={settingKey} />}
      </div>
      <div role="cell" className="crewlet-data-grid__cell crewlet-settings-table__value">
        {children}
      </div>
      {confirming ? (
        // The question's own keys and focus: Escape answers no, and leaving it puts it away.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="cell"
          className="crewlet-data-grid__cell crewlet-settings-table__confirm"
          onKeyDown={keys}
          onBlur={leave}
        >
          <span className="crewlet-settings-table__question">{labels.confirm(defaultLabel)}</span>
          <Button type="button" size="small" variant="ghost" onClick={() => close(false)}>
            {labels.cancel}
          </Button>
          <Button ref={confirmButton} type="button" size="small" variant="secondary" onClick={() => close(true)}>
            {labels.confirmReset}
          </Button>
        </div>
      ) : (
        <>
          <div
            role="cell"
            className={cx(
              'crewlet-data-grid__cell',
              'crewlet-settings-table__source',
              changed && 'crewlet-settings-table__source--changed',
            )}
          >
            {changed ? <StatusDot tone="brand" /> : null}
            {source}
          </div>
          <div
            ref={actionsCell}
            role="cell"
            className="crewlet-data-grid__cell crewlet-data-grid__cell--action crewlet-settings-table__actions"
          >
            {offered ? (
              <IconButton
                ref={resetButton}
                size="sm"
                variant="ghost"
                icon={<RotateCcwGlyph />}
                label={labels.reset}
                tooltip
                disabledReason={resetHeld}
                onFocus={() => {
                  resetHeldFocus.current = true;
                }}
                onBlur={() => {
                  resetHeldFocus.current = false;
                }}
                onClick={() => {
                  if (resetHeld === undefined) setAsking(true);
                }}
              />
            ) : null}
            {actions}
          </div>
        </>
      )}
    </div>
  );
}

SettingsTable.Row = SettingsTableRow;

/**
 * A setting's key, behind the control that copies it: the tooltip shows the
 * key, the control's name says it, and the copy says whether it landed.
 */
function SettingKey({ settingKey }: { settingKey: string }) {
  const { state, attempt, copy } = useClipboard({ failedResetMs: null });
  return (
    <span className="crewlet-settings-table__key" data-copy={state}>
      <IconButton
        size="sm"
        variant="ghost"
        icon={copyGlyph(state)}
        label={`Copy the setting's key, ${settingKey}`}
        tooltip={settingKey}
        onClick={() => {
          void copy(settingKey);
        }}
      />
      <CopyStatus
        state={state}
        attempt={attempt}
        copiedMessage={`${settingKey} copied to the clipboard`}
        failedMessage="the browser refused the clipboard"
      />
    </span>
  );
}
