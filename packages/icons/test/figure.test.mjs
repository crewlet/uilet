/**
 * The crewlet figure, and the two things it must not put in a document.
 *
 * It carried its motions in a `<style>` element inside the SVG. A style
 * element there applies to the WHOLE document, and a strict
 * Content-Security-Policy refuses it outright, so on a page with one the
 * figure lost every motion at once and nothing said why.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CrewletFigure } from '../dist/index.js';
import { attribute, render } from './support.mjs';

describe('the crewlet figure', () => {
  it('injects no style element, and names its motion in a class', () => {
    const markup = render(CrewletFigure, { motion: 'wave' });
    assert.doesNotMatch(markup, /<style/);
    assert.match(attribute(markup, 'class'), /\bcrewlet-figure\b/);
    assert.match(attribute(markup, 'class'), /\bcrewlet-figure--wave\b/);
  });

  it('carries no style attribute until something asks for one', () => {
    // The colour and the delay both rest in the stylesheet, so the default
    // figure is one fewer thing for a policy to refuse.
    assert.equal(attribute(render(CrewletFigure, {}), 'style'), null);
    assert.match(attribute(render(CrewletFigure, { delay: 2 }), 'style'), /--crewlet-figure-delay:\s*2s/);
    assert.match(attribute(render(CrewletFigure, { color: 'red' }), 'style'), /color:\s*red/);
  });

  it('keeps a class a caller adds', () => {
    assert.match(attribute(render(CrewletFigure, { className: 'hero__figure' }), 'class'), /\bhero__figure\b/);
  });
});
