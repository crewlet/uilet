/**
 * SettingsTable is DataGrid's anatomy: the same head, row height, hairlines
 * and hover in a card, one column line down a page of cards, and a phone's
 * two-line row that keeps its controls on its first line.
 */
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Card, DataGrid, IconButton, SettingForm, SettingsTable } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(width: number, ui: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.display = 'grid';
  host.style.gap = '16px';
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(ui));
  await document.fonts.ready;
  for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  return host;
}

const pencil = <IconButton size="sm" variant="ghost" label="Change" icon={<span>e</span>} />;

function settings(name: string, label = 'Review rounds per turn') {
  return (
    <Card padding="none">
      <Card.Header>
        <Card.Title>{name}</Card.Title>
      </Card.Header>
      <SettingsTable aria-label={name}>
        <SettingsTable.Row label={label} settingKey="turn_engine.max_iterations" source="Default" actions={pencil}>
          3
        </SettingsTable.Row>
        <SettingsTable.Row
          label="Tool rounds per run"
          source="Changed from 24"
          changed
          onReset={() => {}}
          defaultLabel="24"
          actions={pencil}
        >
          32
        </SettingsTable.Row>
      </SettingsTable>
    </Card>
  );
}

const grid = (
  <Card padding="none">
    <Card.Header>
      <Card.Title>Defined</Card.Title>
    </Card.Header>
    <DataGrid
      aria-label="Defined"
      rows={[{ id: 'a' }, { id: 'b' }]}
      rowKey={(r) => r.id}
      columns={[
        { key: 'name', header: 'Name', cell: (r) => r.id },
        { key: 'next', header: 'Next', cell: () => 'in 5h' },
      ]}
    />
  </Card>
);

const box = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);

test("draws DataGrid's head, row height, hairlines and ground in a card", async () => {
  await page.viewport(1440, 900);
  const at = await mount(960, (
    <>
      {settings('Guardrails')}
      {grid}
    </>
  ));
  const [table, records] = [...at.querySelectorAll<HTMLElement>('.crewlet-data-grid')];
  const head = (el: HTMLElement) => el.querySelector(':scope > .crewlet-data-grid__head')!;
  const row = (el: HTMLElement) => el.querySelector('.crewlet-data-grid__body .crewlet-data-grid__row')!;
  expect(box(head(table!)).height).toBeCloseTo(box(head(records!)).height, 0);
  expect(style(head(table!)).backgroundColor).toBe(style(head(records!)).backgroundColor);
  expect(box(row(table!)).height).toBeCloseTo(box(row(records!)).height, 0);
  expect(style(row(table!)).borderBottomColor).toBe(style(row(records!)).borderBottomColor);
  expect(style(table!).borderTopWidth).toBe(style(records!).borderTopWidth);
  // The first column starts on the card title's edge, as the grid's does.
  const th = (el: HTMLElement) => head(el).querySelector('.crewlet-data-grid__th')!;
  expect(box(th(table!)).left + Number.parseFloat(style(th(table!)).paddingLeft)).toBeCloseTo(
    box(th(records!)).left + Number.parseFloat(style(th(records!)).paddingLeft),
    0,
  );
  await userEvent.hover(row(table!));
  await new Promise((resolve) => setTimeout(resolve, 300));
  await userEvent.hover(row(records!));
  await new Promise((resolve) => setTimeout(resolve, 300));
  const hovered = style(row(records!)).backgroundColor;
  await userEvent.hover(row(table!));
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(style(row(table!)).backgroundColor).toBe(hovered);
});

test('puts every value, source and pencil on one line down a page of cards', async () => {
  await page.viewport(1440, 900);
  const at = await mount(960, (
    <>
      {settings('Guardrails')}
      {settings('Delegation', 'Share of the budget a single delegated call may spend')}
    </>
  ));
  const columns = (selector: string) =>
    [...at.querySelectorAll(selector)].map((el) => Math.round(box(el).left));
  for (const selector of ['.crewlet-settings-table__value', '.crewlet-settings-table__source']) {
    expect(new Set(columns(selector)).size).toBe(1);
  }
  const pencils = [...at.querySelectorAll('button[aria-label="Change"]')].map((el) => Math.round(box(el).right));
  expect(new Set(pencils).size).toBe(1);
  // The pencil ends the row, inside the card's edge.
  const card = box(at.querySelector('.crewlet-card')!);
  expect(card.right - pencils[0]!).toBeGreaterThan(0);
  expect(card.right - pencils[0]!).toBeLessThanOrEqual(20);
});

test('on a phone, keeps the controls on the name’s line and nothing overflows', async () => {
  await page.viewport(390, 844);
  const at = await mount(358, settings('Guardrails', 'Share of the budget a single delegated call may spend'));
  const table = at.querySelector('.crewlet-settings-table')!;
  expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth);
  for (const row of table.querySelectorAll('.crewlet-settings-table__body .crewlet-settings-table__row')) {
    const name = box(row.querySelector('.crewlet-settings-table__setting')!);
    const actions = box(row.querySelector('.crewlet-settings-table__actions')!);
    const value = box(row.querySelector('.crewlet-settings-table__value')!);
    expect(actions.top).toBeLessThan(name.bottom);
    expect(actions.right).toBeLessThanOrEqual(box(row).right);
    expect(value.top).toBeGreaterThanOrEqual(name.bottom - 1);
  }
  // The reset's question fits the phone's row.
  (table.querySelector('button[aria-label="Reset to default"]') as HTMLButtonElement).click();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const confirm = table.querySelector('.crewlet-settings-table__confirm')!;
  expect(box(confirm).right).toBeLessThanOrEqual(box(table).right);
  expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth);
});

test("a setting's panel leaves no gap for an outcome not yet said", async () => {
  await page.viewport(1440, 900);
  const at = await mount(400, (
    <SettingForm label="Time zone" htmlFor="tz" status={<div role="status" />} onSave={() => {}} onCancel={() => {}}>
      <input id="tz" />
    </SettingForm>
  ));
  const form = at.querySelector('.crewlet-setting-form')!;
  const field = box(form.querySelector('.crewlet-form-field')!);
  const actions = box(form.querySelector('.crewlet-setting-form__actions')!);
  expect(actions.top - field.bottom).toBeCloseTo(Number.parseFloat(style(form).rowGap), 0);
});
