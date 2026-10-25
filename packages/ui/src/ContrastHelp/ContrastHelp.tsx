import { InfoGlyph } from '@crewlethq/icons/glyphs';
import { ContrastLevelTag } from '../ContrastBadge/index.js';
import { IconButton } from '../IconButton/index.js';
import { Popover, type PopoverAlign } from '../Popover/index.js';
import { cx } from '../utils/cx.js';

export interface ContrastHelpLabels {
  /** The button's name: "About contrast levels". */
  trigger: string;
  /** The panel's name: "Contrast levels". */
  title: string;
  /** What contrast is. */
  intro: string;
  /** The levels, each its word as the badge draws it and what it means. */
  aa: { term: string; meaning: string };
  aaa: { term: string; meaning: string };
  low: { term: string; meaning: string };
}

const LABELS: ContrastHelpLabels = {
  trigger: 'About contrast levels',
  title: 'Contrast levels',
  intro: 'Contrast compares two colours, from 1:1 to 21:1.',
  aa: { term: 'AA', meaning: 'At least 4.5:1 for text, 3:1 for large text, icons and buttons.' },
  aaa: { term: 'AAA', meaning: 'At least 7:1 for text, 4.5:1 for large text.' },
  low: { term: 'Low or Fails', meaning: 'Below AA.' },
};

export interface ContrastHelpProps {
  /** Which edge of the button the panel lines up with. `start` by default. */
  align?: PopoverAlign | undefined;
  className?: string | undefined;
  labels?: Partial<ContrastHelpLabels> | undefined;
}

/**
 * What the contrast levels mean, a press away: a small info button beside a
 * contrast heading that opens a short panel with AA, AAA and Low or Fails,
 * each drawn as `ContrastBadge` draws it.
 *
 * A PRESS, NOT A HOVER. The panel is a `Popover` the button toggles, so it
 * opens on a phone, where there is no hover, and from the keyboard (Enter or
 * Space), and closes on Escape or a press outside, handing focus back to the
 * button. A tooltip would hold this on hover alone and drop it the moment the
 * pointer moved to read it. The panel is a dialog named by its title.
 */
export function ContrastHelp({ align = 'start', className, labels }: ContrastHelpProps) {
  const text = { ...LABELS, ...labels };
  return (
    <Popover
      role="dialog"
      label={text.title}
      align={align}
      className={cx('crewlet-contrast-help__panel', className)}
      trigger={(_, toggle) => (
        <IconButton
          size="sm"
          variant="ghost"
          label={text.trigger}
          icon={<InfoGlyph size="sm" />}
          className="crewlet-contrast-help__trigger"
          onClick={toggle}
        />
      )}
    >
      <div className="crewlet-contrast-help">
        <p className="crewlet-contrast-help__title">{text.title}</p>
        <p className="crewlet-contrast-help__intro">{text.intro}</p>
        <dl className="crewlet-contrast-help__levels">
          <dt>
            <ContrastLevelTag level="aa">{text.aa.term}</ContrastLevelTag>
          </dt>
          <dd>{text.aa.meaning}</dd>
          <dt>
            <ContrastLevelTag level="aaa">{text.aaa.term}</ContrastLevelTag>
          </dt>
          <dd>{text.aaa.meaning}</dd>
          <dt>
            <ContrastLevelTag level="low">{text.low.term}</ContrastLevelTag>
          </dt>
          <dd>{text.low.meaning}</dd>
        </dl>
      </div>
    </Popover>
  );
}
