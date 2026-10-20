import '../ArtifactKindIllustration/ArtifactKinds.css';
import './ArtifactCard.css';

export { ArtifactCard, ArtifactCardSkeleton, ArtifactPreviewGlyph } from './ArtifactCard.js';
export type { ArtifactCardLabels, ArtifactCardProps, ArtifactCardSize } from './ArtifactCard.js';
// The kind's glyph has a module of its own (`ArtifactKindGlyph/`); this
// subpath still answers for it, as it did before the move.
export { ARTIFACT_KINDS, ArtifactKindGlyph } from '../ArtifactKindGlyph/index.js';
export type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
// Access has a module of its own (`ArtifactAccess/`), shared with a list's
// Access column; this subpath still answers for its type.
export type { ArtifactAccess } from '../ArtifactAccess/index.js';
