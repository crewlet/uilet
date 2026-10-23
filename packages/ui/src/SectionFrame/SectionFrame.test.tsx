/**
 * SectionFrame: the sections column beside the screen, and the picker it
 * folds to, which folds after a pick and opens where the caller asks.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SidebarNav } from '../SidebarNav/index.js';
import { SectionFrame } from './index.js';

afterEach(cleanup);

function Frame({ location, openOnArrival = false, folded = true }: { location: string; openOnArrival?: boolean; folded?: boolean }) {
  return (
    <SectionFrame columnWidth="236px" folded={folded}>
      <SectionFrame.Nav
        scope="Settings"
        current={location === '#/settings/people' ? { label: 'People' } : undefined}
        location={location}
        openOnArrival={openOnArrival}
      >
        <SidebarNav.Group label="Access">
          <SidebarNav.Item label="People" href="#/settings/people" current={location === '#/settings/people'} />
          <SidebarNav.Item label="API tokens" href="#/settings/tokens" />
        </SidebarNav.Group>
      </SectionFrame.Nav>
      <SectionFrame.Body>the section</SectionFrame.Body>
    </SectionFrame>
  );
}

const isOpen = (container: HTMLElement) =>
  container.querySelector('.crewlet-section-frame__nav')!.hasAttribute('data-open');

test('draws the column it is given and the body beside it, folded only when asked', () => {
  const { container, rerender } = render(<Frame location="#/settings/people" folded={false} />);
  const frame = container.querySelector<HTMLElement>('.crewlet-section-frame')!;
  expect(frame.style.getPropertyValue('--crewlet-section-frame-column')).toBe('236px');
  expect(frame.hasAttribute('data-folded')).toBe(false);
  expect(screen.getByRole('navigation', { name: 'Settings sections' })).toBeTruthy();
  expect(frame.querySelector('.crewlet-section-frame__body')?.textContent).toBe('the section');
  rerender(<Frame location="#/settings/people" />);
  expect(frame.hasAttribute('data-folded')).toBe(true);
});

test("the picker names the section the reader is on, and the scope where there is none", () => {
  const { rerender } = render(<Frame location="#/settings/people" />);
  // The dot is drawn, not read: the name is the scope, "Section", then the section.
  const named = screen.getByRole('button', { name: 'Settings Section: People' });
  expect(named.getAttribute('aria-expanded')).toBe('false');
  rerender(<Frame location="#/settings" />);
  expect(screen.getByRole('button', { name: 'Settings sections' })).toBeTruthy();
});

test('a pick folds the picker, and the arrival it causes does not open it again', () => {
  const { container, rerender } = render(<Frame location="#/settings" openOnArrival />);
  expect(isOpen(container)).toBe(true);
  fireEvent.click(screen.getByRole('link', { name: 'People' }));
  expect(isOpen(container)).toBe(false);
  // The arrival the pick caused, at an address that would open the picker.
  rerender(<Frame location="#/settings/people" openOnArrival />);
  expect(isOpen(container)).toBe(false);
});

test('an arrival the reader did not make here opens it where the caller asks, and folds it elsewhere', () => {
  const { container, rerender } = render(<Frame location="#/settings/people" />);
  expect(isOpen(container)).toBe(false);
  fireEvent.click(container.querySelector('.crewlet-section-frame__toggle')!);
  expect(isOpen(container)).toBe(true);
  rerender(<Frame location="#/settings" openOnArrival />);
  expect(isOpen(container)).toBe(true);
  rerender(<Frame location="#/settings/tokens" />);
  expect(isOpen(container)).toBe(false);
});

test('the column sticks at the view height beside the section, and folds into the flow', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SectionFrame.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
  };
  const nav = rule('.crewlet-section-frame__nav');
  expect(nav).toMatch(/position:\s*sticky/);
  expect(nav).toMatch(/height:\s*100cqb/);
  expect(nav).not.toMatch(/(^|[;\s])(min-|max-)?height:\s*100%/);
  expect(rule('.crewlet-section-frame__toggle')).toMatch(/display:\s*none/);
  expect(rule('.crewlet-section-frame[data-folded] .crewlet-section-frame__toggle')).toMatch(/display:\s*flex/);
  expect(rule('.crewlet-section-frame[data-folded]')).toMatch(/grid-template-rows:\s*auto 1fr/);
  expect(rule('.crewlet-section-frame[data-folded] > .crewlet-section-frame__nav')).toMatch(/position:\s*static/);
});
