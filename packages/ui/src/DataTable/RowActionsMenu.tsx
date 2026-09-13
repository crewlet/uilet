import { Fragment, type ReactNode } from 'react';
import { Popover } from '../Popover/Popover.js';
import type { DataTableRowAction } from './DataTable.js';

/*
 * RowActionsMenu, a DataTable-internal helper for the compact variant.
 * Renders a single kebab (⋮) trigger that opens a themed Popover listing
 * per-row actions. Falsy entries are filtered so callers can compose
 * actions conditionally without ternary noise.
 */
export interface RowActionsMenuProps {
  actions: Array<DataTableRowAction | null | undefined | false>;
  ariaLabel?: string;
}

export const RowActionsMenu = ({ actions, ariaLabel = 'Row actions' }: RowActionsMenuProps) => {
  const items = (actions || []).filter(
    (a): a is DataTableRowAction => !!a && a.visible !== false,
  );
  if (items.length === 0) return null;

  return (
    <Popover
      align="end"
      side="bottom"
      width="auto"
      className="crewlet-data-table__row-actions-popover"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={`crewlet-data-table__row-actions-trigger${open ? ' is-open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="material-symbols-outlined" aria-hidden>more_vert</span>
        </button>
      )}
    >
      {(close: () => void): ReactNode => (
        <ul className="crewlet-data-table__row-actions-list" role="menu">
          {items.map((action, i) => {
            const cls = [
              'crewlet-data-table__row-actions-item',
              action.variant && `crewlet-data-table__row-actions-item--${action.variant}`,
              action.disabled && 'is-disabled',
            ].filter(Boolean).join(' ');
            return (
              <Fragment key={i}>
                {action.divider === 'before' && (
                  <li className="crewlet-data-table__row-actions-divider" role="separator" />
                )}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={cls}
                    disabled={action.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (action.disabled) return;
                      action.onClick?.();
                      close();
                    }}
                  >
                    {action.icon && (
                      <span
                        className="material-symbols-outlined crewlet-data-table__row-actions-item-icon"
                        aria-hidden
                      >
                        {action.icon}
                      </span>
                    )}
                    <span className="crewlet-data-table__row-actions-item-text">
                      <span className="crewlet-data-table__row-actions-item-label">{action.label}</span>
                      {action.description && (
                        <span className="crewlet-data-table__row-actions-item-description">
                          {action.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
                {action.divider === 'after' && (
                  <li className="crewlet-data-table__row-actions-divider" role="separator" />
                )}
              </Fragment>
            );
          })}
        </ul>
      )}
    </Popover>
  );
};
