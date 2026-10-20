/** The canvas's dotted field as a still surface: its own ground, or a kind's. */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DottedGround } from './index.js';

afterEach(cleanup);

test('holds its content on the dotted ground, in a kind’s colours when given one', () => {
  const { container, rerender } = render(
    <DottedGround>
      <p>Draft</p>
    </DottedGround>,
  );
  const ground = container.firstElementChild!;
  expect(ground.classList.contains('crewlet-dotted-ground--bleed')).toBe(true);
  expect(ground.classList.contains('crewlet-dotted-ground--kind')).toBe(false);
  expect(screen.getByText('Draft')).toBeDefined();
  rerender(
    <DottedGround kind="dashboard" shape="inset" data-testid="g">
      <p>Draft</p>
    </DottedGround>,
  );
  const tinted = screen.getByTestId('g');
  expect(tinted.classList.contains('crewlet-kind--dashboard')).toBe(true);
  expect(tinted.classList.contains('crewlet-dotted-ground--kind')).toBe(true);
  expect(tinted.classList.contains('crewlet-dotted-ground--inset')).toBe(true);
});
