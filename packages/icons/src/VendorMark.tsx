/**
 * The marks of the third-party tools a Crewlet product integrates with.
 *
 * THE ONE PLACE THIS DESIGN SYSTEM DRAWS SOMEBODY ELSE'S COLOURS. Colour here
 * carries state and never identity, and a third-party app's mark is the
 * deliberate exception: its colours are the app's own, drawn as the app draws
 * them, because identity is exactly what a mark is for and a recoloured Slack
 * mark is not Slack's. No hue in svg/vendor is a token, nothing reads state
 * from a mark, and a mark appears only beside the app's own name, so the rule
 * holds everywhere else.
 *
 * GitHub's and Notion's marks are monochrome by design, so they take the
 * current text colour and read on either theme. That is the vendor's own
 * instruction rather than an exemption from the rule above: each publishes one
 * mark, black on a light ground and white on a dark one, and a fixed hex would
 * be wrong in one theme whichever one was picked.
 *
 * Datadog draws its own mark as a violet tile with the dog knocked OUT of it,
 * so the dog is a hole rather than a shape and needs something opaque behind
 * it: the white plate is the tile itself, corner for corner off the violet
 * path, so the plate stops exactly where the violet does. A plain square would
 * spill past the tilted edges, and painting the surface behind it would put a
 * vendor's colour on a card.
 *
 * The Mattermost, Datadog, Notion, Discord, ClickUp, Telegram and Microsoft
 * Teams drawings are Simple Icons' renderings (CC0 1.0). Using a mark to name
 * the app it belongs to is nominative use; TRADEMARKS.md says what that does
 * and does not allow.
 */

import type { ComponentType, SVGProps } from 'react';

import './VendorMark.css';
import type { GlyphSize } from './Glyph.js';
import { cssLength } from './Glyph.js';
import * as marks from './generated/vendors/index.js';

/** The apps this package carries a mark for. */
export const VENDORS = [
  'atlassian',
  'clickup',
  'datadog',
  'discord',
  'figma',
  'github',
  'gitlab',
  'mattermost',
  'microsoft-teams',
  'notion',
  'slack',
  'telegram',
] as const;

export type Vendor = (typeof VENDORS)[number];

export interface VendorMarkProps extends Omit<SVGProps<SVGSVGElement>, 'title'> {
  vendor: Vendor;
  /** A step, a number of px, or any CSS length. Defaults to `1em`. */
  size?: GlyphSize;
  /**
   * Names the mark for assistive technology. Without one the mark is
   * decoration, which is what it is wherever the app's name is beside it.
   */
  title?: string;
  /** Drains the colour, for an app that is available but not connected. */
  muted?: boolean;
}

const drawings: Record<Vendor, ComponentType<SVGProps<SVGSVGElement>>> = {
  atlassian: marks.Atlassian,
  clickup: marks.Clickup,
  datadog: marks.Datadog,
  discord: marks.Discord,
  figma: marks.Figma,
  github: marks.Github,
  gitlab: marks.Gitlab,
  mattermost: marks.Mattermost,
  'microsoft-teams': marks.MicrosoftTeams,
  notion: marks.Notion,
  slack: marks.Slack,
  telegram: marks.Telegram,
};

export function VendorMark({ vendor, size, title, muted = false, className, ...rest }: VendorMarkProps) {
  const Drawing = drawings[vendor];
  const dimension = cssLength(size);
  /*
   * Named and exposed, or hidden and unfocusable. Never both: aria-hidden wins
   * over role="img", so a mark carrying each of them is silent and looks
   * named. The engine component this came from set both on every mark.
   */
  const semantics: SVGProps<SVGSVGElement> = title
    ? { role: 'img', 'aria-label': title, 'aria-hidden': undefined, focusable: 'false' }
    : { 'aria-hidden': true, focusable: 'false' };
  const classes = ['crewlet-vendor-mark'];
  if (muted) classes.push('crewlet-vendor-mark--muted');
  if (className !== undefined) classes.push(className);
  return <Drawing width={dimension} height={dimension} {...semantics} className={classes.join(' ')} {...rest} />;
}
