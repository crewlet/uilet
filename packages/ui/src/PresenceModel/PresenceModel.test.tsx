/**
 * Who is present, as data: the roster order, one entry per person, the hue
 * each collaborator is drawn in, and the words a reader hears.
 */

import { describe, expect, test } from 'vitest';
import { assignPresenceHues, collapseSessions, PRESENCE_HUES, joinNames, PRESENCE_LABELS, presenceOrder, type PresenceMember } from './index.js';

const member = (id: string, kind: PresenceMember['kind'], activity: PresenceMember['activity'], extra: Partial<PresenceMember> = {}): PresenceMember => ({
  id,
  name: id,
  kind,
  activity,
  ...extra,
});

describe('presenceOrder', () => {
  test('people editing, agents editing, people viewing, agents reading, idle last, stable inside each band', () => {
    const ordered = presenceOrder([
      member('idle-person', 'human', 'idle'),
      member('reading-agent', 'agent', 'viewing'),
      member('viewer-1', 'human', 'viewing'),
      member('editing-agent', 'agent', 'editing'),
      member('viewer-2', 'human', 'viewing'),
      member('editor', 'human', 'editing'),
      member('idle-agent', 'agent', 'idle'),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual([
      'editor',
      'editing-agent',
      'viewer-1',
      'viewer-2',
      'reading-agent',
      'idle-person',
      'idle-agent',
    ]);
  });
});

describe('collapseSessions', () => {
  test('two tabs of one person are one entry, the most active tab speaks, and the first position is kept', () => {
    const collapsed = collapseSessions([
      member('tab-1', 'human', 'viewing', { seat: 'maya' }),
      member('pm', 'agent', 'viewing', { seat: 'pm' }),
      member('tab-2', 'human', 'editing', { seat: 'maya' }),
      member('tab-3', 'human', 'idle', { seat: 'maya' }),
    ]);
    expect(collapsed.map((entry) => entry.id)).toEqual(['tab-2', 'pm']);
  });
});

describe('assignPresenceHues', () => {
  test('never hands out the hue nearest the accent, however many people join', () => {
    // A collaborator ringed in violet read as the reader's own active cell.
    const people = Array.from({ length: 12 }, (_, i) => member(`p${i}`, 'human', 'viewing'));
    const hues = assignPresenceHues(people);
    expect([...hues.values()]).not.toContain('purple');
    expect(PRESENCE_HUES).not.toContain('purple');
    expect(new Set(hues.values()).size).toBe(PRESENCE_HUES.length);
  });

  test('an agent keeps its chosen hue, and people take the hues nobody wears, in join order', () => {
    const hues = assignPresenceHues([member('maya', 'human', 'viewing'), member('pm', 'agent', 'viewing', { hue: 'purple' }), member('jane', 'human', 'editing')]);
    expect(hues.get('pm')).toBe('purple');
    expect(hues.get('maya')).toBe('cyan');
    expect(hues.get('jane')).toBe('green');
  });

  test('a person keeps the hue they were given while they stay, whoever joins or leaves', () => {
    const first = assignPresenceHues([member('maya', 'human', 'viewing'), member('jane', 'human', 'viewing')]);
    const second = assignPresenceHues([member('jane', 'human', 'viewing'), member('sam', 'human', 'viewing')], first);
    expect(second.get('jane')).toBe(first.get('jane'));
    expect(second.get('sam')).toBe(first.get('maya'));
  });

  test('past five, hues repeat as evenly as they can', () => {
    const many = Array.from({ length: 11 }, (_, index) => member(`p${index}`, 'human', 'viewing'));
    const hues = [...assignPresenceHues(many).values()];
    for (const hue of PRESENCE_HUES) expect(hues.filter((each) => each === hue).length).toBeGreaterThanOrEqual(2);
  });
});

describe('labels', () => {
  test('say the roster from the reader point of view', () => {
    expect(PRESENCE_LABELS.here(3, true)).toBe('You and 3 others are here');
    expect(PRESENCE_LABELS.here(1, true)).toBe('You and 1 other are here');
    expect(PRESENCE_LABELS.here(0, true)).toBe('Only you are here');
    expect(PRESENCE_LABELS.here(2, false)).toBe('2 people are here');
  });

  test('an agent that is looking is reading, and a location wins over the activity word', () => {
    expect(PRESENCE_LABELS.member(member('PM', 'agent', 'viewing'))).toBe('PM, reading');
    expect(PRESENCE_LABELS.member(member('Maya Ortiz', 'human', 'editing', { location: 'editing row Acme Corp' }))).toBe('Maya Ortiz, editing row Acme Corp');
    expect(PRESENCE_LABELS.alsoHere(['Jane Founder'])).toBe('Jane Founder is also here.');
    expect(PRESENCE_LABELS.alsoHere(['Maya', 'Jane', 'Sam'])).toBe('Maya, Jane and 1 other are also here.');
    expect(joinNames(['Maya', 'Jane'])).toBe('Maya and Jane');
  });
});
