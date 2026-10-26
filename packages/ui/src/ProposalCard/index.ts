// The foot's empty live region borrows the shared visually hidden class.
import '../VisuallyHidden/VisuallyHidden.css';
import './ProposalCard.css';

export { PROPOSAL_CARD_LABELS, PROPOSAL_FAILURE_OUTCOMES, PROPOSAL_STATES, PROPOSAL_TONES, ProposalCard } from './ProposalCard.js';
export type {
  ProposalCardLabels,
  ProposalCardProps,
  ProposalConfirmation,
  ProposalDecisionRefusal,
  ProposalFailureOutcome,
  ProposalKind,
  ProposalScope,
  ProposalState,
  ProposalTone,
} from './ProposalCard.js';
