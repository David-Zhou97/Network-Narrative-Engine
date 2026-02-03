/**
 * AI Integration Types for the Network Narrative Engine
 */

import type {
  NarrativeNode,
  Edge,
  WorldState,
  Character,
  SceneContext,
  GeneratedDialogue,
  PlayerChoice,
  HistoryEntry,
} from './narrative';

// ============================================================================
// AI Provider Interface
// ============================================================================

export interface AIProvider {
  /**
   * Generate dialogue and choices for a turn
   */
  generateTurn(request: TurnGenerationRequest): Promise<TurnGenerationResponse>;

  /**
   * Generate a single character's dialogue
   */
  generateCharacterDialogue(request: CharacterDialogueRequest): Promise<string>;

  /**
   * Contextualize choices based on current state
   */
  contextualizeChoices(request: ChoiceContextRequest): Promise<PlayerChoice[]>;
}

// ============================================================================
// Generation Requests
// ============================================================================

export interface TurnGenerationRequest {
  /** The narrative title and premise */
  narrativeContext: NarrativeContext;
  /** Current node information */
  currentNode: NarrativeNode;
  /** Available edges (choices) from this node */
  availableEdges: Edge[];
  /** Current world state */
  worldState: WorldState;
  /** Characters present in scene */
  presentCharacters: Character[];
  /** Scene context (location, mood, etc.) */
  sceneContext?: SceneContext;
  /** Recent conversation history */
  recentHistory: HistoryEntry[];
  /** Player's role description */
  playerRole: string;
}

export interface CharacterDialogueRequest {
  character: Character;
  situation: string;
  playerLastChoice?: string;
  relationshipLevel: number;
  mood?: string;
}

export interface ChoiceContextRequest {
  edges: Edge[];
  currentContext: string;
  characterPresent?: Character;
  worldState: WorldState;
}

// ============================================================================
// Generation Responses
// ============================================================================

export interface TurnGenerationResponse {
  narration: string;
  dialogues: GeneratedDialogue[];
  choices: PlayerChoice[];
}

export interface NarrativeContext {
  title: string;
  description: string;
  genre?: string;
  tone?: string;
}

// ============================================================================
// Prompt Templates
// ============================================================================

export interface PromptTemplate {
  system: string;
  user: string;
  variables: string[];
}

export interface PromptContext {
  narrativeTitle: string;
  narrativeDescription: string;
  playerRole: string;
  currentLocation: string;
  currentMood: string;
  sceneDescription: string;
  presentCharacters: string;
  characterDetails: string;
  worldStateRelevant: string;
  recentHistory: string;
  choiceHints: string;
}

// ============================================================================
// AI Configuration
// ============================================================================

export interface AIConfig {
  /** AI provider to use */
  provider: 'anthropic' | 'openai' | 'local';
  /** Model identifier */
  model: string;
  /** Temperature for generation (0-1) */
  temperature: number;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Custom system prompt additions */
  systemPromptAdditions?: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024,
};

// ============================================================================
// Response Parsing
// ============================================================================

export interface ParsedAIResponse {
  narration: string;
  dialogues: {
    characterId: string;
    text: string;
    emotion?: string;
  }[];
  choices: {
    index: number;
    text: string;
    edgeId: string;
  }[];
}

/**
 * Expected JSON structure from AI response
 */
export interface AIResponseFormat {
  narration: string;
  dialogues: Array<{
    character: string;
    text: string;
    emotion?: string;
  }>;
  choices: Array<{
    text: string;
    tone: 'positive' | 'neutral' | 'negative';
  }>;
}
