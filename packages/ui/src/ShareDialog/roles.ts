/*
 * The artifact role ladder, as the engine names it (`artifacts.Role`).
 *
 * Each role includes every role below it. Owner is held by one principal and
 * moves only by transfer, so no share grants it.
 */

export type ArtifactRole = 'viewer' | 'commenter' | 'contributor' | 'editor' | 'owner';

/** The roles a share may grant: every role but owner. */
export type ShareableRole = Exclude<ArtifactRole, 'owner'>;

/** The ladder in ascending order. */
export const ARTIFACT_ROLES = ['viewer', 'commenter', 'contributor', 'editor', 'owner'] as const satisfies readonly ArtifactRole[];

export const SHAREABLE_ROLES = ['viewer', 'commenter', 'contributor', 'editor'] as const satisfies readonly ShareableRole[];

/** Whether `role` includes `floor`: an editor can do everything a viewer can. */
export function roleAtLeast(role: ArtifactRole, floor: ArtifactRole): boolean {
  return ARTIFACT_ROLES.indexOf(role) >= ARTIFACT_ROLES.indexOf(floor);
}

/** What the whole company may do: nothing beyond the people added, or one shareable role. */
export type CompanyAccess = 'none' | ShareableRole;
