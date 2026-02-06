/**
 * NarrativeEngine - Main orchestrator for the network narrative system
 *
 * New Architecture Integration:
 * - HardChoiceGenerator: Creates meaningful dilemmas from value conflicts
 * - NarrativeGenerator: LLM-powered content generation
 * - EffectProcessor: Applies world rules and processes consequences
 * - Enhanced StateManager: Tracks memories, value conflicts, ending dimensions
 */

import type {
  NarrativeDefinition,
  NarrativeMetadata,
  EntryNode,
  EndingNode,
  NarrativeNode,
  GameSession,
  TurnResult,
  PlayerChoice,
  EndingResult,
  WorldState,
  Edge,
  Memory,
  ValueConflictRecord,
} from '../types/index.js';
import type { AIProvider, TurnGenerationRequest, NarrativeContext } from '../types/ai.js';
import type { StorySeed } from '../types/storySeed.js';
import { StateManager } from './StateManager.js';
import { GraphManager, type ValidationResult, type GraphStats } from './GraphManager.js';
import { ChoiceResolver } from './ChoiceResolver.js';
import { HardChoiceGenerator, type HardChoiceContext, type GeneratedHardChoice } from './HardChoiceGenerator.js';
import { NarrativeGenerator, type NarrativeGenerationContext } from './NarrativeGenerator.js';
import { EffectProcessor, type EffectContext, type EffectProcessingResult } from './EffectProcessor.js';

/**
 * Extended game session with new architecture data
 */
export interface ExtendedGameSession extends GameSession {
  /** Reference to the story seed (if using new architecture) */
  storySeedId?: string;
  /** Current hard choice being presented */
  currentHardChoice?: GeneratedHardChoice;
  /** Effect processing result from last choice */
  lastEffectResult?: EffectProcessingResult;
}

export class NarrativeEngine {
  private definition: NarrativeDefinition;
  private graphManager: GraphManager;
  private stateManager: StateManager | null = null;
  private choiceResolver: ChoiceResolver | null = null;
  private aiProvider: AIProvider | null = null;
  private session: ExtendedGameSession | null = null;
  private lastChoices: PlayerChoice[] = [];

  // New architecture components
  private storySeed: StorySeed | null = null;
  private hardChoiceGenerator: HardChoiceGenerator | null = null;
  private narrativeGenerator: NarrativeGenerator | null = null;
  private effectProcessor: EffectProcessor | null = null;
  private currentHardChoice: GeneratedHardChoice | null = null;
  private useNewArchitecture: boolean = false;

  constructor(definition: NarrativeDefinition, storySeed?: StorySeed) {
    this.definition = definition;
    this.graphManager = new GraphManager(definition);

    // If story seed is provided, use new architecture
    if (storySeed) {
      this.storySeed = storySeed;
      this.useNewArchitecture = true;
      this.initializeNewArchitecture(storySeed);
    }
  }

  /**
   * Initialize new architecture components
   */
  private initializeNewArchitecture(storySeed: StorySeed): void {
    this.hardChoiceGenerator = new HardChoiceGenerator({
      conflictRepeatCooldown: 3,
      includeThirdPath: true,
      includeBothOption: true,
      choiceCount: 4,
    });

    this.narrativeGenerator = new NarrativeGenerator({
      temperature: 0.75,
      maxTokens: 1024,
      includeEmotions: true,
      narrationPerspective: 'second_person',
    });

    this.effectProcessor = new EffectProcessor(
      storySeed.worldRules,
      storySeed.endingDimensions
    );
  }

  /**
   * Set the AI provider for dialogue generation
   */
  setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
    // Also set on narrative generator if using new architecture
    if (this.narrativeGenerator) {
      this.narrativeGenerator.setAIProvider(provider);
    }
  }

  /**
   * Get the story seed (if using new architecture)
   */
  getStorySeed(): StorySeed | null {
    return this.storySeed;
  }

  /**
   * Check if using new architecture
   */
  isNewArchitecture(): boolean {
    return this.useNewArchitecture;
  }

  /**
   * Get narrative metadata
   */
  getMetadata(): NarrativeMetadata {
    return this.definition.metadata;
  }

  /**
   * Get all available starting scenarios
   */
  getStartingScenarios(): EntryNode[] {
    return this.graphManager.getEntryNodes();
  }

  /**
   * Get all possible endings
   */
  getPossibleEndings(): EndingNode[] {
    return this.graphManager.getEndingNodes();
  }

  /**
   * Validate the narrative graph
   */
  validate(): ValidationResult {
    return this.graphManager.validate();
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    return this.graphManager.getStats();
  }

  /**
   * Start a new game session with a selected scenario
   */
  startSession(scenarioId: string): ExtendedGameSession {
    const entryNode = this.graphManager.getNode(scenarioId);
    if (!entryNode || entryNode.type !== 'entry') {
      throw new Error(`Invalid scenario ID: ${scenarioId}`);
    }

    // Initialize state manager
    this.stateManager = new StateManager(
      this.definition.worldState,
      this.definition.characters,
      scenarioId
    );

    // Initialize choice resolver
    this.choiceResolver = new ChoiceResolver(this.stateManager, this.graphManager);

    // Set initial character presence
    if (entryNode.characters) {
      this.stateManager.setCharacterPresence(entryNode.characters);
    }

    // Apply entry node effects
    if (entryNode.onEnter) {
      this.stateManager.applyModifications(entryNode.onEnter);
    }

    // New architecture: Initialize ending dimensions
    if (this.useNewArchitecture && this.storySeed) {
      this.stateManager.initializeEndingDimensions(this.storySeed.endingDimensions);
    }

    // Create session
    this.session = {
      id: this.generateSessionId(),
      narrativeId: this.definition.metadata.id,
      state: this.stateManager.getState(),
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      storySeedId: this.storySeed?.id,
    };

    return this.session;
  }

  /**
   * Resume a session from saved state
   */
  resumeSession(savedSession: GameSession): void {
    // Initialize state manager with saved state
    this.stateManager = new StateManager(
      this.definition.worldState,
      this.definition.characters,
      savedSession.state.currentNodeId
    );
    this.stateManager.importState(JSON.stringify(savedSession.state));

    // Initialize choice resolver
    this.choiceResolver = new ChoiceResolver(this.stateManager, this.graphManager);

    this.session = savedSession;
  }

  /**
   * Get the current turn (scene, dialogue, choices)
   */
  async getCurrentTurn(): Promise<TurnResult> {
    if (!this.stateManager || !this.choiceResolver) {
      throw new Error('No active session. Call startSession() first.');
    }

    const currentNodeId = this.stateManager.getCurrentNodeId();
    const currentNode = this.graphManager.getNode(currentNodeId);

    if (!currentNode) {
      throw new Error(`Current node not found: ${currentNodeId}`);
    }

    // Check if this is an ending
    if (currentNode.type === 'ending') {
      return this.createEndingResult(currentNode as EndingNode);
    }

    // Get available choices
    const availableEdges = this.choiceResolver.getAvailableChoices(currentNodeId);

    // Check if any available edge leads to a branch node or ending (point of no return)
    const isPointOfNoReturn = availableEdges.some((edge) =>
      this.graphManager.isBranchNode(edge.to) || this.graphManager.isEndingNode(edge.to)
    );

    // Generate turn content via AI or fallback
    if (this.aiProvider) {
      const turn = await this.generateAITurn(currentNode, availableEdges);
      turn.isPointOfNoReturn = isPointOfNoReturn;
      return turn;
    } else {
      const turn = this.generateFallbackTurn(currentNode, availableEdges);
      turn.isPointOfNoReturn = isPointOfNoReturn;
      return turn;
    }
  }

  /**
   * Make a choice and advance the narrative
   */
  async makeChoice(choiceIndex: number): Promise<TurnResult> {
    if (!this.stateManager || !this.choiceResolver || !this.session) {
      throw new Error('No active session. Call startSession() first.');
    }

    // Validate choice
    const validationError = this.choiceResolver.validateChoice(
      choiceIndex,
      this.lastChoices
    );
    if (validationError) {
      throw new Error(validationError.message);
    }

    // Resolve the choice
    const result = this.choiceResolver.resolveChoice(choiceIndex, this.lastChoices);
    if (!result) {
      throw new Error('Failed to resolve choice');
    }

    // Update session
    this.session.state = this.stateManager.getState();
    this.session.lastUpdatedAt = Date.now();

    // Get the new turn
    return await this.getCurrentTurn();
  }

  /**
   * Get current world state
   */
  getWorldState(): WorldState | null {
    return this.stateManager?.getState() ?? null;
  }

  /**
   * Get current session
   */
  getSession(): GameSession | null {
    if (!this.session || !this.stateManager) return null;
    return {
      ...this.session,
      state: this.stateManager.getState(),
    };
  }

  /**
   * Export session for persistence
   */
  exportSession(): string {
    const session = this.getSession();
    if (!session) {
      throw new Error('No active session');
    }
    return JSON.stringify(session);
  }

  /**
   * Generate turn content using AI
   */
  private async generateAITurn(
    currentNode: NarrativeNode,
    availableEdges: Edge[]
  ): Promise<TurnResult> {
    if (!this.aiProvider || !this.stateManager) {
      throw new Error('AI provider not configured');
    }

    const narrativeContext: NarrativeContext = {
      title: this.definition.metadata.title,
      description: this.definition.metadata.description,
    };

    const presentCharacters = this.stateManager
      .getPresentCharacters()
      .map((ci) => ci.character);

    const request: TurnGenerationRequest = {
      narrativeContext,
      currentNode,
      availableEdges,
      worldState: this.stateManager.getState(),
      presentCharacters,
      sceneContext: currentNode.context,
      recentHistory: this.stateManager.getRecentHistory(5),
      playerRole: 'the protagonist',
    };

    const response = await this.aiProvider.generateTurn(request);

    // Store choices for later resolution
    this.lastChoices = response.choices;

    return {
      narration: response.narration,
      dialogues: response.dialogues,
      choices: response.choices,
      isEnding: false,
    };
  }

  /**
   * Generate fallback turn content (no AI)
   */
  private generateFallbackTurn(
    currentNode: NarrativeNode,
    availableEdges: Edge[]
  ): TurnResult {
    // Create basic choices from edge hints
    const choices: PlayerChoice[] = availableEdges.map((edge, index) => ({
      index,
      text: edge.choiceHint,
      edgeId: edge.id,
      tone: this.choiceTypeToTone(edge.choiceType),
    }));

    // Store choices for later resolution
    this.lastChoices = choices;

    return {
      narration: currentNode.description,
      dialogues: [],
      choices,
      isEnding: false,
    };
  }

  /**
   * Create ending result
   */
  private createEndingResult(endingNode: EndingNode): TurnResult {
    const state = this.stateManager?.getState();

    const ending: EndingResult = {
      type: endingNode.endingType,
      title: endingNode.title,
      epilogue: endingNode.epilogue,
      stats: {
        turnsPlayed: state?.turnCount ?? 0,
        choicesMade: state?.history.length ?? 0,
        relationshipsFormed: this.getSignificantRelationships(),
      },
    };

    return {
      narration: endingNode.description,
      dialogues: [],
      choices: [],
      isEnding: true,
      ending,
    };
  }

  /**
   * Get characters with significant relationships (>50 or <-50)
   */
  private getSignificantRelationships(): string[] {
    const state = this.stateManager?.getState();
    if (!state) return [];

    return Object.entries(state.characters)
      .filter(([_, instance]) => Math.abs(instance.relationship) > 50)
      .map(([_, instance]) => instance.character.name);
  }

  /**
   * Map choice type to tone
   */
  private choiceTypeToTone(
    choiceType: string
  ): 'positive' | 'neutral' | 'negative' {
    const positiveTypes = ['agree', 'comfort', 'investigate'];
    const negativeTypes = ['refuse', 'confront', 'leave'];

    if (positiveTypes.includes(choiceType)) return 'positive';
    if (negativeTypes.includes(choiceType)) return 'negative';
    return 'neutral';
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // New Architecture Methods
  // ============================================================================

  /**
   * Generate a hard choice for the current scene (new architecture)
   */
  async generateHardChoice(): Promise<GeneratedHardChoice> {
    if (!this.useNewArchitecture || !this.storySeed || !this.hardChoiceGenerator || !this.stateManager) {
      throw new Error('New architecture not initialized');
    }

    const presentCharacters = this.stateManager.getPresentCharacters();
    const currentNode = this.graphManager.getNode(this.stateManager.getCurrentNodeId());

    const context: HardChoiceContext = {
      valueConflicts: this.storySeed.valueConflicts,
      characters: this.storySeed.characters,
      presentCharacters,
      worldRules: this.storySeed.worldRules,
      worldState: this.stateManager.getState(),
      sceneContext: {
        location: currentNode?.context?.location || 'Unknown location',
        mood: currentNode?.context?.mood || 'Tense',
        situation: currentNode?.description || 'A critical moment',
      },
    };

    this.currentHardChoice = this.hardChoiceGenerator.generateHardChoice(context);
    return this.currentHardChoice;
  }

  /**
   * Get the current turn using new architecture
   * Generates hard choices and uses narrative generator
   */
  async getCurrentTurnNewArchitecture(): Promise<TurnResult> {
    if (!this.useNewArchitecture || !this.storySeed || !this.narrativeGenerator || !this.stateManager) {
      throw new Error('New architecture not initialized');
    }

    const currentNodeId = this.stateManager.getCurrentNodeId();
    const currentNode = this.graphManager.getNode(currentNodeId);

    if (!currentNode) {
      throw new Error(`Current node not found: ${currentNodeId}`);
    }

    // Check if this is an ending
    if (currentNode.type === 'ending') {
      return this.createEndingResultNewArchitecture(currentNode as EndingNode);
    }

    // Generate a hard choice
    const hardChoice = await this.generateHardChoice();

    // Build narrative generation context
    const context = this.buildNarrativeContext();

    // Generate the scene
    const generatedTurn = await this.narrativeGenerator.generateHardChoiceScene(hardChoice, context);

    // Store choices for later resolution
    this.lastChoices = generatedTurn.choices;
    this.currentHardChoice = hardChoice;

    return {
      narration: generatedTurn.narration,
      dialogues: generatedTurn.dialogues,
      choices: generatedTurn.choices,
      isEnding: false,
    };
  }

  /**
   * Make a choice using new architecture (processes effects, world rules)
   */
  async makeChoiceNewArchitecture(choiceIndex: number): Promise<TurnResult> {
    if (!this.useNewArchitecture || !this.effectProcessor || !this.stateManager || !this.currentHardChoice) {
      throw new Error('New architecture not initialized or no current choice');
    }

    if (choiceIndex < 0 || choiceIndex >= this.currentHardChoice.choices.length) {
      throw new Error(`Invalid choice index: ${choiceIndex}`);
    }

    const selectedChoice = this.currentHardChoice.choices[choiceIndex];

    // Create effect context
    const effectContext: EffectContext = {
      choice: selectedChoice,
      valueConflict: {
        conflictId: this.currentHardChoice.valueConflict.id,
        presentedAt: this.stateManager.getTurnCount(),
        choiceMade: selectedChoice.favors,
        choiceText: selectedChoice.text,
        nodeId: this.stateManager.getCurrentNodeId(),
      },
      involvedCharacters: this.currentHardChoice.embodiments.map((e) => e.characterId),
      location: this.stateManager.getState().currentNodeId,
      turnNumber: this.stateManager.getTurnCount(),
    };

    // Process effects (world rules, memories, ending dimensions)
    const effectResult = this.effectProcessor.processChoice(
      selectedChoice,
      effectContext,
      this.stateManager
    );

    // Record the value conflict choice
    this.stateManager.recordValueConflict(effectContext.valueConflict);

    // Record in history
    this.stateManager.recordChoice(
      this.stateManager.getCurrentNodeId(),
      choiceIndex,
      selectedChoice.text
    );

    // Store effect result on session
    if (this.session) {
      this.session.lastEffectResult = effectResult;
      this.session.state = this.stateManager.getState();
      this.session.lastUpdatedAt = Date.now();
    }

    // Move to next node (use choice resolver for graph traversal)
    if (this.choiceResolver && this.lastChoices[choiceIndex]) {
      this.choiceResolver.resolveChoice(choiceIndex, this.lastChoices);
      // Node transition handled by choice resolver
    }

    // Clear current hard choice
    this.currentHardChoice = null;

    // Get the new turn
    return await this.getCurrentTurnNewArchitecture();
  }

  /**
   * Build narrative generation context
   */
  private buildNarrativeContext(): NarrativeGenerationContext {
    if (!this.storySeed || !this.stateManager) {
      throw new Error('Cannot build context without story seed and state manager');
    }

    const worldState = this.stateManager.getState();

    return {
      storySeed: this.storySeed,
      worldState,
      presentCharacters: this.stateManager.getPresentCharacters(),
      recentMemories: this.stateManager.getMemories({ limit: 5 }),
      sceneContext: {
        location: this.graphManager.getNode(worldState.currentNodeId)?.context?.location || 'Unknown',
        mood: this.graphManager.getNode(worldState.currentNodeId)?.context?.mood || 'Tense',
      },
      recentChoices: worldState.history.slice(-3).map((h) => h.choiceText),
    };
  }

  /**
   * Create ending result for new architecture
   */
  private createEndingResultNewArchitecture(endingNode: EndingNode): TurnResult {
    const state = this.stateManager?.getState();

    // Determine ending based on dimension scores
    let endingType = endingNode.endingType;
    if (this.effectProcessor && state) {
      this.effectProcessor.findClosestEnding(
        state.endingDimensionScores,
        this.storySeed?.endings.map((e) => ({
          id: e.id,
          dimensionPositions: e.dimensionPositions,
        })) || []
      );
      // Could override endingType based on dimension scores
    }

    const ending: EndingResult = {
      type: endingType,
      title: endingNode.title,
      epilogue: endingNode.epilogue,
      stats: {
        turnsPlayed: state?.turnCount ?? 0,
        choicesMade: state?.history.length ?? 0,
        relationshipsFormed: this.getSignificantRelationships(),
      },
    };

    return {
      narration: endingNode.description,
      dialogues: [],
      choices: [],
      isEnding: true,
      ending,
    };
  }

  /**
   * Get memories from state manager (new architecture)
   */
  getMemories(options?: { type?: string; limit?: number }): Memory[] {
    if (!this.stateManager) return [];
    return this.stateManager.getMemories(options as Parameters<StateManager['getMemories']>[0]);
  }

  /**
   * Get value conflict history (new architecture)
   */
  getValueConflictHistory(): ValueConflictRecord[] {
    if (!this.stateManager) return [];
    return this.stateManager.getValueConflictHistory();
  }

  /**
   * Get ending dimension scores (new architecture)
   */
  getEndingDimensionScores(): Record<string, number> {
    if (!this.stateManager) return {};
    return this.stateManager.getEndingDimensionScores();
  }

  /**
   * Get the current hard choice being presented
   */
  getCurrentHardChoice(): GeneratedHardChoice | null {
    return this.currentHardChoice;
  }

  /**
   * Get active world rule effects
   */
  getActiveRuleEffects(): import('../types/index.js').ActiveRuleEffect[] {
    if (!this.stateManager) return [];
    return this.stateManager.getActiveRuleEffects();
  }
}
