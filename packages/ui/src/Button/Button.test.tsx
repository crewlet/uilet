/**
 * The button's contract, which is more than its markup: what it forwards, how
 * an icon-only one is named, that a link wears exactly the same recipe, and
 * the two unavailable states that are deliberately not the native `disabled`.
 *
 * The first three cases are ported from the engine dashboard's
 * `ui/primitives.test.tsx`; the rest are what the merged API adds.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MoreVertGlyph } from '@crewlethq/icons/glyphs';
import { themes } from '@crewlethq/tokens';
import { contrast, paletteStates, parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { Button, ButtonLink } from './index.js';
import { IconButton } from '../IconButton/index.js';

afterEach(cleanup);

describe('Button', () => {
  // A menu trigger and a list's Move buttons are built on it, and each needs
  // something a plain click target does not: a ref to hand focus back to, the
  // popup state a screen reader announces, a way out of the tab order.
  test('hands a ref, aria and data attributes, tabIndex and keys to the element it draws', () => {
    const ref = createRef<HTMLButtonElement>();
    const onKeyDown = vi.fn();
    render(
      <Button
        ref={ref}
        leadingIcon={<MoreVertGlyph />}
        variant="tertiary"
        size="small"
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={false}
        aria-controls="actions-menu"
        tabIndex={-1}
        data-node="seat:ceo"
        id="seat-actions"
        onKeyDown={onKeyDown}
      />,
    );
    const button = screen.getByRole('button', { name: 'Actions' });
    expect(ref.current).toBe(button);
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('actions-menu');
    expect(button.getAttribute('tabindex')).toBe('-1');
    expect(button.getAttribute('data-node')).toBe('seat:ceo');
    expect(button.id).toBe('seat-actions');
    // The recipe is still the primitive's own.
    expect(button.className).toBe('crewlet-btn crewlet-btn--tertiary crewlet-btn--small crewlet-btn--square');
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  test('an icon button is named by its title unless the caller names it more precisely', () => {
    render(
      <>
        <Button leadingIcon={<MoreVertGlyph />} title="Move up" />
        <Button leadingIcon={<MoreVertGlyph />} title="Move up" aria-label="Move goal 2 of 3 up" />
        <Button leadingIcon={<MoreVertGlyph />}>Add</Button>
      </>,
    );
    const [plain, named, labelled] = screen.getAllByRole('button');
    expect(plain!.getAttribute('aria-label')).toBe('Move up');
    expect(named!.getAttribute('aria-label')).toBe('Move goal 2 of 3 up');
    expect(named!.getAttribute('title')).toBe('Move up');
    // A button with visible text is named by that text, not by a duplicate.
    expect(labelled!.getAttribute('aria-label')).toBeNull();
  });

  test('a toggle says whether it is on', () => {
    const { rerender } = render(<Button pressed={false}>Only failures</Button>);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    rerender(<Button pressed>Only failures</Button>);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  test('a loading button keeps its focus and refuses the press', () => {
    // The native `disabled` takes focus off the control the reader just used
    // and drops it on the page body, then refuses to give it back when the
    // action finishes.
    const onClick = vi.fn();
    const { rerender } = render(
      <Button leadingIcon={<MoreVertGlyph />} onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    button.focus();
    rerender(
      <Button leadingIcon={<MoreVertGlyph />} loading onClick={onClick}>
        Save
      </Button>,
    );

    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    // The label is untouched, so the button still says what it does.
    expect(button.textContent).toBe('Save');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('a disabled reason is reachable, and read after the name rather than instead of it', () => {
    const onClick = vi.fn();
    render(
      <Button disabledReason="Add at least one reporting line first" onClick={onClick}>
        Review and save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Review and save' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    // Focusable, which a natively disabled button is not: the explanation is
    // unreachable by keyboard otherwise.
    button.focus();
    expect(document.activeElement).toBe(button);
    const described = button.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(document.getElementById(described!)?.textContent).toBe('Add at least one reporting line first');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('asChild puts the recipe on somebody else’s element without a nested button', () => {
    render(
      <Button asChild variant="secondary" size="small">
        <a href="#/org">Open</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link.className).toBe('crewlet-btn crewlet-btn--secondary crewlet-btn--small crewlet-btn--square');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/**
 * THE PRIMARY ACTION IS THE ACCENT, at rest, under the pointer and pressed,
 * with the on-accent label on all three. @crewlethq/tokens measures those
 * three fills against that label; what it cannot see is which tokens this
 * stylesheet spends, so the pairs are read back out of the CSS here, and the
 * cascade is asked what a rendered button actually paints.
 */
describe('the primary action', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'Button.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokensCss = resolve(here, '../../../tokens/dist/css');
  const states = paletteStates({
    tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
    themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
  });
  /*
   * Token names are written without their leading dashes and prefixed at use:
   * the package's variable check reads a quoted `--name` in a .tsx file as a
   * DECLARATION, and a component may declare only `--crewlet-*` names.
   */
  const token = (name: string) => `--${name}`;
  const PRESSABLE = ":not(:disabled):not([aria-disabled='true'])";
  const STEPS = [
    ['at rest', '', 'color-brand-accent'],
    ['under the pointer', `:hover${PRESSABLE}`, 'color-brand-accent-hover'],
    ['pressed', `:active${PRESSABLE}`, 'color-brand-accent-active'],
  ] as const;

  /** The one rule whose selector list names `selector`, and what it binds. */
  function rule(selector: string): { selectors: string[]; fill: string | null; ink: string | null } {
    const found = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .map(([, list, body]) => ({ selectors: (list ?? '').split(',').map((one) => one.trim()), body: body ?? '' }))
      .filter(({ selectors }) => selectors.includes(selector));
    if (found.length !== 1) throw new Error(`Button.css has ${found.length} rules for ${selector}`);
    const { selectors, body } = found[0]!;
    return {
      selectors,
      fill: /(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(body)?.[1] ?? null,
      ink: /(?:^|;|\s)color:\s*var\((--[\w-]+)\)/.exec(body)?.[1] ?? null,
    };
  }

  test('primary and accent are one recipe, and it paints the accent in each of its three states', () => {
    for (const [when, state, fill] of STEPS) {
      const bound = rule(`.crewlet-btn--primary${state}`);
      // One rule for both names, so the pair cannot drift into two violets.
      expect(bound.selectors, when).toContain(`.crewlet-btn--accent${state}`);
      expect(bound.fill, when).toBe(token(fill));
      // The label is set once, at rest, and a state that named its own would
      // be a second answer the palette suite never measured.
      expect(bound.ink, when).toBe(state === '' ? token('color-text-on-accent') : null);
    }
  });

  test('its label clears 4.5:1 on every fill it takes, and gains as the button is pressed, in every palette', () => {
    const failures: string[] = [];
    for (const [name, values] of Object.entries(states)) {
      const label = parseHex(values.get(token('color-text-on-accent')) ?? '');
      if (label === null) throw new Error(`${name} has no opaque on-accent label`);
      let previous = 0;
      for (const [when, , fill] of STEPS) {
        const ground = parseHex(values.get(token(fill)) ?? '');
        if (ground === null) throw new Error(`${name}: ${fill} is not an opaque colour`);
        const ratio = contrast(label, ground);
        if (ratio < 4.5) failures.push(`${name}: the label ${when}: ${ratio.toFixed(2)}:1`);
        // A hover that brightens moves the fill TOWARD a white label, which is
        // how the approved design's hover took it under the floor.
        if (ratio <= previous) failures.push(`${name}: the label ${when} loses contrast (${ratio.toFixed(2)}:1)`);
        previous = ratio;
      }
    }
    expect(failures).toEqual([]);
  });

  test('as the cascade decides it, a primary button, an accent one and a link drawn as one paint the accent', () => {
    for (const theme of ['dark', 'light'] as const) {
      const uninstall = installThemed(theme, 'Button/Button.css');
      const { unmount } = render(
        <>
          <Button>Default</Button>
          <Button variant="primary">Create</Button>
          <Button variant="accent">Continue</Button>
          <ButtonLink variant="primary" href="#/tasks/new">
            New task
          </ButtonLink>
        </>,
      );
      const palette = themes[theme].color;
      for (const element of [
        screen.getByRole('button', { name: 'Default' }),
        screen.getByRole('button', { name: 'Create' }),
        screen.getByRole('button', { name: 'Continue' }),
        screen.getByRole('link', { name: 'New task' }),
      ]) {
        const style = getComputedStyle(element);
        const where = `${theme}: ${element.textContent}`;
        expect(channels(style.backgroundColor), where).toEqual(parseHex(palette.brand.accent));
        expect(channels(style.color), where).toEqual(parseHex(palette.text.onAccent));
      }
      unmount();
      uninstall();
    }
  });
});

describe('ButtonLink', () => {
  // A control that goes somewhere is a real link, drawn by the same recipe as
  // the button beside it rather than a class list spelled at the call site.
  test('is an anchor wearing exactly the class list the matching Button wears', () => {
    render(
      <>
        <Button variant="primary" size="small" leadingIcon={<MoreVertGlyph />}>
          Create
        </Button>
        <ButtonLink variant="primary" size="small" leadingIcon={<MoreVertGlyph />} href="#/org?lens=builder">
          Create
        </ButtonLink>
        <ButtonLink variant="tertiary" leadingIcon={<MoreVertGlyph />} title="Open" href="#/org" />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Create' });
    const link = screen.getByRole('link', { name: 'Create' });
    expect(link.className).toBe(button.className);
    expect(link.getAttribute('href')).toBe('#/org?lens=builder');
    // In an application's own routes, it stays in this tab.
    expect(link.getAttribute('target')).toBeNull();

    const iconOnly = screen.getByRole('link', { name: 'Open' });
    expect(iconOnly.className).toBe('crewlet-btn crewlet-btn--tertiary crewlet-btn--medium crewlet-btn--square');
  });

  test('an external link opens a new tab without handing over the referrer or the opener', () => {
    render(
      <ButtonLink external href="https://example.com/install">
        Install
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Install' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
    // And it says so on the page: the mark is the only warning a pointer
    // reader gets that the press leaves the application.
    expect(link.querySelector('svg')).not.toBeNull();
  });
});

describe('IconButton', () => {
  test('is named by its label, which is also what its tooltip says', () => {
    render(<IconButton label="Row actions" icon={<MoreVertGlyph />} />);
    const button = screen.getByRole('button', { name: 'Row actions' });
    // The LABEL names it. The tooltip repeats the same words, so a name read
    // out of the title alone would look right while the prop did nothing.
    expect(button.getAttribute('aria-label')).toBe('Row actions');
    expect(button.getAttribute('title')).toBe('Row actions');
    expect(button.className).toContain('crewlet-icon-btn--md');
  });

  test('its smallest step is a control step, so no density takes it under the target floor', () => {
    // 22px squares are what it used to draw, which is under the 24px a pointer
    // target needs, and compact density took them to 18.
    render(<IconButton label="Copy" size="sm" icon={<MoreVertGlyph />} />);
    expect(screen.getByRole('button').className).toContain('crewlet-icon-btn--sm');
  });

  /*
   * The bordered square. A row action, a step in a toolbar and a month's back
   * and forward are controls with nothing around them to say they are
   * controls, and before this variant existed a call site drew a Button with
   * no label and squared it off with a stylesheet of its own.
   */
  test('draws the bordered square when it is asked for, and stays borderless otherwise', () => {
    const { rerender } = render(<IconButton label="Previous month" variant="secondary" icon={<MoreVertGlyph />} />);
    expect(screen.getByRole('button').className).toContain('crewlet-icon-btn--secondary');
    rerender(<IconButton label="Previous month" icon={<MoreVertGlyph />} />);
    expect(screen.getByRole('button').className).toContain('crewlet-icon-btn--ghost');
    expect(screen.getByRole('button').className).not.toContain('crewlet-icon-btn--secondary');
  });

  test('a disabled reason keeps its focus and is read', () => {
    const onClick = vi.fn();
    render(<IconButton label="Delete" disabledReason="The last unit cannot be deleted" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Delete' });
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(
      'The last unit cannot be deleted',
    );
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
