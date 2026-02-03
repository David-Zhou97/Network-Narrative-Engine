/**
 * NarrativeEngine - Main orchestrator for the network narrative system
 */

import type {
  NarrativeDefinition,
  NarrativeMetadata,
  Character,
  EntryNode,
  EndingNode,
  NarrativeNode,
  GameSession,
  TurnResult,
  PlayerChoice,
  EndingResult,
  WorldState,
  Edge,
} from '../types';
import type { AIProvider, TurnGenerationRequest, NarrativeContext } from '../types/ai';
import { StateManager } from './StateManager';
import { GraphManager, ValidationResult, GraphStats } from './GraphManager';
import { ChoiceResolver, ResolvedChoice } from './ChoiceResolver';

export class NarrativeEngine {
  private definition: NarrativeDefinition;
  private graphManager: GraphManager;
  private stateManager: StateManager | null = null;
  private choiceResolver: ChoiceResolver | null = null;
  private aiProvider: AIProvider | null = null;
  private session: GameSession | null = null;
  private lastChoices: PlayerChoice[] = [];

  constructor(definition: NarrativeDefinition) {
    this.definition = definition;
    this.graphManager = new GraphManager(definition);
  }

  /**
   * Set the AI provider for dialogue generation
   */
  setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
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
  startSession(scenarioId: string): GameSession {
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

    // Create session
    this.session = {
      id: this.generateSessionId(),
      narrativeId: this.definition.metadata.id,
      state: this.stateManager.getState(),
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
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

    // Generate turn content via AI or fallback
    if (this.aiProvider) {
      return await this.generateAITurn(currentNode, availableEdges);
    } else {
      return this.generateFallbackTurn(currentNode, availableEdges);
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
}
