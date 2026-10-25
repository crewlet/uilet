import { expect, test } from 'vitest';
import { completeReference, isWholeReference, rankReferences, referenceAt, urlSchemeOf } from './references.js';

// WHAT IS UNDER THE CARET, which is not the same as what the box holds.
test('a reference is found from the caret back, and only there', () => {
  expect(referenceAt('$', 1)).toEqual({ start: 0, query: '' });
  expect(referenceAt('${', 2)).toEqual({ start: 0, query: '' });
  expect(referenceAt('${GITHUB', 8)).toEqual({ start: 0, query: 'GITHUB' });
  expect(referenceAt('https://${SITE', 14)).toEqual({ start: 8, query: 'SITE' });
  expect(referenceAt('${A} and ${B', 12)).toEqual({ start: 9, query: 'B' });
  // A CLOSED REFERENCE IS FINISHED.
  expect(referenceAt('${GITHUB_TOKEN}', 15)).toBeNull();
  // A SPACE ENDS THE SCAN.
  expect(referenceAt('$A B', 4)).toBeNull();
  // A DOLLAR IN A VALUE IS NOT A REFERENCE.
  expect(referenceAt('pa$$w0rd!', 9)).toBeNull();
  expect(referenceAt('no dollar here', 14)).toBeNull();
});

// CLOSEST FIRST: a prefix beats a substring beats a subsequence.
test('names are ranked by how closely they match', () => {
  const names = ['ATLASSIAN_ORG_ID', 'GITHUB_TOKEN', 'GH_WEBHOOK', 'DATADOG_APP_KEY'];
  expect(rankReferences(names, 'GH')).toEqual(['GH_WEBHOOK', 'GITHUB_TOKEN']);
  expect(rankReferences(names, 'token')).toEqual(['GITHUB_TOKEN']);
  expect(rankReferences(names, 'dak')).toEqual(['DATADOG_APP_KEY']);
  expect(rankReferences(names, 'zzz')).toEqual([]);
  expect(rankReferences(names, '')).toEqual(names);
});

// A CHOSEN NAME IS WRITTEN WHOLE, braces and all.
test('choosing a name writes a whole reference and leaves the caret after it', () => {
  const typed = referenceAt('${GITH', 6);
  if (!typed) throw new Error('nothing under the caret');
  expect(completeReference('${GITH', 6, typed, 'GITHUB_TOKEN')).toEqual({ value: '${GITHUB_TOKEN}', caret: 15 });

  const closed = referenceAt('${GITH}', 6);
  if (!closed) throw new Error('nothing under the caret');
  expect(completeReference('${GITH}', 6, closed, 'GITHUB_TOKEN').value).toBe('${GITHUB_TOKEN}');

  const inline = referenceAt('https://$SITE/x', 13);
  if (!inline) throw new Error('nothing under the caret');
  expect(completeReference('https://$SITE/x', 13, inline, 'SITE_URL').value).toBe('https://${SITE_URL}/x');
});

test('a whole reference is one name in braces, and nothing else', () => {
  expect(isWholeReference('${JIRA_TOKEN}')).toBe(true);
  expect(isWholeReference('  ${_X1}  ')).toBe(true);
  for (const value of ['', 'ATATT-real', '${HOST}/x', '${}', 'prefix ${NAME}', '${1A}', '$NAME']) {
    expect(isWholeReference(value), value).toBe(false);
  }
});

test('the scheme a value carries is read without regard to case', () => {
  expect(urlSchemeOf('HTTPS://a.example')).toBe('https://');
  expect(urlSchemeOf('http://a.example')).toBe('http://');
  expect(urlSchemeOf('a.example')).toBe('');
});
