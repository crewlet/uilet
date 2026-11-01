import { useId, useState, type ReactNode } from 'react';
import { BellGlyph, ChevronDownGlyph, CircleAlertGlyph, InfoGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Card } from '../Card/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';

/** How much an item matters: something broken, something owed, or news. */
export type AttentionTone = 'danger' | 'warning' | 'info';

/** One thing that needs a person. */
export interface AttentionItem {
  key: string;
  tone: AttentionTone;
  /** What it is about, as a picture beside the title: a vendor's mark. Decorative. */
  media?: ReactNode;
  /** One line: what is wrong. */
  title: ReactNode;
  /** One quieter line: who it stops, since when. */
  meta?: ReactNode;
  /** Its one fix, at the row's end: a small secondary button or link. */
  action?: ReactNode;
  /** What else there is to read, behind Details: the recorded sentence, the remedy at length. */
  details?: ReactNode;
}

export interface AttentionListLabels {
  /** The panel's heading. */
  title: string;
  /** What each tone is called to a screen reader, before the title. */
  tones: Record<AttentionTone, string>;
  details: string;
  /** The control that shows the rows past the first few: "Show 3 more". */
  more: (hidden: number) => string;
  less: string;
  /** The heading's counts in words, for a screen reader: "1 problem, 2 warnings". */
  summary: (counts: Record<AttentionTone, number>) => string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const ATTENTION_LIST_LABELS: AttentionListLabels = {
  title: 'Needs attention',
  tones: { danger: 'Problem', warning: 'Warning', info: 'Note' },
  details: 'Details',
  more: (hidden) => `Show ${hidden} more`,
  less: 'Show fewer',
  summary: (c) =>
    [
      c.danger ? plural(c.danger, 'problem', 'problems') : '',
      c.warning ? plural(c.warning, 'warning', 'warnings') : '',
      c.info ? plural(c.info, 'note', 'notes') : '',
    ]
      .filter(Boolean)
      .join(', '),
};

export interface AttentionListProps {
  items: readonly AttentionItem[];
  /** Rows shown before the rest fold behind "Show N more". */
  collapseAfter?: number | undefined;
  /** Any of the words, each tone's on its own: the rest keep their defaults. */
  labels?: (Partial<Omit<AttentionListLabels, 'tones'>> & { tones?: Partial<Record<AttentionTone, string>> | undefined }) | undefined;
  /** The heading's level, where the surrounding outline does not decide it. */
  headingLevel?: HeadingLevel | undefined;
  className?: string | undefined;
}

const ORDER: Record<AttentionTone, number> = { danger: 0, warning: 1, info: 2 };
const TONES: readonly AttentionTone[] = ['danger', 'warning', 'info'];

function ToneGlyph({ tone, size }: { tone: AttentionTone; size: 'xs' | 'sm' }) {
  if (tone === 'danger') return <CircleAlertGlyph size={size} />;
  if (tone === 'warning') return <TriangleAlertGlyph size={size} />;
  return <InfoGlyph size={size} />;
}

/**
 * What needs a person, as one quiet panel of rows instead of a banner each:
 * the tone's glyph in its ink, the subject's mark, a one-line title over a
 * quieter line, and the one fix at the row's end in the page's own button,
 * so the colour of a warning never fights the colour of its action. What
 * there is to read at length opens under the row, behind Details. Problems
 * first, then warnings, then notes, each in the order given.
 *
 * THE PANEL IS A CARD LIKE ITS NEIGHBOURS: the page's own surface, hairline
 * and corner, and a header in the card's own type with the counts at its end.
 * No strip, border or ground takes the worst row's tone. A tinted frame made
 * the panel the loudest thing on the page whatever it held, and said the
 * same thing as the glyphs inside it a second time; severity is each row's
 * glyph, and the header's counts are those glyphs again, small, in the
 * tertiary type.
 *
 * MANY ROWS FOLD TO A SUMMARY: the header counts them by tone, the first few
 * stay, and the rest open on request, so a bad day does not push the page's
 * own content off the screen.
 *
 * ONE SET OF COLUMNS FOR EVERY ROW: glyph, mark, words, Details, the fix. The
 * rows are subgrids of the list, so each Details and each fix stands in one
 * column whatever the width of the button beside it, every title starts on
 * one line whether or not its row has a mark, and what opens under a row
 * starts on the title's own line. Were each row to size its own end slot,
 * four fixes of four widths would put four Details at four places. Details
 * and the fold are the kit's small ghost Button, the step of the fix beside
 * them.
 *
 * The tone is said in words before each title ("Problem: ..."), for a reader
 * who cannot tell the glyphs apart, and each Details names the body it opens
 * by an id taken from the row's position, never its key, since a key may hold
 * a space and an id reference list splits on whitespace.
 *
 * Nothing when there is nothing: a panel that says all is well is noise
 * beside a page that shows it.
 */
export function AttentionList({ items, collapseAfter = 3, labels: overrides, headingLevel, className }: AttentionListProps) {
  const contextLevel = useHeadingLevel();
  const Heading = headingTag(headingLevel ?? contextLevel);
  const words = {
    ...ATTENTION_LIST_LABELS,
    ...overrides,
    tones: { ...ATTENTION_LIST_LABELS.tones, ...overrides?.tones },
  };
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  if (items.length === 0) return null;
  const ordered = [...items].sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
  const counts = { danger: 0, warning: 0, info: 0 };
  for (const i of items) counts[i.tone] += 1;
  const folds = ordered.length > collapseAfter + 1;
  const shown = folds && !expanded ? ordered.slice(0, collapseAfter) : ordered;
  // THE MARK'S COLUMN only where a row has a mark: an empty track would still
  // put a gap on each side of itself, between every glyph and its title. Read
  // off every row, folded or not, so opening the fold never moves a title.
  const media = ordered.some((item) => item.media != null);
  return (
    <Card as="section" padding="none" className={cx('crewlet-attention-list', className)}>
      <Card.Header
        icon={<BellGlyph size="sm" />}
        actions={
          <span className="crewlet-attention-list__counts">
            {TONES.filter((tone) => counts[tone] > 0).map((tone) => (
              <span key={tone} className={cx('crewlet-attention-list__count', `is-${tone}`)} aria-hidden>
                <ToneGlyph tone={tone} size="xs" />
                {counts[tone]}
              </span>
            ))}
            <VisuallyHidden>{words.summary(counts)}</VisuallyHidden>
          </span>
        }
      >
        <Card.Title as={Heading}>{words.title}</Card.Title>
      </Card.Header>
      <Card.Body padding="none">
        <ul className={cx('crewlet-attention-list__rows', media && 'crewlet-attention-list__rows--media')}>
          {shown.map((item, index) => {
            const open = opened.has(item.key);
            const panel = `${id}-${index}`;
            return (
              <li key={item.key} className="crewlet-attention-list__item">
                <div className="crewlet-attention-list__row">
                  <span className={cx('crewlet-attention-list__glyph', `is-${item.tone}`)} aria-hidden>
                    <ToneGlyph tone={item.tone} size="sm" />
                  </span>
                  {item.media != null ? (
                    <span className="crewlet-attention-list__media" aria-hidden>
                      {item.media}
                    </span>
                  ) : null}
                  <span className="crewlet-attention-list__text">
                    <span className="crewlet-attention-list__line">
                      <VisuallyHidden>{`${words.tones[item.tone]}: `}</VisuallyHidden>
                      {item.title}
                    </span>
                    {item.meta ? <span className="crewlet-attention-list__meta">{item.meta}</span> : null}
                  </span>
                  <span className="crewlet-attention-list__end">
                    {item.details ? (
                      <Button
                        variant="ghost"
                        size="small"
                        flush
                        className="crewlet-attention-list__details"
                        aria-expanded={open}
                        aria-controls={open ? panel : undefined}
                        trailingIcon={<ChevronDownGlyph size="xs" />}
                        onClick={() =>
                          setOpened((was) => {
                            const next = new Set(was);
                            if (next.has(item.key)) next.delete(item.key);
                            else next.add(item.key);
                            return next;
                          })
                        }
                      >
                        {words.details}
                      </Button>
                    ) : null}
                    {item.action != null ? <span className="crewlet-attention-list__action">{item.action}</span> : null}
                  </span>
                </div>
                {item.details && open ? (
                  <div id={panel} className="crewlet-attention-list__body">
                    {item.details}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {folds ? (
          <div className="crewlet-attention-list__foot">
            <Button
              variant="ghost"
              size="small"
              flush
              className="crewlet-attention-list__more"
              aria-expanded={expanded}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? words.less : words.more(ordered.length - collapseAfter)}
            </Button>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
