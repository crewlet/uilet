/**
 * The button's contract, which is more than its markup: what it forwards, how
 * an icon-only one is named, that a link wears exactly the same recipe, and
 * the two unavailable states that are deliberately not the native `disabled`.
 *
 * The first three cases are ported from the engine dashboard's
 * `ui/primitives.test.tsx`; the rest are what the merged API adds.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MoreVertGlyph } from '@crewlethq/icons/glyphs';
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
