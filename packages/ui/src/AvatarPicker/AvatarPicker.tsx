import { CREWLET_CHARACTERS, CREWLET_CHARACTER_GEOMETRY, type CrewletCharacterId } from '@crewlethq/icons/characters';
import { PencilGlyph } from '@crewlethq/icons/glyphs';
import { Avatar, type AvatarSize } from '../Avatar/Avatar.js';
import { CharacterPicker } from '../CharacterPicker/CharacterPicker.js';
import { HuePicker } from '../HuePicker/HuePicker.js';
import { Popover } from '../Popover/index.js';
import { cx } from '../utils/cx.js';
import { NODE_HUE_NAMES, type NodeHue } from '../utils/nodeHue.js';

/** An agent's look: its character and the hue it is drawn in. */
export interface AvatarPickerValue {
  character: CrewletCharacterId;
  hue: NodeHue;
}

export interface AvatarPickerProps {
  value: AvatarPickerValue;
  onChange: (next: AvatarPickerValue) => void;
  /** The agent's name, for the button's accessible name. */
  name: string;
  /** The badge's size. 40px, the size a form's header draws an identity at. */
  size?: AvatarSize | undefined;
  /** The characters offered, in order. Every character, by default. */
  characters?: readonly CrewletCharacterId[] | undefined;
  /** The badge is drawn, and nothing opens. */
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * An agent's badge that opens its own picker: press it and the characters and
 * the hues open in a popover beside it.
 *
 * THE BADGE IS THE CONTROL. The two pickers drawn open in a form took about
 * 330px for a choice made once, so the form keeps one badge, marked with a
 * pencil pip as the thing that changes it, and the grid opens on demand. A
 * choice applies as it is made, as the pickers' own radios do; Escape or a
 * press outside closes the popover.
 */
export function AvatarPicker({
  value,
  onChange,
  name,
  size = 'lg',
  characters = CREWLET_CHARACTERS,
  disabled = false,
  className,
}: AvatarPickerProps) {
  const badge = <Avatar kind="agent" name={name} character={value.character} hue={value.hue} size={size} decorative />;
  if (disabled) return <span className={cx('crewlet-avatar-picker', className)}>{badge}</span>;
  const now = `${CREWLET_CHARACTER_GEOMETRY[value.character].name} in ${NODE_HUE_NAMES[value.hue]}`;
  return (
    <Popover
      label="Profile icon"
      align="start"
      className="crewlet-avatar-picker__panel"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={cx('crewlet-avatar-picker', className)}
          aria-label={`Change ${name}'s profile icon, now ${now}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={toggle}
        >
          {badge}
          <span className="crewlet-avatar-picker__pip" aria-hidden="true">
            <PencilGlyph size={9} />
          </span>
        </button>
      )}
    >
      <div className="crewlet-avatar-picker__body">
        <span className="crewlet-avatar-picker__label">Character</span>
        <CharacterPicker
          label="Character"
          value={value.character}
          hue={value.hue}
          characters={characters}
          onValueChange={(character) => onChange({ ...value, character })}
        />
        <span className="crewlet-avatar-picker__label">Color</span>
        <HuePicker label="Color" size="sm" value={value.hue} onValueChange={(hue) => onChange({ ...value, hue })} />
      </div>
    </Popover>
  );
}
