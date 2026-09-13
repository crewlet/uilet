import type { CSSProperties, SVGProps } from 'react';
import { CREWLET_PARTS as P } from './crewletParts.js';

export type CrewletMotion = 'idle' | 'dance' | 'wave' | 'jump' | 'walk' | 'spin';

export interface CrewletFigureProps extends SVGProps<SVGSVGElement> {
  /** Which looping motion the figure plays. Defaults to a subtle idle. */
  motion?: CrewletMotion;
  /** Phase offset in seconds, so a group of figures does not move in lockstep. */
  delay?: number;
  /** Body fill. Defaults to the crewlet purple; also settable via CSS color. */
  color?: string;
  /**
   * Back the joints so a moving limb reveals body instead of a blank gap.
   * On by default. Set false for the plain trim (pieces meet with visible seams).
   */
  fillGaps?: boolean;
}

// The crewlet artwork trimmed into five body parts (real path data, no clip
// layers or overlays; see crewletParts.ts). Each part group has its own joint
// pivot and animates for every motion in CrewletMotion. To add a motion:
// extend the union type, add its `.crewlet-figure--<name>` rules and
// @keyframes below, and list it in the Storybook catalog. Reduced motion is
// honored.
//
// A <style> element inside an inline SVG applies to the whole document, so
// every class, keyframe and custom property here is namespaced under
// crewlet-figure to keep it from matching or overriding the page's own.
const STYLES = `
.crewlet-figure__all, .crewlet-figure__arm-l, .crewlet-figure__arm-r, .crewlet-figure__leg-l, .crewlet-figure__leg-r { transform-box: view-box; animation-delay: var(--crewlet-figure-delay, 0s); }
.crewlet-figure__all { transform-origin: 761px 869px; }
.crewlet-figure__arm-l { transform-origin: 384px 473px; }
.crewlet-figure__arm-r { transform-origin: 1128px 475px; }
.crewlet-figure__leg-l { transform-origin: 588px 730px; }
.crewlet-figure__leg-r { transform-origin: 939px 733px; }

.crewlet-figure--idle .crewlet-figure__arm-l { animation: crewlet-figure-idle-arm-l 3.4s ease-in-out infinite; }
.crewlet-figure--idle .crewlet-figure__arm-r { animation: crewlet-figure-idle-arm-r 3.4s ease-in-out infinite; }

.crewlet-figure--dance .crewlet-figure__all { animation: crewlet-figure-bob 0.8s ease-in-out infinite; }
.crewlet-figure--dance .crewlet-figure__arm-l { animation: crewlet-figure-arm-l-dance 0.8s ease-in-out infinite; }
.crewlet-figure--dance .crewlet-figure__arm-r { animation: crewlet-figure-arm-r-dance 0.8s ease-in-out infinite; }
.crewlet-figure--dance .crewlet-figure__leg-l { animation: crewlet-figure-leg-l-dance 0.8s ease-in-out infinite; }
.crewlet-figure--dance .crewlet-figure__leg-r { animation: crewlet-figure-leg-r-dance 0.8s ease-in-out infinite; }

.crewlet-figure--wave .crewlet-figure__arm-r { animation: crewlet-figure-wave-arm 0.8s ease-in-out infinite; }
.crewlet-figure--wave .crewlet-figure__arm-l { animation: crewlet-figure-idle-arm-l 3.4s ease-in-out infinite; }

.crewlet-figure--jump .crewlet-figure__all { animation: crewlet-figure-jump 1.15s ease-in-out infinite; }
.crewlet-figure--jump .crewlet-figure__arm-l { animation: crewlet-figure-jump-arm-l 1.15s ease-in-out infinite; }
.crewlet-figure--jump .crewlet-figure__arm-r { animation: crewlet-figure-jump-arm-r 1.15s ease-in-out infinite; }

.crewlet-figure--walk .crewlet-figure__all { animation: crewlet-figure-walk-body 0.5s ease-in-out infinite; }
.crewlet-figure--walk .crewlet-figure__arm-l { animation: crewlet-figure-walk-arm-l 0.5s ease-in-out infinite; }
.crewlet-figure--walk .crewlet-figure__arm-r { animation: crewlet-figure-walk-arm-r 0.5s ease-in-out infinite; }
.crewlet-figure--walk .crewlet-figure__leg-l { animation: crewlet-figure-walk-leg-l 0.5s ease-in-out infinite; }
.crewlet-figure--walk .crewlet-figure__leg-r { animation: crewlet-figure-walk-leg-r 0.5s ease-in-out infinite; }

.crewlet-figure--spin .crewlet-figure__all { animation: crewlet-figure-spin 1.1s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
.crewlet-figure--spin .crewlet-figure__arm-l { animation: crewlet-figure-idle-arm-l 1.1s ease-in-out infinite; }
.crewlet-figure--spin .crewlet-figure__arm-r { animation: crewlet-figure-idle-arm-r 1.1s ease-in-out infinite; }

@keyframes crewlet-figure-idle-arm-l { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-3deg); } }
@keyframes crewlet-figure-idle-arm-r { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(3deg); } }
@keyframes crewlet-figure-arm-l-dance { 0%, 100% { transform: rotate(6deg); } 50% { transform: rotate(-12deg); } }
@keyframes crewlet-figure-arm-r-dance { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(12deg); } }
@keyframes crewlet-figure-leg-l-dance { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
@keyframes crewlet-figure-leg-r-dance { 0%, 100% { transform: rotate(8deg); } 50% { transform: rotate(-8deg); } }
@keyframes crewlet-figure-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-26px); } }
@keyframes crewlet-figure-wave-arm { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(-20deg); } }
@keyframes crewlet-figure-jump {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  12% { transform: translateY(22px) scale(1.05, 0.9); }
  45% { transform: translateY(-124px) scale(0.95, 1.06); }
  72% { transform: translateY(0) scale(1.03, 0.96); }
}
@keyframes crewlet-figure-jump-arm-l { 0%, 100% { transform: rotate(3deg); } 45% { transform: rotate(-16deg); } }
@keyframes crewlet-figure-jump-arm-r { 0%, 100% { transform: rotate(-3deg); } 45% { transform: rotate(16deg); } }
@keyframes crewlet-figure-walk-body { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
@keyframes crewlet-figure-walk-leg-l { 0%, 100% { transform: rotate(16deg); } 50% { transform: rotate(-16deg); } }
@keyframes crewlet-figure-walk-leg-r { 0%, 100% { transform: rotate(-16deg); } 50% { transform: rotate(16deg); } }
@keyframes crewlet-figure-walk-arm-l { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }
@keyframes crewlet-figure-walk-arm-r { 0%, 100% { transform: rotate(12deg); } 50% { transform: rotate(-12deg); } }
@keyframes crewlet-figure-spin {
  0% { transform: rotate(0) translateY(0); }
  25% { transform: rotate(90deg) translateY(-40px); }
  50% { transform: rotate(180deg) translateY(0); }
  75% { transform: rotate(270deg) translateY(-40px); }
  100% { transform: rotate(360deg) translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .crewlet-figure__all, .crewlet-figure__arm-l, .crewlet-figure__arm-r, .crewlet-figure__leg-l, .crewlet-figure__leg-r { animation: none !important; }
}
`;

const Part = ({ cls, ds }: { cls: string; ds: string[] }) => (
  <g className={cls}>{ds.map((d, i) => <path key={i} d={d} />)}</g>
);

const CrewletFigure = ({ motion = 'idle', delay = 0, color = '#7c56ff', fillGaps = true, style, ...rest }: CrewletFigureProps) => {
  const rootStyle = { color, ['--crewlet-figure-delay' as string]: `${delay}s`, ...style } as CSSProperties;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1467 978"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      style={rootStyle}
      {...rest}
    >
      <style>{STYLES}</style>
      <g className={`crewlet-figure crewlet-figure--${motion}`} fill="currentColor">
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
