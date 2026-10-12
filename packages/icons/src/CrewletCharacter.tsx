import type { SVGProps } from 'react';

import { drawingOf } from './characterDrawing.js';
import { CREWLET_CHARACTER_GEOMETRY, type CrewletCharacterId } from './crewletCharacters.js';

/**
 * How much of a character is drawn.
 *
 * `full` is the mark's own drawing: the keyline floating off the body, and the
 * gap round the visor. `compact` leaves both out, with every other cut as fine
 * as them, and opens the eyes a little, for a character drawn too small for a
 * hairline gap to read (an avatar under 56px): at that size the keyline turns
 * into a blur round the body rather than a line.
 */
export type CrewletCharacterDetail = 'full' | 'compact';

export interface CrewletCharacterProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> {
  /** Which character to draw. */
  character: CrewletCharacterId;
  /** Defaults to `full`. */
  detail?: CrewletCharacterDetail | undefined;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * One Crewlet character, in the current text colour, centred in a square.
 *
 * It is framed square on what it draws and its face and holes are cut through
 * it (see `characterDrawing.ts`), so it sits in the middle of whatever box a
 * consumer puts it in and shows that box's ground through every cut. It
 * carries no mask and no id, so nothing a host stylesheet paints reaches a
 * hole and any number of copies can share a page.
 *
 * It is a picture and says nothing on its own: it is hidden from assistive
 * technology, and whatever draws it beside a name (an avatar, a picker's
 * option) carries that name. Colour it with CSS `color` on it or any ancestor.
 */
const CrewletCharacter = ({ character, detail = 'full', ...rest }: CrewletCharacterProps) => {
  const geometry = CREWLET_CHARACTER_GEOMETRY[character];
  const { frame, paths } = drawingOf(character);
  const drawn = paths(detail).map((d) => <path key={d} d={d} />);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={[frame.x, frame.y, frame.width, frame.height].map(round).join(' ')}
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      data-character={character}
      data-detail={detail}
      {...rest}
    >
      <g fill="currentColor" transform={geometry.kind === 'mark' ? geometry.transform : undefined}>
        {drawn}
      </g>
    </svg>
  );
};

export default CrewletCharacter;
