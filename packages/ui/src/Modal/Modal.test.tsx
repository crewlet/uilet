/**
 * The modal surface: what it is called, where focus goes, and what refuses to
 * close it.
 *
 * The layer stack's own rules have their own suite (`Layer/Layer.test.tsx`).
 * What is here is the wiring: that this component actually hands the stack a
 * veil, a panel and a place for focus to start, and that a surface mid-write
 * refuses all three ways out rather than two of them.
 *
 * The sheet cases are ported from the engine dashboard's `ui/Drawer.test.tsx`,
 * where the node editor is a sheet and its unsaved-changes prompt is a dialog
 * over it. That pair is the case that matters most: one Escape must close the
 * prompt and leave the editor, with its edits, exactly where it was.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { Modal } from './index.js';
import { installCss, installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { LayerHost } from '../Layer/index.js';
import { HeadingLevelProvider, useHeadingLevel } from '../utils/headingLevel.js';

afterEach(cleanup);

function press(key: string, init: Partial<KeyboardEventInit> = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
}

function veil(): HTMLElement {
  const found = document.querySelectorAll<HTMLElement>('.crewlet-modal-overlay');
  return found[found.length - 1]!;
}

/** A sheet editing something, with a prompt raised over it, as the builder has. */
function Editor() {
  const [sheet, setSheet] = useState(true);
  const [prompt, setPrompt] = useState(false);
  return (
    <>
      <Modal open={sheet} variant="sheet" title="Edit Software Engineer" onClose={() => setSheet(false)}>
        <input aria-label="Name" />
        <button onClick={() => setPrompt(true)}>Discard</button>
      </Modal>
      <Modal open={prompt} title="Discard your edits?" onClose={() => setPrompt(false)}>
        <button>Keep editing</button>
      </Modal>
    </>
  );
}

test('the title names the dialog, with no id passed by hand', () => {
  render(
    <Modal open onClose={() => {}} title="Edit project name">
      <p>Anything.</p>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Edit project name' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
});

test('a surface with no title is named by ariaLabel, and described by its subtitle', () => {
  render(
    <Modal open onClose={() => {}} ariaLabel="Search" subtitle="Screens, seats and units.">
      <p>Anything.</p>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Search' });
  const description = document.getElementById(dialog.getAttribute('aria-describedby')!);
  expect(description?.textContent).toBe('Screens, seats and units.');
});

/*
 * `title={ready && name}` and `footer={null}` are both how a caller says
 * "nothing here". Read as present, the first points the frame's name at an
 * empty element AND suppresses the `ariaLabel` that would have named it, which
 * is the failure this component was rebuilt to remove; the second draws an
 * empty footer band with a rule across the top of it.
 */
test('a slot handed nothing is nothing: a falsy title leaves ariaLabel to name the surface', () => {
  const ready = false as boolean;
  render(
    <Modal open onClose={() => {}} title={ready && 'Edit project name'} ariaLabel="Edit project" footer={null}>
      <p>Anything.</p>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Edit project' });
  expect(dialog.getAttribute('aria-labelledby')).toBeNull();
  expect(document.querySelector('.crewlet-modal__footer')).toBeNull();
});

test('describedBy wins over the subtitle, so a caller can point at its own line', () => {
  render(
    <>
      <p id="own-line">The reason this is being asked.</p>
      <Modal open onClose={() => {}} title="Confirm" subtitle="A subtitle" describedBy="own-line">
        <p>Anything.</p>
      </Modal>
    </>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Confirm' });
  expect(dialog.getAttribute('aria-describedby')).toBe('own-line');
});

test('a dialog opens where the eye is, and says so rather than centring by default', () => {
  render(
    <Modal open onClose={() => {}} title="Edit project name">
      <p>Anything.</p>
    </Modal>,
  );
  expect(veil().classList.contains('crewlet-modal-overlay--top')).toBe(true);
  expect(veil().classList.contains('crewlet-modal-overlay--center')).toBe(false);
});

test('center is still reachable, for a surface with nothing above it to stay with', () => {
  render(
    <Modal open onClose={() => {}} placement="center" title="Viewer">
      <p>Anything.</p>
    </Modal>,
  );
  expect(veil().classList.contains('crewlet-modal-overlay--center')).toBe(true);
  expect(veil().classList.contains('crewlet-modal-overlay--top')).toBe(false);
});

test("only a sheet's head takes the sheet's own band, and only a sheet's title", () => {
  render(
    <>
      <Modal open variant="sheet" onClose={() => {}} title="Edit Software Engineer">
        <input aria-label="Name" />
      </Modal>
      <Modal open onClose={() => {}} title="Discard your edits?">
        <button>Keep editing</button>
      </Modal>
    </>,
  );
  const heads = [...document.querySelectorAll<HTMLElement>('.crewlet-modal__header')];
  expect(heads.length).toBe(2);
  expect(heads.map((head) => head.classList.contains('crewlet-modal__header--sheet'))).toEqual([
    true,
    false,
  ]);
  const titles = [...document.querySelectorAll<HTMLElement>('.crewlet-modal__title')];
  expect(titles.map((title) => title.classList.contains('crewlet-modal__title--sheet'))).toEqual([
    true,
    false,
  ]);
});

/*
 * AND THE CLASS ACTUALLY WINS. Both rules are one class, so a tie is broken
 * by source order: written above the base rule this set a size the base rule
 * then set back, and the sheet's head kept the dialog's register with the
 * class in the markup and the declaration in the file. Measured on the live
 * build at 14px against the 16 the source asked for.
 */
test("a sheet's title is drawn one step above a dialog's", () => {
  withLengths();
  const [sheetTitle, dialogTitle] = paint(
    '<p class="crewlet-modal__title crewlet-modal__title--sheet"></p>' +
      '<p class="crewlet-modal__title"></p>',
  );
  expect(px(sheetTitle!, 'font-size')).toBe(16);
  expect(px(dialogTitle!, 'font-size')).toBe(14);
});

/**
 * A SHEET IS COMMITTED FROM ITS HEAD. Its body is a tall column a reader
 * scrolls; Apply at the bottom of it is a button they have to travel the
 * whole form to reach and travel back from. Measured on a seat with a dozen
 * fields, that was 1,764px of scroll against a 794px window.
 */
test("a sheet's head carries the actions that commit it, before the body", () => {
  render(
    <Modal
      open
      variant="sheet"
      onClose={() => {}}
      title="Edit SRE Lead"
      showCloseButton={false}
      headerActions={
        <>
          <button>Cancel</button>
          <button>Apply</button>
        </>
      }
    >
      <input aria-label="Name" />
    </Modal>,
  );
  const head = document.querySelector('.crewlet-modal__header')!;
  const apply = screen.getByRole('button', { name: 'Apply' });
  expect(head.contains(apply)).toBe(true);
  // After the title, so a reader moving through the band meets what the
  // surface IS before what it offers.
  expect(
    head.querySelector('.crewlet-modal__heading')!.compareDocumentPosition(apply) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  // And before the body, which is what puts the commit pair one Tab from the
  // surface's own start rather than past every field in it.
  expect(
    head.compareDocumentPosition(document.querySelector('.crewlet-modal__body')!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  // ONE WAY OUT PER JOB. With Cancel in the band there is no close control
  // beside it doing the same thing.
  expect(screen.queryByRole('button', { name: 'Close' })).toBe(null);
});

/**
 * A PROMPT HAS NO BANDS AT ALL, and is still named. The title moves inside
 * the body, so the one thing a band was carrying that a screen reader needs
 * has to survive the band going.
 */
test('a prompt draws no head band, no close control, and is still named by its title', () => {
  render(
    <Modal open shape="prompt" onClose={() => {}} title="Discard your changes?">
      <p>The changes to SRE Lead have not been applied to the draft.</p>
    </Modal>,
  );
  expect(document.querySelector('.crewlet-modal__header')).toBe(null);
  expect(screen.queryByRole('button', { name: 'Close' })).toBe(null);
  const frame = screen.getByRole('dialog', { name: 'Discard your changes?' });
  expect(frame.className).toContain('crewlet-modal--prompt');
  const title = document.querySelector('.crewlet-modal__prompt-title')!;
  expect(document.querySelector('.crewlet-modal__body')!.contains(title)).toBe(true);
  expect(frame.getAttribute('aria-labelledby')).toBe(title.id);
});

/** A sheet is never a prompt: the shape is read on the dialog variant only. */
test('a sheet asked for the prompt shape stays a sheet, bands and all', () => {
  render(
    <Modal open variant="sheet" shape="prompt" onClose={() => {}} title="Edit unit">
      <input aria-label="Name" />
    </Modal>,
  );
  expect(screen.getByRole('dialog', { name: 'Edit unit' }).className).not.toContain(
    'crewlet-modal--prompt',
  );
  expect(document.querySelector('.crewlet-modal__header')).not.toBe(null);
});

test('Escape with a dialog over a sheet closes only the dialog', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
  expect(screen.getByRole('dialog', { name: 'Discard your edits?' })).toBeDefined();

  press('Escape');
  expect(screen.queryByRole('dialog', { name: 'Discard your edits?' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Edit Software Engineer' })).toBeDefined();

  press('Escape');
  expect(screen.queryByRole('dialog', { name: 'Edit Software Engineer' })).toBeNull();
});

test('focus starts in the body rather than on Close, and Tab wraps through Close', () => {
  render(<Editor />);
  const name = screen.getByLabelText('Name');
  const close = screen.getByRole('button', { name: 'Close' });
  const discard = screen.getByRole('button', { name: 'Discard' });
  expect(document.activeElement).toBe(name);

  discard.focus();
  press('Tab');
  expect(document.activeElement).toBe(close);
  press('Tab', { shiftKey: true });
  expect(document.activeElement).toBe(discard);
});

test('with nothing focusable in the body, focus goes to the footer and never to Close', () => {
  render(
    <Modal open onClose={() => {}} title="Done" footer={<button>Got it</button>}>
      <p>The company has been created.</p>
    </Modal>,
  );
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Got it' }));
});

test('a surface mid-write refuses Escape, the veil and Close alike', () => {
  let closed = 0;
  render(
    <Modal open variant="sheet" title="Saving" onClose={() => { closed += 1; }} dismissable={false}>
      <input aria-label="Name" />
    </Modal>,
  );
  press('Escape');
  fireEvent.pointerDown(veil());
  fireEvent.click(veil());
  const close = screen.getByRole('button', { name: 'Close' });
  fireEvent.click(close);
  expect(close.getAttribute('aria-disabled')).toBe('true');
  expect(closed).toBe(0);
});

/*
 * THE FRAME IS NOT THE FORM. A `<form>` accepts only `search`, `none` and
 * `presentation` as an explicit role, so a frame written as
 * `<form role="dialog" aria-modal>` is a conformance failure axe reports on
 * every surface in this package that submits. The form is INSIDE the frame,
 * drawing no box of its own, so Enter from any control still submits and the
 * dialog is a plain element that may carry the role.
 */
test('the sheet is a labelled modal dialog, and holds a form when it submits', () => {
  let submitted = 0;
  render(
    <Modal open variant="sheet" title="Edit unit" onClose={() => {}} onSubmit={() => { submitted += 1; }}>
      <input aria-label="Name" />
    </Modal>,
  );
  const sheet = screen.getByRole('dialog', { name: 'Edit unit' });
  expect(sheet.getAttribute('aria-modal')).toBe('true');
  expect(sheet.tagName).not.toBe('FORM');
  const form = sheet.querySelector('form')!;
  expect(form.getAttribute('role')).toBeNull();
  fireEvent.submit(form);
  expect(submitted).toBe(1);
});

test('a dialog that does not submit holds no form at all', () => {
  render(
    <Modal open title="Edit unit" onClose={() => {}}>
      <input aria-label="Name" />
    </Modal>,
  );
  expect(screen.getByRole('dialog', { name: 'Edit unit' }).querySelector('form')).toBeNull();
});

/*
 * The sheet stays on the MODAL layer. On the overlay layer it would sit below
 * the popover step, so a menu it did not open could cover it.
 */
test('a sheet paints inside the layer band, never on the in-page overlay step', () => {
  render(
    <Modal open variant="sheet" title="Edit unit" onClose={() => {}}>
      <input aria-label="Name" />
    </Modal>,
  );
  const depth = Number(veil().style.zIndex);
  expect(depth).toBeGreaterThanOrEqual(9000);
  expect(depth).toBeLessThanOrEqual(9899);
  expect(screen.getByRole('dialog', { name: 'Edit unit' }).className).toContain('crewlet-modal--sheet');
});

/*
 * A LayerHost publishes its portal target one commit after it first renders,
 * so a surface that opens in the same commit as its host is drawn into the
 * body first and moved into the host next. That move is a REMOUNT: the panel
 * the stack was handed is replaced, and focus, already put inside the first
 * one, is left on the page body behind the veil.
 */
test('a surface opened in the same commit as its host still takes focus', () => {
  render(
    <div data-testid="canvas">
      <LayerHost>
        <Modal open onClose={() => {}} title="Edit unit">
          <input aria-label="Name" />
        </Modal>
      </LayerHost>
    </div>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Edit unit' });
  expect(screen.getByTestId('canvas').contains(dialog)).toBe(true);
  // One surface, not the first one left behind in the body beside it.
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(document.activeElement).toBe(screen.getByLabelText('Name'));
});

test('the veil closes on the click of a press that began on it, and not before', () => {
  let closed = 0;
  render(
    <Modal open onClose={() => { closed += 1; }} title="Edit">
      <input aria-label="Name" />
    </Modal>,
  );
  fireEvent.pointerDown(veil());
  // Still up: a veil removed on the press is gone before a tap's own click is
  // hit-tested, and that click lands on whatever the veil was covering.
  expect(closed).toBe(0);
  fireEvent.click(veil());
  expect(closed).toBe(1);
});

test('a press that began inside the surface does not close it on the veil', () => {
  let closed = 0;
  render(
    <Modal open onClose={() => { closed += 1; }} title="Edit">
      <input aria-label="Name" />
    </Modal>,
  );
  fireEvent.pointerDown(screen.getByLabelText('Name'));
  fireEvent.click(veil());
  expect(closed).toBe(0);
});

test('closeOnBackdrop false is a veil-only switch: Escape and Close still work', () => {
  let closed = 0;
  render(
    <Modal open onClose={() => { closed += 1; }} title="Edit" closeOnBackdrop={false}>
      <input aria-label="Name" />
    </Modal>,
  );
  fireEvent.pointerDown(veil());
  fireEvent.click(veil());
  expect(closed).toBe(0);
  press('Escape');
  expect(closed).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(closed).toBe(2);
});

test('a field that takes autoFocus keeps it, and focus returns to whatever opened the surface', () => {
  function Screen() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Edit</button>
        <Modal open={open} onClose={() => setOpen(false)} title="Edit project name">
          <input aria-label="Before" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input aria-label="Name" autoFocus />
        </Modal>
      </>
    );
  }
  render(<Screen />);
  const opener = screen.getByRole('button', { name: 'Edit' });
  opener.focus();
  fireEvent.click(opener);
  expect(document.activeElement).toBe(screen.getByLabelText('Name'));

  press('Escape');
  expect(document.activeElement).toBe(opener);
});

/*
 * `aria-modal` puts the page behind the veil out of reach, so a heading inside
 * a surface starts at 2 however deeply the component that opened it was
 * nested. FormSection reads exactly this.
 */
test('a surface resets the heading level, so its contents are their own outline', () => {
  function Level() {
    return <span data-testid="level">{useHeadingLevel()}</span>;
  }
  render(
    // Opened from deep inside a page's outline, which is the only place the
    // reset can be seen: 2 is also the context's own default.
    <HeadingLevelProvider level={5}>
      <Modal open onClose={() => {}} title="Edit project name">
        <Level />
      </Modal>
    </HeadingLevelProvider>,
  );
  expect(screen.getByTestId('level').textContent).toBe('2');
});

test('the surfaces carry no accessibility violation', async () => {
  render(
    <>
      <Modal open onClose={() => {}} title="Edit project name" subtitle="Members only." footer={<button>Save</button>}>
        <label htmlFor="name">Name</label>
        <input id="name" />
      </Modal>
      <Modal open variant="sheet" title="Edit unit" onClose={() => {}} footerStart="Saved a moment ago">
        <label htmlFor="goal">Goal</label>
        <input id="goal" />
      </Modal>
    </>,
  );
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Contrast needs layout and resolved custom properties, neither of which
    // jsdom has. The palette suite measures it from the stylesheets instead.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

/* -------------------------------------------------------------------------
 * What is DRAWN.
 *
 * jsdom applies no stylesheet on its own, and every case below used to be a
 * regular expression over this file's own text. That guard passes while the
 * defect ships: it cannot see a later rule winning on source order, and it
 * cannot see a declaration the product's own bundler removes on the way to
 * the browser. These put the real sheet into the document and read back what
 * the cascade decides.
 * ---------------------------------------------------------------------- */

const here = dirname(fileURLToPath(import.meta.url));

/**
 * One token's value, from the tokens package's own source, taken by family
 * and step rather than by its custom-property name: a component's source may
 * not spell a token name (`check-css-variables.mjs` reads a quoted one as a
 * declaration), and the name is the two joined anyway.
 */
function token(family: string, step: string): string {
  const json = JSON.parse(
    readFileSync(resolve(here, `../../../tokens/tokens/${family}.json`), 'utf8'),
  ) as Record<string, Record<string, { value: string }>>;
  return String(json[family]![step]!.value);
}

const modalCss = (): string => readFileSync(resolve(here, 'Modal.css'), 'utf8');

let removeSheet: (() => void) | null = null;
let painted: HTMLElement | null = null;
afterEach(() => {
  removeSheet?.();
  removeSheet = null;
  painted?.remove();
  painted = null;
});

/**
 * Bare markup for the cascade to decide on, in a wrapper of its own so the
 * teardown takes it away without touching the containers React's own cleanup
 * is holding.
 */
function paint(html: string): HTMLElement[] {
  painted = document.createElement('div');
  painted.innerHTML = html;
  document.body.append(painted);
  return [...painted.children] as HTMLElement[];
}

/**
 * The stylesheet with its LENGTH tokens resolved, which is every case that
 * measures a box. The colour and shadow families are deliberately outside
 * that helper, so the one case that needs a shadow substitutes it by hand.
 */
function withLengths(): void {
  removeSheet = installSheets('Modal/Modal.css');
}

/**
 * The stylesheet as written, with one token substituted by hand, because
 * jsdom resolves no custom property and the colour and shadow families are
 * deliberately outside the cascade helper's own substitution. Answers with
 * the value it put in.
 */
function withToken(family: string, step: string): string {
  const value = token(family, step);
  removeSheet = installCss(modalCss().replaceAll(`var(--${family}-${step})`, value));
  return value;
}

/**
 * THE PROPERTY NAMES ONE RULE DECLARES, read out of the source block rather
 * than the CSSOM, because jsdom throws a vendor-prefixed declaration away on
 * parse and can be asked about neither its presence nor its absence.
 */
function declared(selector: string): string[] {
  const escaped = selector.replace(/[.]/g, '\\.');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(
    modalCss().replace(/\/\*[\s\S]*?\*\//g, ''),
  );
  return (block?.[1] ?? '')
    .split(';')
    .map((part) => part.slice(0, part.indexOf(':')).trim().toLowerCase())
    .filter((name) => name !== '');
}

/**
 * THE VEIL'S BLUR, READ OFF A RENDERED OVERLAY, and the one condition that
 * keeps it there after the bundler has run.
 *
 * The source here has always said `backdrop-filter`. It also used to say
 * `-webkit-backdrop-filter` on the line below, by hand, and the minifier the
 * product's bundler runs answers a rule holding both by keeping the PREFIXED
 * declaration and dropping the standard one outright (measured: lightningcss
 * collapses the pair at every browser target, and given the standard spelling
 * alone it emits both, standard last). The shipped rule then read
 * `-webkit-backdrop-filter` alone, which Chrome does not support, and the
 * blur computed to `none` in every dialog and every sheet in the product.
 *
 * Two halves, because neither reaches the other's failure. The first is what
 * the owner sees: the blur a rendered overlay computes, which catches a wrong
 * token or a rule that stopped matching. The second is the condition that
 * carries it through a transform happening long after every test here, and it
 * cannot be a rendering: jsdom discards a vendor-prefixed declaration on
 * parse, so nothing rendered can be asked whether one was written.
 */
test("the veil's blur is drawn, in the one spelling the bundler keeps", () => {
  const blur = withToken('blur', 'xs');
  const [overlayEl] = paint('<div class="crewlet-modal-overlay"></div>');
  expect(getComputedStyle(overlayEl!).getPropertyValue('backdrop-filter')).toBe(`blur(${blur})`);

  const names = declared('.crewlet-modal-overlay');
  expect(names).toContain('backdrop-filter');
  expect(names.filter((name) => name.startsWith('-webkit-'))).toEqual([]);
});

/*
 * THE FORM IS NOT A BOX. It sits between the frame and the three bands so the
 * dialog can be a plain element that may carry `role="dialog"`, and every rule
 * in this file addresses the head, the body and the footer as the FRAME's own
 * children: a form that generated a box of its own would take the frame's
 * column away and the body would stop scrolling inside it.
 */
test('the form inside the frame draws no box of its own', () => {
  withLengths();
  document.body.innerHTML =
    '<div class="crewlet-modal"><form class="crewlet-modal__form"></form></div>';
  expect(getComputedStyle(document.querySelector('.crewlet-modal__form')!).display).toBe('contents');
});

/**
 * A SHEET ARRIVES FROM OFF SCREEN. It used to travel 16px and fade, at which
 * distance the panel does not arrive from anywhere: it turns up where it
 * already is. The frame's own width is what makes the motion read as a sheet.
 */
test('the sheet travels its own width in, with no fade', () => {
  withLengths();
  const [frame] = paint('<div class="crewlet-modal crewlet-modal--sheet"></div>');
  const from = getComputedStyle(frame!).getPropertyValue('--crewlet-modal-sheet-from').trim();
  expect(from).toBe('100%');

  const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
  const frames = rules.find(
    (rule): rule is CSSKeyframesRule =>
      rule instanceof CSSKeyframesRule && rule.name === 'crewlet-modal-sheet-in',
  )!;
  const start = frames.cssRules[0] as CSSKeyframeRule;
  expect(start.style.transform.replace(`var(--crewlet-modal-sheet-from)`, from)).toBe(
    'translateX(100%)',
  );
  // No opacity ramp: the sheet is opaque paper sliding over the page, and a
  // frame that fades in as well reads as two things happening at once.
  expect(start.style.opacity).toBe('');
});

/**
 * THE SEPARATION IS AT THE EDGE THE SHEET HAS. --shadow-xl is written for a
 * dialog floating over a page: both of its offsets are vertical, and on a
 * frame running the whole height of the window both casts fall off the
 * screen, leaving the sheet's one real edge lit by a blur tail.
 */
test("the sheet's shadow is cast sideways, into the page it covers", () => {
  withToken('shadow', 'sheet');
  const [frame] = paint('<div class="crewlet-modal crewlet-modal--sheet"></div>');
  const cast = getComputedStyle(frame!).getPropertyValue('box-shadow');
  const [x, y] = cast.split(/\s+/).slice(0, 2).map(Number.parseFloat);
  expect(x).toBeLessThan(0);
  expect(y).toBe(0);
});

/**
 * THE HEAD A SHEET IS COMMITTED FROM. It stands at the shell's own top-bar
 * height, which is what holds a pair of full-height buttons with room around
 * them, and is inset on the body's own line so the title starts where the
 * first field's label does.
 */
test("a sheet's head stands at the shell's bar height, and a dialog's does not", () => {
  withLengths();
  const [sheetHead, dialogHead] = paint(
    '<div class="crewlet-modal__header crewlet-modal__header--sheet"></div>' +
      '<div class="crewlet-modal__header"></div>',
  );
  expect(px(sheetHead!, 'min-height')).toBe(64);
  expect(px(sheetHead!, 'padding-top')).toBe(16);
  expect(px(sheetHead!, 'padding-left')).toBe(24);
  // The dialog's head is unchanged: it is read in the same glance as the
  // question under it, and a taller band there is a gap before a sentence.
  expect(px(dialogHead!, 'min-height')).toBe(0);
  expect(px(dialogHead!, 'padding-top')).toBe(16);
  expect(px(dialogHead!, 'padding-left')).toBe(16);
});

test("a sheet's fields start on the line its title does", () => {
  withLengths();
  const [sheetBody, dialogBody] = paint(
    '<div class="crewlet-modal__body crewlet-modal__body--stacked crewlet-modal__body--sheet"></div>' +
      '<div class="crewlet-modal__body crewlet-modal__body--stacked"></div>',
  );
  expect(px(sheetBody!, 'padding-left')).toBe(24);
  // `gap`, not `row-gap`: jsdom keeps the shorthand it was given.
  expect(px(sheetBody!, 'gap')).toBe(8);
  expect(px(dialogBody!, 'padding-left')).toBe(16);
  expect(px(dialogBody!, 'gap')).toBe(12);
});

/**
 * THE FOOT'S TWO HALVES, and which of them carries the spacing.
 *
 * The start slot holds the auto margin, not the end slot, because a rule that
 * reads "align to the end unless a sibling exists" breaks the first time
 * somebody adds one. An application that hand-rolled a flexing span inside the
 * actions instead put its caption 130px from Cancel with the band's first
 * 257px empty, which is the defect this slot removes.
 */
test("a footer's start slot is its own group, and carries the margin that pushes the actions over", () => {
  withLengths();
  render(
    <Modal
      open
      onClose={() => {}}
      title="Review and save"
      footerStart="A seat needs a name."
      footer={<button>Save</button>}
    >
      <p>Anything.</p>
    </Modal>,
  );
  const start = document.querySelector<HTMLElement>('.crewlet-modal__footer-start')!;
  const end = document.querySelector<HTMLElement>('.crewlet-modal__footer-end')!;
  expect(start.textContent).toBe('A seat needs a name.');
  expect(end.contains(screen.getByRole('button', { name: 'Save' }))).toBe(true);
  // Its own group, before the actions, and the one carrying the auto margin.
  expect(start.contains(end)).toBe(false);
  expect(start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getComputedStyle(start).getPropertyValue('margin-inline-end')).toBe('auto');
});

/**
 * THE PROMPT IS NARROWER, which is half of why it is a shape of its own: one
 * sentence set across a dialog's 480 is read twice. The width is declared
 * after the size steps on purpose, because both are one class and a tie is
 * broken by source order: written above them, the shape would set a variable
 * the size step then overwrote.
 */
test('a prompt is narrower than the size step it carries, and opens centred', () => {
  withLengths();
  const [frame] = paint(
    '<div class="crewlet-modal crewlet-modal--dialog crewlet-modal--sm crewlet-modal--prompt"></div>',
  );
  expect(getComputedStyle(frame!).getPropertyValue('--crewlet-modal-width').trim()).toBe('420px');

  render(
    <Modal open shape="prompt" onClose={() => {}} title="Discard your changes?">
      <p>They have not been applied.</p>
    </Modal>,
  );
  expect(veil().className).toContain('crewlet-modal-overlay--center');
});

/**
 * The frame with the corners is the frame that clips: a body with its padding
 * dropped runs its content to the frame's own edge, and a table head or an
 * image there is square where the frame is round. A sheet has no corners and
 * does not clip, so nothing inside one is cut off at an edge that is not
 * there.
 */
test('the frame with the corners is the frame that clips them, and a sheet has neither', () => {
  withLengths();
  const [dialog, sheet] = paint(
    '<div class="crewlet-modal crewlet-modal--dialog"></div>' +
      '<div class="crewlet-modal crewlet-modal--sheet"></div>',
  );
  expect(px(dialog!, 'border-radius')).toBe(16);
  expect(getComputedStyle(dialog!).overflow).toBe('hidden');
  expect(px(sheet!, 'border-radius')).toBe(0);
  expect(getComputedStyle(sheet!).overflow).not.toBe('hidden');
});
