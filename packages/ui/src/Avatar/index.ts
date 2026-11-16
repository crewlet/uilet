import './Avatar.css';
import './AvatarStack.css';

export {
  AVATAR_CHARACTER_FULL_DETAIL,
  AVATAR_CORNER_RANGE,
  AVATAR_CORNER_RATIO,
  AVATAR_SIZES,
  AVATAR_STATUS_LABELS,
  AVATAR_STATUSES,
  AVATAR_VERDICT_LABELS,
  AVATAR_VERDICTS,
  Avatar,
  avatarCorner,
  avatarInitialsName,
  avatarPixels,
  avatarTint,
  getInitials,
} from './Avatar.js';
export type {
  AvatarKind,
  AvatarProps,
  AvatarRing,
  AvatarSize,
  AvatarSizeStep,
  AvatarStatus,
  AvatarTone,
  AvatarVerdict,
} from './Avatar.js';
export { AvatarStack, avatarStackLabel } from './AvatarStack.js';
export type { AvatarStackMember, AvatarStackProps } from './AvatarStack.js';
