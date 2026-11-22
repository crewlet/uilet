/**
 * The Google Analytics logos a Crewlet surface shows beside Google Analytics
 * data. Google's branding policy allows only its own files, unaltered, so the
 * files here are held to the bytes Google serves and to the record of them.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { PACKAGE } from './support.mjs';

const DIRECTORY = resolve(PACKAGE, 'attribution/google-analytics');

/** The horizontal lockup for a light ground and for a dark one, as the policy page offers them. */
const LOGOS = ['lockup_ic_Analytics_horiz_272px_clr.png', 'lockup_ic_Analytics_horiz_272px_wht.png'];

describe('the Google Analytics logos', () => {
  it("are Google's two horizontal files and nothing else", async () => {
    const files = (await readdir(DIRECTORY)).filter((file) => file !== 'SHA256SUMS').sort();
    assert.deepEqual(files, LOGOS);
  });

  it('match the checksums recorded beside them, so no byte was altered', async () => {
    const sums = (await readFile(resolve(DIRECTORY, 'SHA256SUMS'), 'utf8')).trim().split('\n');
    assert.deepEqual(sums.map((line) => line.split(/\s+/)[1]).sort(), LOGOS);
    for (const line of sums) {
      const [sum, file] = line.split(/\s+/);
      const bytes = await readFile(resolve(DIRECTORY, file));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), sum, file);
    }
  });

  it("are Google's 1519 by 402 PNGs, which hold the policy's 154 by 50 minimum at a 50px height", async () => {
    for (const file of LOGOS) {
      const bytes = await readFile(resolve(DIRECTORY, file));
      assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG', file);
      const [width, height] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
      assert.deepEqual([width, height], [1519, 402], file);
      assert.ok(Math.round((50 * width) / height) >= 154, file);
    }
  });

  it('ship in the package, and TRADEMARKS.md records them with the policy they follow', async () => {
    const manifest = JSON.parse(await readFile(resolve(PACKAGE, 'package.json'), 'utf8'));
    // TRADEMARKS.md is the files' only record of their terms, so it ships with them.
    assert.ok(manifest.files.includes('attribution'));
    assert.ok(manifest.files.includes('TRADEMARKS.md'));
    assert.equal(manifest.exports['./attribution/*'], './attribution/*');
    const record = await readFile(resolve(PACKAGE, 'TRADEMARKS.md'), 'utf8');
    assert.match(record, /https:\/\/developers\.google\.com\/analytics\/terms\/branding-policy/);
    for (const file of LOGOS) assert.ok(record.includes(file), `TRADEMARKS.md does not record ${file}`);
  });
});
