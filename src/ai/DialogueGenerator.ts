/**
 * DialogueGenerator - Generates contextual dialogue using AI
 */

import type {
  NarrativeNode,
  Edge,
  WorldState,
  Character,
  SceneContext,
  HistoryEntry,
  GeneratedDialogue,
  PlayerChoice,
} from '../types';
import type {
  AIProvider,
  TurnGenerationRequest,
  TurnGenerationResponse,
  AIResponseFormat,
  AIConfig,
  NarrativeContext,
} from '../types/ai';
import {
  buildNarratorSystemPrompt,
  buildTurnPrompt,
  buildCharacterPrompt,
} from './prompts/system';

export class DialogueGenerator implements AIProvider {
  private config: AIConfig;
  private apiClient: AIAPIClient;

  constructor(config: AIConfig, apiClient: AIAPIClient) {
    this.config = config;
    this.apiClient = apiClient;
  }

  /**
   * Generate a complete turn with narration, dialogue, and choices
   */
  async generateTurn(request: TurnGenerationRequest): Promise<TurnGenerationResponse> {
    const systemPrompt = buildNarratorSystemPrompt(
      request.narrativeContext.title,
      request.narrativeContext.description
    );

    const userPrompt = buildTurnPrompt({
      sceneDescription: request.currentNode.description,
      location: request.sceneContext?.location ?? 'Unknown location',
      mood: request.sceneContext?.mood ?? 'neutral',
      characterDetails: this.formatCharacterDetails(
        request.presentCharacters,
        request.worldState
      ),
      worldState: this.formatWorldState(request.worldState),
      recentHistory: this.formatHistory(request.recentHistory),
      choiceHints: this.formatChoiceHints(request.availableEdges),
    });

    const response = await this.apiClient.complete({
      systemPrompt,
      userPrompt,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    return this.parseResponse(response, request.availableEdges, request.presentCharacters);
  }

  /**
   * Generate dialogue for a specific character
   */
  async generateCharacterDialogue(request: {
    character: Character;
    situation: string;
    playerLastChoice?: string;
    relationshipLevel: number;
    mood?: string;
  }): Promise<string> {
    const prompt = buildCharacterPrompt({
      characterName: request.character.name,
      traits: request.character.traits.join(', '),
      personality: request.character.personality,
      relationshipLevel: request.relationshipLevel,
      situation: request.situation,
      previousContext: request.playerLastChoice,
    });

    return await this.apiClient.complete({
      systemPrompt: 'You are a character in an interactive story. Respond only with dialogue.',
      userPrompt: prompt,
      temperature: this.config.temperature,
      maxTokens: 150,
    });
  }

  /**
   * Contextualize raw choices into natural dialogue options
   */
  async contextualizeChoices(request: {
    edges: Edge[];
    currentContext: string;
    characterPresent?: Character;
    worldState: WorldState;
  }): Promise<PlayerChoice[]> {
    const prompt = `Given this scene context: "${request.currentContext}"

Transform these choice directions into natural dialogue options a player might say:
${request.edges.map((e, i) => `${i + 1}. ${e.choiceHint} (${e.choiceType})`).join('\n')}

${request.characterPresent ? `The player is speaking to ${request.characterPresent.name}.` : ''}

Output as JSON array:
[{"text": "natural dialogue", "tone": "positive|neutral|negative"}]`;

    const response = await this.apiClient.complete({
      systemPrompt: 'You transform narrative directions into natural player dialogue options.',
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 300,
    });

    try {
      const parsed = JSON.parse(response);
      return request.edges.map((edge, index) => ({
        index,
        text: parsed[index]?.text ?? edge.choiceHint,
        edgeId: edge.id,
        tone: parsed[index]?.tone ?? 'neutral',
      }));
    } catch {
      // Fallback to hints if parsing fails
      return request.edges.map((edge, index) => ({
        index,
        text: edge.choiceHint,
        edgeId: edge.id,
        tone: 'neutral' as const,
      }));
    }
  }

  /**
   * Format character details for prompt
   */
  private formatCharacterDetails(
    characters: Character[],
    worldState: WorldState
  ): string {
    if (characters.length === 0) {
      return 'No other characters present';
    }

    return characters
      .map((char) => {
        const instance = worldState.characters[char.id];
        const relationship = instance?.relationship ?? 0;
        const relationshipDesc =
          relationship > 50
            ? 'friendly'
            : relationship < -50
              ? 'hostile'
              : 'neutral';

        return `- ${char.name}: ${char.description}
  Traits: ${char.traits.join(', ')}
  Relationship: ${relationshipDesc} (${relationship})`;
      })
      .join('\n');
  }

  /**
   * Format world state for prompt
   */
  private formatWorldState(worldState: WorldState): string {
    const parts: string[] = [];

    // Player attributes
    const playerAttrs = Object.entries(worldState.player)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (playerAttrs) {
      parts.push(`Player: ${playerAttrs}`);
    }

    // Active flags
    const activeFlags = Object.entries(worldState.flags)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (activeFlags.length > 0) {
      parts.push(`Events: ${activeFlags.join(', ')}`);
    }

    // Resources
    const resources = Object.entries(worldState.resources)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (resources) {
      parts.push(`Resources: ${resources}`);
    }

    return parts.join('\n') || 'No notable state';
  }

  /**
   * Format history for prompt
   */
  private formatHistory(history: HistoryEntry[]): string {
    if (history.length === 0) {
      return 'This is the beginning of the story';
    }

    return history
      .slice(-3) // Last 3 entries
      .map((entry) => `- You chose: "${entry.choiceText}"`)
      .join('\n');
  }

  /**
   * Format choice hints for prompt
   */
  private formatChoiceHints(edges: Edge[]): string {
    return edges
      .map(
        (edge, i) =>
          `Choice ${i + 1} (${edge.choiceType}): ${edge.choiceHint}`
      )
      .join('\n');
  }

  /**
   * Parse AI response into structured format
   */
  private parseResponse(
    rawResponse: string,
    edges: Edge[],
    characters: Character[]
  ): TurnGenerationResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed: AIResponseFormat = JSON.parse(jsonMatch[0]);

      // Map character names to IDs
      const charNameToId = new Map(characters.map((c) => [c.name.toLowerCase(), c.id]));
      const charIdToName = new Map(characters.map((c) => [c.id, c.name]));

      const dialogues: GeneratedDialogue[] = (parsed.dialogues ?? []).map((d) => ({
        characterId: charNameToId.get(d.character.toLowerCase()) ?? d.character,
        characterName: charIdToName.get(d.character) ?? d.character,
        text: d.text,
        emotion: d.emotion,
      }));

      const choices: PlayerChoice[] = (parsed.choices ?? []).map((choice, index) => ({
        index,
        text: choice.text,
        edgeId: edges[index]?.id ?? `edge-${index}`,
        tone: choice.tone,
      }));

      return {
        narration: parsed.narration ?? '',
        dialogues,
        choices,
      };
    } catch (error) {
      // Fallback if parsing fails
      return {
        narration: rawResponse.slice(0, 200),
        dialogues: [],
        choices: edges.map((edge, index) => ({
          index,
          text: edge.choiceHint,
          edgeId: edge.id,
          tone: 'neutral' as const,
        })),
      };
    }
  }
}

/**
 * Interface for AI API clients (Anthropic, OpenAI, etc.)
 */
export interface AIAPIClient {
  complete(request: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<string>;
}

/**
 * Mock API client for testing
 */
export class MockAIClient implements AIAPIClient {
  async complete(request: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<string> {
    // Return mock response for testing
    return JSON.stringify({
      narration: 'The scene unfolds before you with a sense of anticipation.',
      dialogues: [],
      choices: [
        { text: 'Take the first path', tone: 'positive' },
        { text: 'Consider your options carefully', tone: 'neutral' },
        { text: 'Turn back the way you came', tone: 'negative' },
      ],
    });
  }
}
