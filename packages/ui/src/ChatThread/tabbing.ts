import { useCallback, useEffect, useRef, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { CHAT_MESSAGE_CLASS } from '../ChatMessage/ChatMessage.js';

/**
 * A TRANSCRIPT IS ONE STOP IN THE TAB ORDER, not one per control in every
 * message. Tab into the log lands on a message row (the one last focused, if
 * it is in view, or the newest in view), the arrow keys walk the rows
 * (ChatMessage), Tab walks the focused row's own controls, and Tab past the
 * last of them leaves the row for the next stop that is not inside another
 * message: a day's pill, a control under the list, or the box below it.
 * Shift+Tab mirrors it. Controls between rows (a day's pill, Older messages)
 * stay stops of their own.
 */

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';
const ROW = `.${CHAT_MESSAGE_CLASS}`;

/** What Tab can land on inside `scope`, in document order. */
function tabbables(scope: ParentNode): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.tabIndex < 0 || el.matches(':disabled') || el.closest('[inert], [hidden]')) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/** The row `el` is in (or is), when that row belongs to this log. */
function rowOf(el: Element, log: HTMLElement): HTMLElement | null {
  const row = el.closest<HTMLElement>(ROW);
  return row && log.contains(row) ? row : null;
}

/** The next stop from `row` outward, skipping every control inside another row and the log itself. */
function stopBeside(row: HTMLElement, log: HTMLElement, backward: boolean): HTMLElement | null {
  const all = tabbables(row.ownerDocument);
  const mine = new Set(tabbables(row));
  const after = (el: HTMLElement) => row.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
  const candidates = backward
    ? all.filter((el) => !after(el) && !mine.has(el) && el !== row).reverse()
    : all.filter((el) => after(el) && !mine.has(el));
  return candidates.find((el) => el !== log && !rowOf(el, log)) ?? null;
}

/** The row Tab lands on: the last one focused if it is still in view, else the newest in view. */
function landing(log: HTMLElement, last: HTMLElement | null): HTMLElement | null {
  const rows = [...log.querySelectorAll<HTMLElement>(ROW)];
  if (rows.length === 0) return null;
  const view = log.getBoundingClientRect();
  const shown = (row: HTMLElement) => {
    const box = row.getBoundingClientRect();
    return box.bottom > view.top && box.top < view.bottom;
  };
  if (last && last.isConnected && log.contains(last) && shown(last)) return last;
  return rows.filter(shown).at(-1) ?? rows.at(-1)!;
}

/** The handlers a log's root takes, for its scroller `log`. */
export function useLogTabbing(log: RefObject<HTMLElement | null>) {
  const last = useRef<HTMLElement | null>(null);
  // Whether the focus now moving was moved by Tab: a click, a jump to a
  // message and a layer handing focus back are left where they land.
  const tabbing = useRef(false);
  useEffect(() => {
    const down = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Tab') tabbing.current = true;
    };
    const up = () => {
      tabbing.current = false;
    };
    document.addEventListener('keydown', down, true);
    document.addEventListener('keyup', up, true);
    document.addEventListener('pointerdown', up, true);
    return () => {
      document.removeEventListener('keydown', down, true);
      document.removeEventListener('keyup', up, true);
      document.removeEventListener('pointerdown', up, true);
    };
  }, []);

  const onKeyDownCapture = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const scroller = log.current;
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented || !scroller) return;
      const target = event.target as HTMLElement;
      let next: HTMLElement | null;
      if (target === scroller) {
        if (event.shiftKey) return;
        next = landing(scroller, last.current);
      } else {
        const row = rowOf(target, scroller);
        if (!row) return;
        const inside = tabbables(row).filter((el) => el !== row);
        const at = target === row ? -1 : inside.indexOf(target);
        if (event.shiftKey) next = at > 0 ? inside[at - 1]! : at === 0 ? row : stopBeside(row, scroller, true);
        else next = at + 1 < inside.length ? inside[at + 1]! : stopBeside(row, scroller, false);
      }
      if (!next) return;
      event.preventDefault();
      next.focus();
    },
    [log],
  );

  const onFocusCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const scroller = log.current;
      if (!scroller) return;
      const target = event.target as HTMLElement;
      const row = rowOf(target, scroller);
      if (row && target === row) last.current = row;
      const from = event.relatedTarget as Node | null;
      // Tab arriving from outside the log, onto the log itself or into a
      // row's controls (Shift+Tab from the box below lands on the last one).
      if (!tabbing.current || (from && event.currentTarget.contains(from))) return;
      if (target !== scroller && !row) return;
      const to = landing(scroller, last.current);
      if (to && to !== target) to.focus();
    },
    [log],
  );

  return { onKeyDownCapture, onFocusCapture };
}
