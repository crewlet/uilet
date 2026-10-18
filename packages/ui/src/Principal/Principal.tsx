import type { CrewletCharacterId } from '@crewlethq/icons/characters';
import { UsersGlyph } from '@crewlethq/icons/glyphs';
import { Avatar, type AvatarSize } from '../Avatar/index.js';
import type { NodeHue } from '../utils/nodeHue.js';

/**
 * Who something is shared with, made by or owned by.
 *
 * `person` and `agent` are seats (a person holds a human seat), drawn as the
 * circle and the squircle `Avatar` already draws them as. A `team` is an org
 * unit: everyone in it and below it, people and agents alike, so it is drawn
 * with the people glyph rather than anybody's initials.
 */
export type PrincipalKind = 'person' | 'agent' | 'team';

export const PRINCIPAL_KINDS = ['person', 'agent', 'team'] as const satisfies readonly PrincipalKind[];

export interface Principal {
  /** Stable across renames: a seat handle or a unit key. */
  id: string;
  kind: PrincipalKind;
  name: string;
  /** A short second line: a unit, a handle, "6 people, 4 agents". */
  detail?: string | undefined;
  /** The Crewlet character an agent is drawn as. */
  character?: CrewletCharacterId | undefined;
  /** The hue an agent's character is drawn in. */
  hue?: NodeHue | undefined;
  /** A person's picture. */
  src?: string | undefined;
}

export interface PrincipalAvatarProps {
  principal: Principal;
  size?: AvatarSize | undefined;
  /** The name is printed beside the badge, so the badge says nothing itself. Defaults to true. */
  decorative?: boolean | undefined;
}

/** A principal's badge, drawn the one way every surface draws it. */
export function PrincipalAvatar({ principal, size = 'sm', decorative = true }: PrincipalAvatarProps) {
  const { kind, name, character, hue, src } = principal;
  if (kind === 'team') {
    return <Avatar name={name} size={size} kind="agent" icon={<UsersGlyph />} decorative={decorative} />;
  }
  return (
    <Avatar
      name={name}
      size={size}
      kind={kind === 'person' ? 'human' : 'agent'}
      character={kind === 'agent' ? character : undefined}
      hue={kind === 'agent' ? hue : undefined}
      src={src}
      decorative={decorative}
    />
  );
}
