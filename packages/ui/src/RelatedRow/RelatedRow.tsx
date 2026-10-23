import type { ReactNode } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { Card } from '../Card/index.js';
import { Inline, Spacer, Stack } from '../Layout/index.js';
import { Text } from '../Text/index.js';
import { cx } from '../utils/cx.js';

export interface RelatedRowProps {
  /** Where the row goes. */
  href: string;
  /** The destination's own glyph, at the small step. */
  icon: ReactNode;
  /** The place, by its name. */
  title: ReactNode;
  /** One sentence: what is there, and where. */
  description: ReactNode;
  /** What the region is called for assistive technology. */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * The one related place a page points at, as a quiet linked row under its
 * content (Policies to the engine's limits, Nodes to its backups).
 *
 * A ROW, NOT A FOOTNOTE. A trailing caption ("The caps are in Settings ›
 * Limits.") was a sentence a reader had to find the link inside. The row
 * stands on a card's own inset, so its glyph stands under the card heads'
 * glyphs and its words under their titles, and the whole row is the link.
 *
 * An application offers it only to a reader who may open the place: a link to
 * a page that refuses them is a dead end offered as a way on.
 */
export function RelatedRow({ href, icon, title, description, label = 'Related', className }: RelatedRowProps) {
  return (
    <nav aria-label={label} className={cx('crewlet-related-row', className)}>
      <Card href={href} interactive padding="sm">
        <Inline gap={3}>
          <span className="crewlet-related-row__glyph" aria-hidden="true">
            {icon}
          </span>
          <Stack gap={1}>
            <Text variant="cell">{title}</Text>
            <Text variant="caption">{description}</Text>
          </Stack>
          <Spacer />
          <span className="crewlet-related-row__glyph" aria-hidden="true">
            <ChevronRightGlyph size="sm" />
          </span>
        </Inline>
      </Card>
    </nav>
  );
}
