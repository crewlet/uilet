import { Menu, type MenuEntry } from '../Menu/index.js';
import type { DataTableRowAction } from './DataTable.js';

/*
 * RowActionsMenu: the kebab at the end of a row, as an ADAPTER over Menu.
 *
 * It used to be a second menu, hand-built inside a Popover: its own list, its
 * own item buttons, its own separators, and a `role="menu"` with no keyboard
 * model behind it, so the arrows did nothing, Home and End did nothing, and
 * the first item took no focus when it opened. None of that is a table's
 * business. What IS the table's business is the shape a caller describes a
 * row's actions in, and that is all this file does now: it translates
 * `DataTableRowAction` into the entries Menu draws, so there is exactly one
 * menu in the package and one place its keys are decided.
 */
export interface RowActionsMenuProps {
  actions: Array<DataTableRowAction | null | undefined | false>;
  /** The trigger's accessible name. */
  label?: string;
}

/** One action as a menu entry, with the dividers it asks for around it. */
function entriesFor(action: DataTableRowAction, index: number): MenuEntry[] {
  const key = `${index}:${action.label}`;
  const item: MenuEntry = {
    key,
    label: action.label,
    icon: action.icon,
    // An action with nothing to do still draws, because `disabled` is what
    // says why it cannot be pressed; an empty handler is never called.
    onSelect: action.onClick ?? (() => {}),
    disabled: action.disabled,
    danger: action.danger,
    description: action.description,
  };
  return [
    ...(action.divider === 'before' ? [{ kind: 'separator' as const, key: `${key}:before` }] : []),
    item,
    ...(action.divider === 'after' ? [{ kind: 'separator' as const, key: `${key}:after` }] : []),
  ];
}

export const RowActionsMenu = ({ actions, label = 'Row actions' }: RowActionsMenuProps) => {
  const items = (actions || [])
    .filter((action): action is DataTableRowAction => !!action && action.visible !== false)
    .flatMap(entriesFor);
  if (items.length === 0) return null;

  return <Menu label={label} items={items} align="end" className="crewlet-data-table__row-actions" />;
};
