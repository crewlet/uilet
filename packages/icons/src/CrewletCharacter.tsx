import { useId } from 'react';
import type { SVGProps } from 'react';

import {
  CREWLET_CHARACTER_GEOMETRY,
  EYE,
  KEYLINE_GAP,
  KEYLINE_LINE,
  NOTCH,
  VISOR_GAP,
  type CrewletCharacterId,
  type DrawnCharacter,
} from './crewletCharacters.js';

/**
 * How much of a character is drawn.
 *
 * `full` is the mark's own drawing: the keyline floating off the body, and the
 * gap round the visor. `compact` leaves both out and opens the eyes a little,
 * for a character drawn too small for a hairline gap to read (an avatar under
 * 56px): at that size the keyline turns into a blur round the body rather
 * than a line.
 */
export type CrewletCharacterDetail = 'full' | 'compact';

export interface CrewletCharacterProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> {
  /** Which character to draw. */
  character: CrewletCharacterId;
  /** Defaults to `full`. */
  detail?: CrewletCharacterDetail | undefined;
}

const round = (n: number) => Math.round(n * 100) / 100;

/*
 * The frame: a square centred on what the character draws, its longer side
 * filling the square. Every character is therefore centred in whatever box a
 * consumer puts it in, and none needs a placement of its own.
 */
function viewBoxOf({ x, y, width, height }: { x: number; y: number; width: number; height: number }): string {
  const side = Math.max(width, height);
  return [x + width / 2 - side / 2, y + height / 2 - side / 2, side, side].map(round).join(' ');
}

/*
 * A drawn character's pieces. The face (the slits, the visor gap and the
 * crown notch) and any holes are cut out of the body with a mask rather than
 * painted over it in a background colour, so the character is transparent
 * where it is cut and sits on any ground. The keyline is the body's outline
 * stroked wide and masked down to a ring off its edge.
 */
function Drawn({ geometry, detail, id }: { geometry: DrawnCharacter; detail: CrewletCharacterDetail; id: string }) {
  const { shapes, holes, visor, notch } = geometry;
  const full = detail === 'full';
  const d = shapes.join('');
  const eye = full ? EYE.full : EYE.compact;
  const eyeWidth = visor.width * eye.width;
  const eyeHeight = visor.height * eye.height;
  const eyeTop = visor.y + (visor.height - eyeHeight) / 2;
  const middle = visor.x + visor.width / 2;
  const offset = visor.width * EYE.offset;
  // The masks reach well past the stage, so a part drawn near its edge is never clipped by them.
  const reach = { x: -40, y: -40, width: 180, height: 180 } as const;
  const face = `${id}-face`;
  const ring = `${id}-ring`;
  return (
    <>
      <defs>
        <mask id={face} maskUnits="userSpaceOnUse" {...reach}>
          <rect {...reach} fill="#fff" />
          <g fill="#000">
            {[middle - offset, middle + offset].map((centre) => (
              <rect
                key={centre}
                x={round(centre - eyeWidth / 2)}
                y={round(eyeTop)}
                width={round(eyeWidth)}
                height={round(eyeHeight)}
              />
            ))}
            {notch && (
              <path
                d={`M${round(notch[0] - NOTCH.half)} ${round(notch[1] - 1)}L${round(notch[0] + NOTCH.half)} ${round(
                  notch[1] - 1,
                )}L${round(notch[0])} ${round(notch[1] + NOTCH.depth)}Z`}
              />
            )}
            {holes.map((hole) => (
              <path key={hole} d={hole} />
            ))}
          </g>
          {full && (
            <rect
              x={visor.x}
              y={visor.y}
              width={visor.width}
              height={visor.height}
              fill="none"
              stroke="#000"
              strokeWidth={VISOR_GAP}
            />
          )}
        </mask>
        {full && (
          <mask id={ring} maskUnits="userSpaceOnUse" {...reach}>
            <rect {...reach} fill="#fff" />
            <path d={d} fill="#000" stroke="#000" strokeWidth={KEYLINE_GAP * 2} strokeLinejoin="miter" />
          </mask>
        )}
      </defs>
      {full && (
        <path
          d={d}
          mask={`url(#${ring})`}
          fill="none"
          stroke="currentColor"
          strokeWidth={(KEYLINE_GAP + KEYLINE_LINE) * 2}
          strokeLinejoin="miter"
        />
      )}
      <path d={d} mask={`url(#${face})`} fill="currentColor" />
    </>
  );
}

/**
 * One Crewlet character, in the current text colour, centred in a square.
 *
 * It is a picture and says nothing on its own: it is hidden from assistive
 * technology, and whatever draws it beside a name (an avatar, a picker's
 * option) carries that name. Colour it with CSS `color` on it or any ancestor.
 */
const CrewletCharacter = ({ character, detail = 'full', ...rest }: CrewletCharacterProps) => {
  // A mask is found by id across the whole document, so every instance needs
  // its own. React's ids are made safe for a url() reference here.
  const id = `crewlet-character-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const geometry = CREWLET_CHARACTER_GEOMETRY[character];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBoxOf(geometry.bounds)}
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      data-character={character}
      data-detail={detail}
      {...rest}
    >
      {geometry.kind === 'mark' ? (
        <g transform={geometry.transform} fill="currentColor">
          {detail === 'full' && <path d={geometry.keyline} />}
          {geometry.body.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ) : (
        <Drawn geometry={geometry} detail={detail} id={id} />
      )}
    </svg>
  );
};

export default CrewletCharacter;
