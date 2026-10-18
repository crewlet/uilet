import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentType } from 'react';
import {
  CheckboxCell,
  DateCell,
  LongTextCell,
  MultiSelectCell,
  NumberCell,
  PersonCell,
  RatingCell,
  SelectCell,
  SheetCell,
  StatusCell,
  TextCell,
  UrlCell,
  type SheetCellProps,
  type SheetValue,
} from '@crewlethq/ui';
import { SHEET_PEOPLE, STATUS_OPTIONS, TIER_OPTIONS } from '../fixtures/sheet.js';

const meta: Meta<typeof SheetCell> = {
  title: 'UI/SheetCell',
  component: SheetCell,
};

export default meta;
type Story = StoryObj<typeof SheetCell>;

/** One cell, editable, holding its own value: what a form built from a sheet's schema draws. */
function Editable({ cell: Cell, value: start, ...rest }: { cell: ComponentType<Omit<SheetCellProps, 'type'>>; value: unknown } & Omit<SheetCellProps, 'type' | 'value'>) {
  const [value, setValue] = useState<unknown>(start);
  return <Cell {...rest} value={value} onChange={(next: SheetValue) => setValue(next)} />;
}

const both = (Cell: ComponentType<Omit<SheetCellProps, 'type'>>, props: Omit<SheetCellProps, 'type'>) => (
  <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
    <Editable cell={Cell} {...props} />
    <Cell {...props} readOnly />
  </div>
);

export const Checkbox: Story = { render: () => both(CheckboxCell, { label: 'Approved', value: true }) };
export const Text: Story = { render: () => both(TextCell, { label: 'Vendor', value: 'Acme Corp' }) };
export const LongText: Story = { render: () => both(LongTextCell, { label: 'Notes', value: 'Renewal in Q1.\nWaiting on legal.' }) };
export const Numeric: Story = { render: () => both(NumberCell, { label: 'Score', value: 7.2, column: { min: 0, max: 10, precision: 1 } }) };
export const Select: Story = { render: () => both(SelectCell, { label: 'Tier', value: 'gold', options: TIER_OPTIONS }) };
export const MultiSelect: Story = {
  render: () => both(MultiSelectCell, { label: 'Tiers offered', value: ['gold', 'silver'], options: TIER_OPTIONS, column: { maxItems: 2 } }),
};
export const Person: Story = { render: () => both(PersonCell, { label: 'Owner', value: 'seat:pm', people: SHEET_PEOPLE }) };
export const Status: Story = { render: () => both(StatusCell, { label: 'Status', value: 'blocked', options: STATUS_OPTIONS }) };
export const CalendarDate: Story = { render: () => both(DateCell, { label: 'Review by', value: '2026-10-24' }) };
export const Url: Story = { render: () => both(UrlCell, { label: 'Site', value: 'https://acme.example' }) };
export const Rating: Story = { render: () => both(RatingCell, { label: 'Priority', value: 4, column: { max: 5 } }) };

/** A cell waiting on the engine, and one whose edit was refused, said on the cell. */
export const PendingAndRefused: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <TextCell label="Vendor" value="Acme Corp" onChange={() => {}} pending />
      <NumberCell label="Score" value={6.8} onChange={() => {}} refused="You can view this sheet but not edit it." />
    </div>
  ),
};
