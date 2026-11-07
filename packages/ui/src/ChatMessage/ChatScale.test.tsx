import { afterEach, expect, test } from 'vitest';
import { motion } from '@crewlethq/tokens';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { tokenMs } from '../utils/tokenMs.js';

let uninstall: () => void = () => {};
afterEach(() => uninstall());

const scale = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const px = (name: string) => {
  const value = scale(name);
  expect(value, `${name} resolves to a length`).toMatch(/^\d+(\.\d+)?px$/);
  return Number.parseFloat(value);
};
// A motion token named through var(), read back as its value on the scale.
const step = (name: string) => {
  const token = /^var\(--motion-duration-([a-z]+)\)$/.exec(scale(name))?.[1];
  expect(token, `${name} names a step of the motion scale`).toBeDefined();
  return tokenMs(motion.duration[token as keyof typeof motion.duration]);
};

// The words start 64px in: the side inset, the face and the gap after it.
// Mutation: widen the gap back to 12px and the column moves to 68px.
test('sets the words 64px in from the row edge', () => {
  uninstall = installSheets('ChatMessage/ChatScale.css');
  expect(px('--crewlet-chat-pad-x') + px('--crewlet-chat-avatar') + px('--crewlet-chat-gap')).toBe(64);
  expect(px('--crewlet-chat-gap')).toBe(8);
});

// Feedback is quick and travel is slower, so a pill that moves never lags a
// colour change and a hover never waits on a move.
test('keeps feedback motion shorter than travel, both on the motion scale', () => {
  uninstall = installSheets('ChatMessage/ChatScale.css');
  const feedback = step('--crewlet-chat-feedback');
  const travel = step('--crewlet-chat-travel');
  expect(feedback).toBeLessThanOrEqual(80);
  expect(travel).toBeGreaterThan(feedback);
  expect(travel).toBeLessThanOrEqual(160);
  expect(scale('--crewlet-chat-ease')).toBe('var(--motion-easing-out)');
});

/** A unitless line height as the number it multiplies by: `1.5`, or a `calc(a / b)` ratio. */
const ratio = (name: string) => {
  const value = scale(name);
  const quotient = /^calc\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)$/.exec(value);
  const result = quotient ? Number(quotient[1]) / Number(quotient[2]) : Number(value);
  expect(Number.isFinite(result), `${name} is a unitless ratio`).toBe(true);
  return result;
};

// The words are on the chat step, 14px on a 22px line, so a one-line first
// row is 4 + 22 + 22 + 4. Mutation: put the line back on the 1.5 step and it
// reads 21px.
test('sets the words 14px on a 22px line', () => {
  uninstall = installSheets('ChatMessage/ChatScale.css');
  expect(px('--crewlet-chat-text')).toBe(14);
  expect(px('--crewlet-chat-text') * ratio('--crewlet-chat-line')).toBeCloseTo(22, 6);
});
