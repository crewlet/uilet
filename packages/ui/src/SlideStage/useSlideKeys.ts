import { useEffect } from 'react';
import { isComposing } from '../Layer/index.js';

export interface SlideKeys {
  onNext: () => void;
  onPrevious: () => void;
  onFirst?: (() => void) | undefined;
  onLast?: (() => void) | undefined;
  /** Escape: leave the show. */
  onExit?: (() => void) | undefined;
  /** Listen only while the show is on. */
  enabled?: boolean | undefined;
}

/** Whether a key press belongs to a field the reader is typing in. */
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * The keys every presentation answers, the ones a clicker sends too: Right,
 * Down, Page Down, Space and Enter go forward; Left, Up, Page Up and Backspace
 * go back; Home and End go to the ends; Escape leaves.
 *
 * AT THE DOCUMENT, because a show has no field to focus and a clicker sends
 * its key wherever focus is. A key a field is typing, a composition is using,
 * or a nearer surface (a menu, a dialog) already handled is left alone, and
 * modified keys are the browser's.
 */
export function useSlideKeys({ onNext, onPrevious, onFirst, onLast, onExit, enabled = true }: SlideKeys): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isComposing(event) || typing(event.target)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const act: Record<string, (() => void) | undefined> = {
        ArrowRight: onNext,
        ArrowDown: onNext,
        PageDown: onNext,
        ' ': onNext,
        Enter: onNext,
        ArrowLeft: onPrevious,
        ArrowUp: onPrevious,
        PageUp: onPrevious,
        Backspace: onPrevious,
        Home: onFirst,
        End: onLast,
        Escape: onExit,
      };
      const fn = act[event.key];
      if (!fn) return;
      // A BUTTON IN FOCUS takes Enter and Space as its own press.
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      fn();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, onNext, onPrevious, onFirst, onLast, onExit]);
}
