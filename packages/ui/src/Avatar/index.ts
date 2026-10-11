import './Avatar.css';
import './AvatarStack.css';

export {
  AVATAR_CHARACTER_FULL_DETAIL,
  AVATAR_CORNER_RATIO,
  AVATAR_SIZES,
  AVATAR_STATUS_LABELS,
  AVATAR_STATUSES,
  Avatar,
  avatarCorner,
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
} from './Avatar.js';
export { AvatarStack, avatarStackLabel } from './AvatarStack.js';
export type { AvatarStackMember, AvatarStackProps } from './AvatarStack.js';
