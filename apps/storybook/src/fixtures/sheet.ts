/**
 * The vendor scorecard the sheet stories draw: one column of every type, a
 * few rows, and the people its person column names. Shared so every sheet and
 * cell story shows the same sheet.
 */
import type { SheetCellPresence, SheetColumn, SheetPerson, SheetRow } from '@crewlethq/ui';

export const SHEET_PEOPLE: SheetPerson[] = [
  { id: 'seat:maya', name: 'Maya Ortiz', kind: 'human' },
  { id: 'seat:jane', name: 'Jane Founder', kind: 'human' },
  { id: 'seat:pm', name: 'PM', kind: 'agent', character: 'gemlet', hue: 'rose' },
  { id: 'seat:cto', name: 'CTO', kind: 'agent', character: 'hexlet', hue: 'amber' },
];

export const TIER_OPTIONS = [
  { id: 'gold', label: 'Gold', color: 'amber' },
  { id: 'silver', label: 'Silver', color: 'neutral' },
  { id: 'bronze', label: 'Bronze', color: 'rose' },
  { id: 'legacy', label: 'Legacy', archived: true },
];

export const STATUS_OPTIONS = [
  { id: 'review', label: 'Review', category: 'in_progress' as const },
  { id: 'blocked', label: 'Blocked', color: 'warning' },
  { id: 'done', label: 'Done', category: 'done' as const },
];

export const SHEET_COLUMNS: SheetColumn[] = [
  { field: 'vendor', label: 'Vendor', type: 'text', frozen: true, required: true },
  { field: 'score', label: 'Score', type: 'number', min: 0, max: 10, precision: 1 },
  { field: 'approved', label: 'Approved', type: 'checkbox' },
  { field: 'tier', label: 'Tier', type: 'select', options: TIER_OPTIONS },
  { field: 'regions', label: 'Regions', type: 'multiselect', options: [
    { id: 'eu', label: 'EU', color: 'blue' },
    { id: 'us', label: 'US', color: 'green' },
    { id: 'apac', label: 'APAC', color: 'purple' },
  ] },
  { field: 'owner', label: 'Owner', type: 'person' },
  { field: 'status', label: 'Status', type: 'status', options: STATUS_OPTIONS },
  { field: 'due', label: 'Review by', type: 'date' },
  { field: 'site', label: 'Site', type: 'url' },
  { field: 'priority', label: 'Priority', type: 'rating', max: 5 },
  { field: 'notes', label: 'Notes', type: 'longtext' },
];

export const SHEET_ROWS: SheetRow[] = [
  { id: 'acme', values: { vendor: 'Acme Corp', score: 7.2, approved: true, tier: 'gold', regions: ['eu', 'us'], owner: 'seat:maya', status: 'review', due: '2026-10-24', site: 'https://acme.example', priority: 4, notes: 'Renewal in Q1.' } },
  { id: 'globex', values: { vendor: 'Globex', score: 6.8, approved: false, tier: 'silver', regions: ['us'], owner: 'seat:pm', status: 'blocked', due: '2026-10-21', site: 'https://globex.example', priority: 2, notes: 'Waiting on the security review.' } },
  { id: 'initech', values: { vendor: 'Initech', score: 9.1, approved: true, tier: 'legacy', regions: ['apac'], owner: null, status: 'done', due: null, site: null, priority: 5, notes: '' } },
  { id: 'umbrella', values: { vendor: 'Umbrella', score: null, approved: false, tier: null, regions: [], owner: 'seat:cto', status: null, due: '2026-11-02', site: 'https://umbrella.example', priority: null, notes: 'New this quarter.' } },
];

export const SHEET_PRESENCE: SheetCellPresence[] = [
  { rowId: 'globex', field: 'score', id: 'jane', name: 'Jane Founder', kind: 'human', hue: 'cyan' },
  { rowId: 'acme', field: 'status', id: 'pm', name: 'PM', kind: 'agent', hue: 'rose', editing: true },
  { rowId: 'umbrella', field: 'tier', id: 'maya', name: 'Maya Ortiz', kind: 'human', hue: 'green', idle: true },
];

/** Ten thousand rows, for the virtualisation story. */
export function manyRows(count: number): SheetRow[] {
  const tiers = ['gold', 'silver', 'bronze'];
  const statuses = ['review', 'blocked', 'done'];
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    values: {
      vendor: `Vendor ${String(index + 1).padStart(5, '0')}`,
      score: Math.round(((index * 37) % 100) / 10 * 10) / 10,
      approved: index % 3 === 0,
      tier: tiers[index % 3],
      status: statuses[index % 3],
      priority: (index % 5) + 1,
    },
  }));
}
