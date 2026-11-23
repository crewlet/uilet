/**
 * The marks of the third-party tools, which are the one place this design
 * system draws somebody else's colours.
 *
 * The rules that need holding are the ones a reader cannot see: that a mark is
 * decoration until it is named, that the muted state is a class rather than an
 * inline style a strict Content-Security-Policy would refuse, that the
 * monochrome marks and only those take the current text colour, and that two
 * marks on one page do not share an id.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { createHash } from 'node:crypto';

import { CloudGlyph } from '../dist/glyphs.js';
import { CrewletIcon, VENDORS, VendorMark } from '../dist/index.js';
import { extent, markPaths } from '../scripts/mark.mjs';
import { PACKAGE, attribute, render } from './support.mjs';

/** The products whose owners allow no mark here, each drawn as a glyph of its own on a plate. */
const UNMARKED = [['aws', CloudGlyph]];
const UNMARKED_VENDORS = UNMARKED.map(([vendor]) => vendor);

/** The store, ads and analytics products, each drawn with its owner's own logo. */
const GROWTH = [
  'app-store-connect',
  'apple-ads',
  'google-admob',
  'google-ads',
  'google-adsense',
  'google-analytics',
  'google-play',
  'google-search-console',
  'meta-ads',
];

/** The owners' PNGs embedded where they publish no vector, by the SHA-256 of their bytes. */
const RASTERS = {
  'app-store-connect.svg': 'd670ff551a23ada8e5e9db2fbf337697ca28343bcb309c0006bcded12d80ce83',
  'dark/app-store-connect.svg': '3b42a3f2b8510bcd5215bc47176d0587ce4e4109d4fd17e5c06a9c7334fec0ee',
  'meta-ads.svg': 'f10dd0c7ae1dd1317e552d18cebd474785ddc2f25955f345ef0d301d50d9ce82',
};

/** Every shape a drawing paints, with the attributes that place it, in order. */
const shapes = (markup) =>
  [...markup.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)>/g)].map(([, tag, attrs]) =>
    [tag, ...['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'points'].map((name) => attribute(`<${tag}${attrs}>`, name))].join(' '),
  );

describe('the vendor list', () => {
  it('is exactly the drawings the package carries, Crewlet, Copilot and the unmarked tiles', async () => {
    const files = (await readdir(resolve(PACKAGE, 'svg/vendor')))
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -'.svg'.length))
      .sort();
    const borrowed = ['copilot', 'crewlet', ...UNMARKED_VENDORS];
    assert.deepEqual(VENDORS.filter((vendor) => !borrowed.includes(vendor)).sort(), files);
  });

  it("draws Copilot with GitHub's mark, as GitHub's own brand toolkit does", () => {
    // GitHub retired Copilot's standalone logo in 2025 and sets the Invertocat
    // beside the product's name, so the mark is the GitHub drawing itself.
    const paths = (markup) => [...markup.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
    const mark = render(VendorMark, { vendor: 'copilot' });
    assert.deepEqual(paths(mark), paths(render(VendorMark, { vendor: 'github' })));
    assert.match(attribute(mark, 'class') ?? '', /(^| )crewlet-vendor-mark--copilot( |$)/);
  });

  it("draws each unmarked product as its own glyph on a plate of the text colour, and nothing of its owner's", () => {
    // AWS allows no icon without leave, so its tile is a generic glyph on a
    // neutral plate: currentColor only, no hue, and no glyph shared by two tiles.
    const drawn = new Set();
    for (const [vendor, Glyph] of UNMARKED) {
      const mark = render(VendorMark, { vendor, size: 'md' });
      assert.equal(attribute(mark, 'viewBox'), '0 0 24 24', vendor);
      assert.match(attribute(mark, 'class') ?? '', new RegExp(`(^| )crewlet-vendor-mark--${vendor}( |$)`), vendor);
      const plate = /<rect\b[^>]*>/.exec(mark)?.[0] ?? '';
      assert.equal(attribute(plate, 'class'), 'crewlet-vendor-mark__plate', vendor);
      assert.deepEqual(['x', 'y', 'width', 'height'].map((name) => attribute(plate, name) ?? '0'), ['0', '0', '24', '24'], vendor);
      assert.equal(attribute(plate, 'fill'), 'currentColor', vendor);
      assert.equal(attribute(plate, 'fill-opacity'), '0.1', vendor);
      // The glyph is the one svg inside the mark's own.
      const inner = mark.slice(mark.indexOf('<svg', 1));
      assert.equal(attribute(inner, 'class'), 'crewlet-glyph crewlet-vendor-mark__glyph', vendor);
      assert.deepEqual(['x', 'y', 'width', 'height'].map((name) => attribute(inner, name)), ['4', '4', '16', '16'], vendor);
      assert.equal(attribute(inner, 'stroke'), 'currentColor', vendor);
      assert.ok(shapes(inner).length > 0, vendor);
      assert.deepEqual(shapes(inner), shapes(render(Glyph, {})), vendor);
      assert.doesNotMatch(mark, /(fill|stroke)="#/, vendor);
      assert.ok(!drawn.has(Glyph), `${vendor} shares its glyph`);
      drawn.add(Glyph);
    }
  });

  it('draws an unmarked glyph alone, at full size, below 16px and at a size it cannot measure', () => {
    // A plate there would leave the glyph too small to read: in a line of
    // text (1em), in another tile's badge, or at the atlas's 12 and 14px.
    for (const [vendor, Glyph] of UNMARKED) {
      for (const size of [undefined, '1em', 'xs', 'sm', 15, '14px']) {
        const mark = render(VendorMark, { vendor, size });
        assert.doesNotMatch(mark, /crewlet-vendor-mark__plate/, `${vendor} at ${size}`);
        assert.equal(attribute(mark, 'viewBox'), '0 0 24 24', `${vendor} at ${size}`);
        assert.equal(attribute(mark, 'stroke'), 'currentColor', `${vendor} at ${size}`);
        assert.match(attribute(mark, 'class') ?? '', new RegExp(`^crewlet-glyph crewlet-vendor-mark crewlet-vendor-mark--${vendor}$`));
        assert.deepEqual(shapes(mark), shapes(render(Glyph, {})), `${vendor} at ${size}`);
      }
      for (const size of ['md', 16, '16px', 'lg', 36]) {
        assert.match(render(VendorMark, { vendor, size }), /crewlet-vendor-mark__plate/, `${vendor} at ${size}`);
      }
      const titled = render(VendorMark, { vendor, title: vendor });
      assert.equal(attribute(titled, 'role'), 'img', vendor);
      assert.equal(attribute(titled, 'aria-label'), vendor, vendor);
      assert.equal(attribute(titled, 'aria-hidden'), null, vendor);
    }
  });

  it("sets the plate's glyph heavier, so it draws near the weight of a glyph the plate's size", async () => {
    const sheet = await readFile(resolve(PACKAGE, 'src/VendorMark.css'), 'utf8');
    const rule = /\.crewlet-vendor-mark__glyph\s*\{([^}]*)\}/.exec(sheet)?.[1] ?? '';
    const weight = Number(/--crewlet-glyph-stroke:\s*([\d.]+);/.exec(rule)?.[1]);
    // At two thirds, 1.75 x 3 / 2 = 2.625 would match exactly; within a tenth of a unit of it.
    assert.ok(Math.abs((weight * 16) / 24 - 1.75) <= 0.1, `the plate's glyph draws at ${weight}`);
    // The same width plainly, for a page whose style-src refuses the glyph's own style.
    assert.equal(Number(/(?:^|[;\s])stroke-width:\s*([\d.]+);/.exec(rule)?.[1]), weight);
  });

  it("draws Crewlet's own services with the brand mark, never a second copy of it", () => {
    // The built-in services stand beside the apps they replace, and their
    // mark is the one the product is known by: the same paths as CrewletIcon,
    // so a change to the brand mark reaches the catalogue too.
    const paths = (markup) => [...markup.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
    const mark = render(VendorMark, { vendor: 'crewlet' });
    assert.deepEqual(paths(mark), paths(render(CrewletIcon, {})));
    assert.ok(paths(mark).length > 0);
    assert.match(attribute(render(VendorMark, { vendor: 'crewlet', muted: true }), 'class'), /--muted/);
  });

  it('gives each vendor its own drawing', () => {
    // A typo in the map from a vendor to its component draws the wrong
    // company's mark beside the right company's name, and every other rule
    // here would still pass. The vendor's own class is left out, since it
    // names the vendor whatever is drawn; Copilot is GitHub's mark by design.
    const drawn = new Map(
      VENDORS.map((vendor) => [vendor, render(VendorMark, { vendor }).replace(` crewlet-vendor-mark--${vendor}`, '')]),
    );
    const meant = new Set(['copilot github', 'github copilot']);
    for (const [vendor, markup] of drawn) {
      const twins = [...drawn]
        .filter(([other, theirs]) => other !== vendor && theirs === markup && !meant.has(`${vendor} ${other}`))
        .map(([other]) => other);
      assert.deepEqual(twins, [], `${vendor} draws the same mark as ${twins.join(', ')}`);
    }
  });
});

describe('the store, ads and analytics marks', () => {
  it("draw their owners' own logos at every size, never a plate or a glyph", () => {
    for (const vendor of GROWTH) {
      const drawn = new Set();
      for (const size of [undefined, '1em', 12, 'sm', 16, 'md', 24, 36, 48]) {
        const mark = render(VendorMark, { vendor, size });
        assert.doesNotMatch(mark, /crewlet-vendor-mark__plate|crewlet-glyph/, `${vendor} at ${size}`);
        assert.match(attribute(mark, 'class') ?? '', new RegExp(`(^| )crewlet-vendor-mark--${vendor}( |$)`), `${vendor} at ${size}`);
        drawn.add(mark.replace(/\s(width|height)="[^"]*"/g, ''));
      }
      assert.equal(drawn.size, 1, `${vendor} draws a different picture at another size`);
      const titled = render(VendorMark, { vendor, size: 24, title: vendor });
      assert.equal(attribute(titled, 'role'), 'img', vendor);
      assert.equal(attribute(titled, 'aria-label'), vendor, vendor);
    }
  });

  it("embed the owner's PNG byte for byte only where the owner publishes no vector", async () => {
    // App Store Connect's icon and Meta Ads Manager's app icon ship only as PNG.
    for (const file of await vendorFiles()) {
      const source = await readFile(resolve(PACKAGE, 'svg/vendor', file), 'utf8');
      const images = [...source.matchAll(/<image\b[^>]*>/g)].map(([tag]) => tag);
      if (!(file in RASTERS)) {
        assert.deepEqual(images, [], `${file} embeds a raster`);
        continue;
      }
      assert.equal(images.length, 1, file);
      const data = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(attribute(images[0], 'href') ?? '')?.[1];
      assert.ok(data, `${file} embeds something other than one PNG`);
      const bytes = Buffer.from(data, 'base64');
      assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG', file);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), RASTERS[file], file);
    }
    const readme = await readFile(resolve(PACKAGE, 'README.md'), 'utf8');
    for (const sum of Object.values(RASTERS)) assert.ok(readme.includes(sum), `README.md does not record ${sum}`);
  });

  it('carry nothing but drawing: no script, no handler, no style and no reference outside the file', async () => {
    for (const file of await vendorFiles()) {
      const source = await readFile(resolve(PACKAGE, 'svg/vendor', file), 'utf8');
      assert.doesNotMatch(source, /<(script|style|foreignObject|iframe|object|embed|use)\b/i, file);
      assert.doesNotMatch(source, /\son[a-z]+\s*=/i, file);
      assert.doesNotMatch(source, /@import|javascript:/i, file);
      for (const [, url] of source.matchAll(/url\(([^)]*)\)/g)) assert.match(url, /^#[\w-]+$/, `${file} paints from ${url}`);
      for (const [, href] of source.matchAll(/\s(?:xlink:)?href="([^"]*)"/g)) {
        assert.match(href, /^(#[\w-]+|data:image\/png;base64,[A-Za-z0-9+/=]+)$/, `${file} links to ${href.slice(0, 40)}`);
      }
    }
  });
});

describe('the SSH mark', () => {
  const brandPaint = async () => /<g\s+fill="([^"]+)"/.exec(await readFile(resolve(PACKAGE, 'svg/crewlet-icon.svg'), 'utf8'))?.[1];

  it("is Crewlet's own drawing in the brand mark's violet, read from the token with the mark's own value behind it", async () => {
    /*
     * SSH is a protocol, so no vendor publishes a mark for it: the drawing is
     * Crewlet's, and so is its colour. It fills in the current colour and the
     * stylesheet sets that colour to --color-brand-mark, which the tokens'
     * palette suite holds to 3:1 on every theme's grounds. The fallback is the
     * brand mark's own paint, so a consumer without the tokens draws the same
     * violet, and a change to the brand mark that left this behind fails here.
     */
    const source = await readFile(resolve(PACKAGE, 'svg/vendor/ssh.svg'), 'utf8');
    assert.equal(attribute(/<svg\b[^>]*>/.exec(source)[0], 'fill'), 'currentColor');
    assert.doesNotMatch(source, /(fill|stroke)="#/);
    const sheet = await readFile(resolve(PACKAGE, 'src/VendorMark.css'), 'utf8');
    const rule = /\.crewlet-vendor-mark--ssh\s*\{([^}]*)\}/.exec(sheet)?.[1] ?? '';
    const ink = /^\s*color:\s*var\(\s*(--[\w-]+)\s*,\s*(#[0-9a-f]{6})\s*\);\s*$/i.exec(rule);
    assert.ok(ink, 'no rule sets the SSH mark to a token with a fallback');
    assert.equal(ink[1], '--color-brand-mark');
    assert.equal(ink[2], await brandPaint());
  });

  it('is named SSH once it has a title, and draws its own key rather than the brand mark', () => {
    const markup = render(VendorMark, { vendor: 'ssh', title: 'SSH' });
    assert.equal(attribute(markup, 'role'), 'img');
    assert.equal(attribute(markup, 'aria-label'), 'SSH');
    assert.equal(attribute(markup, 'aria-hidden'), null);
    assert.match(attribute(markup, 'class') ?? '', /(^| )crewlet-vendor-mark--ssh( |$)/);
    const paths = (svg) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
    assert.notDeepEqual(paths(markup), paths(render(CrewletIcon, {})));
    assert.match(attribute(render(VendorMark, { vendor: 'ssh', muted: true }), 'class'), /--muted/);
  });

  it('frames the key in the square its own extent fits, centred', async () => {
    // Drawn on the glyph grid and outlined, then framed like Crewlet's mark,
    // so the key draws the slot's full width as the marks beside it do.
    const source = await readFile(resolve(PACKAGE, 'svg/vendor/ssh.svg'), 'utf8');
    const [x, y, width, height] = attribute(/<svg\b[^>]*>/.exec(source)[0], 'viewBox').split(/\s+/).map(Number);
    assert.equal(width, height, 'the frame is square');
    assert.equal(x + width / 2, 12, 'the key is not centred across the glyph grid');
    assert.equal(y + height / 2, 12, 'the key is not centred down the glyph grid');
  });
});

describe('a vendor mark', () => {
  it('draws every vendor, decorative and unfocusable by default', () => {
    for (const vendor of VENDORS) {
      const markup = render(VendorMark, { vendor });
      assert.match(markup, /<(path|circle|image)\b/, vendor);
      assert.equal(attribute(markup, 'aria-hidden'), 'true', vendor);
      assert.equal(attribute(markup, 'focusable'), 'false', vendor);
      assert.equal(attribute(markup, 'role'), null, vendor);
    }
  });

  it('is named and exposed once it has a title, and hidden no longer', () => {
    const markup = render(VendorMark, { vendor: 'slack', title: 'Slack' });
    assert.equal(attribute(markup, 'role'), 'img');
    assert.equal(attribute(markup, 'aria-label'), 'Slack');
    assert.equal(attribute(markup, 'aria-hidden'), null);
  });

  it('carries the muted state as a class, never as a style attribute', () => {
    const muted = render(VendorMark, { vendor: 'gitlab', muted: true });
    assert.match(attribute(muted, 'class'), /\bcrewlet-vendor-mark--muted\b/);
    assert.equal(attribute(muted, 'style'), null);
    assert.doesNotMatch(attribute(render(VendorMark, { vendor: 'gitlab' }), 'class'), /--muted/);
  });

  it('sizes like a glyph, and defaults to one em', () => {
    assert.equal(attribute(render(VendorMark, { vendor: 'slack' }), 'width'), '1em');
    assert.equal(attribute(render(VendorMark, { vendor: 'slack', size: 'lg' }), 'height'), '20px');
    assert.equal(attribute(render(VendorMark, { vendor: 'slack', size: 40 }), 'width'), '40px');
  });

  it('draws the monochrome marks in the current text colour and nobody else in it', () => {
    /*
     * GitHub, Notion, OpenCode, Expo, DigitalOcean, Cursor, OpenAI and Apple each publish one mark,
     * dark on a light ground and light on a dark one, so the current text
     * colour is the vendor's own instruction and a fixed hex would be wrong in
     * one theme whichever was picked. Every other mark is the vendor's own colours, which is the one
     * sanctioned exception to colour carrying state rather than identity, and
     * a mark quietly joining this list is a mark that has lost them.
     */
    const monochrome = ['apple-ads', 'copilot', 'cursor', 'digitalocean', 'expo', 'github', 'notion', 'openai', 'opencode'];
    // Monochrome is the current text colour AND no colour of the mark's own
    // beneath it: Crewlet's drawing is rooted in currentColor, as every
    // illustration is, and paints its brand violet on the group inside. SSH's
    // drawing fills in the current colour too, and its stylesheet sets that
    // colour to the brand mark's violet, which the SSH suite below holds.
    // The unmarked tiles are held above: a plate and a stroke, not a filled mark.
    const inherited = VENDORS.filter((vendor) => {
      if (vendor === 'ssh' || UNMARKED_VENDORS.includes(vendor)) return false;
      const markup = render(VendorMark, { vendor });
      return attribute(markup, 'fill') === 'currentColor' && !/fill="#/.test(markup);
    });
    assert.deepEqual([...inherited].sort(), monochrome);
  });

  it('names its vendor in a class, so a rule can reach one mark', () => {
    for (const vendor of VENDORS.filter((v) => v !== 'crewlet')) {
      const markup = render(VendorMark, { vendor });
      assert.match(attribute(markup, 'class') ?? '', new RegExp(`(^| )crewlet-vendor-mark--${vendor}( |$)`));
    }
  });

  it('draws Mattermost, Qwen, Scaleway and Sentry reversed on the dark themes, as each publishes its mark for a dark ground', async () => {
    // Mattermost's blue under 3:1, Qwen's under 2.5:1, and Scaleway's purple and Sentry's violet
    // under 2:1, on the dark ground; reversed, each is the text's ink. The dark themes are chosen as
    // the tokens choose them: dark is the default, unless the document or the
    // system asks for light.
    const sheet = await readFile(resolve(PACKAGE, 'src/VendorMark.css'), 'utf8');
    const rule = (selectors) => {
      const start = sheet.indexOf(selectors[0]);
      assert.ok(start >= 0, `no rule names ${selectors[0]}`);
      const block = sheet.slice(start, sheet.indexOf('}', start));
      for (const selector of selectors) assert.ok(block.includes(selector), `${selector} is not in the rule`);
      assert.match(block, /\{\s*fill: currentColor;/);
    };
    for (const vendor of ['mattermost', 'qwen', 'scaleway', 'sentry']) {
      rule([`:root[data-theme='dark'] .crewlet-vendor-mark--${vendor}`]);
    }
    const media = sheet.slice(sheet.indexOf('@media not (prefers-color-scheme: light)'));
    assert.ok(media.length < sheet.length, 'the system-dark rule is missing');
    for (const vendor of ['mattermost', 'qwen', 'scaleway', 'sentry']) {
      assert.ok(
        media.slice(0, media.indexOf('}')).includes(`:root:not([data-theme='light']) .crewlet-vendor-mark--${vendor}`),
        `${vendor} is not reversed on a system dark ground`,
      );
    }
    rule([
      `:root:not([data-theme='light']) .crewlet-vendor-mark--mattermost`,
      `:root:not([data-theme='light']) .crewlet-vendor-mark--qwen`,
      `:root:not([data-theme='light']) .crewlet-vendor-mark--scaleway`,
      `:root:not([data-theme='light']) .crewlet-vendor-mark--sentry`,
    ]);
  });

  it('reads no token, because a vendor hue is not ours to theme', async () => {
    /*
     * The other half of the exception. A mark is the one place here that draws
     * somebody else's colours, and the moment one of them is a token it starts
     * moving with a palette decision nobody made about that vendor: a themed
     * Slack aubergine is not Slack's, and the next contrast sweep would have
     * every reason to move it.
     */
    for (const file of await vendorFiles()) {
      const source = await readFile(resolve(PACKAGE, 'svg/vendor', file), 'utf8');
      assert.doesNotMatch(source, /var\(\s*--/, `${file} paints from a token`);
    }
  });

  it('keeps the ids of each mark to itself', () => {
    // Inline SVGs share the document's id space, so two marks on one page with
    // the same gradient id both paint with whichever came first.
    const markup = render(VendorMark, { vendor: 'atlassian' });
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(ids.length > 0);
    for (const id of ids) assert.match(id, /^crewlet-vendor-atlassian/);
  });
});

describe('a vendor mark with a drawing of its own for a dark ground', () => {
  const twoDrawings = ['app-store-connect', 'grok', 'hermes', 'kimi'];

  it('is a vendor that publishes one, and every dark drawing has its light one', async () => {
    const dark = (await readdir(resolve(PACKAGE, 'svg/vendor/dark'))).filter((name) => name.endsWith('.svg')).map((name) => name.slice(0, -4));
    assert.deepEqual(dark.sort(), twoDrawings);
    for (const vendor of dark) assert.ok(VENDORS.includes(vendor), `${vendor} has a dark drawing and no vendor`);
  });

  it('mounts both drawings in one frame, the dark one hidden until a dark theme shows it', () => {
    for (const vendor of twoDrawings) {
      const markup = render(VendorMark, { vendor, size: 24, title: vendor });
      // The frame is the mark: it is named, sized and classed, and the drawings inside are not.
      assert.equal(attribute(markup, 'role'), 'img', vendor);
      assert.equal(attribute(markup, 'aria-label'), vendor, vendor);
      assert.equal(attribute(markup, 'width'), '24px', vendor);
      assert.match(attribute(markup, 'class') ?? '', new RegExp(`(^| )crewlet-vendor-mark--${vendor}( |$)`));
      const inner = [...markup.matchAll(/<svg\b[^>]*>/g)].slice(1).map(([tag]) => tag);
      assert.equal(inner.length, 2, vendor);
      const [light, dark] = inner;
      assert.equal(attribute(light, 'class'), 'crewlet-vendor-mark__light', vendor);
      assert.equal(attribute(light, 'display'), null, vendor);
      assert.equal(attribute(dark, 'class'), 'crewlet-vendor-mark__dark', vendor);
      assert.equal(attribute(dark, 'display'), 'none', vendor);
      for (const tag of inner) assert.equal(attribute(tag, 'width'), '100%', vendor);
      assert.match(attribute(render(VendorMark, { vendor, muted: true }), 'class'), /--muted/);
    }
  });

  it('swaps the drawings on the dark themes, chosen as the tokens choose them', async () => {
    const sheet = await readFile(resolve(PACKAGE, 'src/VendorMark.css'), 'utf8');
    // Hidden by a class too, since a host's `svg { display: block }` beats the attribute.
    assert.match(sheet, /\n\.crewlet-vendor-mark \.crewlet-vendor-mark__dark \{\s*display: none;/);
    const rules = (scope) =>
      ['light', 'dark'].map((part) => new RegExp(`${scope.replace(/[[\]()']/g, '\\$&')} \\.crewlet-vendor-mark__${part} \\{\\s*display: ([a-z]+);`).exec(sheet)?.[1]);
    assert.deepEqual(rules(":root[data-theme='dark']"), ['none', 'inline']);
    const media = sheet.slice(sheet.lastIndexOf('@media not (prefers-color-scheme: light)'));
    assert.ok(media.includes(":root:not([data-theme='light']) .crewlet-vendor-mark__light"), 'the system-dark swap is missing');
    assert.deepEqual(rules(":root:not([data-theme='light'])"), ['none', 'inline']);
  });

  it("draws Grok's two files as xAI publishes them: one drawing, in its black and in white", async () => {
    // xAI asks for its logos exactly as provided, so neither is recoloured.
    const read = (file) => readFile(resolve(PACKAGE, 'svg/vendor', file), 'utf8');
    const [light, dark] = [await read('grok.svg'), await read('dark/grok.svg')];
    assert.deepEqual(markPaths(light), markPaths(dark));
    assert.deepEqual([...new Set([...light.matchAll(/<path\b[^>]*\sfill="([^"]+)"/g)].map(([, fill]) => fill))], ['#0A0A0A']);
    assert.deepEqual([...new Set([...dark.matchAll(/<path\b[^>]*\sfill="([^"]+)"/g)].map(([, fill]) => fill))], ['white']);
  });

  it("draws Kimi's two files as Kimi publishes them: one drawing, its tile and K swapped", async () => {
    const read = (file) => readFile(resolve(PACKAGE, 'svg/vendor', file), 'utf8');
    const [light, dark] = [await read('kimi.svg'), await read('dark/kimi.svg')];
    assert.deepEqual(markPaths(light), markPaths(dark));
    const fills = (source) => [...source.matchAll(/<(?:rect|path)\b[^>]*\sfill="([^"]+)"/g)].map(([, fill]) => fill);
    assert.deepEqual(fills(light), ['black', '#1783FF', 'white']);
    assert.deepEqual(fills(dark), ['white', '#1783FF', 'black']);
  });

  it('keeps the ids of each drawing to itself, so the light one never paints with the dark one', () => {
    const markup = render(VendorMark, { vendor: 'hermes' });
    const [light, dark] = markup.split('class="crewlet-vendor-mark__dark"');
    const ids = (part) => [...part.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(ids(light).length > 0 && ids(dark).length > 0);
    for (const id of ids(light)) assert.match(id, /^crewlet-vendor-hermes__/);
    for (const id of ids(dark)) assert.match(id, /^crewlet-vendor-dark-hermes__/);
  });
});

/** Every vendor drawing, the dark ones as `dark/<vendor>.svg`. */
async function vendorFiles() {
  const directory = resolve(PACKAGE, 'svg/vendor');
  const files = (await readdir(directory)).filter((name) => name.endsWith('.svg'));
  const dark = (await readdir(resolve(directory, 'dark'))).filter((name) => name.endsWith('.svg'));
  return [...files, ...dark.map((name) => `dark/${name}`)];
}

/**
 * The points a path's commands end on, in user units: enough to tell how much
 * of its frame a drawing takes, where a bounding box would need every curve
 * and arc solved. A curve or an arc bulging past its end points is not seen,
 * so the extent read here is never larger than the drawing.
 */
/** The box a clip path's one rectangle or circle encloses, as x, y, width and height. */
function clipBox(clip) {
  const rect = /^\s*<rect\b[^>]*\/>\s*$/.exec(clip)?.[0];
  if (rect) return ['x', 'y', 'width', 'height'].map((name) => Number(attribute(rect, name) ?? 0));
  const circle = /^\s*<circle\b[^>]*\/>\s*$/.exec(clip)?.[0];
  if (!circle) return null;
  const [cx, cy, r] = ['cx', 'cy', 'r'].map((name) => Number(attribute(circle, name) ?? 0));
  return [cx - r, cy - r, 2 * r, 2 * r];
}

function anchors(d) {
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const points = [];
  let at = 0;
  // An arc's two flags are one digit each and may be written run together
  // ("0 01.4.4"), so they are read a character at a time.
  const flag = () => {
    while (/[\s,]/.test(d[at] ?? '')) at += 1;
    return Number(d[at++]);
  };
  const number = () => {
    const match = /^[\s,]*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/i.exec(d.slice(at));
    if (!match) throw new Error(`no number at ${at} in ${d.slice(at, at + 12)}`);
    at += match[0].length;
    return Number(match[1]);
  };
  const more = () => /^[\s,]*[-.\d]/.test(d.slice(at));
  let command = 'M';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  while (at < d.length) {
    const letter = /^[\s,]*([A-Za-z])/.exec(d.slice(at));
    if (letter) {
      command = letter[1];
      at += letter[0].length;
    } else if (!more()) break;
    const upper = command.toUpperCase();
    const relative = command !== upper;
    if (upper === 'Z') {
      [x, y] = [startX, startY];
      continue;
    }
    const args = Array.from({ length: arity[upper] }, (_, i) => (upper === 'A' && (i === 3 || i === 4) ? flag() : number()));
    if (upper === 'H') x = relative ? x + args[0] : args[0];
    else if (upper === 'V') y = relative ? y + args[0] : args[0];
    else {
      const [ex, ey] = args.slice(-2);
      x = relative ? x + ex : ex;
      y = relative ? y + ey : ey;
    }
    if (upper === 'M') {
      [startX, startY] = [x, y];
      command = relative ? 'l' : 'L';
    }
    points.push([x, y]);
  }
  return points;
}

describe('a vendor mark in its square', () => {
  it('fills its frame, so the marks in a catalogue stand at one weight', async () => {
    /*
     * GitLab's press-kit file framed the logo in a 380 unit square with the
     * logo 186 units across, and drew at half the size of every mark beside
     * it (10px in a 20px slot). Every drawing's own end points span at least
     * four fifths of its frame's longer side, and none falls outside it. Four
     * fifths rather than the whole, because end points sit inside the curves
     * between them: Figma's round shapes fill their frame and their end points
     * span 83 percent of it.
     * A clipped path is measured inside the frame, once its clip is held to it
     * (Hermes's portrait runs past its tile, which clips it).
     */
    for (const file of await vendorFiles()) {
      const source = await readFile(resolve(PACKAGE, 'svg/vendor', file), 'utf8');
      const [x, y, width, height] = attribute(/<svg\b[^>]*>/.exec(source)[0], 'viewBox').split(/\s+/).map(Number);
      const clips = new Map();
      for (const [tag, clip] of source.matchAll(/<clipPath\b[^>]*>([\s\S]*?)<\/clipPath>/g)) {
        const box = clipBox(clip);
        assert.ok(box, `${file} clips to a shape other than a rectangle or a circle, which this test cannot measure`);
        const [cx, cy, cw, ch] = box;
        assert.ok(cx >= x && cy >= y && cx + cw <= x + width && cy + ch <= y + height, `${file} clips to a box outside its frame`);
        clips.set(attribute(tag, 'id'), box);
      }
      const clipped = new Set([...source.matchAll(/<g\b[^>]*\sclip-path="[^"]*"[^>]*>([\s\S]*?)<\/g>/g)].flatMap(([, group]) => markPaths(group)));
      const clamp = (value, low, size) => Math.min(Math.max(value, low), low + size);
      const points = markPaths(source).flatMap((d) =>
        clipped.has(d) ? anchors(d).map(([px, py]) => [clamp(px, x, width), clamp(py, y, height)]) : anchors(d),
      );
      // An embedded image paints its own box, or the box of the clip it is drawn through.
      for (const [tag] of source.matchAll(/<image\b[^>]*>/g)) {
        let [ix, iy, iw, ih] = ['x', 'y', 'width', 'height'].map((name) => Number(attribute(tag, name) ?? 0));
        const clip = clips.get(/url\(#([^)]+)\)/.exec(attribute(tag, 'clip-path') ?? '')?.[1]);
        if (clip) [ix, iy, iw, ih] = clip;
        points.push([ix, iy], [ix + iw, iy + ih]);
      }
      // A tile drawn as a rect is part of the drawing (Kimi's); a clip's rect is not.
      for (const [tag] of source.replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, '').matchAll(/<rect\b[^>]*>/g)) {
        const [rx, ry, rw, rh] = ['x', 'y', 'width', 'height'].map((name) => Number(attribute(tag, name) ?? 0));
        points.push([rx, ry], [rx + rw, ry + rh]);
      }
      const xs = points.map(([px]) => px);
      const ys = points.map(([, py]) => py);
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      assert.ok(span / Math.max(width, height) >= 0.8, `${file} draws ${Math.round((span / Math.max(width, height)) * 100)} percent of its frame`);
      // A fiftieth of the frame: Atlassian's own drawing runs a third of a
      // unit past its 24 unit frame, which no reader sees.
      const slack = Math.max(width, height) * 0.02;
      assert.ok(Math.min(...xs) >= x - slack && Math.max(...xs) <= x + width + slack, `${file} draws outside its frame across`);
      assert.ok(Math.min(...ys) >= y - slack && Math.max(...ys) <= y + height + slack, `${file} draws outside its frame down`);
    }
  });

  it("frames Crewlet's mark in the square its own extent fits, centred", async () => {
    /*
     * The wide file keeps artwork margins round the mark, and fitted to a
     * square slot it drew 17 by 9 pixels where the marks beside it drew 20 by
     * 20. The vendor mark frames the same paths in the square the mark's own
     * extent fits, so it draws the slot's full width.
     */
    const mark = extent(markPaths(await readFile(resolve(PACKAGE, 'svg/crewlet-icon.svg'), 'utf8')));
    const [x, y, width, height] = attribute(render(VendorMark, { vendor: 'crewlet' }), 'viewBox').split(/\s+/).map(Number);
    assert.equal(width, height, 'the frame is square');
    assert.ok(x <= mark.left && x + width >= mark.right, 'the frame crops the mark across');
    assert.ok(y <= mark.top && y + height >= mark.bottom, 'the frame crops the mark down');
    const off = (edge, low, high) => Math.abs(edge + width / 2 - (low + high) / 2);
    assert.ok(off(x, mark.left, mark.right) <= 2, 'the mark is not centred across');
    assert.ok(off(y, mark.top, mark.bottom) <= 2, 'the mark is not centred down');
    assert.ok(width / (mark.right - mark.left) <= 1.01, 'the frame leaves air beside the mark');
    // Every other vendor keeps its own file's frame.
    assert.equal(attribute(render(VendorMark, { vendor: 'slack' }), 'viewBox'), '0 0 24 24');
  });
});
