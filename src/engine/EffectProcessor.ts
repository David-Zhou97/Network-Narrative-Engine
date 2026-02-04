/**
 * EffectProcessor - Applies world rules and processes narrative effects
 *
 * This component handles:
 * - Evaluating world rules against player actions
 * - Triggering delayed consequences
 * - Managing active rule effects
 * - Updating ending dimension scores
 */

import type { WorldRule, EndingDimension } from '../types/storySeed.js';
import type {
  WorldState,
  StateModification,
  ActiveRuleEffect,
  Memory,
  ValueConflictRecord,
  HardChoice,
} from '../types/narrative.js';
import { StateManager } from './StateManager.js';

/**
 * Result of processing effects for a turn
 */
export interface EffectProcessingResult {
  /** State modifications that were applied */
  appliedModifications: StateModification[];
  /** World rules that were triggered */
  triggeredRules: TriggeredRule[];
  /** New memories created */
  newMemories: Memory[];
  /** Consequences that surfaced from past actions */
  surfacedConsequences: SurfacedConsequence[];
  /** Updated ending dimension scores */
  dimensionUpdates: Record<string, number>;
}

/**
 * A world rule that was triggered
 */
export interface TriggeredRule {
  rule: WorldRule;
  trigger: string;
  /** Whether the effect is immediate or delayed */
  isDelayed: boolean;
  /** Number of turns until effect manifests (if delayed) */
  delayedTurns?: number;
  /** Description of the effect */
  effectDescription: string;
}

/**
 * A consequence that surfaces from a past action
 */
export interface SurfacedConsequence {
  /** The original rule effect */
  ruleEffect: ActiveRuleEffect;
  /** The rule that created it */
  rule: WorldRule;
  /** Description of what's happening now */
  manifestation: string;
  /** State modifications to apply */
  modifications: StateModification[];
}

/**
 * Context for processing effects
 */
export interface EffectContext {
  /** The choice that was made */
  choice: HardChoice;
  /** Which value conflict was involved */
  valueConflict: ValueConflictRecord;
  /** Characters involved */
  involvedCharacters: string[];
  /** Scene location */
  location: string;
  /** Current turn number */
  turnNumber: number;
}

/**
 * Configuration for the effect processor
 */
export interface EffectProcessorConfig {
  /** Probability of a secret surfacing (0-1) */
  secretSurfaceProbability: number;
  /** Minimum turns before delayed effects trigger */
  minDelayTurns: number;
  /** Maximum turns before delayed effects trigger */
  maxDelayTurns: number;
  /** Whether to apply relationship decay over time */
  enableRelationshipDecay: boolean;
  /** Rate of relationship decay per turn (0-1) */
  relationshipDecayRate: number;
}

const DEFAULT_CONFIG: EffectProcessorConfig = {
  secretSurfaceProbability: 0.15,
  minDelayTurns: 2,
  maxDelayTurns: 5,
  enableRelationshipDecay: true,
  relationshipDecayRate: 0.02,
};

export class EffectProcessor {
  private worldRules: WorldRule[];
  private endingDimensions: EndingDimension[];
  private config: EffectProcessorConfig;

  constructor(
    worldRules: WorldRule[],
    endingDimensions: EndingDimension[],
    config: Partial<EffectProcessorConfig> = {}
  ) {
    this.worldRules = worldRules;
    this.endingDimensions = endingDimensions;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process all effects for a player's choice
   */
  processChoice(
    choice: HardChoice,
    context: EffectContext,
    stateManager: StateManager
  ): EffectProcessingResult {
    const result: EffectProcessingResult = {
      appliedModifications: [],
      triggeredRules: [],
      newMemories: [],
      surfacedConsequences: [],
      dimensionUpdates: {},
    };

    // 1. Apply direct choice effects
    if (choice.conditions) {
      // Choice conditions would be applied here if they modify state
    }

    // 2. Check world rules for triggers
    const triggeredRules = this.evaluateWorldRules(choice, context);
    result.triggeredRules = triggeredRules;

    // 3. Process immediate rule effects
    for (const triggered of triggeredRules.filter((t) => !t.isDelayed)) {
      const mods = this.generateRuleModifications(triggered);
      result.appliedModifications.push(...mods);
      stateManager.applyModifications(mods);
    }

    // 4. Queue delayed effects
    for (const triggered of triggeredRules.filter((t) => t.isDelayed)) {
      const effect = this.createDelayedEffect(triggered, context.turnNumber);
      stateManager.addActiveRuleEffect(effect);
    }

    // 5. Check for surfacing consequences
    const consequences = this.checkForSurfacingConsequences(context, stateManager);
    result.surfacedConsequences = consequences;
    for (const consequence of consequences) {
      result.appliedModifications.push(...consequence.modifications);
      stateManager.applyModifications(consequence.modifications);
      stateManager.removeActiveRuleEffect(consequence.ruleEffect.ruleId);
    }

    // 6. Create memory of this choice
    const memory = this.createChoiceMemory(choice, context);
    result.newMemories.push(memory);
    stateManager.addMemory(memory);

    // 7. Update ending dimensions
    result.dimensionUpdates = this.updateEndingDimensions(choice, context, stateManager);

    // 8. Apply time-based effects (relationship decay)
    if (this.config.enableRelationshipDecay) {
      this.applyRelationshipDecay(stateManager);
    }

    return result;
  }

  /**
   * Evaluate which world rules are triggered by a choice
   */
  private evaluateWorldRules(
    choice: HardChoice,
    context: EffectContext
  ): TriggeredRule[] {
    const triggered: TriggeredRule[] = [];

    for (const rule of this.worldRules) {
      const trigger = this.checkRuleTrigger(rule, choice, context);
      if (trigger) {
        const isDelayed = this.shouldBeDelayed(rule);
        triggered.push({
          rule,
          trigger,
          isDelayed,
          delayedTurns: isDelayed
            ? this.randomDelay()
            : undefined,
          effectDescription: this.describeRuleEffect(rule, choice, context),
        });
      }
    }

    return triggered;
  }

  /**
   * Check if a specific rule is triggered
   */
  private checkRuleTrigger(
    rule: WorldRule,
    choice: HardChoice,
    context: EffectContext
  ): string | null {
    const ruleLower = rule.rule.toLowerCase();
    const choiceTextLower = choice.text.toLowerCase();
    const benefitLower = choice.benefit.toLowerCase();
    const costLower = choice.cost.toLowerCase();

    // Violence rules
    if (rule.category === 'violence') {
      const violenceKeywords = ['fight', 'attack', 'kill', 'hurt', 'violence', 'force', 'aggressive'];
      for (const keyword of violenceKeywords) {
        if (choiceTextLower.includes(keyword) || benefitLower.includes(keyword) || costLower.includes(keyword)) {
          return `Used violence or force: "${choice.text}"`;
        }
      }
    }

    // Trust rules
    if (rule.category === 'trust') {
      const betrayalKeywords = ['betray', 'lie', 'deceive', 'trick', 'break promise'];

      for (const keyword of betrayalKeywords) {
        if (choiceTextLower.includes(keyword) || costLower.includes(keyword)) {
          return `Broke trust: "${choice.text}"`;
        }
      }

      // "Trust once broken takes 3x effort" triggers on betrayal
      if (ruleLower.includes('trust') && ruleLower.includes('broken')) {
        for (const keyword of betrayalKeywords) {
          if (costLower.includes(keyword)) {
            return `Trust broken through: "${choice.text}"`;
          }
        }
      }
    }

    // Secret rules
    if (rule.category === 'secrets') {
      const secretKeywords = ['reveal', 'secret', 'expose', 'hidden', 'discover'];
      for (const keyword of secretKeywords) {
        if (choiceTextLower.includes(keyword) || benefitLower.includes(keyword)) {
          return `Secrets involved: "${choice.text}"`;
        }
      }

      // "Secrets surface at the worst moments" - random trigger
      if (ruleLower.includes('surface') && Math.random() < this.config.secretSurfaceProbability) {
        return 'A secret threatens to surface';
      }
    }

    // Relationship rules
    if (rule.category === 'relationships') {
      if (context.involvedCharacters.length > 0) {
        // Power corrupts
        if (ruleLower.includes('power') && ruleLower.includes('corrupt')) {
          if (benefitLower.includes('power') || benefitLower.includes('control')) {
            return `Gained power through: "${choice.text}"`;
          }
        }

        // Mercy remembered
        if (ruleLower.includes('mercy')) {
          if (choiceTextLower.includes('mercy') || choiceTextLower.includes('spare') || choiceTextLower.includes('forgive')) {
            return `Showed mercy: "${choice.text}"`;
          }
        }
      }
    }

    // Resource rules
    if (rule.category === 'resources') {
      // Debts collected
      if (ruleLower.includes('debt')) {
        if (benefitLower.includes('owe') || benefitLower.includes('favor') || benefitLower.includes('help')) {
          return `Created a debt: "${choice.text}"`;
        }
      }
    }

    // Time rules
    if (rule.category === 'time') {
      // Time heals but fades
      if (ruleLower.includes('time') && ruleLower.includes('heal')) {
        // This is processed passively, not on trigger
      }
    }

    return null;
  }

  /**
   * Determine if a rule effect should be delayed
   */
  private shouldBeDelayed(rule: WorldRule): boolean {
    const delayedPatterns = [
      'cycle', 'return', 'later', 'eventually', 'come back',
      'revenge', 'collect', 'surface', 'remember', 'haunt'
    ];

    const ruleLower = rule.rule.toLowerCase();
    return delayedPatterns.some((pattern) => ruleLower.includes(pattern));
  }

  /**
   * Generate random delay for a rule effect
   */
  private randomDelay(): number {
    return Math.floor(
      Math.random() * (this.config.maxDelayTurns - this.config.minDelayTurns + 1) +
      this.config.minDelayTurns
    );
  }

  /**
   * Generate state modifications for a triggered rule
   */
  private generateRuleModifications(triggered: TriggeredRule): StateModification[] {
    const mods: StateModification[] = [];
    const rule = triggered.rule;

    switch (rule.category) {
      case 'violence':
        // Violence creates enemies
        mods.push({
          type: 'set',
          target: 'flags.has_enemies',
          value: true,
        });
        break;

      case 'trust':
        // Trust broken is hard to repair
        mods.push({
          type: 'subtract',
          target: 'player.trust_reputation',
          value: 20,
        });
        break;

      case 'secrets':
        // Secrets about to surface
        mods.push({
          type: 'add',
          target: 'player.exposed_risk',
          value: 15,
        });
        break;

      case 'relationships':
        // Power affects relationships
        if (rule.rule.toLowerCase().includes('corrupt')) {
          mods.push({
            type: 'subtract',
            target: 'player.empathy',
            value: 5,
          });
        }
        break;

      case 'resources':
        // Debts tracked
        mods.push({
          type: 'add',
          target: 'resources.debts_owed',
          value: 1,
        });
        break;
    }

    return mods;
  }

  /**
   * Create a delayed effect to be tracked
   */
  private createDelayedEffect(
    triggered: TriggeredRule,
    currentTurn: number
  ): ActiveRuleEffect {
    return {
      ruleId: triggered.rule.id,
      triggeredAt: currentTurn,
      turnsRemaining: triggered.delayedTurns,
      pendingEffect: triggered.effectDescription,
      target: this.determineEffectTarget(triggered.rule),
    };
  }

  /**
   * Determine what the rule effect targets
   */
  private determineEffectTarget(rule: WorldRule): string {
    switch (rule.category) {
      case 'violence':
        return 'character';
      case 'trust':
        return 'relationships';
      case 'secrets':
        return 'player';
      case 'relationships':
        return 'character';
      case 'resources':
        return 'player';
      case 'time':
        return 'world';
      default:
        return 'player';
    }
  }

  /**
   * Check for consequences that should surface this turn
   */
  private checkForSurfacingConsequences(
    _context: EffectContext,
    stateManager: StateManager
  ): SurfacedConsequence[] {
    const state = stateManager.getState();
    const surfacing: SurfacedConsequence[] = [];

    for (const effect of state.activeRuleEffects) {
      // Decrement remaining turns
      if (effect.turnsRemaining !== undefined) {
        effect.turnsRemaining--;

        // Check if it's time to surface
        if (effect.turnsRemaining <= 0) {
          const rule = this.worldRules.find((r) => r.id === effect.ruleId);
          if (rule) {
            surfacing.push({
              ruleEffect: effect,
              rule,
              manifestation: this.generateManifestation(rule, effect),
              modifications: this.generateConsequenceModifications(rule, effect),
            });
          }
        }
      }
    }

    return surfacing;
  }

  /**
   * Generate description of how a consequence manifests
   */
  private generateManifestation(rule: WorldRule, _effect: ActiveRuleEffect): string {
    const templates: Record<string, string[]> = {
      violence: [
        'The cycle of violence catches up with you.',
        'Someone seeks revenge for past wrongs.',
        'Violence begets violence, as you now discover.',
      ],
      trust: [
        'Your broken promise comes back to haunt you.',
        'The trust you shattered proves harder to rebuild than expected.',
        'Word of your betrayal has spread.',
      ],
      secrets: [
        'The secret you thought buried has resurfaced.',
        'At the worst possible moment, the truth emerges.',
        'Someone knows what you tried to hide.',
      ],
      relationships: [
        'The power you gained has changed how others see you.',
        'Your mercy is remembered when you need it most.',
        'Past kindness returns unexpectedly.',
      ],
      resources: [
        'A debt is called in.',
        'The favor you owe cannot be ignored.',
        'Payment is demanded.',
      ],
    };

    const categoryTemplates = templates[rule.category] || ['Your past actions have consequences.'];
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  }

  /**
   * Generate modifications when a consequence surfaces
   */
  private generateConsequenceModifications(
    rule: WorldRule,
    _effect: ActiveRuleEffect
  ): StateModification[] {
    const mods: StateModification[] = [];

    // Mark that a consequence has surfaced
    mods.push({
      type: 'set',
      target: `flags.consequence_${rule.id}_surfaced`,
      value: true,
    });

    // Category-specific effects
    switch (rule.category) {
      case 'violence':
        mods.push({
          type: 'subtract',
          target: 'player.safety',
          value: 15,
        });
        break;

      case 'trust':
        mods.push({
          type: 'multiply',
          target: 'player.trust_repair_difficulty',
          value: 3,
        });
        break;

      case 'secrets':
        mods.push({
          type: 'set',
          target: 'flags.exposed',
          value: true,
        });
        break;

      case 'relationships':
        // Mercy or corruption consequences
        if (rule.rule.toLowerCase().includes('mercy')) {
          mods.push({
            type: 'add',
            target: 'player.karma',
            value: 20,
          });
        }
        break;

      case 'resources':
        mods.push({
          type: 'subtract',
          target: 'resources.favors',
          value: 1,
        });
        break;
    }

    return mods;
  }

  /**
   * Create a memory of the choice made
   */
  private createChoiceMemory(choice: HardChoice, context: EffectContext): Memory {
    let significance = 5;

    // Third path choices are more significant
    if (choice.isThirdPath) {
      significance = 8;
    }

    // Choices with hidden consequences are more significant
    if (choice.hiddenConsequences) {
      significance = Math.min(significance + 2, 10);
    }

    return {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'choice',
      description: `Chose: "${choice.text}" - ${choice.benefit}`,
      createdAt: context.turnNumber,
      significance,
      involvedCharacters: context.involvedCharacters,
      relatedConflict: context.valueConflict.conflictId,
      hasSurfaced: false,
    };
  }

  /**
   * Update ending dimension scores based on the choice
   */
  private updateEndingDimensions(
    choice: HardChoice,
    _context: EffectContext,
    stateManager: StateManager
  ): Record<string, number> {
    const updates: Record<string, number> = {};
    const state = stateManager.getState();

    for (const dimension of this.endingDimensions) {
      let change = 0;

      // Analyze the choice to determine dimension impact
      const choiceLower = choice.text.toLowerCase();
      const benefitLower = choice.benefit.toLowerCase();

      const lowEndLower = dimension.lowEnd.toLowerCase();
      const highEndLower = dimension.highEnd.toLowerCase();

      // Check for keywords that push toward each end
      if (
        choiceLower.includes(lowEndLower) ||
        benefitLower.includes(lowEndLower) ||
        this.isRelatedConcept(choiceLower + benefitLower, lowEndLower)
      ) {
        change -= 0.1;
      }

      if (
        choiceLower.includes(highEndLower) ||
        benefitLower.includes(highEndLower) ||
        this.isRelatedConcept(choiceLower + benefitLower, highEndLower)
      ) {
        change += 0.1;
      }

      if (change !== 0) {
        const currentScore = state.endingDimensionScores[dimension.id] || 0.5;
        const newScore = Math.max(0, Math.min(1, currentScore + change));
        updates[dimension.id] = newScore;
        stateManager.updateEndingDimensionScore(dimension.id, newScore);
      }
    }

    return updates;
  }

  /**
   * Check if text contains concepts related to a dimension end
   */
  private isRelatedConcept(text: string, concept: string): boolean {
    const conceptRelations: Record<string, string[]> = {
      'truth': ['reveal', 'honest', 'expose', 'discover', 'uncover'],
      'buried': ['hide', 'secret', 'conceal', 'bury', 'forget'],
      'alone': ['solitary', 'independent', 'isolated', 'solo', 'leave'],
      'together': ['unite', 'join', 'ally', 'group', 'community'],
      'violence': ['fight', 'attack', 'war', 'conflict', 'aggression'],
      'peace': ['calm', 'harmony', 'resolve', 'reconcile', 'forgive'],
    };

    const related = conceptRelations[concept] || [];
    return related.some((r) => text.includes(r));
  }

  /**
   * Apply relationship decay over time
   */
  private applyRelationshipDecay(stateManager: StateManager): void {
    const state = stateManager.getState();

    for (const [charId, instance] of Object.entries(state.characters)) {
      if (instance.relationship !== 0) {
        // Relationships drift toward neutral over time
        const decay = instance.relationship * this.config.relationshipDecayRate;
        const newRelationship = instance.relationship - decay;
        stateManager.applyModifications([
          {
            type: 'set',
            target: `character.${charId}.relationship`,
            value: Math.abs(newRelationship) < 1 ? 0 : newRelationship,
          },
        ]);
      }
    }
  }

  /**
   * Describe what effect a rule will have
   */
  private describeRuleEffect(
    rule: WorldRule,
    _choice: HardChoice,
    _context: EffectContext
  ): string {
    return rule.mechanicalEffect ||
      `"${rule.rule}" will affect your journey.`;
  }

  /**
   * Get all currently active rule effects
   */
  getActiveEffects(state: WorldState): ActiveRuleEffect[] {
    return state.activeRuleEffects;
  }

  /**
   * Calculate current position on all ending dimensions
   */
  calculateEndingPosition(state: WorldState): Record<string, number> {
    return { ...state.endingDimensionScores };
  }

  /**
   * Determine which ending the player is closest to
   */
  findClosestEnding(
    dimensionScores: Record<string, number>,
    endings: Array<{ id: string; dimensionPositions: Record<string, number> }>
  ): { endingId: string; distance: number } {
    let closestEnding = '';
    let minDistance = Infinity;

    for (const ending of endings) {
      let distance = 0;
      for (const [dimId, position] of Object.entries(ending.dimensionPositions)) {
        const score = dimensionScores[dimId] || 0.5;
        distance += Math.pow(score - position, 2);
      }
      distance = Math.sqrt(distance);

      if (distance < minDistance) {
        minDistance = distance;
        closestEnding = ending.id;
      }
    }

    return { endingId: closestEnding, distance: minDistance };
  }
}
