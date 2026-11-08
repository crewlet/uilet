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
 * GitHub's, Notion's, OpenCode's, Expo's and DigitalOcean's marks are
 * monochrome by design, so they take the current text colour and read on
 * either theme. That is each
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
 * Sentry's dark violet is the same case: its mark on a light ground, and on a
 * dark one a hue under 2:1 that left the glyph a smudge. Sentry's branding
 * page offers the glyph in white for a dark ground, so the dark themes draw it
 * in the current text colour, by the same rule as Mattermost's.
 *
 * Scaleway's purple is the same case again: its mark on a light ground, and
 * under 2:1 on a dark one. Scaleway draws the same mark in white on a dark
 * ground (the logo in its CLI's documentation), so the dark themes draw it in
 * the current text colour too.
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
 * SSH IS CREWLET'S OWN DRAWING TOO, for the SSH Connection integration built
 * into it. SSH is a protocol rather than an app, so no vendor publishes a mark
 * for it, and drawing the brand mark there would read as one more built-in
 * service. Its mark is a key whose bow is a rounded square holding a shell
 * prompt, drawn on the glyph grid at the glyphs' weight (a 1.75 stroke with
 * round caps and joins) and outlined into one filled path, as every other mark
 * here is a fill. It is framed in the square its own extent fits, so it draws
 * the slot's full width. Its colour is the brand mark's violet, read from
 * --color-brand-mark with the mark's own value behind it, as the Crewlet
 * figure reads it (VendorMark.css): that token clears 3:1 on every theme's
 * grounds, which the tokens' palette suite holds, so unlike Mattermost's it
 * needs no reversed drawing for a dark one.
 *
 * OpenCode publishes its mark twice, near-black on a light ground and
 * near-white on a dark one, so it is drawn in the current text colour, its
 * inner square a quarter of that ink, as GitHub's is: one fixed pair of hexes
 * would be wrong in one theme. Its drawing is a 240 by 300 upright that fills
 * its own viewBox, as every vendor's does; the mark's square slot centres it.
 *
 * The Mattermost, Datadog, Notion, Discord, ClickUp, Telegram and Microsoft
 * Teams drawings are Simple Icons' renderings (CC0 1.0), and so are the
 * Cloudflare, Google Cloud, Linear, PostgreSQL, Scaleway, Sentry and Stripe
 * drawings, taken from simple-icons 16.35.0 (its icons/<slug>.svg, path
 * unchanged) in the hex that release records for each brand. Scaleway's is its
 * purple, #4F0599, which that release sources to Scaleway's own design system.
 * Google Cloud's (icons/googlecloud.svg) is Google Blue, #4285F4, which that
 * release sources to cloud.google.com: the cloud Google draws in four colours,
 * in its one blue. Google's brand terms allow a product icon only beside the
 * product's name, never alone, which is how every mark here is drawn. Claude's is the Claude Spark in Clay, from
 * Anthropic's own press kit
 * (anthropic.com/press-kit, "Anthropic media resources", Claude logos, 3 Claude
 * Spark), unchanged but for the file's size attributes. OpenCode's is the
 * square logo from its own brand page (opencode.ai/brand,
 * opencode-logo-light-square.svg), its no-op clip and mask removed and its
 * colours taken from the text as above. Expo's is the mark from its own logo
 * pack (github.com/expo/logos, svg/logo-type-a.svg, which expo.dev/brand
 * links), its path unchanged, its size attributes dropped and its black taken
 * from the text, as Expo's own site and docs draw it. DigitalOcean's is Simple
 * Icons' rendering (CC0 1.0) from simple-icons 16.35.0
 * (icons/digitalocean.svg, path unchanged), the same icon DigitalOcean's own
 * logo pack draws (the Brand Assets download on digitalocean.com/press), but
 * not in the blue that release records: the pack now publishes the logo only
 * in black for a light ground and white for a dark one, so it takes the text
 * colour as above.
 * Using a mark to name the app it belongs to is nominative use; TRADEMARKS.md
 * says what that does and does not allow.
 *
 * AWS HAS NO MARK HERE. AWS's trademark guidelines allow a third party a
 * plain-text reference only, with no logo (Section 13), so its tile draws the
 * glyph set's own cloud (CloudGlyph, Lucide's, under ISC) beside the name: a
 * generic drawing that claims nothing about AWS. It is the glyph component
 * itself rather than a copy in svg/vendor, so it draws as every glyph does,
 * a stroke in the current text colour on either theme.
 */

import type { ComponentType, SVGProps } from 'react';

import './VendorMark.css';
import type { GlyphSize } from './Glyph.js';
import { cssLength } from './Glyph.js';
import CrewletIcon from './generated/CrewletIcon.js';
import CloudGlyph from './generated/glyphs/CloudGlyph.js';
import * as marks from './generated/vendors/index.js';

/** The apps this package draws on a catalogue tile, Crewlet's own services and SSH among them. */
export const VENDORS = [
  'atlassian',
  'aws',
  'claude',
  'clickup',
  'cloudflare',
  'crewlet',
  'datadog',
  'digitalocean',
  'discord',
  'expo',
  'figma',
  'github',
  'gitlab',
  'google-cloud',
  'linear',
  'mattermost',
  'microsoft-teams',
  'notion',
  'opencode',
  'postgresql',
  'scaleway',
  'sentry',
  'slack',
  'ssh',
  'stripe',
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
  aws: CloudGlyph,
  claude: marks.Claude,
  clickup: marks.Clickup,
  cloudflare: marks.Cloudflare,
  crewlet: CrewletIcon,
  datadog: marks.Datadog,
  digitalocean: marks.Digitalocean,
  discord: marks.Discord,
  expo: marks.Expo,
  figma: marks.Figma,
  github: marks.Github,
  gitlab: marks.Gitlab,
  'google-cloud': marks.GoogleCloud,
  linear: marks.Linear,
  mattermost: marks.Mattermost,
  'microsoft-teams': marks.MicrosoftTeams,
  notion: marks.Notion,
  opencode: marks.Opencode,
  postgresql: marks.Postgresql,
  scaleway: marks.Scaleway,
  sentry: marks.Sentry,
  slack: marks.Slack,
  ssh: marks.Ssh,
  stripe: marks.Stripe,
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
