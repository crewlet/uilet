// Fails unless every non-merge commit a range adds carries a Signed-off-by
// trailer. The trailer is how a contributor certifies the Developer
// Certificate of Origin in ./DCO over their commit (`git commit -s` writes
// it), so a commit without one is a contribution nobody certified.
//
//   node scripts/check-signoff.mjs [<base> [<head>]]
//
// <base> defaults to upstream/main, then origin/main, then main, whichever
// the checkout has first; <head> defaults to HEAD. A <base> of forty zeros
// (what a push that creates a branch reports as its previous tip) judges
// every commit reachable from <head>.
//
// Presence is checked, not identity. The trailer is deliberately not matched
// against the commit author: the DCO's clauses (b) and (c) cover passing on
// work somebody else wrote, which is exactly a commit whose author and signer
// differ, and bots sign off under a different address than the one GitHub
// authors their commits with.
//
// Merge commits are exempt: neither `git merge` nor the merge button offers a
// chance to sign one, and a merge carries no change of its own to certify.
//
// The trailer is read from git's parsed trailer block (%(trailers)), never
// from the raw message, so a Signed-off-by line quoted in the body of a
// commit message is not mistaken for a certification.

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ZERO_SHA = /^0{40}$/;
const SIGN_OFF = /^Signed-off-by: .+ <[^\s@]+@[^\s@]+>\s*$/m;
const DEFAULT_BASES = ['upstream/main', 'origin/main', 'main'];

export class SignoffError extends Error {}

function git(args, { cwd, allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new SignoffError(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return { ok: result.status === 0, stdout: result.stdout.trim() };
}

function isCommit(ref, cwd) {
  return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd, allowFailure: true }).ok;
}

function lines(text) {
  return text.split('\n').filter(Boolean);
}

/**
 * Returns the commits in the range that lack a Signed-off-by trailer, and how
 * many commits were judged. Throws SignoffError when the range cannot be
 * judged at all, because passing on a range nobody looked at is a claim about
 * nothing.
 */
export function findUnsigned({ base, head = 'HEAD', cwd = process.cwd() } = {}) {
  if (!git(['rev-parse', '--git-dir'], { cwd, allowFailure: true }).ok) {
    throw new SignoffError('not inside a git repository, so there is no history to judge');
  }

  let resolvedBase = base;
  if (resolvedBase === undefined) {
    resolvedBase = DEFAULT_BASES.find((candidate) => isCommit(candidate, cwd));
    if (resolvedBase === undefined) {
      throw new SignoffError(
        `none of ${DEFAULT_BASES.join(', ')} resolves in this checkout, so there is no range to judge. Run: git fetch origin main, or pass <base> explicitly`,
      );
    }
  }
  if (!isCommit(head, cwd)) {
    throw new SignoffError(`"${head}" does not name a commit in this checkout. Fetch it first (git fetch --unshallow)`);
  }

  let range;
  let rebaseOnto;
  if (ZERO_SHA.test(resolvedBase)) {
    range = [head];
    rebaseOnto = '--root';
  } else {
    if (!isCommit(resolvedBase, cwd)) {
      throw new SignoffError(
        `"${resolvedBase}" does not name a commit in this checkout. Fetch it first (git fetch --unshallow)`,
      );
    }
    // The merge base rather than the base ref: both select the same commits,
    // but the repair command below names this SHA, and a rebase onto a stale
    // fork's own main would re-sign commits the contributor never wrote.
    const forkPoint = git(['merge-base', resolvedBase, head], { cwd }).stdout;
    range = [`${forkPoint}..${head}`];
    rebaseOnto = forkPoint;
  }

  // A shallow clone rewrites its graft boundary to have no parents, so a merge
  // commit there reads as an ordinary one and would be failed for lacking a
  // trailer it may never carry. A range that reaches a parentless commit in a
  // shallow clone cannot tell a real root commit from a truncated merge.
  const shallow = git(['rev-parse', '--is-shallow-repository'], { cwd }).stdout === 'true';
  if (shallow && lines(git(['rev-list', '--max-parents=0', ...range], { cwd }).stdout).length > 0) {
    throw new SignoffError(
      'this range reaches a commit with no parents in a shallow clone, which cannot be told apart from a merge whose parents were cut away. Run: git fetch --unshallow',
    );
  }

  const commits = lines(git(['rev-list', '--no-merges', ...range], { cwd }).stdout);
  const unsigned = commits.filter((sha) => {
    const trailers = git(['show', '-s', '--format=%(trailers:key=Signed-off-by,only,unfold)', sha], { cwd }).stdout;
    return !SIGN_OFF.test(trailers);
  });
  return { checked: commits.length, unsigned, range: range[0], rebaseOnto };
}

function main(argv) {
  if (argv.length > 2 || argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write('usage: node scripts/check-signoff.mjs [<base> [<head>]]\n');
    process.exitCode = argv.length > 2 ? 1 : 0;
    return;
  }
  const [base, head] = argv;
  const { checked, unsigned, range, rebaseOnto } = findUnsigned({ base, head });
  if (unsigned.length > 0) {
    const listing = lines(git(['log', '--no-walk', '--format=%h %s', ...unsigned]).stdout)
      .map((line) => `  ${line}`)
      .join('\n');
    throw new SignoffError(
      [
        'commits without a Signed-off-by trailer:',
        listing,
        '',
        'Every commit certifies the Developer Certificate of Origin (see DCO and CONTRIBUTING.md).',
        'Sign new commits with: git commit -s',
        `Repair the commits above, which rewrites them, with: git rebase --signoff ${rebaseOnto}`,
      ].join('\n'),
    );
  }
  process.stdout.write(`check-signoff: ${checked} commit(s) in ${range}, all signed off\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof SignoffError)) throw error;
    console.error(`check-signoff: ${error.message}`);
    process.exitCode = 1;
  }
}
