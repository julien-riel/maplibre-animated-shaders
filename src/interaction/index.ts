/**
 * Interaction module - Per-feature animation control
 *
 * Provides interactive animation control for individual features
 * via click/hover events.
 */

export { FeatureAnimationStateManager } from './FeatureAnimationStateManager';
export { FeatureInteractionHandler } from './InteractionHandler';

// Re-export with legacy name for backwards compatibility
export { FeatureInteractionHandler as InteractionHandler } from './InteractionHandler';
