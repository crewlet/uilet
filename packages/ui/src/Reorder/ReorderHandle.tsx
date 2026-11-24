import { GripVerticalGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';
import type { ReorderHandleProps as HandleBinding } from './useReorder.js';

export interface ReorderHandleComponentProps extends HandleBinding {
  /**
   * Out of the tab order, for a row whose own keys move it (a grid row with Alt and
   * an arrow): the handle is then the pointer's only.
   */
  pointerOnly?: boolean | undefined;
  /** Held in place: drawn, not draggable. */
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/** The grip a `useReorder` or `useReorderLists` item is dragged by: spread `handleProps(key)` on it. */
export function ReorderHandle({ pointerOnly = false, disabled = false, className, ...binding }: ReorderHandleComponentProps) {
  const { 'aria-label': label, ...handle } = binding;
  return (
    <IconButton
      size="sm"
      variant="ghost"
      className={cx('crewlet-reorder-handle', className)}
      label={label}
      icon={<GripVerticalGlyph size="sm" />}
      {...(pointerOnly ? { tabIndex: -1 } : {})}
      {...(disabled ? { disabled: true } : handle)}
    />
  );
}
