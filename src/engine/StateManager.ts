/**
 * StateManager - Manages world state throughout the narrative
 *
 * Enhanced for the new architecture with:
 * - Memory tracking
 * - Value conflict history
 * - Ending dimension scores
 * - Active rule effects
 */

import type {
  WorldState,
  WorldStateDefinition,
  Character,
  CharacterInstance,
  StateModification,
  EdgeCondition,
  HistoryEntry,
  Memory,
  ValueConflictRecord,
  ActiveRuleEffect,
} from '../types/index.js';
import type { EndingDimension } from '../types/storySeed.js';

export class StateManager {
  private state: WorldState;
  private definition: WorldStateDefinition;
  private characters: Map<string, Character>;

  constructor(
    definition: WorldStateDefinition,
    characters: Character[],
    initialNodeId: string
  ) {
    this.definition = definition;
    this.characters = new Map(characters.map((c) => [c.id, c]));
    this.state = this.initializeState(initialNodeId);
  }

  /**
   * Initialize world state from definition
   */
  private initializeState(initialNodeId: string): WorldState {
    const player: Record<string, number | boolean | string> = {};
    const flags: Record<string, boolean> = {};
    const resources: Record<string, number> = {};

    // Initialize player attributes
    for (const [key, variable] of Object.entries(this.definition.player)) {
      player[key] = variable.default;
    }

    // Initialize flags
    for (const [key, variable] of Object.entries(this.definition.flags)) {
      flags[key] = variable.default as boolean;
    }

    // Initialize resources
    if (this.definition.resources) {
      for (const [key, variable] of Object.entries(this.definition.resources)) {
        resources[key] = variable.default as number;
      }
    }

    // Initialize character instances
    const characterInstances: Record<string, CharacterInstance> = {};
    for (const [id, character] of this.characters) {
      characterInstances[id] = {
        character,
        relationship: character.initialRelationship ?? 0,
        state: character.initialState ? { ...character.initialState } : {},
        present: false,
      };
    }

    return {
      player,
      flags,
      resources,
      characters: characterInstances,
      currentNodeId: initialNodeId,
      turnCount: 0,
      history: [],
      // New architecture fields
      memories: [],
      valueConflictHistory: [],
      endingDimensionScores: {},
      activeRuleEffects: [],
    };
  }

  /**
   * Get current world state (immutable copy)
   */
  getState(): WorldState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get current node ID
   */
  getCurrentNodeId(): string {
    return this.state.currentNodeId;
  }

  /**
   * Set current node
   */
  setCurrentNode(nodeId: string): void {
    this.state.currentNodeId = nodeId;
  }

  /**
   * Update character presence for current scene
   */
  setCharacterPresence(characterIds: string[]): void {
    // Reset all to not present
    for (const instance of Object.values(this.state.characters)) {
      instance.present = false;
    }
    // Set specified characters as present
    for (const id of characterIds) {
      if (this.state.characters[id]) {
        this.state.characters[id].present = true;
      }
    }
  }

  /**
   * Get present characters
   */
  getPresentCharacters(): CharacterInstance[] {
    return Object.values(this.state.characters).filter((c) => c.present);
  }

  /**
   * Apply state modifications
   */
  applyModifications(modifications: StateModification[]): void {
    for (const mod of modifications) {
      this.applyModification(mod);
    }
  }

  /**
   * Apply a single state modification
   */
  private applyModification(mod: StateModification): void {
    const [category, key] = this.parseTarget(mod.target);

    switch (category) {
      case 'player':
        this.modifyValue(this.state.player, key, mod);
        break;
      case 'flags':
        this.modifyValue(this.state.flags, key, mod);
        break;
      case 'resources':
        this.modifyValue(this.state.resources, key, mod);
        break;
      case 'character': {
        const [charId, attr] = key.split('.');
        if (attr === 'relationship' && this.state.characters[charId]) {
          const current = this.state.characters[charId].relationship;
          this.state.characters[charId].relationship = this.computeNewValue(
            current,
            mod.type,
            mod.value as number
          ) as number;
          // Clamp relationship to -100 to 100
          this.state.characters[charId].relationship = Math.max(
            -100,
            Math.min(100, this.state.characters[charId].relationship)
          );
        } else if (this.state.characters[charId]) {
          this.modifyValue(this.state.characters[charId].state, attr, mod);
        }
        break;
      }
    }
  }

  /**
   * Parse target string (e.g., "player.courage" -> ["player", "courage"])
   */
  private parseTarget(target: string): [string, string] {
    const parts = target.split('.');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    // For character.charId.attribute, return ["character", "charId.attribute"]
    if (parts.length === 3) {
      return [parts[0], `${parts[1]}.${parts[2]}`];
    }
    return ['player', target];
  }

  /**
   * Modify a value in a state object
   */
  private modifyValue(
    obj: Record<string, unknown>,
    key: string,
    mod: StateModification
  ): void {
    const current = obj[key];
    obj[key] = this.computeNewValue(current, mod.type, mod.value);
  }

  /**
   * Compute new value based on modification type
   */
  private computeNewValue(
    current: unknown,
    type: StateModification['type'],
    value: number | boolean | string
  ): unknown {
    switch (type) {
      case 'set':
        return value;
      case 'add':
        return (current as number) + (value as number);
      case 'subtract':
        return (current as number) - (value as number);
      case 'multiply':
        return (current as number) * (value as number);
      case 'toggle':
        return !(current as boolean);
      default:
        return value;
    }
  }

  /**
   * Evaluate a condition against current state
   */
  evaluateCondition(condition: EdgeCondition): boolean {
    const actualValue = this.getConditionValue(condition);

    switch (condition.operator) {
      case '==':
        return actualValue === condition.value;
      case '!=':
        return actualValue !== condition.value;
      case '>':
        return (actualValue as number) > (condition.value as number);
      case '<':
        return (actualValue as number) < (condition.value as number);
      case '>=':
        return (actualValue as number) >= (condition.value as number);
      case '<=':
        return (actualValue as number) <= (condition.value as number);
      case 'has':
        return this.state.history.some((h) => h.nodeId === condition.value);
      case 'lacks':
        return !this.state.history.some((h) => h.nodeId === condition.value);
      default:
        return false;
    }
  }

  /**
   * Get value for condition evaluation
   */
  private getConditionValue(condition: EdgeCondition): unknown {
    switch (condition.type) {
      case 'state': {
        const [category, key] = this.parseTarget(condition.target);
        switch (category) {
          case 'player':
            return this.state.player[key];
          case 'flags':
            return this.state.flags[key];
          case 'resources':
            return this.state.resources[key];
          default:
            return undefined;
        }
      }
      case 'relationship': {
        const charId = condition.target;
        return this.state.characters[charId]?.relationship ?? 0;
      }
      case 'flag':
        return this.state.flags[condition.target];
      case 'resource':
        return this.state.resources[condition.target];
      case 'history':
        return this.state.history.some((h) => h.nodeId === condition.target);
      default:
        return undefined;
    }
  }

  /**
   * Record a choice in history
   */
  recordChoice(nodeId: string, choiceIndex: number, choiceText: string): void {
    this.state.history.push({
      nodeId,
      choiceIndex,
      choiceText,
      timestamp: Date.now(),
    });
    this.state.turnCount++;
  }

  /**
   * Get all node IDs the player has visited (from history + current node)
   */
  getVisitedNodeIds(): Set<string> {
    const visited = new Set<string>();
    visited.add(this.state.currentNodeId);
    for (const entry of this.state.history) {
      visited.add(entry.nodeId);
    }
    return visited;
  }

  /**
   * Get recent history entries
   */
  getRecentHistory(count: number = 5): HistoryEntry[] {
    return this.state.history.slice(-count);
  }

  /**
   * Get turn count
   */
  getTurnCount(): number {
    return this.state.turnCount;
  }

  /**
   * Export state for persistence
   */
  exportState(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Import state from persistence
   */
  importState(serialized: string): void {
    this.state = JSON.parse(serialized);
    // Ensure new fields exist for backwards compatibility
    if (!this.state.memories) {
      this.state.memories = [];
    }
    if (!this.state.valueConflictHistory) {
      this.state.valueConflictHistory = [];
    }
    if (!this.state.endingDimensionScores) {
      this.state.endingDimensionScores = {};
    }
    if (!this.state.activeRuleEffects) {
      this.state.activeRuleEffects = [];
    }
  }

  // ============================================================================
  // Memory Management (New Architecture)
  // ============================================================================

  /**
   * Add a memory to the state
   */
  addMemory(memory: Memory): void {
    this.state.memories.push(memory);
    // Sort by significance (most significant first)
    this.state.memories.sort((a, b) => b.significance - a.significance);
    // Keep only the most significant 50 memories
    if (this.state.memories.length > 50) {
      this.state.memories = this.state.memories.slice(0, 50);
    }
  }

  /**
   * Get memories, optionally filtered
   */
  getMemories(options?: {
    type?: Memory['type'];
    minSignificance?: number;
    relatedConflict?: string;
    limit?: number;
  }): Memory[] {
    let memories = [...this.state.memories];

    if (options?.type) {
      memories = memories.filter((m) => m.type === options.type);
    }
    if (options?.minSignificance !== undefined) {
      memories = memories.filter((m) => m.significance >= options.minSignificance!);
    }
    if (options?.relatedConflict) {
      memories = memories.filter((m) => m.relatedConflict === options.relatedConflict);
    }
    if (options?.limit) {
      memories = memories.slice(0, options.limit);
    }

    return memories;
  }

  /**
   * Mark a memory as surfaced (recalled in the narrative)
   */
  surfaceMemory(memoryId: string): void {
    const memory = this.state.memories.find((m) => m.id === memoryId);
    if (memory) {
      memory.hasSurfaced = true;
    }
  }

  /**
   * Get unsurfaced memories that could be recalled
   */
  getUnsurfacedMemories(limit: number = 3): Memory[] {
    return this.state.memories
      .filter((m) => !m.hasSurfaced)
      .slice(0, limit);
  }

  // ============================================================================
  // Value Conflict History (New Architecture)
  // ============================================================================

  /**
   * Record a value conflict choice
   */
  recordValueConflict(record: ValueConflictRecord): void {
    this.state.valueConflictHistory.push(record);
  }

  /**
   * Get value conflict history
   */
  getValueConflictHistory(): ValueConflictRecord[] {
    return [...this.state.valueConflictHistory];
  }

  /**
   * Get the most recent value conflict presented
   */
  getLastValueConflict(): ValueConflictRecord | undefined {
    return this.state.valueConflictHistory[this.state.valueConflictHistory.length - 1];
  }

  /**
   * Check how many times a specific value has been favored
   */
  countValueFavored(value: 'value1' | 'value2' | 'both' | 'neither'): number {
    return this.state.valueConflictHistory.filter((r) => r.choiceMade === value).length;
  }

  /**
   * Get a summary of the player's value choices
   */
  getValueChoiceSummary(): Record<string, number> {
    const summary: Record<string, number> = {
      value1: 0,
      value2: 0,
      both: 0,
      neither: 0,
    };

    for (const record of this.state.valueConflictHistory) {
      summary[record.choiceMade]++;
    }

    return summary;
  }

  // ============================================================================
  // Ending Dimension Scores (New Architecture)
  // ============================================================================

  /**
   * Initialize ending dimension scores
   */
  initializeEndingDimensions(dimensions: EndingDimension[]): void {
    for (const dim of dimensions) {
      // Start at the midpoint
      this.state.endingDimensionScores[dim.id] = 0.5;
    }
  }

  /**
   * Update an ending dimension score
   */
  updateEndingDimensionScore(dimensionId: string, score: number): void {
    // Clamp between 0 and 1
    this.state.endingDimensionScores[dimensionId] = Math.max(0, Math.min(1, score));
  }

  /**
   * Get all ending dimension scores
   */
  getEndingDimensionScores(): Record<string, number> {
    return { ...this.state.endingDimensionScores };
  }

  /**
   * Get a specific ending dimension score
   */
  getEndingDimensionScore(dimensionId: string): number {
    return this.state.endingDimensionScores[dimensionId] ?? 0.5;
  }

  // ============================================================================
  // Active Rule Effects (New Architecture)
  // ============================================================================

  /**
   * Add an active rule effect
   */
  addActiveRuleEffect(effect: ActiveRuleEffect): void {
    this.state.activeRuleEffects.push(effect);
  }

  /**
   * Remove an active rule effect
   */
  removeActiveRuleEffect(ruleId: string): void {
    this.state.activeRuleEffects = this.state.activeRuleEffects.filter(
      (e) => e.ruleId !== ruleId
    );
  }

  /**
   * Get all active rule effects
   */
  getActiveRuleEffects(): ActiveRuleEffect[] {
    return [...this.state.activeRuleEffects];
  }

  /**
   * Decrement turns remaining on all delayed effects
   */
  tickDelayedEffects(): ActiveRuleEffect[] {
    const surfacing: ActiveRuleEffect[] = [];

    for (const effect of this.state.activeRuleEffects) {
      if (effect.turnsRemaining !== undefined) {
        effect.turnsRemaining--;
        if (effect.turnsRemaining <= 0) {
          surfacing.push(effect);
        }
      }
    }

    return surfacing;
  }

  // ============================================================================
  // Character Relationship Helpers (New Architecture)
  // ============================================================================

  /**
   * Get all characters with significant relationships
   */
  getSignificantRelationships(threshold: number = 30): CharacterInstance[] {
    return Object.values(this.state.characters).filter(
      (c) => Math.abs(c.relationship) >= threshold
    );
  }

  /**
   * Get the player's ally characters
   */
  getAllies(minRelationship: number = 50): CharacterInstance[] {
    return Object.values(this.state.characters).filter(
      (c) => c.relationship >= minRelationship
    );
  }

  /**
   * Get the player's rival/enemy characters
   */
  getRivals(maxRelationship: number = -30): CharacterInstance[] {
    return Object.values(this.state.characters).filter(
      (c) => c.relationship <= maxRelationship
    );
  }

  /**
   * Update a character's relationship
   */
  updateRelationship(characterId: string, change: number): void {
    if (this.state.characters[characterId]) {
      const newValue = this.state.characters[characterId].relationship + change;
      this.state.characters[characterId].relationship = Math.max(-100, Math.min(100, newValue));
    }
  }
}
