import '../ArtifactKindIllustration/ArtifactKinds.css';
import './ArtifactCard.css';

export { ArtifactCard, ArtifactCardSkeleton, ArtifactPreviewGlyph } from './ArtifactCard.js';
export type { ArtifactAccess, ArtifactCardLabels, ArtifactCardProps, ArtifactCardSize } from './ArtifactCard.js';
// The kind's glyph has a module of its own (`ArtifactKindGlyph/`); this
// subpath still answers for it, as it did before the move.
export { ARTIFACT_KINDS, ArtifactKindGlyph } from '../ArtifactKindGlyph/index.js';
export type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
