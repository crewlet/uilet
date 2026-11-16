import { useState, type ReactNode } from 'react';
import { CircleAlertGlyph, CircleCheckGlyph, InfoGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
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
  collapseAfter = 3,
  itemsShown = 4,
  label,
  labels: overrides,
  className,
}: NoticeListProps) {
  const words = { ...NOTICE_LIST_LABELS, ...overrides, tones: { ...NOTICE_LIST_LABELS.tones, ...overrides?.tones } };
  const [expanded, setExpanded] = useState(false);
  if (notices.length === 0) return null;
  const mixed = new Set(notices.map((n) => n.tone ?? 'neutral')).size > 1;
  const folds = notices.length > collapseAfter + 1;
  const shown = folds && !expanded ? notices.slice(0, collapseAfter) : notices;
  return (
    <div className={cx('crewlet-notice-list', mixed && 'crewlet-notice-list--mixed', className)}>
      <ul className="crewlet-notice-list__items" aria-label={label}>
        {shown.map((notice) => (
          <li key={notice.key} className="crewlet-notice-list__item">
            {mixed ? (
              <span className={cx('crewlet-notice-list__glyph', `is-${notice.tone ?? 'neutral'}`)} aria-hidden>
                {GLYPHS[notice.tone ?? 'neutral']}
              </span>
            ) : null}
            <div className="crewlet-notice-list__text">
              <p className="crewlet-notice-list__title">
                {mixed ? <VisuallyHidden>{`${words.tones[notice.tone ?? 'neutral']}: `}</VisuallyHidden> : null}
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
        ))}
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
