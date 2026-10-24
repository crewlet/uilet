import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { XGlyph } from '@crewlethq/icons/glyphs';
import { announce } from '../Announcer/index.js';
import { Button } from '../Button/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { cx } from '../utils/cx.js';
import { returnFocus } from '../utils/focusModality.js';

export interface SelectionBarLabels {
  /** The count, printed and said: "3 selected". */
  count: (count: number) => string;
  /** Said once the last pick is cleared, since the bar it was printed in goes. */
  cleared: string;
  /** The control that clears every pick. */
  clear: string;
  /** Names the bar: a toolbar is announced by its name. */
  label: string;
}

const LABELS: SelectionBarLabels = {
  count: (count) => `${count} selected`,
  cleared: 'Selection cleared',
  clear: 'Clear',
  label: 'Selection',
};

export interface SelectionBarProps {
  /** How many items are picked. At zero the bar draws nothing. */
  count: number;
  /** Clears every pick. */
  onClear: () => void;
  /**
   * The bulk actions, as `Button`s ("Move to…"). An action only some of the
   * picks allow is drawn with `disabledReason` ("You own 2 of 3"), never
   * applied to the part it can be applied to without saying so.
   */
  children?: ReactNode;
  /**
   * Where focus goes once Clear has emptied the selection and the bar has
   * gone with it: the gallery's Select toggle, or the list. Without it focus
   * would fall to the page body with the button that held it.
   */
  returnFocusRef?: RefObject<HTMLElement | null> | undefined;
  className?: string | undefined;
  labels?: Partial<SelectionBarLabels> | undefined;
}

/**
 * What is picked, and what can be done to all of it: the count, the bulk
 * actions, and Clear.
 *
 * STICKY OVER THE LIST, DOCKED TO THE FOOT ON A PHONE. Over a long gallery the
 * bar stays under the top of the scroller (`--crewlet-selection-bar-top` for a
 * scroller that carries a bar of its own); under the phone breakpoint it
 * floats at the bottom edge, where a thumb reaches it and the list it acts on
 * stays in view; the host keeps the list's last row clear of it.
 *
 * THE COUNT IS SAID, POLITELY, AS IT CHANGES, through the shell's one polite
 * region (`Announcer`): ticking a box changes nothing a screen reader reads on
 * its own, and the bar appearing is not news a reader hears unless something
 * says it. Clearing the last pick says so, since the bar goes with it.
 *
 * ONE STOP IN THE TAB ORDER: the actions and Clear are a `Toolbar`, walked
 * with the arrows.
 */
export function SelectionBar({ count, onClear, children, returnFocusRef, className, labels }: SelectionBarProps) {
  const text = { ...LABELS, ...labels };
  const said = useRef(0);
  const countWords = text.count(count);
  const clearedWords = text.cleared;

  useEffect(() => {
    if (count === said.current) return;
    const before = said.current;
    said.current = count;
    if (count > 0) announce(countWords);
    else if (before > 0) announce(clearedWords);
  }, [count, countWords, clearedWords]);

  if (count <= 0) return null;
  return (
    <Toolbar label={text.label} className={cx('crewlet-selection-bar', className)}>
      <span className="crewlet-selection-bar__count">{countWords}</span>
      {children ? <span className="crewlet-selection-bar__actions">{children}</span> : null}
      <span className="crewlet-selection-bar__spacer" aria-hidden="true" />
      <Button
        variant="ghost"
        size="small"
        leadingIcon={<XGlyph size="sm" />}
        onClick={() => {
          onClear();
          returnFocus(returnFocusRef?.current);
        }}
      >
        {text.clear}
      </Button>
    </Toolbar>
  );
}
