/**
 * A control's hint while it is held (`disabledReason`): what it does, then
 * why it cannot be used now, so the tip a pointer or a keyboard opens says
 * both. "React with eyes. Join the room to react."
 */
export function heldHint(hint: string, reason: string | undefined): string {
  return reason ? `${hint}. ${reason}` : hint;
}
