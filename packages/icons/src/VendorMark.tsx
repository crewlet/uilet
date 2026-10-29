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
 * GitHub's, Notion's and OpenCode's marks are monochrome by design, so they
 * take the current text colour and read on either theme. That is each
 * vendor's own instruction rather than an exemption from the rule above: each
 * publishes one mark, dark on a light ground and light on a dark one, and a
 * fixed hex would be wrong in one theme whichever one was picked.
 *
 * Mattermost's blue is its mark on a light ground, and Mattermost publishes
 * the same drawing reversed (white) for a dark one, which is what the dark
 * themes draw: its blue on the dark ground fell under 3:1 and the mark next
 * to its channel's name all but disappeared. The reversed mark takes the
 * current text colour, as GitHub's does (`VendorMark.css`).
 *
 * Datadog draws its own mark as a violet tile with the dog knocked OUT of it,
 * so the dog is a hole rather than a shape and needs something opaque behind
 * it: the white plate is the tile itself, corner for corner off the violet
 * path, so the plate stops exactly where the violet does. A plain square would
 * spill past the tilted edges, and painting the surface behind it would put a
 * vendor's colour on a card.
 *
 * CREWLET ITSELF IS ONE OF THEM, for the services built into it (Worklet,
 * Doclet) that a catalogue lists beside the third-party apps they stand in
 * for. Its drawing is the brand mark the package already
 * carries (svg/crewlet-icon.svg, compiled as CrewletIcon), never a second
 * copy, so the mark on a catalogue tile is the mark everywhere else, and it
 * takes the same size and the same muted state as every vendor beside it.
 *
 * OpenCode publishes its mark twice, near-black on a light ground and
 * near-white on a dark one, so it is drawn in the current text colour, its
 * inner square a quarter of that ink, as GitHub's is: one fixed pair of hexes
 * would be wrong in one theme. Its drawing is a 240 by 300 upright that fills
 * its own viewBox, as every vendor's does; the mark's square slot centres it.
 *
 * The Mattermost, Datadog, Notion, Discord, ClickUp, Telegram and Microsoft
 * Teams drawings are Simple Icons' renderings (CC0 1.0). Claude's is the
 * Claude Spark in Clay, from Anthropic's own press kit
 * (anthropic.com/press-kit, "Anthropic media resources", Claude logos, 3 Claude
 * Spark), unchanged but for the file's size attributes. OpenCode's is the
 * square logo from its own brand page (opencode.ai/brand,
 * opencode-logo-light-square.svg), its no-op clip and mask removed and its
 * colours taken from the text as above.
 * Using a mark to name the app it belongs to is nominative use; TRADEMARKS.md
 * says what that does and does not allow.
 */

import type { ComponentType, SVGProps } from 'react';

import './VendorMark.css';
import type { GlyphSize } from './Glyph.js';
import { cssLength } from './Glyph.js';
import CrewletIcon from './generated/CrewletIcon.js';
import * as marks from './generated/vendors/index.js';

/** The apps this package carries a mark for, Crewlet's own services among them. */
export const VENDORS = [
  'atlassian',
  'claude',
  'clickup',
  'crewlet',
  'datadog',
  'discord',
  'figma',
  'github',
  'gitlab',
  'mattermost',
  'microsoft-teams',
  'notion',
  'opencode',
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
  claude: marks.Claude,
  clickup: marks.Clickup,
  crewlet: CrewletIcon,
  datadog: marks.Datadog,
  discord: marks.Discord,
  figma: marks.Figma,
  github: marks.Github,
  gitlab: marks.Gitlab,
  mattermost: marks.Mattermost,
  'microsoft-teams': marks.MicrosoftTeams,
  notion: marks.Notion,
  opencode: marks.Opencode,
  slack: marks.Slack,
  telegram: marks.Telegram,
};

/**
 * The frame a drawing takes in the mark's square, where its own file's frame
 * is not that square's.
 *
 * Every other vendor's drawing fills its own viewBox edge to edge, so a mark
 * is as large as its slot allows and the marks in a catalogue stand at one
 * weight. Crewlet's drawing is the brand mark, whose wide file
 * (svg/crewlet-icon.svg, 1467 by 978) leaves room round the mark for the
 * places it is laid out as artwork: fitted to a square slot it drew 17 by 9
 * pixels in a 20px slot where every vendor beside it drew 20 by 20. Here it
 * is framed in the square its own extent fits, centred, so it draws the
 * slot's full width, as wide a mark as any other vendor's (Microsoft Teams',
 * Discord's) does. It is the same drawing: only the frame differs.
 */
const FRAMES: Partial<Record<Vendor, string>> = {
  crewlet: '110 -107 1280 1280',
};

export function VendorMark({ vendor, size, title, muted = false, className, ...rest }: VendorMarkProps) {
  const Drawing = drawings[vendor];
  const frame = FRAMES[vendor];
  const dimension = cssLength(size);
  /*
   * Named and exposed, or hidden and unfocusable. Never both: aria-hidden wins
   * over role="img", so a mark carrying each of them is silent and looks
   * named. The engine component this came from set both on every mark.
   */
  const semantics: SVGProps<SVGSVGElement> = title
    ? { role: 'img', 'aria-label': title, 'aria-hidden': undefined, focusable: 'false' }
    : { 'aria-hidden': true, focusable: 'false' };
  const classes = ['crewlet-vendor-mark', `crewlet-vendor-mark--${vendor}`];
  if (muted) classes.push('crewlet-vendor-mark--muted');
  if (className !== undefined) classes.push(className);
  return (
    <Drawing
      width={dimension}
      height={dimension}
      {...(frame === undefined ? null : { viewBox: frame })}
      {...semantics}
      className={classes.join(' ')}
      {...rest}
    />
  );
}
