import type { ReactNode } from 'react';
import type { Notice, NoticeLine, NoticeTone } from './NoticeList.js';

/** One finding as its source reports it, before repeats are merged. */
export interface NoticeEntry {
  /** Entries that say the same thing share a kind and merge into one notice. */
  kind: string;
  tone?: NoticeTone | undefined;
  /** Who or what it is about: a seat, a unit, a server. */
  subject?: string | undefined;
  /** The specific thing within the subject: a schedule, a file. */
  item?: string | undefined;
  title: ReactNode;
  /** The effect and the fix, the same words for every entry of the kind. */
  detail?: ReactNode;
  action?: ReactNode;
}

export interface GroupNoticesOptions {
  /** Several subjects named together: "9 agents", as the subject or, when they carry items, the summary. */
  count: (subjects: readonly string[]) => ReactNode;
}

interface Group {
  first: NoticeEntry;
  /** Subject to its items, in first-seen order; '' holds entries about no subject. */
  subjects: Map<string, string[]>;
}

const TONE_ORDER: Record<NoticeTone, number> = { danger: 0, warning: 1, info: 2, success: 3, neutral: 4 };

/**
 * Entries merged into one notice per kind, so a warning raised once per
 * schedule or per seat is read once, with its subjects and items listed under
 * it. Kinds keep their first-seen order inside each tone, worst tone first.
 */
export function groupNotices(entries: readonly NoticeEntry[], { count }: GroupNoticesOptions): Notice[] {
  const groups = new Map<string, Group>();
  for (const entry of entries) {
    let group = groups.get(entry.kind);
    if (group === undefined) {
      group = { first: entry, subjects: new Map() };
      groups.set(entry.kind, group);
    }
    const subject = entry.subject ?? '';
    const items = group.subjects.get(subject) ?? [];
    if (entry.item !== undefined && !items.includes(entry.item)) items.push(entry.item);
    group.subjects.set(subject, items);
  }
  const notices = [...groups.entries()].map(([kind, { first, subjects }]) => {
    const named = [...subjects.keys()].filter((s) => s !== '');
    const itemized = [...subjects.values()].some((items) => items.length > 0);
    const base: Notice = { key: kind, tone: first.tone, title: first.title, detail: first.detail, action: first.action };
    if (named.length === 0) return withLines(base, itemized ? [{ items: subjects.get('') ?? [] }] : []);
    if (!itemized) {
      return named.length === 1 ? { ...base, subject: named[0] } : withLines({ ...base, subject: count(named) }, [{ items: named }]);
    }
    if (named.length === 1 && !subjects.has('')) return withLines({ ...base, subject: named[0] }, [{ items: subjects.get(named[0]!)! }]);
    const lines: NoticeLine[] = [...subjects.entries()].map(([subject, items]) =>
      subject === '' ? { items } : { subject, items },
    );
    return withLines({ ...base, summary: count(named) }, lines);
  });
  return notices
    .map((notice, index) => ({ notice, index }))
    .sort((a, b) => TONE_ORDER[a.notice.tone ?? 'neutral'] - TONE_ORDER[b.notice.tone ?? 'neutral'] || a.index - b.index)
    .map(({ notice }) => notice);
}

function withLines(notice: Notice, lines: readonly NoticeLine[]): Notice {
  const kept = lines.filter((line) => line.items.length > 0);
  return kept.length > 0 ? { ...notice, lines: kept } : notice;
}
