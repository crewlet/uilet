// Framework free: the artifact kit imports this entry into a bundle with no
// React in it, so nothing reachable from here may import React or a stylesheet.
export {
  PRESENCE_ACTIVITIES,
  PRESENCE_HUES,
  PRESENCE_LABELS,
  assignPresenceHues,
  collapseSessions,
  joinNames,
  presenceLabels,
  presenceOrder,
} from './presence.js';
export type { PresenceActivity, PresenceKind, PresenceLabels, PresenceMember } from './presence.js';
