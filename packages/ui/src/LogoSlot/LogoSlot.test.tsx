/**
 * A logo slot is a named group that draws its logo on its own ground (the
 * brand's colour when it has passed `#rrggbb`, the product's sheet for that
 * mode when not), inks its guide in whichever palette reads on that ground,
 * takes one file by a picker or a drop, says it is uploading, and announces a
 * refusal.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { themes } from '@crewlethq/tokens';
import { afterEach, expect, test, vi } from 'vitest';
import { LogoSlot } from './index.js';

afterEach(cleanup);

const stage = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-logo-slot__stage')!;
const groundOf = (container: HTMLElement) => stage(container).style.getPropertyValue('--crewlet-logo-slot-ground');
const inkOf = (container: HTMLElement) => stage(container).style.getPropertyValue('--crewlet-logo-slot-ink');

test('is a group named by its label and described by its line, with the logo as an image', () => {
  render(<LogoSlot label="Primary" description="On a light ground" ground="light" src="blob:logo" alt="Acme logo" />);
  const group = screen.getByRole('group', { name: 'Primary' });
  expect(document.getElementById(group.getAttribute('aria-describedby') ?? '')?.textContent).toBe('On a light ground');
  expect(screen.getByRole('img', { name: 'Acme logo' }).getAttribute('src')).toBe('blob:logo');
});

test("draws each ground on the product's own sheet for that mode, inked in the other mode's text", () => {
  const { container, rerender } = render(<LogoSlot label="Primary" ground="light" alt="Acme logo" />);
  expect(groundOf(container)).toBe(themes.light.color.surface.background);
  expect(inkOf(container)).toBe(themes.light.color.text.secondary);
  rerender(<LogoSlot label="For dark grounds" ground="dark" alt="Acme logo" />);
  expect(groundOf(container)).toBe(themes.dark.color.surface.background);
  expect(inkOf(container)).toBe(themes.dark.color.text.secondary);
});

test("draws the brand's own ground once it reads as a colour, and ignores one that does not", () => {
  const { container, rerender } = render(<LogoSlot label="For dark grounds" ground="dark" groundColor="#1A1033" alt="Acme logo" />);
  expect(groundOf(container)).toBe('#1a1033');
  expect(inkOf(container)).toBe(themes.dark.color.text.secondary);
  rerender(<LogoSlot label="For dark grounds" ground="dark" groundColor="url(https://example.com/x)" alt="Acme logo" />);
  expect(groundOf(container)).toBe(themes.dark.color.surface.background);
});

test('an empty slot shows where a logo would go, and says so to a reader who cannot fill it', () => {
  const { container } = render(<LogoSlot label="Mark" ground="light" shape="square" alt="Acme mark" />);
  expect(screen.queryByRole('img')).toBeNull();
  expect(container.querySelector('.crewlet-logo-slot__placeholder svg')).not.toBeNull();
  expect(screen.getByText('No logo yet')).toBeDefined();
  expect(screen.queryByRole('button')).toBeNull();
});

test('an editable slot takes one picked file, and offers Replace and Remove once it holds one', () => {
  const onFile = vi.fn();
  const onRemove = vi.fn();
  const { container, rerender } = render(<LogoSlot label="Primary" ground="light" alt="Acme logo" editable onFile={onFile} />);
  expect(screen.getByRole('button', { name: 'Choose a file' })).toBeDefined();
  expect(screen.getByText('SVG, PNG or WebP, up to 2 MB.')).toBeDefined();
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  expect(input.multiple).toBe(false);
  expect(input.accept).toBe('image/svg+xml,image/png,image/webp');
  const logo = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
  fireEvent.change(input, { target: { files: [logo] } });
  expect(onFile).toHaveBeenCalledWith(logo);
  rerender(<LogoSlot label="Primary" ground="light" alt="Acme logo" src="blob:logo" editable onFile={onFile} onRemove={onRemove} />);
  expect(screen.getByRole('button', { name: 'Replace' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test('while a file uploads the slot is busy, says so, and takes no other file', () => {
  const onFile = vi.fn();
  const onRemove = vi.fn();
  render(<LogoSlot label="Primary" ground="light" alt="Acme logo" src="blob:logo" editable uploading onFile={onFile} onRemove={onRemove} />);
  expect(screen.getByRole('group', { name: 'Primary' }).getAttribute('aria-busy')).toBe('true');
  expect(screen.getByRole('status').textContent).toBe('Uploading');
  const replace = screen.getByRole('button', { name: 'Replace' });
  expect(replace.getAttribute('aria-busy')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(onRemove).not.toHaveBeenCalled();
});

test('a refusal is drawn under the slot and announced', () => {
  render(<LogoSlot label="Primary" ground="light" alt="Acme logo" editable onFile={() => {}} error="This SVG declares a DOCTYPE on line 2. Export it again without one." />);
  expect(screen.getByRole('alert').textContent).toBe('This SVG declares a DOCTYPE on line 2. Export it again without one.');
});

test("a reader's download is drawn beside the name once there is a logo to download", () => {
  const { rerender } = render(<LogoSlot label="Primary" ground="light" alt="Acme logo" download={<button type="button">Download</button>} />);
  expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
  rerender(<LogoSlot label="Primary" ground="light" alt="Acme logo" src="blob:logo" download={<button type="button">Download</button>} />);
  expect(screen.getByRole('button', { name: 'Download' })).toBeDefined();
});

test('carries no axe violation, read and edited', async () => {
  const { container } = render(
    <main>
      <h1>Logos</h1>
      <LogoSlot label="Primary" description="On a light ground" ground="light" alt="Acme logo" src="blob:logo" />
      <LogoSlot label="For dark grounds" ground="dark" alt="Acme logo" editable onFile={() => {}} error="Too large." />
      <LogoSlot label="Mark" ground="light" shape="square" alt="Acme mark" editable uploading onFile={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
