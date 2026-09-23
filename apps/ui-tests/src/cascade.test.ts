/**
 * The cascade helper's own suite. It is the thing every guard written with it
 * rests on, so what it claims about jsdom is checked here rather than assumed:
 * that a sheet put in this way is cascaded at all, that specificity and source
 * order decide as they do in a browser, that `:empty` is evaluated, that a
 * length token arrives as its number, that a selector list is scored and
 * matched member by member (jsdom does neither, and the harness corrects it),
 * that a pseudo-element is measured on a stand-in only its own rules reach
 * (jsdom computes no style for one), and that a reduced-motion query is
 * answered where it stands, so its stop wins or loses exactly as it would in
 * a browser.
 */
import { afterEach, expect, test } from 'vitest';
import {
  answerForcedColors,
  answerMotion,
  inset,
  installCss,
  installMotion,
  installSheets,
  oneSelectorPerRule,
  pseudoElement,
  px,
  standInPseudoElement,
} from './cascade.js';

let remove: (() => void) | null = null;
afterEach(() => {
  remove?.();
  remove = null;
  document.body.innerHTML = '';
});

test('a sheet put in this way is cascaded, tokens resolved', () => {
  remove = installSheets('Card/Card.css');
  document.body.innerHTML = '<div class="crewlet-card crewlet-card--p-md"></div>';
  // --spacing-4, arrived as its own number rather than as the unresolved
  // var() every other suite in this package would have seen.
  expect(px(document.body.firstElementChild!, 'padding-left')).toBe(16);
});

test('a modifier beats the base rule it shares a specificity with', () => {
  // The rule this helper is for. `.crewlet-card__body` and
  // `.crewlet-card__body--p-none` are both one class, so a padding on the base
  // rule would tie and win on source order, and the modifier would be a class
  // in the markup that changes nothing.
  remove = installSheets('Card/Card.css');
  document.body.innerHTML =
    '<div class="crewlet-card__body crewlet-card__body--p-none"></div>' +
    '<div class="crewlet-card__body crewlet-card__body--p-md"></div>';
  const [none, md] = [...document.body.children];
  expect(px(none!, 'padding-left')).toBe(0);
  expect(px(md!, 'padding-left')).toBe(16);
});

test('an empty box is evaluated by :empty, and a filled one is not', () => {
  remove = installSheets('Card/Card.css');
  document.body.innerHTML =
    '<div class="crewlet-card__header-chrome"></div>' +
    '<div class="crewlet-card__header-chrome"><button type="button">Page</button></div>';
  const [empty, filled] = [...document.body.children];
  expect(getComputedStyle(empty!).display).toBe('none');
  expect(getComputedStyle(filled!).display).toBe('flex');
});

test('inset adds up the chain between two elements', () => {
  remove = installSheets('Card/Card.css');
  document.body.innerHTML =
    '<div class="crewlet-card crewlet-card--p-md"><div class="crewlet-card__body crewlet-card__body--p-md"><p>x</p></div></div>';
  const card = document.querySelector('.crewlet-card')!;
  const text = document.querySelector('p')!;
  // The card's 16 and the body's 16. The card's own one pixel border is not
  // in it: jsdom answers `16px` for every border width in the document.
  expect(inset(text, card)).toBe(32);
  expect(() => inset(card, text)).toThrow();
});

test('a token whose key is camelCase arrives as its number too', () => {
  /*
   * THE BUG THIS EXISTS FOR. `size.targetMin` is written into the stylesheet
   * as `--size-target-min`, and the walk that builds the substitution table
   * used to join the raw JSON keys, so it recorded `--size-targetMin`. The
   * var() was left standing, jsdom dropped the whole declaration, and every
   * rule holding the pointer-target floor measured ZERO: a case asserting a
   * small number passed while nothing at all had been applied. The floor is
   * 24px, and it is what `AddPill` gives the control that adds a node.
   */
  remove = installSheets('AddPill/AddPill.css');
  document.body.innerHTML = '<button class="crewlet-add-pill__mark"></button>';
  expect(px(document.body.firstElementChild!, 'width')).toBe(24);
  expect(px(document.body.firstElementChild!, 'height')).toBe(24);
});

test('a sheet naming a derived token is installed, not dropped whole', () => {
  /*
   * `radius.chip` is `calc({radius.md} - 1px)`, a style-dictionary REFERENCE.
   * Substituted raw it is not CSS at all: css-tree refuses the declaration,
   * jsdom then refuses the WHOLE stylesheet, and every measurement taken
   * through it reads zero. `Tabs.css` names that token, so it is the sheet
   * that could not be installed here at all; what is asserted is a length
   * from somewhere else in the same file, which is only there if the file
   * survived.
   */
  remove = installSheets('Tabs/Tabs.css');
  document.body.innerHTML = '<button class="crewlet-tabs__tab"></button>';
  expect(px(document.body.firstElementChild!, 'min-width')).toBe(24);
});

test('a selector list is scored by the member that matched, as a browser scores it', () => {
  /*
   * jsdom scores a list by its MOST specific member, so the list below would
   * outrank `.p .c` on an element only its `.c` matches, and a reduced-motion
   * stop written as a list would read here as winning while the motion it
   * stops keeps running in a browser. The harness writes one selector to a
   * rule, which is what a browser sees.
   */
  document.body.innerHTML = '<div class="p"><i class="c"></i></div>';
  const c = document.querySelector('.c')!;
  remove = installCss('.p .c { color: red; }\n.c, .q .r .s { color: blue; }');
  expect(getComputedStyle(c).color).toBe('rgb(255, 0, 0)');
});

test('a pseudo-element in a list does not hide the rest of the list', () => {
  // jsdom matches NOTHING with a list holding a pseudo-element; a browser
  // matches every other member as usual.
  document.body.innerHTML = '<i class="c"></i>';
  const c = document.body.firstElementChild!;
  remove = installCss('.c { color: red; }\n.q::before, .c { color: blue; }');
  expect(getComputedStyle(c).color).toBe('rgb(0, 0, 255)');
});

test('a pseudo-element is measured on its stand-in, and only the rules naming it reach it', () => {
  /*
   * A browser never matches a pseudo-element with a selector that does not
   * name it: `.h.h *` reaches the <i> and not `.h::after`. A stand-in that
   * such a rule DID reach would read a catch-all stop as winning while the
   * pseudo-element kept moving (two classes outrank one class and a
   * pseudo-element, which is DataTable's old catch-all exactly), so every
   * other selector is kept off it.
   */
  document.body.innerHTML = '<span class="h"><i></i></span>';
  const host = document.body.firstElementChild!;
  const child = host.querySelector('i')!;
  const after = pseudoElement(host, 'after');
  const before = pseudoElement(host, 'before');
  remove = installCss('.h::after { animation: a 1s; }\n.h::before { animation: b 1s; }\n.h.h * { animation: none; }');
  expect(getComputedStyle(after).animation).toBe('a 1s');
  expect(getComputedStyle(before).animation).toBe('b 1s');
  expect(getComputedStyle(child).animation).toBe('none');
  // Where the pseudo-elements are: first and last among the host's children.
  expect([...host.children].map((each) => each.localName)).toEqual(['crewlet-pseudo-before', 'i', 'crewlet-pseudo-after']);
});

test("a pseudo-element's rules tie and win among themselves as a browser has them do", () => {
  // The stand-in scores what the pseudo-element scores, so a stop for it
  // written above its start loses on source order, and one after it wins.
  document.body.innerHTML = '<i class="a"></i><i class="b"></i>';
  const [a, b] = [...document.body.children].map((host) => pseudoElement(host, 'after'));
  const sheet =
    '@media (prefers-reduced-motion: reduce) { .a::after { animation: none; } }\n.a::after { animation: k 1s; }\n' +
    '.b::after { animation: k 1s; }\n@media (prefers-reduced-motion: reduce) { .b::after { animation: none; } }\n' +
    '.p .b::after { color: red; }\n.b::after { color: blue; }';
  document.body.classList.add('p');
  remove = installCss(answerMotion(sheet, 'reduce'));
  expect(getComputedStyle(a!).animation).toBe('k 1s');
  expect(getComputedStyle(b!).animation).toBe('none');
  // And the more specific one wins, whatever comes after it.
  expect(getComputedStyle(b!).color).toBe('rgb(255, 0, 0)');
  document.body.classList.remove('p');
});

test('a pseudo-element is written as its stand-in, and every other selector is kept off it', () => {
  expect(oneSelectorPerRule('.a::after, .b > .c { x: 1; }\n.d ::before, ::after { y: 2; }', standInPseudoElement)).toBe(
    '\n.a > crewlet-pseudo-after { x: 1; }\n.b > .c:not(crewlet-pseudo-before, crewlet-pseudo-after) { x: 1; }' +
      '\n.d * > crewlet-pseudo-before { y: 2; }\n* > crewlet-pseudo-after { y: 2; }',
  );
  // Any other pseudo-element is left to match nothing, as it did.
  expect(standInPseudoElement('.e::placeholder')).toBe('.e::placeholder');
  const frames = '@keyframes k { 0%, 100% { opacity: 1; } }';
  expect(oneSelectorPerRule(frames, standInPseudoElement)).toBe(frames);
});

test('a list is split where it stands, and a keyframe list is left alone', () => {
  expect(oneSelectorPerRule('.a, .b:not(.c, .d) { x: 1; }\n@media (width < 1024px) { .e, .f { y: 2; } }')).toBe(
    '\n.a { x: 1; }\n.b:not(.c, .d) { x: 1; }\n@media (width < 1024px) {\n.e { y: 2; }\n.f { y: 2; } }',
  );
  const frames = '@keyframes k { 0%, 100% { opacity: 1; } }';
  expect(oneSelectorPerRule(frames)).toBe(frames);
});

test('a motion preference is answered, and the cascade then decides', () => {
  /*
   * jsdom applies no `@media` rule, so without the answer a reduced-motion
   * stop is never in the cascade at all and every element reads as moving.
   * Answered, the stop is where the stylesheet wrote it, and it wins or loses
   * on the specificity and the source order it was written with.
   */
  document.body.innerHTML = '<span class="crewlet-status-dot crewlet-status-dot--info is-pulsing"></span>';
  const ring = pseudoElement(document.body.firstElementChild!, 'after');
  remove = installMotion('no-preference', 'StatusDot/StatusDot.css');
  expect(getComputedStyle(ring).animation).toContain('crewlet-status-dot-pulse');
  remove();
  remove = installMotion('reduce', 'StatusDot/StatusDot.css');
  expect(getComputedStyle(ring).animation).toBe('none');
});

test('an answered query keeps its place, so a stop written too early still loses', () => {
  /*
   * The defect the helper exists to catch, in miniature: the stop names the
   * same selector as the start, so the two tie on specificity, and the stop
   * comes FIRST, so source order hands the tie back to the motion. Read as
   * source, "the block names the selector and says none" passes it.
   */
  const early =
    '@media (prefers-reduced-motion: reduce) { .a { transition: none; } }\n.a { transition: opacity 1s; }\n' +
    '.b { transition: opacity 1s; }\n@media (prefers-reduced-motion: reduce) { .b { transition: none; } }';
  document.body.innerHTML = '<i class="a"></i><i class="b"></i>';
  const [a, b] = [...document.body.children];
  remove = installCss(answerMotion(early, 'reduce'));
  expect(getComputedStyle(a!).transition).toBe('opacity 1s');
  expect(getComputedStyle(b!).transition).toBe('none');
});

test('the other preference drops the block, and every other at-rule stays where it was', () => {
  expect(
    answerMotion('.b { color: red; }\n@media (prefers-reduced-motion: reduce) { .a { animation: none; } }', 'no-preference'),
  ).toBe('.b { color: red; }\n');
  const other = '@media (width < 1024px) { .a { width: 0; } }\n@keyframes k { to { opacity: 0; } }';
  expect(answerMotion(other, 'reduce')).toBe(other);
});

test('a query it cannot answer honestly is refused', () => {
  expect(() =>
    answerMotion('@media (prefers-reduced-motion: reduce) and (width < 1024px) { .a { animation: none; } }', 'reduce'),
  ).toThrow(/cannot answer/);
});

test('a forced-colors block is answered where it stands, and the cascade then decides', () => {
  /*
   * jsdom applies no `@media` rule, so without the answer a forced-colors
   * block is never in the cascade and a suite can only read its source. The
   * block below is one weight short of the rule it has to beat, which is the
   * defect a source read passes and the cascade does not.
   */
  const sheet =
    '.p[data-t] { background: rgb(1, 2, 3); }\n.q[data-t] { background: rgb(1, 2, 3); }\n' +
    '@media (forced-colors: active) { .p { background: CanvasText; } .q[data-t] { background: CanvasText; } }';
  document.body.innerHTML = '<i class="p" data-t="x"></i><i class="q" data-t="x"></i><i class="r"></i>';
  const [p, q, r] = [...document.body.children];
  r!.setAttribute('style', 'background: CanvasText');
  const canvasText = getComputedStyle(r!).backgroundColor;
  remove = installCss(answerForcedColors(sheet, 'active'));
  expect(getComputedStyle(p!).backgroundColor).toBe('rgb(1, 2, 3)');
  expect(getComputedStyle(q!).backgroundColor).toBe(canvasText);
  remove();
  remove = installCss(answerForcedColors(sheet, 'none'));
  expect(getComputedStyle(q!).backgroundColor).toBe('rgb(1, 2, 3)');
});

test('each answerer leaves the other feature’s blocks where they were, and refuses a combined query', () => {
  const both =
    '@media (prefers-reduced-motion: reduce) { .a { animation: none; } }\n' +
    '@media (forced-colors: active) { .a { color: CanvasText; } }';
  expect(answerForcedColors(both, 'active')).toBe(
    '@media (prefers-reduced-motion: reduce) { .a { animation: none; } }\n .a { color: CanvasText; } ',
  );
  expect(answerMotion(both, 'reduce')).toBe(
    ' .a { animation: none; } \n@media (forced-colors: active) { .a { color: CanvasText; } }',
  );
  expect(() =>
    answerForcedColors('@media (forced-colors: active) and (prefers-color-scheme: dark) { .a { color: red; } }', 'active'),
  ).toThrow(/answerForcedColors cannot answer/);
});

test('a calc() jsdom has folded to one length is read as that length, and one it could not fold as 0', () => {
  // jsdom folds `calc(4px * 1.5)` and keeps the wrapper on a gap, so without
  // the unwrap every derived gap in the package measured zero.
  remove = installCss('.a { gap: calc(4px * 1.5); } .b { gap: calc(100% - 4px); } .c { gap: 6px; }');
  document.body.innerHTML = '<i class="a"></i><i class="b"></i><i class="c"></i>';
  const [a, b, c] = [...document.body.children];
  expect(getComputedStyle(a!).gap).toBe('calc(6px)');
  expect(px(a!, 'gap')).toBe(6);
  expect(px(b!, 'gap')).toBe(0);
  expect(px(c!, 'gap')).toBe(6);
});
