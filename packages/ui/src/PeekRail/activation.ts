/**
 * Which clicks on a row mean "peek here" and which mean "open elsewhere".
 *
 * A ROW IS A REAL LINK EITHER WAY: its `href` is the object's page, so a
 * middle press and a modified press open a tab and the status bar says where
 * it goes. A plain primary press is intercepted and peeks instead, because the
 * list is where the reader is.
 *
 * ONE COPY, because two spellings of "which clicks mean elsewhere" is how one
 * of them comes to forget the middle button.
 */

import type { MouseEvent as ReactMouseEvent } from 'react';
import type { DataGridActivationEvent } from '../DataGrid/index.js';

/** Whether a press is a plain primary press, the one a row answers in place. */
export function isPlainPress(event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * A row's click, for a row that is an anchor: a plain press calls `open` and
 * prevents the navigation, and every way a reader opens a tab is left to the
 * browser. Undefined where there is nothing to open.
 */
export function peekClickHandler(open?: () => void): ((event: ReactMouseEvent) => void) | undefined {
  if (!open) return undefined;
  return (event) => {
    if (!isPlainPress(event)) return;
    event.preventDefault();
    open();
  };
}

/**
 * A `DataGrid` row's `onRowActivate`, wired to peek.
 *
 * A KEYBOARD ACTIVATION HAS NO BUTTON TO READ, so it opens unconditionally:
 * Enter on a row is the reader saying "this row" with nothing to say
 * "elsewhere" with. Read through `isPlainPress`, its missing button would read
 * as a press of another button and the keyboard path would open nothing.
 */
export function peekRowActivation<T>(open: (row: T) => void): (row: T, event: DataGridActivationEvent) => void {
  return (row, event) => {
    if (!('button' in event)) {
      open(row);
      return;
    }
    peekClickHandler(() => open(row))?.(event);
  };
}
