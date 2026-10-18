// The built kit, held to what the engine serves it for: a stylesheet that
// paints every theme from files beside it and nowhere else, a bootstrap that
// writes only allowed values, and both under the budgets a page loads before
// it paints. The suite reads dist/, which turbo builds before it runs.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
import { DEFAULT_THEME_ID, themeRegistry } from '@crewlethq/tokens';
import { BUDGETS } from '../scripts/budgets.mjs';

const dist = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'dist');
const css = readFileSync(join(dist, 'kit.css'), 'utf8');
const theme = readFileSync(join(dist, 'theme.js'), 'utf8');

describe('the budgets', () => {
  test('theme.js is under two kilobytes gzipped, because it blocks the first paint', () => {
    assert.ok(gzipSync(theme).length <= BUDGETS.themeGzip, `${gzipSync(theme).length} bytes`);
  });

  test('kit.css is under its gzipped budget', () => {
    assert.ok(gzipSync(css).length <= BUDGETS.cssGzip, `${gzipSync(css).length} bytes`);
  });
});

describe('kit.css', () => {
  test('paints every named theme the tokens ship, under its own attribute', () => {
    const named = themeRegistry.map((entry) => entry.id).filter((id) => id !== DEFAULT_THEME_ID);
    assert.ok(named.length > 0);
    for (const id of named) assert.match(css, new RegExp(`\\[data-palette=["']?${id}["']?\\]`), id);
  });

  test('carries the three-state theme contract and the density steps', () => {
    for (const selector of [/\[data-theme=["']?light/, /\[data-theme=["']?dark/, /\[data-density=["']?compact/, /\[data-density=["']?comfortable/]) {
      assert.match(css, selector);
    }
  });

  test('reaches nothing outside its own directory: every url is a font beside it', () => {
    const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((match) => match[1]);
    assert.ok(urls.length > 0, 'the fonts are referenced');
    for (const url of urls) {
      assert.match(url, /^\.\/fonts\/[a-z0-9-]+\.woff2$/, url);
      assert.ok(existsSync(join(dist, url)), `${url} is in dist`);
    }
    assert.doesNotMatch(css, /@import/);
  });

  test('ships the font license beside the fonts', () => {
    assert.ok(existsSync(join(dist, 'fonts', 'OFL.txt')));
  });
});

/** Runs the built bootstrap in a document of its own, and hands back what it wrote and a way to post to it. */
function bootstrap(hash, { framed = true } = {}) {
  const attributes = new Map();
  const root = {
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
  const listeners = [];
  const window = { location: { hash }, addEventListener: (type, listener) => type === 'message' && listeners.push(listener) };
  window.parent = framed ? {} : window;
  vm.runInNewContext(theme, { window, document: { documentElement: root }, URLSearchParams });
  return { attributes, parent: window.parent, post: (event) => listeners.forEach((listener) => listener(event)) };
}

/** A port that records its listeners and whether it was started. */
function fakePort() {
  const listeners = [];
  return {
    started: false,
    addEventListener: (type, listener) => type === 'message' && listeners.push(listener),
    start() {
      this.started = true;
    },
    deliver: (data) => listeners.forEach((listener) => listener({ data })),
  };
}

describe('theme.js', () => {
  test('writes the appearance from the fragment before anything else runs', () => {
    const { attributes } = bootstrap('#nonce=nonce-0123456789abcdef&theme=light&palette=dusk&density=compact');
    assert.deepEqual(Object.fromEntries(attributes), { 'data-theme': 'light', 'data-palette': 'dusk', 'data-density': 'compact' });
  });

  test('writes nothing it does not allow: a bad value falls back to the bare root', () => {
    const { attributes } = bootstrap('#theme=sepia&palette=%22%5D%7B%7D&density=huge');
    assert.deepEqual(Object.fromEntries(attributes), {});
  });

  test('follows the appearance on the port the parent transfers, and refuses a bad value there too', () => {
    const { attributes, parent, post } = bootstrap('#theme=dark');
    const port = fakePort();
    post({ source: parent, data: { type: 'crewlet.port', bridge: 1 }, ports: [port] });
    assert.equal(port.started, true);
    port.deliver({ type: 'crewlet.theme', mode: 'light', palette: 'iris', density: 'comfortable' });
    assert.deepEqual(Object.fromEntries(attributes), { 'data-theme': 'light', 'data-palette': 'iris', 'data-density': 'comfortable' });
    port.deliver({ type: 'crewlet.theme', mode: 'sepia', palette: 'iris', density: 'normal' });
    assert.equal(attributes.get('data-theme'), 'light');
  });

  test('takes a port only from its parent', () => {
    const { post } = bootstrap('');
    const port = fakePort();
    post({ source: {}, data: { type: 'crewlet.port', bridge: 1 }, ports: [port] });
    assert.equal(port.started, false);
  });

  test('a page opened on its own, with no parent, takes no port at all', () => {
    const { parent, post } = bootstrap('', { framed: false });
    const port = fakePort();
    post({ source: parent, data: { type: 'crewlet.port', bridge: 1 }, ports: [port] });
    assert.equal(port.started, false);
  });
});
