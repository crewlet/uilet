/**
 * The cascade helper's own suite. It is the thing every guard written with it
 * rests on, so what it claims about jsdom is checked here rather than assumed:
 * that a sheet put in this way is cascaded at all, that specificity and source
 * order decide as they do in a browser, that `:empty` is evaluated, and that a
 * length token arrives as its number.
 */
import { afterEach, expect, test } from 'vitest';
import { inset, installSheets, px } from './cascade.js';

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
