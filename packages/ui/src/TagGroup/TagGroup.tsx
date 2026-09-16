import { Children, useRef, useState, type ReactNode } from 'react';
import { useAnnouncer } from '../Announcer/index.js';
import { cx } from '../utils/cx.js';

export interface TagGroupProps {
  /**
   * What the tags are about, read before them: "what this is about", "Labels",
   * "Subjects". REQUIRED, because a bare row of handles is a row of words a
   * screen reader reads with nothing to hang them on.
   */
  label: string;
  /**
   * How many to show before the rest go behind a count. Six, because six
   * handles or addresses are legible at a glance on one line of a card and the
   * seventh is where a row starts wrapping; the measured long case is
   * thirty-six service accounts.
   */
  max?: number | undefined;
  /** The overflow control's label. */
  moreLabel?: ((hidden: number) => string) | undefined;
  /** What is said once the rest are shown. */
  expandedMessage?: ((total: number) => string) | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * A labelled list of tags, with the tail behind a count.
 *
 * IT EXPANDS IN PLACE rather than linking away, because the reason the rest
 * are folded is WIDTH, not secrecy: the list somebody is working through has
 * thirty-six things in it and sending them to another screen to read it is the
 * opposite of helping. It is not a disclosure either. A disclosure whose
 * summary reads "all 1 agents" is ungrammatical twice and hides, behind a
 * click, exactly what the sentence above it has already said.
 *
 * A LIST, not a row of spans: the count is what a reader is told when they
 * arrive, and only a list carries one.
 *
 * The sentence it says on expanding goes through the shared announcer, so the
 * application needs one `<Announcer>` mounted in its shell. Without one the
 * expansion still works and the announcer says loudly that nothing was said,
 * which is the point of it being one region rather than one per component.
 */
export function TagGroup({
  label,
  max = 6,
  moreLabel = (hidden) => `+${hidden} more`,
  expandedMessage = (total) => `Showing all ${total}.`,
  className,
  children,
}: TagGroupProps) {
  const [open, setOpen] = useState(false);
  const announce = useAnnouncer();
  const list = useRef<HTMLUListElement | null>(null);

  const all = Children.toArray(children);
  const shown = open ? all : all.slice(0, max);
  const hidden = all.length - shown.length;

  return (
    <ul
      ref={list}
      /*
       * Focusable only on purpose, never by Tab. The control that expands the
       * list REMOVES ITSELF in doing so, so somebody who pressed it from the
       * keyboard would be left on the document body with the rest of the page
       * to walk back through; focus lands on the list that now holds them.
       */
      tabIndex={-1}
      className={cx('crewlet-tag-group', className)}
      aria-label={`${label}, ${all.length}`}
    >
      {shown.map((tag, index) => (
        // Keyed by position: the list only ever grows at the end, as the tail
        // is revealed, so no item ever changes the index it sits at.
        <li key={index} className="crewlet-tag-group__item">
          {tag}
        </li>
      ))}
      {hidden > 0 ? (
        <li className="crewlet-tag-group__item">
          <button
            type="button"
            className="crewlet-tag-group__more"
            onClick={() => {
              setOpen(true);
              // The rest appear where the button was, and the button goes with
              // it, so the reader is put on the list and told what it holds.
              list.current?.focus();
              announce(expandedMessage(all.length));
            }}
          >
            {moreLabel(hidden)}
          </button>
        </li>
      ) : null}
    </ul>
  );
}
