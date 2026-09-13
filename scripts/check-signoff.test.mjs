import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { findUnsigned, SignoffError } from './check-signoff.mjs';

const directories = [];
after(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test Author',
      GIT_AUTHOR_EMAIL: 'author@example.com',
      GIT_COMMITTER_NAME: 'Test Author',
      GIT_COMMITTER_EMAIL: 'author@example.com',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
    },
  });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'check-signoff-'));
  directories.push(cwd);
  git(cwd, 'init', '--quiet', '--initial-branch=main');
  return cwd;
}

let counter = 0;
function commit(cwd, message, { signed = true } = {}) {
  counter += 1;
  writeFileSync(join(cwd, `file-${counter}.txt`), `${counter}\n`);
  git(cwd, 'add', '.');
  git(cwd, 'commit', '--quiet', ...(signed ? ['--signoff'] : []), '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

describe('findUnsigned', () => {
  it('passes a range in which every commit is signed off', () => {
    const cwd = repository();
    const base = commit(cwd, 'chore: base');
    git(cwd, 'checkout', '--quiet', '-b', 'topic');
    commit(cwd, 'feat: one');
    commit(cwd, 'feat: two');
    const result = findUnsigned({ base, head: 'HEAD', cwd });
    assert.equal(result.checked, 2);
    assert.deepEqual(result.unsigned, []);
  });

  it('reports every commit in the range that has no trailer', () => {
    const cwd = repository();
    const base = commit(cwd, 'chore: base');
    const unsigned = commit(cwd, 'feat: unsigned', { signed: false });
    commit(cwd, 'feat: signed');
    const result = findUnsigned({ base, head: 'HEAD', cwd });
    assert.equal(result.checked, 2);
    assert.deepEqual(result.unsigned, [unsigned]);
    assert.equal(result.rebaseOnto, base);
  });

  it('does not accept a Signed-off-by line quoted in the message body', () => {
    const cwd = repository();
    const base = commit(cwd, 'chore: base');
    const quoted = commit(cwd, 'feat: quoted\n\nSigned-off-by: Someone <someone@example.com>\n\nThe line above is quoted prose.', {
      signed: false,
    });
    assert.deepEqual(findUnsigned({ base, head: 'HEAD', cwd }).unsigned, [quoted]);
  });

  it('does not accept a trailer without an email address', () => {
    const cwd = repository();
    const base = commit(cwd, 'chore: base');
    const malformed = commit(cwd, 'feat: malformed\n\nSigned-off-by: Someone', { signed: false });
    assert.deepEqual(findUnsigned({ base, head: 'HEAD', cwd }).unsigned, [malformed]);
  });

  it('exempts merge commits, which cannot be signed from the merge button', () => {
    const cwd = repository();
    const base = commit(cwd, 'chore: base');
    git(cwd, 'checkout', '--quiet', '-b', 'topic');
    commit(cwd, 'feat: on topic');
    git(cwd, 'checkout', '--quiet', 'main');
    commit(cwd, 'feat: on main');
    git(cwd, 'merge', '--quiet', '--no-ff', '--no-edit', 'topic');
    const result = findUnsigned({ base, head: 'HEAD', cwd });
    assert.equal(result.checked, 2);
    assert.deepEqual(result.unsigned, []);
  });

  it('judges only what the head adds beyond its merge base with the base', () => {
    const cwd = repository();
    commit(cwd, 'chore: old and unsigned', { signed: false });
    const forkPoint = commit(cwd, 'chore: fork point');
    git(cwd, 'checkout', '--quiet', '-b', 'topic');
    commit(cwd, 'feat: topic');
    git(cwd, 'checkout', '--quiet', 'main');
    commit(cwd, 'feat: main moved on', { signed: false });
    const result = findUnsigned({ base: 'main', head: 'topic', cwd });
    assert.equal(result.checked, 1);
    assert.deepEqual(result.unsigned, []);
    assert.equal(result.rebaseOnto, forkPoint);
  });

  it('judges every reachable commit when the base is the all-zero SHA of a new branch', () => {
    const cwd = repository();
    const first = commit(cwd, 'chore: first', { signed: false });
    commit(cwd, 'chore: second');
    const result = findUnsigned({ base: '0'.repeat(40), head: 'HEAD', cwd });
    assert.equal(result.checked, 2);
    assert.deepEqual(result.unsigned, [first]);
    assert.equal(result.rebaseOnto, '--root');
  });

  it('refuses a base that does not resolve rather than passing on nothing', () => {
    const cwd = repository();
    commit(cwd, 'chore: base');
    assert.throws(() => findUnsigned({ base: 'no-such-ref', head: 'HEAD', cwd }), SignoffError);
  });

  it('refuses when no default base exists', () => {
    const cwd = repository();
    commit(cwd, 'chore: base');
    git(cwd, 'branch', '--quiet', '-m', 'topic');
    assert.throws(() => findUnsigned({ head: 'HEAD', cwd }), /no range to judge/);
  });

  it('refuses a shallow range that reaches a parentless commit', () => {
    const origin = repository();
    commit(origin, 'chore: base');
    commit(origin, 'feat: one');
    commit(origin, 'feat: two');
    const clone = mkdtempSync(join(tmpdir(), 'check-signoff-clone-'));
    directories.push(clone);
    git(tmpdir(), 'clone', '--quiet', '--depth=1', `file://${origin}`, clone);
    assert.throws(() => findUnsigned({ base: '0'.repeat(40), head: 'HEAD', cwd: clone }), /shallow clone/);
  });
});
