/**
 * StateManager - Manages world state throughout the narrative
 */

import type {
  WorldState,
  WorldStateDefinition,
  Character,
  CharacterInstance,
  StateModification,
  EdgeCondition,
  HistoryEntry,
} from '../types';

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
  }
}
