/**
 * Engine exports for Network Narrative Engine
 */

// Core components
export { NarrativeEngine } from './NarrativeEngine.js';
export { GraphManager } from './GraphManager.js';
export { StateManager } from './StateManager.js';
export { ChoiceResolver } from './ChoiceResolver.js';

// New architecture components
export { HardChoiceGenerator } from './HardChoiceGenerator.js';
export { NarrativeGenerator } from './NarrativeGenerator.js';
export { EffectProcessor } from './EffectProcessor.js';

// Types from core components
export type { ValidationResult, GraphStats, PathInfo } from './GraphManager.js';
export type { ResolvedChoice, ChoiceStructure, ValidationError } from './ChoiceResolver.js';
export type { ExtendedGameSession } from './NarrativeEngine.js';

// Types from new architecture components
export type {
  HardChoiceContext,
  GeneratedHardChoice,
  CharacterEmbodiment,
  HardChoiceConfig,
} from './HardChoiceGenerator.js';

export type {
  NarrativeGenerationContext,
  GeneratedTurn,
  NarrativeGeneratorConfig,
} from './NarrativeGenerator.js';

export type {
  EffectProcessingResult,
  TriggeredRule,
  SurfacedConsequence,
  EffectContext,
  EffectProcessorConfig,
} from './EffectProcessor.js';
