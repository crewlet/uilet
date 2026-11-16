/**
 * A setting's key control shows with its row: unseen at rest where a pointer
 * can hover, drawn on the row's hover and focus, and its place always kept.
 */
import { afterEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { SettingsTable } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = '720px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <SettingsTable>
        <SettingsTable.Row label="Review rounds per turn" settingKey="turn_engine.max_iterations" source="Default">
          3
        </SettingsTable.Row>
        <SettingsTable.Row label="Tool rounds on a first turn" settingKey="turn_engine.max_tool_rounds" source="Default">
          10
        </SettingsTable.Row>
      </SettingsTable>,
    ),
  );
  await document.fonts.ready;
  return host;
}

const opacity = (el: Element) => Number(getComputedStyle(el).opacity);
const settled = () => new Promise((resolve) => setTimeout(resolve, 400));

test('the key control is unseen at rest and keeps its place', async () => {
  expect(matchMedia('(hover: hover)').matches).toBe(true);
  const at = await mount();
  const keys = at.querySelectorAll('.crewlet-settings-table__key');
  expect(keys).toHaveLength(2);
  for (const key of keys) {
    expect(opacity(key)).toBe(0);
    expect(key.getBoundingClientRect().width).toBeGreaterThan(0);
  }
});

test('hovering a row shows its key control and no other', async () => {
  const at = await mount();
  const [first, second] = at.querySelectorAll<HTMLElement>('.crewlet-settings-table__body .crewlet-settings-table__row');
  await userEvent.hover(first!);
  await settled();
  expect(opacity(first!.querySelector('.crewlet-settings-table__key')!)).toBe(1);
  expect(opacity(second!.querySelector('.crewlet-settings-table__key')!)).toBe(0);
});

test('focusing the control shows it without a pointer', async () => {
  const at = await mount();
  await userEvent.unhover(document.body);
  const button = at.querySelector<HTMLButtonElement>('.crewlet-settings-table__key button')!;
  button.focus();
  await settled();
  expect(opacity(at.querySelector('.crewlet-settings-table__key')!)).toBe(1);
});
