import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * Whether the reader is on an Apple platform, where Command is the command key.
 *
 * `userAgentData.platform` first, because `navigator.platform` is deprecated
 * and frozen on several browsers, and the user agent string is the last
 * resort rather than the first.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const hinted = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  return /mac|iphone|ipad|ipod/i.test(hinted || navigator.platform || navigator.userAgent);
}

/** How each named key is drawn, and how it is read, on each platform. */
const NAMED: Record<string, { apple: [string, string]; other: [string, string] }> = {
  Mod: { apple: ['⌘', 'Command'], other: ['Ctrl', 'Control'] },
  Ctrl: { apple: ['⌃', 'Control'], other: ['Ctrl', 'Control'] },
  Alt: { apple: ['⌥', 'Option'], other: ['Alt', 'Alt'] },
  Shift: { apple: ['⇧', 'Shift'], other: ['Shift', 'Shift'] },
  Enter: { apple: ['↵', 'Return'], other: ['Enter', 'Enter'] },
  Escape: { apple: ['Esc', 'Escape'], other: ['Esc', 'Escape'] },
  Backspace: { apple: ['⌫', 'Delete'], other: ['Backspace', 'Backspace'] },
  Delete: { apple: ['⌦', 'Forward delete'], other: ['Del', 'Delete'] },
  Tab: { apple: ['⇥', 'Tab'], other: ['Tab', 'Tab'] },
  Space: { apple: ['Space', 'Space'], other: ['Space', 'Space'] },
  ArrowUp: { apple: ['↑', 'Up arrow'], other: ['↑', 'Up arrow'] },
  ArrowDown: { apple: ['↓', 'Down arrow'], other: ['↓', 'Down arrow'] },
  ArrowLeft: { apple: ['←', 'Left arrow'], other: ['←', 'Left arrow'] },
  ArrowRight: { apple: ['→', 'Right arrow'], other: ['→', 'Right arrow'] },
  ContextMenu: { apple: ['Menu', 'Menu key'], other: ['Menu', 'Menu key'] },
  '+': { apple: ['+', 'Plus'], other: ['+', 'Plus'] },
  '-': { apple: ['-', 'Minus'], other: ['-', 'Minus'] },
  '=': { apple: ['=', 'Equals'], other: ['=', 'Equals'] },
};

/** How one key is drawn and how it is read. */
export function keyGlyph(key: string, apple: boolean): { glyph: string; spoken: string } {
  const named = NAMED[key];
  if (named) {
    const [glyph, spoken] = apple ? named.apple : named.other;
    return { glyph, spoken };
  }
  // A letter is printed in capitals on every keyboard.
  const shown = [...key].length === 1 ? key.toLocaleUpperCase() : key;
  return { glyph: shown, spoken: shown };
}

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** Draws the keycap quieter, for a hint that sits inside a field. */
  subtle?: boolean | undefined;
  /**
   * A shortcut as the keys it is pressed with, in order: `['Mod', 'Shift',
   * 'z']`. `Mod` is the platform's command key, so one hint is right on both.
   *
   * The chord is drawn as ONE cap, in the platform's own notation: `⌘⇧Z` on
   * an Apple platform, where the menus print a chord's symbols run together,
   * and `Ctrl+Shift+Z` everywhere else, where they print them joined by a
   * plus. The cap is drawn hidden and ONE SENTENCE is read instead: "Command
   * plus Shift plus Z". A screen reader given the glyphs reads "place of
   * interest sign Z", which names nothing anybody presses.
   */
  keys?: readonly string[] | undefined;
  /** Overrides platform detection, for a suite or a screenshot. */
  apple?: boolean | undefined;
  children?: ReactNode;
}

/**
 * Kbd: a keyboard key drawn as a keycap.
 *
 * Two forms, and they are not alternatives: `children` is one key, for a hint
 * inside a field ("Enter" beside a box that adds a value to a list), and
 * `keys` is a whole shortcut, which needs the platform mapping and the spoken
 * sentence. A hint that says Ctrl+Z to somebody on a Mac names a key they do
 * not press.
 *
 * A CHORD IS ONE CAP. The keys of a shortcut are pressed together, so they
 * are printed together, `⌘K` as the approved design draws every shortcut it
 * shows; a cap per key read as a sequence to press one after another. Each
 * key is still its own `kbd` inside the cap, which is how a key combination
 * is marked up. Two shortcuts are two `Kbd`s: `↑` and `↓` beside "to move" are
 * two keys that each do it, not a chord.
 */
export const Kbd = ({ subtle = false, keys, apple, className, children, ...rest }: KbdProps) => {
  const cap = cx('crewlet-kbd', subtle && 'crewlet-kbd--subtle');
  if (keys === undefined) {
    return (
      <kbd {...rest} className={cx(cap, className)}>
        {children}
      </kbd>
    );
  }
  const onApple = apple ?? isApplePlatform();
  const mapped = keys.map((key) => keyGlyph(key, onApple));
  return (
    <span {...rest} className={cx('crewlet-kbd-combo', className)}>
      <kbd className={cap} aria-hidden>
        {mapped.map((key, index) => (
          <Fragment key={index}>
            {index > 0 && !onApple ? '+' : null}
            <kbd className="crewlet-kbd__key">{key.glyph}</kbd>
          </Fragment>
        ))}
      </kbd>
      <VisuallyHidden>{mapped.map((key) => key.spoken).join(' plus ')}</VisuallyHidden>
    </span>
  );
};
