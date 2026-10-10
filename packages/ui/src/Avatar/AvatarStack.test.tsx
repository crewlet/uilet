/**
 * Several badges as one mark: what it draws, what it counts, and what it says.
 *
 * The NAME is the case with a reader behind it. A stack is one image to a
 * screen reader, so everything a sighted reader gets from the badges (how many,
 * which kind, who) has to be in those words, the members folded into the chip
 * included, and a person must never be counted as an agent.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installThemed, px, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { AVATAR_SIZES, AvatarStack, avatarStackLabel, type AvatarStackMember } from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/** Spelled without the leading dashes and prefixed at use: the package's
    variable check reads a quoted `--name` in a .tsx file as a declaration. */
const property = (name: string) => `--${name}`;

const AGENTS: AvatarStackMember[] = [
  { name: 'SWE' },
  { name: 'CTO' },
  { name: 'PM' },
  { name: 'AI Systems' },
  { name: 'Frontend' },
  { name: 'DevRel' },
];

describe('what a stack says', () => {
  test('how many, of which kind, and every name, in the order drawn', () => {
    expect(avatarStackLabel(AGENTS.slice(0, 3))).toBe('3 agents: SWE, CTO, PM');
    expect(avatarStackLabel([{ name: 'SWE' }])).toBe('1 agent: SWE');
    expect(avatarStackLabel([{ name: 'Jane Founder', kind: 'human' }])).toBe('1 person: Jane Founder');
    expect(
      avatarStackLabel([
        { name: 'Jane Founder', kind: 'human' },
        { name: 'Ada Byron', kind: 'human' },
      ]),
    ).toBe('2 people: Jane Founder, Ada Byron');
  });

  test('never calls a person an agent: a mixed stack counts each kind', () => {
    // The design's own watchers stack: a person and two agents.
    expect(
      avatarStackLabel([
        { name: 'Jane Founder', kind: 'human' },
        { name: 'CTO', kind: 'agent' },
        { name: 'SWE' },
      ]),
    ).toBe('2 agents and 1 person: Jane Founder, CTO, SWE');
  });

  test('is one image, named with everybody, the members counted in the chip included', () => {
    render(<AvatarStack members={AGENTS} />);
    const stack = screen.getByRole('img');
    expect(stack.getAttribute('aria-label')).toBe('6 agents: SWE, CTO, PM, AI Systems, Frontend, DevRel');
    // One image: the badges and the chip are drawing, and are not read again.
    expect(screen.getAllByRole('img')).toHaveLength(1);
    for (const member of stack.querySelectorAll('.crewlet-avatar-stack__member')) {
      expect(member.getAttribute('aria-hidden')).toBe('true');
    }
  });

  test('a caller can name it for what it means where it stands', () => {
    render(<AvatarStack members={AGENTS.slice(0, 2)} label="Watching: SWE, CTO" />);
    expect(screen.getByRole('img', { name: 'Watching: SWE, CTO' })).toBeDefined();
  });

  test('a decorative stack says nothing, because the words beside it already do', () => {
    const { container } = render(
      <p>
        <AvatarStack members={AGENTS.slice(0, 3)} decorative /> read by 3 agents today
      </p>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    const stack = container.querySelector('.crewlet-avatar-stack')!;
    expect(stack.getAttribute('aria-hidden')).toBe('true');
    expect(stack.getAttribute('aria-label')).toBeNull();
  });
});

describe('what a stack draws', () => {
  test('four badges by default and a count of the rest, in each member’s own kind', () => {
    const members: AvatarStackMember[] = [{ name: 'Jane Founder', kind: 'human' }, ...AGENTS];
    const { container } = render(<AvatarStack members={members} />);
    const badges = [...container.querySelectorAll('.crewlet-avatar')];
    expect(badges.map((badge) => badge.textContent)).toEqual(['JF', 'SW', 'CT', 'PM']);
    expect(badges[0]?.className).toContain('crewlet-avatar--human');
    expect(badges[1]?.className).toContain('crewlet-avatar--agent');
    const more = container.querySelector('.crewlet-avatar-stack__more')!;
    expect(more.textContent).toBe('+3');
    // A number, not somebody: it is not a badge of either kind.
    expect(more.classList.contains('crewlet-avatar')).toBe(false);
    expect(more.className).not.toMatch(/crewlet-avatar--(agent|human)/);
    // Drawn last, so it is the one in front.
    expect(container.querySelector('.crewlet-avatar-stack')!.lastElementChild).toBe(more);
  });

  test('draws no chip while everybody fits, and exactly `max` badges when they do not', () => {
    const { container, rerender } = render(<AvatarStack members={AGENTS.slice(0, 4)} />);
    expect(container.querySelectorAll('.crewlet-avatar')).toHaveLength(4);
    expect(container.querySelector('.crewlet-avatar-stack__more')).toBeNull();
    rerender(<AvatarStack members={AGENTS} max={2} />);
    expect(container.querySelectorAll('.crewlet-avatar')).toHaveLength(2);
    expect(container.querySelector('.crewlet-avatar-stack__more')!.textContent).toBe('+4');
    rerender(<AvatarStack members={AGENTS} max={6} />);
    expect(container.querySelectorAll('.crewlet-avatar')).toHaveLength(6);
    expect(container.querySelector('.crewlet-avatar-stack__more')).toBeNull();
  });

  test('refuses a max that draws nobody or is not a count', () => {
    for (const max of [0, -1, 1.5, Number.NaN]) {
      expect(() => render(<AvatarStack members={AGENTS} max={max} />), String(max)).toThrow(RangeError);
    }
  });

  test('an empty stack is not drawn at all', () => {
    const { container } = render(<AvatarStack members={[]} />);
    expect(container.innerHTML).toBe('');
  });

  test('every badge takes the step, and the chip stands as tall as they do', () => {
    // The themed install leaves a component's own custom property standing,
    // which is the point: what is read is that the chip's box IS the property
    // the component sets from the step, rather than the stylesheet's default.
    uninstall = installThemed('dark', 'Avatar/Avatar.css', 'Avatar/AvatarStack.css');
    for (const [step, box] of Object.entries(AVATAR_SIZES) as Array<[keyof typeof AVATAR_SIZES, number]>) {
      cleanup();
      const { container } = render(<AvatarStack members={AGENTS} size={step} />);
      for (const badge of container.querySelectorAll('.crewlet-avatar')) {
        expect(badge.className, step).toContain(`crewlet-avatar--${step}`);
      }
      const stack = container.querySelector<HTMLElement>('.crewlet-avatar-stack')!;
      expect(stack.style.getPropertyValue(property('crewlet-avatar-stack-size')), step).toBe(`${box}px`);
      const more = getComputedStyle(container.querySelector('.crewlet-avatar-stack__more')!);
      expect(more.height, step).toBe(`var(${property('crewlet-avatar-stack-size')})`);
      expect(more.minWidth, step).toBe(`var(${property('crewlet-avatar-stack-size')})`);
    }
    // The default is sm, and the stylesheet's own default box is sm's, so a
    // stack drawn without the component's inline size is still one height.
    cleanup();
    const { container } = render(<AvatarStack members={AGENTS} />);
    expect(container.querySelector('.crewlet-avatar')!.className).toContain('crewlet-avatar--sm');
    const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AvatarStack.css'), 'utf8');
    expect(sheet).toContain(`${property('crewlet-avatar-stack-size')}: ${AVATAR_SIZES.sm}px`);
  });

  test('the default step shows at least as much of two initials as the design\'s own stack does', () => {
    // A badge shows its box less the next badge's overlap and its cut-out.
    // Two mono initials are 2 x 0.6em plus the badge's 0.04em tracking each,
    // centred. The design draws 22px badges with 9px initials and 0.02em
    // tracking; this kit's type floor is 11px, which is why the step is not
    // the design's nearest.
    const tokens = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../tokens/dist/css/tokens.css'), 'utf8');
    const rem = (name: string) => Number(new RegExp(`--font-size-${name}:\\s*([\\d.]+)rem`).exec(tokens)?.[1] ?? 'NaN') * 16;
    const shown = (box: number, type: number, tracking: number) => {
      const text = 2 * (0.6 + tracking) * type;
      const start = (box - text) / 2;
      return Math.min(1, (box - 6 - 2 - start) / text);
    };
    const design = shown(22, 9, 0.02);
    expect(shown(AVATAR_SIZES.sm, rem('2xs'), 0.04)).toBeGreaterThanOrEqual(design);
    // And the step under it does not, which is what makes sm the default.
    expect(shown(AVATAR_SIZES.xs, rem('2xs'), 0.04)).toBeLessThan(design);
  });

  test('each badge overlaps the one before it by 6px, cut out by a 2px ring of the ground', () => {
    // Through the real cascade, in both palettes, with the badge's own sheet
    // installed too, so a rule of the badge's that re-set a margin or a
    // shadow would be what is read.
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Avatar/Avatar.css', 'Avatar/AvatarStack.css');
      cleanup();
      const { container } = render(<AvatarStack members={AGENTS} />);
      const stack = container.querySelector('.crewlet-avatar-stack')!;
      const members = [...stack.querySelectorAll('.crewlet-avatar-stack__member')];
      expect(members).toHaveLength(5);
      expect(px(members[0]!, 'margin-inline-start'), theme).toBe(0);
      for (const member of members.slice(1)) expect(px(member, 'margin-inline-start'), theme).toBe(-6);
      for (const member of members) {
        expect(getComputedStyle(member).boxShadow, theme).toBe(
          `0 0 0 2px var(${property('crewlet-avatar-stack-ground')})`,
        );
      }
      // The ground is the SHEET by default: every stack the approved design
      // draws stands on it (a page's top bar, a task's side column), and its
      // own cut-out is drawn in the sheet's colour.
      const ground = getComputedStyle(stack).getPropertyValue(property('crewlet-avatar-stack-ground')).trim();
      expect(channels(ground), theme).toEqual(
        parseHex(themeColours(theme).get(property('color-surface-background')) ?? ''),
      );
    }
  });

  test('a stack on a card sets the ground on itself, and the cut-out reads it', () => {
    // The one way to move it: a style or a rule on the stack's own root, since
    // the stack declares the default there and an ancestor's value would be
    // shadowed by it. The caller's `style` reaches that root beside the size
    // the component writes, and every member's cut-out reads the variable.
    uninstall = installThemed('dark', 'Avatar/Avatar.css', 'Avatar/AvatarStack.css');
    const card = `var(${property('color-surface-subtle')})`;
    const { container } = render(
      <AvatarStack
        members={AGENTS.slice(0, 2)}
        style={{ [property('crewlet-avatar-stack-ground')]: card } as CSSProperties}
      />,
    );
    const stack = container.querySelector('.crewlet-avatar-stack')!;
    expect(getComputedStyle(stack).getPropertyValue(property('crewlet-avatar-stack-ground')).trim()).toBe(card);
    expect(getComputedStyle(stack).getPropertyValue(property('crewlet-avatar-stack-size')).trim()).toBe(
      `${AVATAR_SIZES.sm}px`,
    );
    for (const member of stack.querySelectorAll('.crewlet-avatar-stack__member')) {
      expect(getComputedStyle(member).boxShadow).toBe(`0 0 0 2px var(${property('crewlet-avatar-stack-ground')})`);
    }
  });

  test('the chip is a pill of the neutral badge, with figures that line up', () => {
    uninstall = installThemed('dark', 'Avatar/AvatarStack.css');
    const palette = themeColours('dark');
    const { container } = render(<AvatarStack members={AGENTS} />);
    const more = getComputedStyle(container.querySelector('.crewlet-avatar-stack__more')!);
    expect(more.borderRadius).toBe('999px');
    expect(channels(more.backgroundColor)).toEqual(parseHex(palette.get(property('color-surface-elevated')) ?? ''));
    expect(channels(more.color)).toEqual(parseHex(palette.get(property('color-text-secondary')) ?? ''));
    expect(more.fontVariantNumeric).toBe('tabular-nums');
  });

  test('a ring on a member is drawn in the stack as it is alone', () => {
    const { container } = render(<AvatarStack members={[{ name: 'SWE', ring: 'info' }, { name: 'CTO' }]} />);
    const [ringed, plain] = [...container.querySelectorAll('.crewlet-avatar')];
    expect(ringed?.className).toContain('crewlet-avatar--ring-info');
    expect(plain?.className).not.toContain('ring');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>Board</h1>
        <AvatarStack members={AGENTS} />
        <AvatarStack
          members={[
            { name: 'Jane Founder', kind: 'human', src: 'https://example.com/jane.png' },
            { name: 'CTO', ring: 'info' },
          ]}
        />
        <p>
          <AvatarStack members={AGENTS.slice(0, 3)} decorative /> read by 3 agents today
        </p>
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

test('draws an agent member as its character, in its hue', () => {
  const { container } = render(
    <AvatarStack
      members={[
        { name: 'CTO', character: 'hexlet', hue: 'cyan' },
        { name: 'Jane Founder', kind: 'human', character: 'hexlet', hue: 'cyan' },
      ]}
    />,
  );
  const [agent, person] = [...container.querySelectorAll('.crewlet-avatar-stack__member')];
  expect(agent!.querySelector('svg[data-character="hexlet"]')).not.toBeNull();
  expect(agent!.classList).toContain('crewlet-avatar--hue-cyan');
  expect(person!.querySelector('svg[data-character]')).toBeNull();
  expect(person!.textContent).toBe('JF');
});

