import type { HTMLAttributes, ReactNode } from 'react';
import { CircleCheckGlyph } from '@crewlethq/icons/glyphs';
import { Button, ButtonLink } from '../Button/index.js';
import { IconTile } from '../IconTile/index.js';
import { safeHref } from '../Markdown/index.js';
import { ReceiptStrip } from '../ReceiptStrip/index.js';
import { StatusCard } from '../StatusCard/index.js';
import { cx } from '../utils/cx.js';

/** Whether the place has been opened from the card yet. */
export type OpenInAppState = 'ready' | 'opened';

export interface OpenInAppCardLabels {
  /** The card's title. */
  heading: string;
  openHere: string;
  openInNewTab: string;
  /** The Tag once opened. */
  opened: string;
  /** The strip once opened. */
  openedNotice: string;
}

export const OPEN_IN_APP_CARD_LABELS: OpenInAppCardLabels = {
  heading: 'Open in app',
  openHere: 'Open here',
  openInNewTab: 'Open in new tab',
  opened: 'Opened',
  openedNotice: 'Opened beside this conversation.',
};

export interface OpenInAppCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The place's glyph, drawn on a neutral tile. */
  icon: ReactNode;
  /** The record's own name: "Fix the flaky sign-in test". */
  title: string;
  /** Where it lives, as its last two crumbs: "Tasks › ENG-156". */
  path: string;
  /**
   * The address, for Open in new tab. Only a same-application route (`#/...`)
   * or an http, https or mailto address is drawn as a link; anything else
   * draws no new-tab link at all.
   */
  href: string;
  /** Opens the place beside the conversation. */
  onOpenHere: () => void;
  state?: OpenInAppState | undefined;
  labels?: Partial<OpenInAppCardLabels> | undefined;
}

/**
 * A place in the product the answer points to, opened only by the person's
 * press: the record's glyph on a neutral tile, its name and where it lives,
 * then Open in new tab and Open here. Once opened, a success Tag in the head
 * and a strip that says where it opened.
 *
 * THE ONLY WAY AN ANSWER NAVIGATES. Links written into an answer's prose are
 * never live; a place is reached through this card, whose address the host
 * built and checked. The address is checked again here: a scheme other than
 * the application's own routes, http, https or mailto draws no link.
 */
export function OpenInAppCard({
  icon,
  title,
  path,
  href,
  onOpenHere,
  state = 'ready',
  labels: overrides,
  className,
  ...rest
}: OpenInAppCardProps) {
  const labels = overrides ? { ...OPEN_IN_APP_CARD_LABELS, ...overrides } : OPEN_IN_APP_CARD_LABELS;
  const safe = safeHref(href);
  const opened = state === 'opened';
  return (
    <StatusCard
      {...rest}
      title={labels.heading}
      status={opened ? { label: labels.opened, tone: 'success', icon: <CircleCheckGlyph size="xs" /> } : undefined}
      strip={opened ? <ReceiptStrip>{labels.openedNotice}</ReceiptStrip> : undefined}
      actions={
        opened ? undefined : (
          <>
            {safe === null ? null : (
              <ButtonLink href={safe} variant="secondary" external>
                {labels.openInNewTab}
              </ButtonLink>
            )}
            <Button variant="primary" onClick={onOpenHere}>
              {labels.openHere}
            </Button>
          </>
        )
      }
      className={cx('crewlet-open-in-app-card', className)}
    >
      <div className="crewlet-open-in-app-card__place">
        <IconTile tone="neutral" size="sm">
          {icon}
        </IconTile>
        <span className="crewlet-open-in-app-card__words">
          <span className="crewlet-open-in-app-card__title">{title}</span>
          <span className="crewlet-open-in-app-card__path">{path}</span>
        </span>
      </div>
    </StatusCard>
  );
}
