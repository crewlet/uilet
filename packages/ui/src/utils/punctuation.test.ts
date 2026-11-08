import { expect, test } from 'vitest';
import { peelPunctuation } from './punctuation.js';

test('what opens and closes around a token is peeled off the words beside it', () => {
  expect(peelPunctuation('Approve merging backend#51 (', ') into main?')).toEqual({
    before: 'Approve merging backend#51 ',
    open: '(',
    close: ')',
    after: ' into main?',
  });
  expect(peelPunctuation('reviewed (', ', ENG-43) and green')).toMatchObject({ open: '(', close: ',' });
  expect(peelPunctuation('It said “', '”.')).toMatchObject({ open: '“', close: '”.' });
  expect(peelPunctuation('', ').')).toMatchObject({ before: '', open: '', close: ').', after: '' });
});

test('only a mark that starts or ends a word is peeled, never one inside a word', () => {
  // An apostrophe that a word goes on after is the word's.
  expect(peelPunctuation('see ', "'s owner")).toMatchObject({ close: '', after: "'s owner" });
  // An opening mark after a letter is not one that opens around the token.
  expect(peelPunctuation('see x(', ')')).toMatchObject({ open: '', before: 'see x(' });
  expect(peelPunctuation('plain words ', ' more words')).toEqual({
    before: 'plain words ',
    open: '',
    close: '',
    after: ' more words',
  });
});
