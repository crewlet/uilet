import type { CSSProperties, SVGProps } from 'react';

import './CrewletFigure.css';
import { CREWLET_PARTS as P } from './crewletParts.js';

export type CrewletMotion = 'idle' | 'dance' | 'wave' | 'jump' | 'walk' | 'spin';

export interface CrewletFigureProps extends SVGProps<SVGSVGElement> {
  /** Which looping motion the figure plays. Defaults to a subtle idle. */
  motion?: CrewletMotion;
  /** Phase offset in seconds, so a group of figures does not move in lockstep. */
  delay?: number;
  /**
   * Body fill. Left unset it reads `--color-brand-mark`, falling back to the
   * crewlet purple where the tokens are not loaded; also settable through CSS
   * `color` on any ancestor.
   */
  color?: string;
  /**
   * Back the joints so a moving limb reveals body instead of a blank gap.
   * On by default. Set false for the plain trim (pieces meet with visible seams).
   */
  fillGaps?: boolean;
}

// The crewlet artwork trimmed into five body parts (real path data, no clip
// layers or overlays; see crewletParts.ts). Each part group has its own joint
// pivot and animates for every motion in CrewletMotion. The motions live in
// CrewletFigure.css, which is also where a new one is added; reduced motion is
// honoured there.

const Part = ({ cls, ds }: { cls: string; ds: string[] }) => (
  <g className={cls}>{ds.map((d, i) => <path key={i} d={d} />)}</g>
);

const CrewletFigure = ({ motion = 'idle', delay = 0, color, fillGaps = true, className, style, ...rest }: CrewletFigureProps) => {
  /*
   * Only what was asked for. The colour and the delay both have a resting
   * value in the stylesheet, so leaving them alone means the default figure
   * carries no style attribute at all, which is one fewer thing for a strict
   * Content-Security-Policy to refuse.
   */
  const rootStyle = {
    ...(color === undefined ? {} : { color }),
    ...(delay === 0 ? {} : { ['--crewlet-figure-delay' as string]: `${delay}s` }),
    ...style,
  } as CSSProperties;
  const classes = `crewlet-figure crewlet-figure--${motion}${className === undefined ? '' : ` ${className}`}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1467 978"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      className={classes}
      {...(Object.keys(rootStyle).length === 0 ? {} : { style: rootStyle })}
      {...rest}
    >
      <g fill="currentColor">
        <g className="crewlet-figure__all">
          <Part cls="crewlet-figure__body" ds={fillGaps ? P.bodyFilled : P.body} />
          <Part cls="crewlet-figure__leg-l" ds={P.legRight} />
          <Part cls="crewlet-figure__leg-r" ds={P.legLeft} />
          <Part cls="crewlet-figure__arm-l" ds={P.armRight} />
          <Part cls="crewlet-figure__arm-r" ds={P.armLeft} />
        </g>
      </g>
    </svg>
  );
};

export default CrewletFigure;
