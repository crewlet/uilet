/**
 * What the add pill promises.
 *
 * - at rest it is ONE mark, named after what it adds, and the choices are not
 *   in the document at all;
 * - hovering previews the choices and leaving takes them away, and a PRESS
 *   locks them open so a reader can move onto one;
 * - a press elsewhere, Escape, or choosing closes it, and Escape gives focus
 *   back to the mark it came from;
 * - a closing pill is drawn for exactly as long as its own animation, which is
 *   why the component's own constant and the stylesheet's duration are checked
 *   against each other here rather than remembered;
 * - the drawing is small and every target is not: what is drawn is the console
 *   chart's own pill and what is pressed clears the 24px floor.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { motion, themes } from '@crewlethq/tokens';
import { contrast, flatten, parseHex } from '@crewlethq/tokens/test/palette';
import { installCss, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { AddPill, ADD_PILL_MS, type AddPillSection } from './AddPill.js';

const Glyph = () => <svg data-testid="glyph" />;

function sections(onSelect: (key: string) => void, disabled?: string): AddPillSection[] {
  return ['unit', 'agent', 'human'].map((key) => ({
    key,
    label: `Add a ${key}`,
    icon: <Glyph />,
    disabled: key === disabled,
    onSelect: () => onSelect(key),
  }));
}

function mount(onSelect: (key: string) => void = () => {}, disabled?: string) {
  return render(<AddPill label="Add to Engineering" sections={sections(onSelect, disabled)} />);
}

const mark = () => screen.getByRole('button', { name: 'Add to Engineering' });
const choices = () => screen.queryAllByRole('button').filter((one) => one !== mark());

afterEach(cleanup);

describe('at rest', () => {
  test('one mark, named after the node it adds to, and no choices in the document', () => {
    mount();
    expect(mark().getAttribute('aria-expanded')).toBe('false');
    expect(mark().getAttribute('title')).toBe('Add to Engineering');
    expect(choices()).toHaveLength(0);
  });
});

describe('opening', () => {
  test('hovering previews the choices, and leaving takes them away', () => {
    vi.useFakeTimers();
    const { container } = mount();
    fireEvent.mouseEnter(mark());
    expect(choices()).toHaveLength(3);
    expect(mark().getAttribute('aria-expanded')).toBe('true');
    fireEvent.mouseLeave(container.querySelector('.crewlet-add-pill')!);
    // Closing, and still drawn while its own animation plays.
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closing');
    act(() => vi.advanceTimersByTime(ADD_PILL_MS));
    expect(choices()).toHaveLength(0);
    vi.useRealTimers();
  });

  test('a press locks it open, so leaving it does not take the choices away', () => {
    const { container } = mount();
    fireEvent.click(mark());
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('locked');
    fireEvent.mouseLeave(container.querySelector('.crewlet-add-pill')!);
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('locked');
    expect(choices()).toHaveLength(3);
  });

  test('a press on the mark of an open pill closes it again', () => {
    const { container } = mount();
    fireEvent.click(mark());
    fireEvent.click(mark());
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closing');
  });

  test('each choice says what it adds', () => {
    mount();
    fireEvent.mouseEnter(mark());
    expect(choices().map((one) => one.getAttribute('aria-label'))).toEqual([
      'Add a unit',
      'Add a agent',
      'Add a human',
    ]);
  });
});

describe('choosing', () => {
  test('a choice is taken once and the pill closes', () => {
    const chosen = vi.fn();
    const { container } = mount(chosen);
    fireEvent.click(mark());
    fireEvent.click(choices()[1]!);
    expect(chosen).toHaveBeenCalledTimes(1);
    expect(chosen).toHaveBeenCalledWith('agent');
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closing');
  });

  /* Refused rather than removed: a reader learns the chart offers this and
     that it will not do it now, which a missing third of a pill does not say. */
  test('a refused choice is drawn, announced and does nothing', () => {
    const chosen = vi.fn();
    mount(chosen, 'human');
    fireEvent.click(mark());
    const refused = choices()[2]!;
    expect(refused.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(refused);
    expect(chosen).not.toHaveBeenCalled();
  });
});

describe('closing', () => {
  test('a press anywhere else closes it', () => {
    const { container } = mount();
    fireEvent.click(mark());
    fireEvent.mouseDown(document.body);
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closing');
  });

  test('a press inside it does not', () => {
    const { container } = mount();
    fireEvent.click(mark());
    fireEvent.mouseDown(choices()[0]!);
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('locked');
  });

  test('Escape closes it and gives focus back to the mark it came from', () => {
    const { container } = mount();
    fireEvent.click(mark());
    fireEvent.keyDown(choices()[0]!, { key: 'Escape' });
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closing');
    expect(document.activeElement).toBe(mark());
  });

  test('a closing pill is drawn for exactly as long as its own animation', () => {
    vi.useFakeTimers();
    const { container } = mount();
    fireEvent.click(mark());
    fireEvent.click(mark());
    act(() => vi.advanceTimersByTime(ADD_PILL_MS - 1));
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closing');
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('.crewlet-add-pill')!.getAttribute('data-phase')).toBe('closed');
    vi.useRealTimers();
  });
});

describe('the keyboard', () => {
  test('a press moves focus onto the first choice', () => {
    const frames: FrameRequestCallback[] = [];
    const real = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((frame: FrameRequestCallback) =>
      frames.push(frame)) as typeof globalThis.requestAnimationFrame;
    mount();
    fireEvent.click(mark());
    act(() => {
      for (const frame of frames) frame(0);
    });
    expect(document.activeElement).toBe(choices()[0]);
    globalThis.requestAnimationFrame = real;
  });

  test('a caller that keeps focus out of the strip is obeyed', () => {
    render(
      <AddPill label="Add to Engineering" sections={sections(() => {})} tabIndex={-1} />,
    );
    expect(mark().tabIndex).toBe(-1);
    fireEvent.mouseEnter(mark());
    for (const choice of choices()) expect(choice.tabIndex).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// The drawing
// ---------------------------------------------------------------------------

/**
 * MEASURED, NOT MATCHED. Every assertion below reads what the cascade leaves
 * on the element the component rendered, with the package's own lengths
 * substituted (`cascade.ts`) and its own colours resolved from the tokens
 * module. A guard that matched the stylesheet's TEXT passed on three defects
 * this month: it cannot see a later rule that wins, a selector that matches
 * nothing, or a value that was never the winner.
 */

/** A colour the cascade reports, as the three channels. jsdom answers `rgb(r, g, b)`. */
function channels(value: string): { r: number; g: number; b: number } {
  const hex = parseHex(value.trim());
  if (hex) return hex;
  const parts = /rgba?\(([^)]+)\)/
    .exec(value)?.[1]
    ?.split(',')
    .map((one) => Number.parseFloat(one));
  if (!parts || parts.length < 3) throw new Error(`not a colour: ${value}`);
  return { r: parts[0]!, g: parts[1]!, b: parts[2]! };
}

/** A flattened colour back as a hex string, which is what `painted` takes. */
function hexOf({ r, g, b }: { r: number; g: number; b: number }): string {
  const byte = (one: number) =>
    Math.round(one)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** What `element` is painted in, composited at its own opacity over `ground`. */
function painted(element: Element, ground: string): { r: number; g: number; b: number } {
  const own = channels(getComputedStyle(element).color);
  const alpha = Number.parseFloat(getComputedStyle(element).opacity || '1');
  const over = parseHex(ground);
  if (!over) throw new Error(`not a ground: ${ground}`);
  return flatten(`rgba(${own.r}, ${own.g}, ${own.b}, ${Number.isFinite(alpha) ? alpha : 1})`, over);
}

describe('the drawing', () => {
  let uninstall: (() => void) | undefined;
  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    cleanup();
  });

  /*
   * DRAWN SMALL, HIT FULL SIZE. The disc is a spacing step across, which is
   * about a third of a node's height; the controls around it are the pointer
   * target's own size, and the section is grown past the pill's edge into the
   * branch's strip so the target clears the floor at every density.
   */
  test('the branch step draws a third of a node and hits a whole target', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    const { container } = mount();
    fireEvent.click(mark());
    const group = container.querySelector('.crewlet-add-pill')!;
    expect(px(mark(), 'width')).toBe(24);
    expect(px(mark(), 'height')).toBe(24);
    expect(px(group.querySelector('.crewlet-add-pill__sections')!, 'height')).toBe(16);
    const section = choices()[0]!;
    expect(px(section, 'width')).toBe(24);
    expect(px(section, 'height')).toBe(24);
    // Grown past the pill, top and bottom: (16 - 24) / 2.
    expect(px(section, 'margin-top')).toBe(-4);
  });

  /*
   * ONE GESTURE, TWO STEPS. A table row has a control step to fill, and the
   * drawing IS the target there; it was a second component with its own size,
   * its own ground and no animation at all.
   */
  test('the row step draws and hits one control step, with no disc to mask a branch', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    const { container } = render(
      <AddPill label="Add to Engineering" sections={sections(() => {})} size="md" layout="inline" />,
    );
    fireEvent.click(mark());
    expect(px(mark(), 'width')).toBe(28);
    expect(px(choices()[0]!, 'width')).toBe(28);
    expect(px(choices()[0]!, 'margin-top')).toBe(0);
    expect(px(container.querySelector('.crewlet-add-pill__sections')!, 'height')).toBe(28);
    // The mark stays: in a row it is a toggle beside the choices, not the
    // thing they grew out of.
    expect(getComputedStyle(mark()).opacity).not.toBe('0');
  });

  /*
   * THE DISC IS A MASK. It is the page's own ground, so the branch it sits on
   * stops at its edge instead of running through the plus. Faded with the rest
   * of the control it was not a mask at all, and the line was drawn through
   * every plus on a resting chart: the QUIET is on the glyph.
   */
  test('the disc is the page ground at full strength, and the plus is what is quiet', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    mount();
    const glyph = mark().querySelector('svg')!;
    expect(getComputedStyle(mark()).opacity).toBe('1');
    expect(Number.parseFloat(getComputedStyle(glyph).opacity)).toBeLessThan(1);
  });

  /*
   * THE ADD IS GREEN, and it is the node ramp's green rather than the brand
   * accent: the console chart draws this control in one hue and nothing else
   * on the chart in it, which is what makes "the green plus" a control a
   * reader can be told to press.
   */
  test('the mark, the pill and the choices are drawn in the node green', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    const { container } = mount();
    fireEvent.click(mark());
    const green = themes.dark.color.node.green;
    expect(channels(getComputedStyle(mark()).color)).toEqual(parseHex(green));
    expect(channels(getComputedStyle(choices()[0]!).color)).toEqual(parseHex(green));
    const pill = container.querySelector('.crewlet-add-pill__sections')!;
    expect(getComputedStyle(pill).borderTopColor).toBe(themes.dark.color.node.greenLine);
    expect(
      getComputedStyle(container.querySelector('.crewlet-add-pill__divider')!).backgroundColor,
    ).toBe(themes.dark.color.node.greenHalo);
  });

  /*
   * WHAT IS PAINTED IS THE PILL, NOT THE TARGET. The section is half again as
   * tall as the pill so a finger can hit it, and a hovered choice used to tint
   * that whole button: a square of green standing four pixels proud of the
   * pill top and bottom, over the branch behind it, on the one gesture that is
   * supposed to read as one pill splitting into three. The overhang is padding
   * and the ground is clipped to the content box, which is the pill's own
   * height, so the tint stops at the pill's edges.
   */
  test('a hovered choice tints the pill and not the target around it', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    mount();
    fireEvent.click(mark());
    const section = choices()[0]!;
    const style = getComputedStyle(section);
    expect(px(section, 'height')).toBe(24);
    // The overhang, top and bottom: (24 - 16) / 2.
    expect(px(section, 'padding-top')).toBe(4);
    expect(px(section, 'padding-bottom')).toBe(4);
    // So the painted box is the pill's own 16, and the ground is held to it.
    expect(style.backgroundClip).toBe('content-box');
  });

  /* A row's step IS the target, so there is no overhang to clip away. */
  test('a row draws no overhang, so its choice fills its own control step', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    render(
      <AddPill label="Add to Engineering" sections={sections(() => {})} size="md" layout="inline" />,
    );
    fireEvent.click(mark());
    expect(px(choices()[0]!, 'padding-top')).toBe(0);
    expect(px(choices()[0]!, 'padding-bottom')).toBe(0);
  });

  /*
   * THE DIVIDER IS INSET AND TAKES NO PRESS. The console chart draws its two
   * lines from a sixth of the pill's height to five sixths of it, so they
   * separate the choices without reaching the pill's own ends, and marks them
   * `pointer-events: none` so the hairline between two choices is not a place
   * a press lands on neither. A `border-left` could not do either: it cannot
   * be shorter than its own box, and the box here is a POINTER TARGET half as
   * tall again as the pill, so the line ran past the pill at both ends.
   */
  test('the dividers are inset in the pill and take no press', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    const { container } = mount();
    fireEvent.click(mark());
    const dividers = container.querySelectorAll('.crewlet-add-pill__divider');
    // Three choices, two lines: one between each pair and none at either end,
    // where a line would be the pill's own edge drawn twice.
    expect(dividers).toHaveLength(2);
    for (const divider of dividers) {
      // The pill is 16 and the drawn line 12: two either end, which is the
      // console chart's own sixth of its pill.
      expect(px(divider, 'height')).toBe(12);
      expect(getComputedStyle(divider).pointerEvents).toBe('none');
    }
    // And a line stands between two choices, never before the first.
    expect(container.querySelector('.crewlet-add-pill__sections')!.firstElementChild).toBe(
      choices()[0],
    );
  });

  /*
   * THE GROUND IS THE NODE'S, AND IT IS OPAQUE. The disc and the pill both
   * hang on the branch their choices add a child to, and the neutral surface
   * step is translucent: on the page's ground alone the control was a hole
   * punched in the chart, and on the card's step alone the branch was drawn
   * through the three marks a reader is choosing between. The page's ground
   * with the card's step over it is what a node itself is painted with.
   */
  test('the disc and the pill carry the node ground, opaque, and a resting edge', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'AddPill/AddPill.css');
      cleanup();
      const { container } = mount();
      // The disc is read AT REST, before anything is pointed at: what it is
      // painted with while a chart is merely being looked at is the promise.
      const disc = getComputedStyle(container.querySelector('.crewlet-add-pill__disc')!);
      const resting = { edge: disc.borderTopColor, fade: disc.transition };
      fireEvent.click(mark());
      const pill = getComputedStyle(container.querySelector('.crewlet-add-pill__sections')!);
      for (const [name, style] of [
        ['disc', disc],
        ['pill', pill],
      ] as const) {
        expect(channels(style.backgroundColor), `${theme} ${name}`).toEqual(
          parseHex(themes[theme].color.surface.background),
        );
        const { r, g, b } = parseHex(themes[theme].color.surface.subtle)!;
        expect(style.backgroundImage, `${theme} ${name}`).toContain(`rgb(${r}, ${g}, ${b})`);
      }
      // The disc's own boundary is drawn at rest, at the separator step, and
      // fades over the console chart's own 150ms.
      expect(channels(resting.edge)).toEqual(parseHex(themes[theme].color.border.default));
      expect(resting.fade).toContain(motion.duration.base);
    }
  });

  /*
   * AND A CHOICE IS ONE INK, whatever its mark arrived painted in. A brand
   * mark carries its own fill, so on a pill whose whole point is that it is
   * drawn in one hue the middle choice of three was the Crewlet figure's
   * purple between two green marks, on every node of the chart.
   */
  test('a mark in a choice takes the pill ink, whatever it arrived as', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    const { container } = render(
      <AddPill
        label="Add to Engineering"
        sections={[
          {
            key: 'agent',
            label: 'Add an agent seat',
            icon: (
              <svg data-testid="brand" className="crewlet-figure">
                <path fill="#7c56ff" d="M0 0h1v1H0z" />
              </svg>
            ),
            onSelect: () => {},
          },
          { key: 'human', label: 'Add a human seat', icon: <Glyph />, onSelect: () => {} },
        ]}
      />,
    );
    // The figure's own stylesheet, which lives in the icons package and sets
    // the brand hue on the mark's own root: the fill alone was overridden by
    // exactly the value it was replacing.
    const own = installCss('.crewlet-figure { color: #7c56ff; }');
    fireEvent.click(mark());
    const path = container.querySelector('.crewlet-add-pill__section svg path')!;
    // The rule beats the presentation attribute the mark arrived with AND the
    // ink the mark's own root publishes, so the fill resolves to the section's
    // own green rather than to the brand purple either way.
    expect(channels(getComputedStyle(path).fill)).toEqual(parseHex(themes.dark.color.node.green));
    own();
  });

  /*
   * AND THE CHOICES CLEAR THE GRAPHICAL FLOOR AT REST, on the ground the pill
   * puts them on, in both themes. The console chart draws them at 0.6, which
   * measures 3.07:1 on the dark node ground and 2.51 on the light one: on the
   * floor where it is not under it, for the one control that adds a child.
   */
  test('a resting choice clears the graphical floor on the pill ground', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'AddPill/AddPill.css');
      cleanup();
      mount();
      fireEvent.click(mark());
      const ground = flatten(
        themes[theme].color.surface.subtle,
        parseHex(themes[theme].color.surface.background)!,
      );
      const measured = contrast(painted(choices()[0]!, hexOf(ground)), ground);
      expect(`${theme}: ${measured.toFixed(2)}`).toBe(`${theme}: ${Math.max(measured, 3).toFixed(2)}`);
    }
  });

  /*
   * AND IT CLEARS 3:1 AT REST. It is a button, and the only one that adds a
   * child: the floor is what it measures when nobody is pointing at it, on
   * the page's ground where the disc puts it and on both card grounds, in both
   * themes. At the accent's ink and 0.55 it measured 2.96 and 2.47.
   */
  test('the resting plus clears the graphical floor on every ground it lands on', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'AddPill/AddPill.css');
      cleanup();
      mount();
      const grounds = [themes[theme].color.surface.background, themes[theme].color.surface.subtle];
      for (const ground of grounds) {
        const ink = painted(mark().querySelector('svg')!, ground);
        const measured = contrast(ink, parseHex(ground)!);
        expect(`${theme} on ${ground}: ${measured.toFixed(2)}`).toBe(
          `${theme} on ${ground}: ${Math.max(measured, 3).toFixed(2)}`,
        );
      }
    }
  });

  test('both controls draw a focus ring, inside their own edge', () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AddPill.css'), 'utf8');
    // Matched over the whole sheet: each of these selectors is also the second
    // half of a grouped rule above it, and what is asserted is that the rule
    // exists for BOTH, which no rendered state can answer (jsdom applies no
    // :focus-visible).
    for (const name of ['mark', 'section']) {
      expect(sheet, name).toMatch(
        new RegExp(
          `^\\.crewlet-add-pill__${name}:focus-visible \\{[^}]*outline: 2px solid var\\(--color-focus\\)[^}]*outline-offset: var\\(--size-focus-ring-inset-offset\\)`,
          'm',
        ),
      );
    }
  });

  /*
   * THE MOUNTED LIFETIME OF A CLOSING PILL IS ITS ANIMATION'S LENGTH. The
   * component cannot read a duration token, so the two are one decision kept
   * in two files, and this is what stops them drifting: a pill unmounted early
   * cuts its own recoil off, and one unmounted late leaves a dead surface over
   * the branch.
   */
  test("the component's own timer is the stylesheet's duration", () => {
    uninstall = installThemed('dark', 'AddPill/AddPill.css');
    mount();
    fireEvent.mouseEnter(mark());
    const pill = document.querySelector('.crewlet-add-pill__sections')!;
    // The shorthand, because jsdom parses `animation` into no longhand of its
    // own: what is read back is the resolved value the cascade left.
    expect(getComputedStyle(pill).animation).toContain(motion.duration.moderate);
    expect(Number.parseFloat(motion.duration.moderate)).toBe(ADD_PILL_MS);
  });

  test('a reader who asked for less gets the pill open or closed and no split', () => {
    const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AddPill.css'), 'utf8');
    const at = sheet.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(at).toBeGreaterThan(-1);
    const guarded = sheet.slice(at, sheet.indexOf('\n}', sheet.indexOf('{', at)));
    expect(guarded).toContain('animation: none');
    expect(guarded).toContain('transition: none');
  });
});
