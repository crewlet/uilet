import type { HTMLAttributes } from 'react';
import {
  CREWLET_CHARACTERS,
  CREWLET_CHARACTER_GEOMETRY,
  type CrewletCharacterId,
} from '@crewlethq/icons/characters';
import { Avatar } from '../Avatar/Avatar.js';
import { tabStop, useRoving } from '../Tabs/roving.js';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/**
 * How many characters a row of the grid holds. Thirty characters make five
 * full rows, and a grid that wraps by width would leave the arrow keys
 * guessing which option sits above which.
 */
export const CHARACTER_PICKER_COLUMNS = 6;

export interface CharacterPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /** The group's name, said on entering it: "Character". */
  label: string;
  /** The chosen character. */
  value: CrewletCharacterId;
  onValueChange: (character: CrewletCharacterId) => void;
  /** The hue every option is shown in, so the grid previews the agent it will be. */
  hue?: NodeHue | undefined;
  /** The characters offered, in order. Every character, by default. */
  characters?: readonly CrewletCharacterId[] | undefined;
  /** Nothing can be chosen, and the grid says so. */
  disabled?: boolean | undefined;
}

/**
 * The choice of an agent's Crewlet character: a grid of the characters, each
 * drawn as the badge it would make, in the agent's own hue.
 *
 * A RADIO GROUP, because a character is a setting and exactly one is chosen:
 * the grid is one tab stop, the arrows move through it and choose as they
 * move, as the platform's own radio group does. Left and Right walk the
 * options in reading order and Up and Down move a whole row, because the
 * options are laid out in rows and an arrow that ignored that would move
 * somewhere the reader is not looking.
 *
 * THE CHOSEN OPTION IS SAID THE WAY THE KIT SAYS SELECTED, with the badge's
 * own `brand` ring, rather than a frame the grid draws round a tile: one
 * badge, one line round it, and the line means "this one".
 */
export function CharacterPicker({
  label,
  value,
  onValueChange,
  hue,
  characters = CREWLET_CHARACTERS,
  disabled = false,
  className,
  ...rest
}: CharacterPickerProps) {
  const { buttons, onKeyDown, onFocusAt } = useRoving(
    characters.length,
    disabled ? null : (index) => onValueChange(characters[index]!),
    { columns: CHARACTER_PICKER_COLUMNS },
  );
  const options = characters.map(() => ({ disabled }));
  const stop = tabStop(options, characters.indexOf(value));

  return (
    <div
      {...rest}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cx('crewlet-character-picker', className)}
    >
      {characters.map((character, index) => {
        const chosen = character === value;
        const { name } = CREWLET_CHARACTER_GEOMETRY[character];
        return (
          <button
            key={character}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={name}
            title={name}
            tabIndex={index === stop ? 0 : -1}
            disabled={disabled}
            className={cx('crewlet-character-picker__option', chosen && 'is-chosen')}
            onClick={() => onValueChange(character)}
            onFocus={() => onFocusAt(index)}
            onKeyDown={(event) => onKeyDown(event, true)}
          >
            <Avatar
              kind="agent"
              character={character}
              hue={hue}
              size="lg"
              ring={chosen ? 'brand' : undefined}
              decorative
            />
          </button>
        );
      })}
    </div>
  );
}
