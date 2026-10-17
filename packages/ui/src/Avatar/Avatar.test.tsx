/**
 * What the badge says, and what it deliberately does not.
 *
 * The initials rule is the one with the most call sites behind it: half the
 * names this draws are handles, so a split on whitespace alone turns a roster
 * of `backend-engineer`, `sre_lead` and `cs-lead` into a column of single
 * letters.
 *
 * The OUTLINE is the other: an agent is a squircle and a person a circle, and
 * that is the only thing telling them apart, so the kind, the corner ladder,
 * the ring and the status badge are measured through the cascade where jsdom
 * can answer for them and read off the stylesheet where it cannot (it applies
 * no `@supports` block, no mask and resolves no `calc()`).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { font } from '@crewlethq/tokens';
import { MARK_ON_FILL, parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installSheets, installThemed, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { KeyGlyph } from '@crewlethq/icons/glyphs';
import { NODE_HUES } from '../utils/nodeHue.js';
import {
  AVATAR_CHARACTER_FULL_DETAIL,
  AVATAR_CORNER_RATIO,
  AVATAR_SIZES,
  AVATAR_STATUS_LABELS,
  AVATAR_STATUSES,
  Avatar,
  avatarCorner,
  avatarTint,
  avatarInitialsName,
  getInitials,
  type AvatarKind,
  type AvatarRing,
  type AvatarStatus,
  type AvatarTone,
} from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

const here = dirname(fileURLToPath(import.meta.url));
const SHEET = readFileSync(resolve(here, 'Avatar.css'), 'utf8');
/** The stylesheet without its comments, so prose about a rule is never read as one. */
const RULES = SHEET.replace(/\/\*[\s\S]*?\*\//g, '');

/** Spelled without the leading dashes and prefixed at use: the package's
    variable check reads a quoted `--name` in a .tsx file as a declaration. */
const property = (name: string) => `--${name}`;

const KINDS: AvatarKind[] = ['agent', 'human'];
const TONES: AvatarTone[] = ['neutral', 'seeded'];
const RINGS: AvatarRing[] = ['brand'];

/** The token each ring is drawn in: the accent, for selected. */
const RING_FILL: Record<AvatarRing, string> = {
  brand: 'color-brand-accent',
};

/** The state fill each status badge stands on. */
const STATUS_FILL: Record<AvatarStatus, string> = {
  working: 'color-feedback-info',
  needs: 'color-feedback-warning',
  stopped: 'color-feedback-danger',
};

describe('getInitials', () => {
  test('splits on whitespace, hyphen, underscore and dot', () => {
    expect(getInitials('Carlos Diaz')).toBe('CD');
    expect(getInitials('backend-engineer')).toBe('BE');
    expect(getInitials('sre_lead')).toBe('SL');
    expect(getInitials('carlos.diaz')).toBe('CD');
  });

  test('a single word still gives two letters: at its case humps, or its first two', () => {
    /*
     * The org chart names its seats in one word, and one letter each made the
     * CEO and the CTO the same C. The artboard draws CE, SW, PM and DR.
     */
    expect(getInitials('CEO')).toBe('CE');
    expect(getInitials('CTO')).toBe('CT');
    expect(getInitials('SWE')).toBe('SW');
    expect(getInitials('PM')).toBe('PM');
    // Two words run together, which the case says: the first letter of each.
    expect(getInitials('DevRel')).toBe('DR');
    expect(getInitials('McCall')).toBe('MC');
    // One word in one case: its first two letters, capitalised.
    expect(getInitials('Acme')).toBe('AC');
    expect(getInitials('planner')).toBe('PL');
    // More than two humps still gives two letters.
    expect(getInitials('DevRelOps')).toBe('DR');
    // Words still win over humps: a name of two words is read as two words.
    expect(getInitials('DevRel lead')).toBe('DL');
  });

  test('a one-character name is that character', () => {
    expect(getInitials('x')).toBe('X');
    expect(getInitials(' q ')).toBe('Q');
  });

  test('answers a question mark rather than nothing at all', () => {
    expect(getInitials()).toBe('?');
    expect(getInitials('   ')).toBe('?');
    expect(getInitials('_._')).toBe('?');
  });

  test('keeps an astral character whole', () => {
    // charAt would hand back half a surrogate pair, which renders as U+FFFD.
    expect(getInitials('𝒜cme team')).toBe('𝒜T');
    expect(getInitials('𝒜𝒞')).toBe('𝒜𝒞');
  });
});

describe('the kind', () => {
  test('an agent is the default, and each kind is its own class', () => {
    const { container } = render(
      <>
        <Avatar name="Software Engineer" />
        <Avatar name="Software Engineer" kind="agent" />
        <Avatar name="Jane Founder" kind="human" />
      </>,
    );
    const [unmarked, agent, human] = [...container.querySelectorAll('.crewlet-avatar')];
    expect(unmarked?.className).toContain('crewlet-avatar--agent');
    expect(agent?.className).toContain('crewlet-avatar--agent');
    expect(human?.className).toContain('crewlet-avatar--human');
    expect(human?.className).not.toContain('crewlet-avatar--agent');
  });

  test('an agent is set in the mono face and drawn with a corner; a person in the sans face and round', () => {
    // Through the cascade, with the family and the circle token resolved from
    // @crewlethq/tokens, so a later rule that re-set either would be what the
    // test reads.
    uninstall = installSheets('Avatar/Avatar.css');
    const { container } = render(
      <>
        <Avatar name="Software Engineer" kind="agent" />
        <Avatar name="Jane Founder" kind="human" />
      </>,
    );
    const [agent, human] = [...container.querySelectorAll('.crewlet-avatar')].map((badge) => getComputedStyle(badge));
    // jsdom serialises a family list with double quotes whatever it was
    // written with, so both sides are read in that one spelling.
    const family = (list: string | undefined) => (list ?? '').replaceAll("'", '"');
    expect(family(agent?.fontFamily)).toBe(family(font.family.mono));
    expect(family(human?.fontFamily)).toBe(family(font.family.sans));
    expect(human?.borderRadius).toBe('50%');
    expect(agent?.borderRadius).toBe(`calc(var(${property('crewlet-avatar-size')}) * ${AVATAR_CORNER_RATIO})`);
  });

  test('an image keeps its kind, its ring and its status, and so do the initials it degrades to', () => {
    // Whether somebody has uploaded a photo says nothing about what they are
    // or what they are doing.
    render(
      <>
        <Avatar name="Jane Founder" kind="human" ring="brand" src="https://example.com/jane.png" />
        <Avatar name="Ada Byron" status="needs" src="https://example.com/ada.png" />
      </>,
    );
    const image = screen.getByRole('img', { name: 'Jane Founder' });
    expect(image.className).toContain('crewlet-avatar--human');
    expect(image.className).toContain('crewlet-avatar--ring-brand');
    fireEvent.error(image);
    const initials = screen.getByRole('img', { name: 'Jane Founder avatar' });
    expect(initials.textContent).toBe('JF');
    expect(initials.className).toContain('crewlet-avatar--human');
    expect(initials.className).toContain('crewlet-avatar--ring-brand');

    const asking = screen.getByRole('img', { name: 'Ada Byron, needs you' });
    expect(asking.className).toContain('crewlet-avatar--notched');
    fireEvent.error(asking);
    const degraded = screen.getByRole('img', { name: 'Ada Byron avatar, needs you' });
    expect(degraded.textContent).toBe('AB');
    expect(degraded.parentElement!.querySelector('.crewlet-avatar__status--needs')).not.toBeNull();
  });

  test('there is no dashed badge, in any combination, in the markup or in the stylesheet', () => {
    // One structural cue: a person is the circle. The dashed edge that used to
    // mark a human seat was a second answer to the same question, and the two
    // could disagree.
    const { container } = render(
      <>
        {KINDS.flatMap((kind) =>
          TONES.flatMap((tone) =>
            [undefined, ...RINGS].flatMap((ring) => [
              <Avatar key={`${kind}${tone}${ring}`} name="Ada Byron" kind={kind} tone={tone} ring={ring} />,
              <Avatar
                key={`${kind}${tone}${ring}-image`}
                name="Ada Byron"
                kind={kind}
                tone={tone}
                ring={ring}
                src="https://example.com/ada.png"
              />,
            ]),
          ),
        )}
      </>,
    );
    const badges = [...container.querySelectorAll('.crewlet-avatar')];
    expect(badges).toHaveLength(KINDS.length * TONES.length * (RINGS.length + 1) * 2);
    for (const badge of badges) expect(badge.className).not.toMatch(/dashed|--square|--circle|--solid|--brand\b/);
    expect(SHEET).not.toContain('dashed');
  });
});

describe("an agent's corner", () => {
  /** Every rule in the stylesheet that sets a corner, by its selector. */
  const cornerRules = () =>
    [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((match) => /(^|;|\s)border-radius\s*:/.test(match[2] ?? ''))
      .map((match) => ({ selector: (match[1] ?? '').trim(), body: match[2] ?? '' }));

  test('is ONE proportion of the box, stated once in the stylesheet and equal to the exported ratio', () => {
    // THE OLD DEFECT'S GUARD. A step table in the stylesheet beside a
    // numeric table in the component was two ladders, and they disagreed:
    // `size={80}` drew a squarer badge than `size="lg"` at half its width.
    // So no step rule may set a corner: the size is all a step sets.
    const rules = cornerRules();
    // The status badge is the one other corner, and it is a circle whatever
    // the face's size, so it reads no ladder.
    expect(rules.map((rule) => rule.selector)).toEqual([
      '.crewlet-avatar--agent',
      '.crewlet-avatar--agent',
      '.crewlet-avatar--human',
      '.crewlet-avatar__status',
    ]);
    const ratio = /border-radius:\s*calc\(var\(--crewlet-avatar-size\)\s*\*\s*([\d.]+)\)/.exec(rules[0]!.body)?.[1];
    expect(Number(ratio)).toBe(AVATAR_CORNER_RATIO);
    // Every step sets the one size property the corner reads, to its own box.
    for (const [step, box] of Object.entries(AVATAR_SIZES)) {
      const rule = new RegExp(`\\.crewlet-avatar--${step}\\s*\\{([^}]*)\\}`).exec(RULES)?.[1] ?? '';
      expect(rule, step).toContain(`${property('crewlet-avatar-size')}: ${box}px`);
      expect(rule, step).not.toContain('border-radius');
    }
  });

  test("is the approved design's own ladder, within a pixel at every size it draws", () => {
    // The artboards' agent badges, box and corner: 7px at 24 and 9px at 30 is
    // the pair the ratio was read from, and the rest have to agree with it.
    const design: Array<[number, number]> = [
      [18, 5],
      [20, 6],
      [22, 7],
      [24, 7],
      [26, 8],
      [28, 8],
      [30, 9],
      [44, 13],
    ];
    // The widest is 22px, which the design draws at 7 and the ratio at 6.38.
    for (const [box, corner] of design) expect(Math.abs(avatarCorner(box) - corner), `${box}px`).toBeLessThan(0.625);
    // And at the four steps it is the 6/8/9/12 the design implies there.
    const steps = Object.values(AVATAR_SIZES).map((box) => Math.round(avatarCorner(box)));
    expect(steps).toEqual([6, 8, 9, 12]);
  });

  test('grows with the box and is never squarer at a bigger size than at a smaller one', () => {
    for (let pixels = 12; pixels <= 200; pixels += 1) {
      expect(avatarCorner(pixels)).toBeGreaterThan(avatarCorner(pixels - 1));
      expect(avatarCorner(pixels) / pixels).toBeCloseTo(avatarCorner(pixels - 1) / (pixels - 1), 10);
    }
    expect(avatarCorner(80)).toBeGreaterThan(avatarCorner(AVATAR_SIZES.lg));
  });

  test('a numeric size goes through the same rule as a step, by the same property', () => {
    const { container } = render(
      <>
        <Avatar name="A" size="xs" />
        <Avatar name="B" size={64} />
        <Avatar name="C" size={80} kind="human" />
      </>,
    );
    const [step, measured, round] = [...container.querySelectorAll<HTMLElement>('.crewlet-avatar')];
    expect(step?.className).toContain('crewlet-avatar--xs');
    expect(step?.style.getPropertyValue(property('crewlet-avatar-size'))).toBe('');
    expect(measured?.style.getPropertyValue(property('crewlet-avatar-size'))).toBe('64px');
    // No corner of its own and no box of its own: the stylesheet draws both
    // from that property, exactly as it does for a step.
    expect(measured?.style.borderRadius).toBe('');
    expect(measured?.style.width).toBe('');
    // 0.36 of the box, so two initials stay inside it.
    expect(measured?.style.fontSize).toBe('23px');
    expect(round?.style.borderRadius).toBe('');
  });

  test('is a whole squircle where the browser draws one, and only for an agent', () => {
    // A superellipse corner at 0.29 of the box stands half as deep as the
    // design's arc; at half the box it stands within 0.13px of it at 24px.
    const at = RULES.indexOf('@supports (corner-shape: squircle)');
    expect(at).toBeGreaterThan(-1);
    const block = /^@supports[^{]*\{\s*([^{}]+)\{([^{}]*)\}\s*\}/.exec(RULES.slice(at));
    expect(block?.[1]?.trim()).toBe('.crewlet-avatar--agent');
    const declarations = (block?.[2] ?? '').split(';').map((one) => one.trim()).filter(Boolean);
    expect(declarations.sort()).toEqual(['border-radius: var(--radius-circle)', 'corner-shape: squircle']);
    // The arithmetic the comment claims, so a change to the ratio has to face it.
    const arc = AVATAR_CORNER_RATIO * (1 - Math.SQRT1_2);
    const squircle = 0.5 * (1 - 2 ** -0.25);
    expect(Math.abs(arc - squircle) * 24).toBeLessThan(0.15);
  });
});

describe('the ring', () => {
  test('is selected and nothing else: a state is never a ring', () => {
    // A ring in a state's hue round a plate in the agent's own hue put two
    // colours on one small mark. The stylesheet draws no state ring, and the
    // type takes none.
    expect(RULES).not.toMatch(/ring-(info|warning|danger|success)/);
    // @ts-expect-error a state is a status, never a ring
    const state: AvatarRing = 'danger';
    expect(state).toBe('danger');
  });

  test('is a class, and there is none unless one is asked for', () => {
    const { container } = render(
      <>
        <Avatar name="Resting" />
        {RINGS.map((ring) => (
          <Avatar key={ring} name={ring} ring={ring} />
        ))}
      </>,
    );
    const [resting, ...ringed] = [...container.querySelectorAll('.crewlet-avatar')];
    expect(resting?.className).not.toContain('ring');
    expect(ringed.map((badge) => /crewlet-avatar--ring-(\w+)/.exec(badge.className)?.[1])).toEqual(RINGS);
  });

  test('is a 1.5px line 2px out, in the state fill, and wins over every other rule on the badge', () => {
    // Through the real cascade in both palettes, over the badge alone, over a
    // picture and over a badge in a stack, which draws a shadow of its own:
    // the ring is an outline precisely so that nothing else a badge draws can
    // take it away.
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Avatar/Avatar.css', 'Avatar/AvatarStack.css');
      const palette = themeColours(theme);
      for (const ring of RINGS) {
        cleanup();
        const { container } = render(
          <>
            <Avatar name="Software Engineer" ring={ring} />
            <Avatar name="Jane Founder" kind="human" ring={ring} src="https://example.com/jane.png" />
            <span className="crewlet-avatar-stack">
              <Avatar className="crewlet-avatar-stack__member" name="CTO" />
              <Avatar className="crewlet-avatar-stack__member" name="PM" ring={ring} />
            </span>
          </>,
        );
        const ringed = [...container.querySelectorAll('.crewlet-avatar')].filter((badge) =>
          badge.className.includes(`ring-${ring}`),
        );
        expect(ringed).toHaveLength(3);
        const fill = parseHex(palette.get(property(RING_FILL[ring])) ?? '');
        expect(fill, `${theme} ${ring}`).not.toBeNull();
        for (const badge of ringed) {
          const drawn = getComputedStyle(badge);
          expect(drawn.outlineStyle, `${theme} ${ring}`).toBe('solid');
          expect(drawn.outlineWidth, `${theme} ${ring}`).toBe('1.5px');
          expect(drawn.outlineOffset, `${theme} ${ring}`).toBe('2px');
          expect(channels(drawn.outlineColor), `${theme} ${ring}`).toEqual(fill);
        }
        // The one in the stack keeps the stack's cut-out as well.
        expect(getComputedStyle(ringed[2]!).boxShadow).toContain('2px');
      }
    }
  });

  test('a badge with no ring draws no line', () => {
    uninstall = installThemed('dark', 'Avatar/Avatar.css');
    const { container } = render(<Avatar name="Resting" />);
    expect(getComputedStyle(container.querySelector('.crewlet-avatar')!).outlineStyle).not.toBe('solid');
  });
});

describe('the status', () => {
  test('is a corner badge per status, and an idle badge has none', () => {
    const { container } = render(
      <>
        <Avatar name="Idle" />
        {AVATAR_STATUSES.map((status) => (
          <Avatar key={status} name={status} status={status} />
        ))}
      </>,
    );
    expect(AVATAR_STATUSES).toEqual(['working', 'needs', 'stopped']);
    const [idle, ...framed] = [...container.children];
    expect(idle!.className).toContain('crewlet-avatar');
    expect(idle!.querySelector('.crewlet-avatar__status')).toBeNull();
    expect(framed.map((frame) => frame.className)).toEqual(AVATAR_STATUSES.map(() => 'crewlet-avatar-frame'));
    expect(framed.map((frame) => /crewlet-avatar__status--(\w+)/.exec(frame.innerHTML)?.[1])).toEqual([...AVATAR_STATUSES]);
    for (const frame of framed) {
      expect(frame.querySelector('.crewlet-avatar')!.className).toContain('crewlet-avatar--notched');
      expect(frame.querySelector('.crewlet-avatar__status')!.getAttribute('aria-hidden')).toBe('true');
    }
  });

  test('draws a different shape for each status, in the glyph ink', () => {
    // Shape first: a status read only by its hue is lost to somebody who
    // cannot separate the hues, and in forced-colors mode every fill is one
    // system colour.
    const { container } = render(
      <>
        {AVATAR_STATUSES.map((status) => (
          <Avatar key={status} name={status} status={status} />
        ))}
      </>,
    );
    const glyphs = [...container.querySelectorAll('.crewlet-avatar__status > svg')];
    expect(glyphs).toHaveLength(AVATAR_STATUSES.length);
    expect(new Set(glyphs.map((glyph) => glyph.innerHTML)).size).toBe(AVATAR_STATUSES.length);
    for (const glyph of glyphs) {
      expect(glyph.getAttribute('viewBox')).toBe('0 0 14 14');
      expect(glyph.innerHTML).toContain('currentColor');
    }
  });

  test('is said in the name of a badge that names itself, and not at all by a decorative one', () => {
    render(
      <>
        <Avatar name="Software Engineer" status="stopped" character="gemlet" hue="cyan" />
        <span>
          <Avatar name="Product Manager" status="working" decorative /> Product Manager
        </span>
      </>,
    );
    expect(screen.getAllByRole('img').map((badge) => badge.getAttribute('aria-label'))).toEqual([
      `Software Engineer avatar, ${AVATAR_STATUS_LABELS.stopped}`,
    ]);
    expect(AVATAR_STATUS_LABELS).toEqual({ working: 'working', needs: 'needs you', stopped: 'stopped' });
  });

  test("the frame is the face's box and takes the caller's class and style", () => {
    const { container } = render(
      <Avatar name="Software Engineer" size="lg" status="working" className="row-badge" style={{ marginLeft: 4 }} />,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toBe('crewlet-avatar-frame row-badge');
    expect(frame.style.getPropertyValue(property('crewlet-avatar-size'))).toBe(`${AVATAR_SIZES.lg}px`);
    expect(frame.style.marginLeft).toBe('4px');
    const face = frame.querySelector('.crewlet-avatar') as HTMLElement;
    expect(face.className).not.toContain('row-badge');
    expect(face.style.marginLeft).toBe('');
  });

  test('a badge with a status draws no ring, since the notch is cut from the outline the ring follows', () => {
    const { container } = render(<Avatar name="Software Engineer" ring="brand" status="needs" />);
    expect(container.innerHTML).not.toContain('ring-');
  });

  test("stands on the state's fill in the inverse ink, the pairs the palette suite measures", () => {
    // THE STYLESHEET'S PAIRS ARE THE GATE'S. @crewlethq/tokens holds each
    // [ink, fill] in MARK_ON_FILL at 3:1 over every ground; a badge drawn on
    // a fill or in an ink the table does not list is one nothing measures.
    const pairs = AVATAR_STATUSES.map((status) => [property('color-text-inverse'), property(STATUS_FILL[status])]);
    expect(pairs).toEqual(MARK_ON_FILL.map(([ink, fill]) => [ink, fill]));
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Avatar/Avatar.css');
      cleanup();
      const palette = themeColours(theme);
      const token = (name: string) => parseHex(palette.get(property(name)) ?? '');
      const { container } = render(
        <>
          {AVATAR_STATUSES.map((status) => (
            <Avatar key={status} name={status} status={status} />
          ))}
        </>,
      );
      const badges = [...container.querySelectorAll('.crewlet-avatar__status')];
      badges.forEach((badge, index) => {
        const drawn = getComputedStyle(badge);
        const status = AVATAR_STATUSES[index]!;
        expect(channels(drawn.backgroundColor), `${theme} ${status}`).toEqual(token(STATUS_FILL[status]));
        expect(channels(drawn.color), `${theme} ${status}`).toEqual(token('color-text-inverse'));
        expect(drawn.position, `${theme} ${status}`).toBe('absolute');
      });
    }
  });

  test('cuts the notch with a mask centred where the badge sits', () => {
    // jsdom applies no mask, so the rule is read off the stylesheet: the cut
    // and the badge share one centre and one size.
    const notch = /\.crewlet-avatar--notched\s*\{([^}]*)\}/.exec(RULES)?.[1] ?? '';
    expect(notch).toContain('-webkit-mask-image: radial-gradient(');
    expect(notch).toContain('mask-image: radial-gradient(');
    expect(notch).toMatch(/circle at var\(--crewlet-avatar-status-centre\) var\(--crewlet-avatar-status-centre\)/);
    expect(notch).toMatch(/--crewlet-avatar-status-centre:\s*calc\(\s*100% \+ var\(--crewlet-avatar-status-overhang\) - var\(--crewlet-avatar-status-size\) \/ 2\s*\)/);
    const badge = /\.crewlet-avatar__status\s*\{([^}]*)\}/.exec(RULES)?.[1] ?? '';
    expect(badge).toContain('right: calc(var(--crewlet-avatar-status-overhang) * -1)');
    expect(badge).toContain('width: var(--crewlet-avatar-status-size)');
  });
});

describe('the tone', () => {
  test('is neutral by default: no identity hue is spent without being asked for', () => {
    render(<Avatar name="Carlos Diaz" />);
    const badge = screen.getByRole('img', { name: 'Carlos Diaz avatar' });
    expect(badge.className).toContain('crewlet-avatar--neutral');
    expect(badge.className).not.toContain('tint-');
  });

  test("the neutral badge is the design's: the raised rung, the strong hairline, the secondary ink", () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Avatar/Avatar.css');
      cleanup();
      const palette = themeColours(theme);
      const { container } = render(<Avatar name="Carlos Diaz" />);
      const drawn = getComputedStyle(container.querySelector('.crewlet-avatar')!);
      const token = (name: string) => parseHex(palette.get(property(name)) ?? '');
      expect(channels(drawn.backgroundColor), theme).toEqual(token('color-surface-elevated'));
      expect(channels(drawn.borderTopColor), theme).toEqual(token('color-border-strong'));
      expect(channels(drawn.color), theme).toEqual(token('color-text-secondary'));
    }
  });

  test('a seeded badge is stable for one seed and spread across seeds', () => {
    const seeds = ['ceo', 'cto', 'swe', 'sre-lead', 'pm'];
    for (const seed of seeds) expect(avatarTint(seed)).toBe(avatarTint(seed));
    expect(new Set(seeds.map(avatarTint)).size).toBeGreaterThan(1);
    render(<Avatar name="Carlos Diaz" tone="seeded" colorSeed="ceo" />);
    expect(screen.getByRole('img').className).toContain(`crewlet-avatar--tint-${avatarTint('ceo')}`);
  });

  test('the accent is never a fill: selected is a ring, and the stylesheet paints no badge with it', () => {
    const fills = [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) =>
      /background[^;]*--color-brand-accent/.test(match[2] ?? ''),
    );
    expect(fills).toEqual([]);
  });
});

describe('Avatar', () => {
  test('decorative is hidden, because the name is already printed beside it', () => {
    const { container } = render(
      <span>
        <Avatar name="Carlos Diaz" decorative />
        Carlos Diaz
      </span>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    const badge = container.querySelector('.crewlet-avatar')!;
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.getAttribute('aria-label')).toBeNull();
  });

  test('the initials are set on the line every other word is, and still fit the box', () => {
    /*
     * THE BADGE IS A BOX THAT CENTRES ONE LINE, so a leading of its own bought
     * nothing a reader can see: the ink lands in the same place whichever step
     * it takes, and the step it takes now is the document's, read off the
     * document's own rule rather than named here.
     *
     * What DOES have to hold is that the line still fits: each step pairs its
     * box with a type step so two initials sit inside the badge, and a leading
     * that outgrew the square would push them out of it.
     */
    const base = readFileSync(resolve(here, '../../../tokens/dist/css/base.css'), 'utf8');
    const tokens = readFileSync(resolve(here, '../../../tokens/dist/css/tokens.css'), 'utf8');
    const documentLeading = /(?:^|\})\s*body\s*\{[^}]*line-height:\s*var\((--[\w-]+)\)/.exec(base)?.[1];
    expect(documentLeading).toBeTruthy();
    const root = /\.crewlet-avatar\s*\{([^}]*)\}/.exec(RULES)?.[1] ?? '';
    expect(root).toContain(`line-height: var(${documentLeading ?? ''})`);

    const leading = Number(new RegExp(`${documentLeading ?? ''}:\\s*([\\d.]+)`).exec(tokens)?.[1] ?? '0');
    expect(leading).toBeGreaterThan(0);
    /** The type step a size rule names, in pixels. */
    const typeStep = (step: string) => {
      const rule = new RegExp(`\\.crewlet-avatar--${step}\\s*\\{([^}]*)\\}`).exec(RULES)?.[1] ?? '';
      const named = /font-size:\s*var\((--[\w-]+)\)/.exec(rule)?.[1];
      if (named === undefined) throw new Error(`the ${step} step names no font size`);
      // Type is emitted in `rem` against the browser's own root, which neither
      // the tokens' baseline nor this package resets.
      const value = new RegExp(`${named}:\\s*(\\d*\\.?\\d+)rem`).exec(tokens)?.[1];
      if (value === undefined) throw new Error(`@crewlethq/tokens emits no ${named}`);
      return Number(value) * 16;
    };
    for (const [step, box] of Object.entries(AVATAR_SIZES)) {
      expect(typeStep(step) * leading).toBeLessThanOrEqual(box);
    }
  });

  test('a broken image degrades to the initials rather than to a broken glyph', () => {
    render(<Avatar name="Carlos Diaz" src="https://example.com/gone.png" />);
    const image = screen.getByRole('img', { name: 'Carlos Diaz' });
    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Carlos Diaz avatar' }).textContent).toBe('CD');
  });

  test('a decorative image carries no alt text to read', () => {
    const { container } = render(<Avatar name="Carlos Diaz" src="https://example.com/c.png" decorative />);
    const image = container.querySelector('img')!;
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('aria-hidden')).toBe('true');
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>People</h1>
        <Avatar name="Software Engineer" status="working" />
        <Avatar name="Jane Founder" kind="human" ring="brand" />
        <Avatar name="Ada Byron" kind="human" src="https://example.com/ada.png" status="needs" />
        <Avatar name="Product Manager" character="crewlet" hue="rose" status="stopped" />
        <p>
          <Avatar name="Carlos Diaz" decorative /> Carlos Diaz
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

/*
 * An agent an operator gave a character and a hue is drawn as that character,
 * in that hue. The suite holds the three things a reader relies on: the face
 * is the chosen character and nothing else, the hue is the chosen one and
 * every hue has its plate, and what the badge SAYS is unchanged by any of it.
 */
describe('an agent drawn as its character', () => {
  const characterOf = (container: HTMLElement) => container.querySelector('svg[data-character]');

  test('draws the chosen character in place of the initials', () => {
    const { container } = render(<Avatar name="Backend Engineer" character="hexlet" hue="cyan" />);
    expect(characterOf(container)?.getAttribute('data-character')).toBe('hexlet');
    expect(container.textContent).toBe('');
  });

  test('wears its hue on a plate of the same hue, and the neutral plate without one', () => {
    const tinted = render(<Avatar name="SWE" character="octlet" hue="amber" />).container.firstElementChild!;
    expect(tinted.classList).toContain('crewlet-avatar--hue-amber');
    expect(tinted.classList).not.toContain('crewlet-avatar--neutral');
    cleanup();
    const plain = render(<Avatar name="SWE" character="octlet" />).container.firstElementChild!;
    expect(plain.classList).toContain('crewlet-avatar--neutral');
  });

  test('says what any badge says: the name, or nothing when decorative', () => {
    render(<Avatar name="Backend Engineer" character="hexlet" hue="cyan" />);
    expect(screen.getByRole('img', { name: 'Backend Engineer avatar' })).toBeTruthy();
    cleanup();
    const { container } = render(<Avatar name="Backend Engineer" character="hexlet" decorative />);
    expect(container.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild!.getAttribute('role')).toBeNull();
  });

  test('is an agent\'s face only: a person keeps the circle and the initials', () => {
    const { container } = render(<Avatar name="Jane Founder" kind="human" character="hexlet" hue="cyan" />);
    expect(characterOf(container)).toBeNull();
    expect(container.textContent).toBe('JF');
  });

  test('wins over an image, since it is the face an operator chose', () => {
    const { container } = render(
      <Avatar name="Backend Engineer" character="foxlet" hue="rose" src="https://example.com/b.png" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(characterOf(container)?.getAttribute('data-character')).toBe('foxlet');
  });

  test('drops the keyline under the size it can be seen at, and keeps it from there up', () => {
    const detail = (size: number | 'lg') =>
      characterOf(render(<Avatar name="SWE" character="gemlet" size={size} />).container)?.getAttribute('data-detail');
    expect(detail('lg')).toBe('compact');
    cleanup();
    expect(detail(AVATAR_CHARACTER_FULL_DETAIL - 1)).toBe('compact');
    cleanup();
    expect(detail(AVATAR_CHARACTER_FULL_DETAIL)).toBe('full');
  });

  test('draws every character', () => {
    for (const character of CREWLET_CHARACTERS) {
      const { container } = render(<Avatar name="Seat" character={character} hue="blue" />);
      expect(characterOf(container)?.getAttribute('data-character'), character).toBe(character);
      cleanup();
    }
  });

  /*
   * ITS SLITS SHOW THE PLATE, whatever surrounds the badge. A face cut with a
   * mask is paint a host stylesheet can repaint, and a mask is found by id
   * across the page, so two badges rendered apart could draw one face. The
   * character cuts its face into its own paths instead, at both details.
   */
  test('draws its character as paths alone, with no mask or id for the page to reach', () => {
    for (const character of CREWLET_CHARACTERS) {
      for (const size of ['lg', AVATAR_CHARACTER_FULL_DETAIL] as const) {
        const { container } = render(<Avatar name="Seat" character={character} hue="blue" size={size} />);
        const svg = characterOf(container)!;
        for (const element of svg.querySelectorAll('*')) expect(['g', 'path'], character).toContain(element.tagName);
        expect(svg.querySelector('[id], [mask], [clip-path]'), character).toBeNull();
        cleanup();
      }
    }
  });

  test('has a plate for every hue, drawn from that hue\'s own steps', () => {
    // Matched rather than compared, so the package's variable check does not
    // take a token name written out here for one this suite declares.
    const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Avatar.css'), 'utf8');
    for (const hue of NODE_HUES) {
      const body = new RegExp(`\\.crewlet-avatar--hue-${hue}\\s*\\{([^}]*)\\}`).exec(sheet)?.[1] ?? '';
      expect(body, hue).toMatch(new RegExp(`background:\\s*var\\(--color-node-${hue}-fill\\)`));
      expect(body, hue).toMatch(new RegExp(`border-color:\\s*var\\(--color-node-${hue}-line\\)`));
      expect(body, hue).toMatch(new RegExp(`color:\\s*var\\(--color-node-${hue}\\)`));
    }
  });
});

describe('an agent badge drops the word its shape already says', () => {
  test('a leading "agent" word is not where the initials come from', () => {
    expect(avatarInitialsName('Agent CEO', 'agent')).toBe('CEO');
    expect(avatarInitialsName('agent-cto', 'agent')).toBe('cto');
    expect(avatarInitialsName('Agent', 'agent')).toBe('Agent');
    // Only a LEADING word, and only the whole word.
    expect(avatarInitialsName('Support Agent', 'agent')).toBe('Support Agent');
    expect(avatarInitialsName('Agentic Ops', 'agent')).toBe('Agentic Ops');
    // A person called Agent Smith is a circle, and the word is their name.
    expect(avatarInitialsName('Agent Smith', 'human')).toBe('Agent Smith');
    render(
      <>
        <Avatar name="Agent CEO" />
        <Avatar name="Agent CTO" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Agent CEO avatar' }).textContent).toBe('CE');
    expect(screen.getByRole('img', { name: 'Agent CTO avatar' }).textContent).toBe('CT');
  });
});

describe('a badge with a glyph for a face', () => {
  test('draws the glyph in place of the initials and keeps its name', () => {
    render(<Avatar name="token:reader" kind="human" icon={<KeyGlyph size="sm" />} />);
    const badge = screen.getByRole('img', { name: 'token:reader avatar' });
    expect(badge.textContent).toBe('');
    expect(badge.classList.contains('crewlet-avatar--icon')).toBe(true);
    expect(badge.querySelector('.crewlet-avatar__icon svg')).not.toBeNull();
  });

  test('an agent character still wins over it', () => {
    render(<Avatar name="Agent PM" character="crewlet" icon={<KeyGlyph size="sm" />} />);
    expect(screen.getByRole('img', { name: 'Agent PM avatar' }).querySelector('.crewlet-avatar__icon')).toBeNull();
  });
});

describe('the mark', () => {
  test('draws a glyph on the corner, in the notch a status uses, and keeps the face', () => {
    const { container } = render(<Avatar name="Miles" kind="human" mark={<KeyGlyph size="xs" />} />);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.className).toBe('crewlet-avatar-frame');
    const face = frame.querySelector('.crewlet-avatar')!;
    expect(face.className).toContain('crewlet-avatar--notched');
    expect(face.textContent).toBe('MI');
    const corner = frame.querySelector('.crewlet-avatar__status')!;
    expect(corner.className).toBe('crewlet-avatar__status crewlet-avatar__status--mark');
    expect(corner.getAttribute('aria-hidden')).toBe('true');
    expect(corner.querySelector('svg')).not.toBeNull();
  });

  test('gives way to a status: one corner, and what an agent is doing comes first', () => {
    const { container } = render(<Avatar name="Agent PM" status="working" mark={<KeyGlyph size="xs" />} />);
    expect(container.querySelectorAll('.crewlet-avatar__status')).toHaveLength(1);
    expect(container.querySelector('.crewlet-avatar__status--mark')).toBeNull();
    expect(container.querySelector('.crewlet-avatar__status--working')).not.toBeNull();
  });

  test('is said after the name by a badge that names itself, and not at all by a decorative one', () => {
    const key = <KeyGlyph size="xs" />;
    render(
      <>
        <Avatar name="Miles" kind="human" mark={key} markLabel="signed in with an API token" />
        <Avatar name="Lee Park" kind="human" mark={key} />
        <span>
          <Avatar name="Miles" kind="human" mark={key} markLabel="signed in with an API token" decorative /> Miles
        </span>
      </>,
    );
    expect(screen.getAllByRole('img').map((badge) => badge.getAttribute('aria-label'))).toEqual([
      'Miles avatar, signed in with an API token',
      'Lee Park avatar',
    ]);
  });

  test('an image says the mark in its alternative text', () => {
    const key = <KeyGlyph size="xs" />;
    render(<Avatar name="Miles" kind="human" src="data:image/png;base64," mark={key} markLabel="via a token" />);
    expect(screen.getByRole('img').getAttribute('alt')).toBe('Miles, via a token');
  });

  test('a marked badge draws no ring, since the notch is cut from the outline the ring follows', () => {
    const { container } = render(<Avatar name="Miles" kind="human" ring="brand" mark={<KeyGlyph size="xs" />} />);
    expect(container.innerHTML).not.toContain('ring-');
  });

  test("is drawn quiet, in the neutral badge's raised rung, strong hairline and secondary ink", () => {
    // A MARK IS NOT A STATE, so it spends none of a state's fills: the corner
    // reads as part of the face it sits on, not as an alarm.
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Avatar/Avatar.css');
      cleanup();
      const palette = themeColours(theme);
      const token = (name: string) => parseHex(palette.get(property(name)) ?? '');
      const { container } = render(<Avatar name="Miles" kind="human" mark={<KeyGlyph size="xs" />} />);
      const drawn = getComputedStyle(container.querySelector('.crewlet-avatar__status--mark')!);
      expect(channels(drawn.backgroundColor), theme).toEqual(token('color-surface-elevated'));
      expect(channels(drawn.outlineColor), theme).toEqual(token('color-border-strong'));
      expect(channels(drawn.color), theme).toEqual(token('color-text-secondary'));
      expect(drawn.position, theme).toBe('absolute');
    }
  });

  test('passes axe with a named and a decorative marked badge', async () => {
    const key = <KeyGlyph size="xs" />;
    const { container } = render(
      <>
        <Avatar name="Miles" kind="human" mark={key} markLabel="signed in with an API token" />
        <span>
          <Avatar name="Miles" kind="human" mark={key} decorative /> Miles
        </span>
      </>,
    );
    const result = await axe.run(container);
    expect(result.violations).toEqual([]);
  });
});
