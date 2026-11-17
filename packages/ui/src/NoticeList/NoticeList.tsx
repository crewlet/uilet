import { useId, useState, type ReactNode } from 'react';
import { CircleAlertGlyph, CircleCheckGlyph, InfoGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { DisclosureAnatomy } from '../Disclosure/anatomy.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { NoticeLineView } from './NoticeLineView.js';
import type { Tone } from '../utils/tone.js';

export type NoticeTone = Exclude<Tone, 'brand'>;

/** The specifics under a notice's title, with who they belong to. */
export interface NoticeLine {
  subject?: ReactNode;
  items: readonly ReactNode[];
}

/** One thing to know, said once however many places it applies to. */
export interface Notice {
  key: string;
  /** Drawn as a glyph only in a list that mixes tones. */
  tone?: NoticeTone | undefined;
  /** Who or what it is about, in bold before the title. */
  subject?: ReactNode;
  /** What it applies to in a word or two, after the title on a compact row: "9 agents". */
  summary?: ReactNode;
  /** One line: what is wrong. */
  title: ReactNode;
  /** The specifics, one line per subject, folded after a few. */
  lines?: readonly NoticeLine[] | undefined;
  /** The effect and the fix, in a sentence or two. */
  detail?: ReactNode;
  /** The one action, at the notice's end. */
  action?: ReactNode;
}

export interface NoticeListLabels {
  more: (hidden: number) => string;
  less: string;
  andMore: (hidden: number) => string;
  /** Each tone in words, before a title, in a list that mixes tones. */
  tones: Record<NoticeTone, string>;
}

export const NOTICE_LIST_LABELS: NoticeListLabels = {
  more: (hidden) => `Show ${hidden} more`,
  less: 'Show fewer',
  andMore: (hidden) => `and ${hidden} more`,
  tones: { danger: 'Problem', warning: 'Warning', info: 'Note', success: 'Done', neutral: 'Note' },
};

export interface NoticeListProps {
  notices: readonly Notice[];
  /** Notices shown before the rest fold behind "Show N more". */
  collapseAfter?: number | undefined;
  /** Items shown on a line before "and N more". */
  itemsShown?: number | undefined;
  /** The list's name for a screen reader. */
  label?: string | undefined;
  labels?: Partial<NoticeListLabels> | undefined;
  /**
   * One line per notice: its title, its summary and its action. The specifics
   * and the detail open under one notice at a time.
   */
  compact?: boolean | undefined;
  className?: string | undefined;
}

const GLYPHS: Record<NoticeTone, ReactNode> = {
  neutral: <InfoGlyph size="sm" />,
  info: <InfoGlyph size="sm" />,
  success: <CircleCheckGlyph size="sm" />,
  warning: <TriangleAlertGlyph size="sm" />,
  danger: <CircleAlertGlyph size="sm" />,
};

/**
 * Several things to know from one source, one row each: the subject in bold,
 * a one-line title, the specifics folded after a few, the shared explanation
 * once, and one action at the row's end. Inside a Callout it takes the
 * callout's ink; a glyph per row only when the tones differ.
 */
export function NoticeList({
  notices,
  compact = false,
  collapseAfter = compact ? 5 : 3,
  itemsShown = 4,
  label,
  labels: overrides,
  className,
}: NoticeListProps) {
  const words = { ...NOTICE_LIST_LABELS, ...overrides, tones: { ...NOTICE_LIST_LABELS.tones, ...overrides?.tones } };
  const [expanded, setExpanded] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rid = useId();
  if (notices.length === 0) return null;
  const mixed = new Set(notices.map((n) => n.tone ?? 'neutral')).size > 1;
  const folds = notices.length > collapseAfter + 1;
  const shown = folds && !expanded ? notices.slice(0, collapseAfter) : notices;
  return (
    <div
      className={cx(
        'crewlet-notice-list',
        mixed && 'crewlet-notice-list--mixed',
        compact && 'crewlet-notice-list--compact',
        className,
      )}
    >
      <ul className="crewlet-notice-list__items" aria-label={label}>
        {shown.map((notice, index) =>
          compact ? (
            <CompactNotice
              key={notice.key}
              notice={notice}
              id={`${rid}-${index}`}
              open={openKey === notice.key}
              onToggle={() => setOpenKey((k) => (k === notice.key ? null : notice.key))}
              mixed={mixed}
              itemsShown={itemsShown}
              words={words}
            />
          ) : (
            <FullNotice key={notice.key} notice={notice} mixed={mixed} itemsShown={itemsShown} words={words} />
          ),
        )}
      </ul>
      {folds ? (
        <Button
          variant="ghost"
          size="small"
          flush
          className="crewlet-notice-list__more"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? words.less : words.more(notices.length - collapseAfter)}
        </Button>
      ) : null}
    </div>
  );
}

/** A notice in full: its subject, title, specifics, detail and action. */
function FullNotice({
  notice,
  mixed,
  itemsShown,
  words,
}: {
  notice: Notice;
  mixed: boolean;
  itemsShown: number;
  words: NoticeListLabels;
}) {
  const tone = notice.tone ?? 'neutral';
  return (
    <li className="crewlet-notice-list__item">
      {mixed ? (
        <span className={cx('crewlet-notice-list__glyph', `is-${tone}`)} aria-hidden>
          {GLYPHS[tone]}
        </span>
      ) : null}
      <div className="crewlet-notice-list__text">
        <p className="crewlet-notice-list__title">
          {mixed ? <VisuallyHidden>{`${words.tones[tone]}: `}</VisuallyHidden> : null}
          {notice.subject != null ? (
            <>
              <strong className="crewlet-notice-list__subject">{notice.subject}</strong>
              {': '}
            </>
          ) : null}
          {notice.title}
        </p>
        {notice.lines?.map((line, i) => (
          <NoticeLineView key={i} line={line} shown={itemsShown} andMore={words.andMore} />
        ))}
        {notice.detail != null ? <p className="crewlet-notice-list__detail">{notice.detail}</p> : null}
      </div>
      {notice.action != null ? <div className="crewlet-notice-list__action">{notice.action}</div> : null}
    </li>
  );
}

/**
 * A notice as one line: the title and its summary are the button that opens
 * the specifics and the detail under it; the action stands beside it.
 */
function CompactNotice({
  notice,
  id,
  open,
  onToggle,
  mixed,
  itemsShown,
  words,
}: {
  notice: Notice;
  id: string;
  open: boolean;
  onToggle: () => void;
  mixed: boolean;
  itemsShown: number;
  words: NoticeListLabels;
}) {
  const tone = notice.tone ?? 'neutral';
  const summary = summaryOf(notice, words.andMore);
  const opens = (notice.lines?.length ?? 0) > 0 || notice.detail != null;
  return (
    <li className="crewlet-notice-list__item">
      <DisclosureAnatomy
        open={open}
        onToggle={onToggle}
        title={
          <>
            {mixed ? <VisuallyHidden>{`${words.tones[tone]}: `}</VisuallyHidden> : null}
            <span className="crewlet-notice-list__title">{notice.title}</span>
            {summary != null ? (
              <>
                {' '}
                <span className="crewlet-notice-list__summary">{summary}</span>
              </>
            ) : null}
          </>
        }
        icon={mixed ? <span className={cx('crewlet-notice-list__glyph', `is-${tone}`)}>{GLYPHS[tone]}</span> : undefined}
        actions={notice.action ?? undefined}
        expandable={opens}
        headingLevel="none"
        triggerId={`${id}-trigger`}
        panelId={`${id}-panel`}
        triggerClassName="crewlet-notice-list__toggle"
      />
      {opens ? (
        <div id={`${id}-panel`} className="crewlet-notice-list__panel" hidden={!open}>
          {notice.lines?.map((line, i) => (
            <NoticeLineView key={i} line={line} shown={itemsShown} andMore={words.andMore} />
          ))}
          {notice.detail != null ? <p className="crewlet-notice-list__detail">{notice.detail}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

/** What a notice applies to in a word or two: its summary, its subject, or its one line's first item. */
function summaryOf(notice: Notice, andMore: (hidden: number) => string): ReactNode {
  if (notice.summary != null) return notice.summary;
  if (notice.subject != null) return notice.subject;
  const [line, ...others] = notice.lines ?? [];
  if (line === undefined || others.length > 0) return undefined;
  if (line.subject != null) return line.subject;
  const [first, ...rest] = line.items;
  if (first === undefined) return undefined;
  return rest.length === 0 ? (
    first
  ) : (
    <>
      {first} {andMore(rest.length)}
    </>
  );
}
