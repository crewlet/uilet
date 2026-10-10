// The Crewlet characters, on an entry of their own: the component that draws
// one and the data that names the set. A consumer that only draws agents
// (@crewlethq/ui's Avatar) reaches the thirty silhouettes here without
// resolving the root, which carries every illustration in the package.
export { default as CrewletCharacter } from './CrewletCharacter.js';
export type { CrewletCharacterDetail, CrewletCharacterProps } from './CrewletCharacter.js';
export { CREWLET_CHARACTERS, CREWLET_CHARACTER_GEOMETRY, isCrewletCharacter } from './crewletCharacters.js';
export type { CharacterBox, CrewletCharacterGeometry, CrewletCharacterId } from './crewletCharacters.js';
