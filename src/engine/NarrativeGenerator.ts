/**
 * NarrativeGenerator - LLM-powered content generation for the narrative engine
 *
 * This component wraps AI calls and handles:
 * - Turn generation (narration + dialogue + choices)
 * - Transition scene generation
 * - Consequence description generation
 * - Dialogue generation for characters
 */

import type { AIProvider, TurnGenerationRequest, TurnGenerationResponse } from '../types/ai.js';
import type {
  WorldState,
  NarrativeNode,
  AnchorNode,
  TransitionNode,
  MergeNode,
  CharacterInstance,
  GeneratedDialogue,
  PlayerChoice,
  Memory,
} from '../types/narrative.js';
import type {
  StorySeed,
  WorldRule,
  StoryCharacter,
} from '../types/storySeed.js';
import type { GeneratedHardChoice } from './HardChoiceGenerator.js';

/**
 * Context for generating narrative content
 */
export interface NarrativeGenerationContext {
  /** The story seed */
  storySeed: StorySeed;
  /** Current world state */
  worldState: WorldState;
  /** Present characters */
  presentCharacters: CharacterInstance[];
  /** Recent memories */
  recentMemories: Memory[];
  /** Current scene context */
  sceneContext: {
    location: string;
    mood: string;
    timeOfDay?: string;
  };
  /** Player's recent choices (for continuity) */
  recentChoices: string[];
}

/**
 * Generated turn result
 */
export interface GeneratedTurn {
  narration: string;
  dialogues: GeneratedDialogue[];
  choices: PlayerChoice[];
  /** Optional: Memory to create from this turn */
  suggestedMemory?: Partial<Memory>;
}

/**
 * Configuration for narrative generation
 */
export interface NarrativeGeneratorConfig {
  /** Temperature for AI generation */
  temperature: number;
  /** Max tokens for response */
  maxTokens: number;
  /** Whether to include character emotions */
  includeEmotions: boolean;
  /** Narration style */
  narrationPerspective: 'second_person' | 'third_person';
}

const DEFAULT_CONFIG: NarrativeGeneratorConfig = {
  temperature: 0.75,
  maxTokens: 1024,
  includeEmotions: true,
  narrationPerspective: 'second_person',
};

export class NarrativeGenerator {
  private aiProvider: AIProvider | null = null;
  // Config is stored for future AI model configuration
  public readonly config: NarrativeGeneratorConfig;

  constructor(config: Partial<NarrativeGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the AI provider for generation
   */
  setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
  }

  /**
   * Generate content for a hard choice scene
   */
  async generateHardChoiceScene(
    hardChoice: GeneratedHardChoice,
    context: NarrativeGenerationContext
  ): Promise<GeneratedTurn> {
    if (!this.aiProvider) {
      return this.generateFallbackHardChoiceScene(hardChoice, context);
    }

    const prompt = this.buildHardChoicePrompt(hardChoice, context);
    const response = await this.callAI(prompt, context);

    return this.parseHardChoiceResponse(response, hardChoice);
  }

  /**
   * Generate content for an anchor node
   */
  async generateAnchorScene(
    anchor: AnchorNode,
    context: NarrativeGenerationContext
  ): Promise<GeneratedTurn> {
    if (!this.aiProvider) {
      return this.generateFallbackAnchorScene(anchor, context);
    }

    const prompt = this.buildAnchorPrompt(anchor, context);
    const response = await this.callAI(prompt, context);

    return this.parseAnchorResponse(response, anchor);
  }

  /**
   * Generate content for a transition node
   */
  async generateTransitionScene(
    transition: TransitionNode,
    fromNode: NarrativeNode,
    toNode: NarrativeNode | null,
    context: NarrativeGenerationContext
  ): Promise<GeneratedTurn> {
    if (!this.aiProvider) {
      return this.generateFallbackTransitionScene(transition, context);
    }

    const prompt = this.buildTransitionPrompt(transition, fromNode, toNode, context);
    const response = await this.callAI(prompt, context);

    return this.parseTransitionResponse(response, transition);
  }

  /**
   * Generate content for a merge node (path convergence)
   */
  async generateMergeScene(
    merge: MergeNode,
    incomingPath: string,
    context: NarrativeGenerationContext
  ): Promise<GeneratedTurn> {
    if (!this.aiProvider) {
      return this.generateFallbackMergeScene(merge, incomingPath, context);
    }

    const prompt = this.buildMergePrompt(merge, incomingPath, context);
    const response = await this.callAI(prompt, context);

    return this.parseMergeResponse(response, merge);
  }

  /**
   * Generate consequence description when a world rule triggers
   */
  async generateConsequenceNarration(
    rule: WorldRule,
    trigger: string,
    context: NarrativeGenerationContext
  ): Promise<string> {
    if (!this.aiProvider) {
      return `The consequences of your actions become clear: ${rule.rule}`;
    }

    const prompt = this.buildConsequencePrompt(rule, trigger, context);
    const response = await this.callAI(prompt, context);

    return response.narration || `Your choice has consequences: ${rule.rule}`;
  }

  /**
   * Generate character dialogue for a specific situation
   */
  async generateCharacterDialogue(
    character: StoryCharacter,
    situation: string,
    playerChoice: string,
    context: NarrativeGenerationContext
  ): Promise<GeneratedDialogue> {
    if (!this.aiProvider) {
      return {
        characterId: character.id,
        characterName: character.name,
        text: `${character.name} responds to your choice.`,
        emotion: 'neutral',
      };
    }

    const characterInstance = context.presentCharacters.find(
      (c) => c.character.id === character.id
    );
    const relationship = characterInstance?.relationship ?? 0;

    const prompt = this.buildDialoguePrompt(character, situation, playerChoice, relationship);
    const response = await this.callAI(prompt, context);

    return {
      characterId: character.id,
      characterName: character.name,
      text: response.dialogues?.[0]?.text || `${character.name} considers your words.`,
      emotion: response.dialogues?.[0]?.emotion,
    };
  }

  /**
   * Call the AI provider
   */
  private async callAI(
    prompt: string,
    context: NarrativeGenerationContext
  ): Promise<TurnGenerationResponse> {
    if (!this.aiProvider) {
      throw new Error('AI provider not set');
    }

    // Build the request
    const request: TurnGenerationRequest = {
      narrativeContext: {
        title: context.storySeed.title,
        description: context.storySeed.description,
      },
      currentNode: {
        id: 'generated',
        type: 'transition',
        description: prompt,
        purpose: 'bridge',
        isGenerated: true,
      } as TransitionNode,
      availableEdges: [],
      worldState: context.worldState,
      presentCharacters: context.presentCharacters.map((ci) => ci.character),
      sceneContext: context.sceneContext,
      recentHistory: context.worldState.history.slice(-5),
      playerRole: context.storySeed.worldContext.playerRole,
    };

    return this.aiProvider.generateTurn(request);
  }

  // ============================================================================
  // Prompt Builders
  // ============================================================================

  private buildHardChoicePrompt(
    hardChoice: GeneratedHardChoice,
    context: NarrativeGenerationContext
  ): string {
    const { valueConflict: _valueConflict, dilemma: _dilemma, situation: _situation, embodiments: _embodiments, choices: _choices } = hardChoice;

    return `${hardChoice.generationPrompt}

ADDITIONAL CONTEXT:
Story: "${context.storySeed.title}"
Core Tension: ${context.storySeed.coreTension.description}

RECENT PLAYER ACTIONS:
${context.recentChoices.slice(-3).map((c) => `- ${c}`).join('\n') || 'None yet'}

RELEVANT MEMORIES:
${context.recentMemories.slice(0, 3).map((m) => `- ${m.description}`).join('\n') || 'None yet'}

ACTIVE RELATIONSHIPS:
${context.presentCharacters.map((c) => `- ${c.character.name}: ${this.describeRelationship(c.relationship)}`).join('\n')}

Generate a scene that:
1. Builds naturally to the dilemma
2. Makes all choices feel valid but costly
3. Shows character reactions that reflect their relationships
4. Creates emotional investment in the outcome`;
  }

  private buildAnchorPrompt(
    anchor: AnchorNode,
    context: NarrativeGenerationContext
  ): string {
    return `Generate narration for a KEY STORY MOMENT.

ANCHOR: "${anchor.title}"
BEAT: ${anchor.beat}
SIGNIFICANCE: ${anchor.significance}

SCENE: ${anchor.description}
LOCATION: ${context.sceneContext.location}
MOOD: ${context.sceneContext.mood}

CHARACTERS PRESENT:
${context.presentCharacters.map((c) => `- ${c.character.name} (relationship: ${this.describeRelationship(c.relationship)})`).join('\n')}

STORY CONTEXT:
Core Tension: ${context.storySeed.coreTension.description}

SCRIPTED DIALOGUE (expand and make natural):
${anchor.dialogue?.map((d) => `${d.characterId}: "${d.text}"`).join('\n') || 'None - generate appropriate dialogue'}

REQUIREMENTS:
1. This is a pivotal moment - make it feel significant
2. Build on player's previous choices and relationships
3. Create memorable character interactions
4. Set up the choices that follow naturally`;
  }

  private buildTransitionPrompt(
    transition: TransitionNode,
    fromNode: NarrativeNode,
    toNode: NarrativeNode | null,
    context: NarrativeGenerationContext
  ): string {
    const purposeDescriptions: Record<string, string> = {
      bridge: 'Connect two scenes smoothly',
      escalation: 'Raise the stakes and tension',
      relief: 'Provide a moment of respite',
      revelation: 'Reveal new information',
      preparation: 'Set up what comes next',
    };

    return `Generate a TRANSITION scene.

PURPOSE: ${purposeDescriptions[transition.purpose] || transition.purpose}
${transition.activeConflict ? `EXPLORING CONFLICT: ${transition.activeConflict}` : ''}

FROM: ${fromNode.description}
${toNode ? `LEADING TO: ${toNode.description}` : 'Open-ended transition'}

SCENE: ${transition.description}
LOCATION: ${context.sceneContext.location}
MOOD: ${context.sceneContext.mood}

CHARACTERS PRESENT:
${context.presentCharacters.map((c) => `- ${c.character.name}`).join('\n')}

RECENT CHOICES:
${context.recentChoices.slice(-3).map((c) => `- ${c}`).join('\n') || 'None yet'}

REQUIREMENTS:
1. Bridge the narrative naturally
2. Maintain tension appropriate to the story
3. Give characters moments to react to recent events
4. Prepare the player for what's coming`;
  }

  private buildMergePrompt(
    merge: MergeNode,
    incomingPath: string,
    context: NarrativeGenerationContext
  ): string {
    const strategyDescriptions: Record<string, string> = {
      acknowledge_differences: 'Acknowledge that different players took different paths',
      common_ground: 'Find what all paths have in common',
      forced_unity: 'Force all paths to the same conclusion',
    };

    return `Generate a PATH CONVERGENCE scene.

MERGE POINT: "${merge.title}"
STRATEGY: ${strategyDescriptions[merge.mergeStrategy]}
CANONICAL CONTINUATION: ${merge.canonicalContinuation}

PLAYER'S PATH: ${incomingPath}
${merge.pathVariations?.[incomingPath] ? `PATH-SPECIFIC TEXT: ${merge.pathVariations[incomingPath]}` : ''}

SCENE: ${merge.description}
LOCATION: ${context.sceneContext.location}
MOOD: ${context.sceneContext.mood}

RECENT MEMORIES:
${context.recentMemories.slice(0, 3).map((m) => `- ${m.description}`).join('\n')}

REQUIREMENTS:
1. Make the convergence feel natural
2. Honor the player's unique path
3. Create a unified narrative going forward
4. Reference past choices where appropriate`;
  }

  private buildConsequencePrompt(
    rule: WorldRule,
    trigger: string,
    context: NarrativeGenerationContext
  ): string {
    return `Generate narration for a WORLD RULE consequence.

RULE: "${rule.rule}"
CATEGORY: ${rule.category}
${rule.mechanicalEffect ? `EFFECT: ${rule.mechanicalEffect}` : ''}

TRIGGER: ${trigger}

STORY CONTEXT:
${context.storySeed.title} - ${context.storySeed.coreTension.description}

CHARACTERS WHO MIGHT BE AFFECTED:
${context.presentCharacters.map((c) => `- ${c.character.name}`).join('\n')}

REQUIREMENTS:
1. Show the consequence naturally unfolding
2. Make it feel like a logical result of player actions
3. Create emotional impact
4. Leave room for the player to respond`;
  }

  private buildDialoguePrompt(
    character: StoryCharacter,
    situation: string,
    playerChoice: string,
    relationship: number
  ): string {
    return `Generate dialogue for ${character.name}.

CHARACTER: ${character.name}
ARCHETYPE: ${character.archetype}
CONTRADICTION: ${character.contradiction}
TRAITS: ${character.traits.join(', ')}

RELATIONSHIP WITH PLAYER: ${this.describeRelationship(relationship)} (${relationship})

SITUATION: ${situation}
PLAYER JUST: ${playerChoice}

REQUIREMENTS:
1. Speak in character's unique voice
2. React appropriately to relationship level
3. Show the character's internal contradiction
4. Keep dialogue to 1-3 sentences`;
  }

  // ============================================================================
  // Response Parsers
  // ============================================================================

  private parseHardChoiceResponse(
    response: TurnGenerationResponse,
    hardChoice: GeneratedHardChoice
  ): GeneratedTurn {
    // Map hard choices to player choices
    const playerChoices: PlayerChoice[] = hardChoice.choices.map((hc, i) => ({
      index: i,
      text: response.choices?.[i]?.text || hc.text,
      edgeId: hc.id,
      tone: hc.favors === 'value1' ? 'positive' :
            hc.favors === 'value2' ? 'negative' : 'neutral',
    }));

    return {
      narration: response.narration,
      dialogues: response.dialogues || [],
      choices: playerChoices,
      suggestedMemory: {
        type: 'choice',
        description: `Faced with the conflict between ${hardChoice.valueConflict.value1} and ${hardChoice.valueConflict.value2}`,
        significance: 7,
        relatedConflict: hardChoice.valueConflict.id,
      },
    };
  }

  private parseAnchorResponse(
    response: TurnGenerationResponse,
    anchor: AnchorNode
  ): GeneratedTurn {
    return {
      narration: response.narration || anchor.description,
      dialogues: response.dialogues || [],
      choices: response.choices || [],
      suggestedMemory: {
        type: 'revelation',
        description: `Key moment: ${anchor.title}`,
        significance: 8,
      },
    };
  }

  private parseTransitionResponse(
    response: TurnGenerationResponse,
    transition: TransitionNode
  ): GeneratedTurn {
    return {
      narration: response.narration || transition.description,
      dialogues: response.dialogues || [],
      choices: response.choices || [],
    };
  }

  private parseMergeResponse(
    response: TurnGenerationResponse,
    merge: MergeNode
  ): GeneratedTurn {
    return {
      narration: response.narration || merge.description,
      dialogues: response.dialogues || [],
      choices: response.choices || [],
      suggestedMemory: {
        type: 'revelation',
        description: `Paths converge: ${merge.title}`,
        significance: 5,
      },
    };
  }

  // ============================================================================
  // Fallback Generators (when AI is unavailable)
  // ============================================================================

  private generateFallbackHardChoiceScene(
    hardChoice: GeneratedHardChoice,
    _context: NarrativeGenerationContext
  ): GeneratedTurn {
    const choices: PlayerChoice[] = hardChoice.choices.map((hc, i) => ({
      index: i,
      text: hc.text,
      edgeId: hc.id,
      tone: hc.favors === 'value1' ? 'positive' :
            hc.favors === 'value2' ? 'negative' : 'neutral',
    }));

    return {
      narration: hardChoice.situation + '\n\n' + hardChoice.dilemma,
      dialogues: hardChoice.embodiments.map((e) => ({
        characterId: e.characterId,
        characterName: e.characterName,
        text: e.manifestation,
      })),
      choices,
    };
  }

  private generateFallbackAnchorScene(
    anchor: AnchorNode,
    context: NarrativeGenerationContext
  ): GeneratedTurn {
    return {
      narration: anchor.description,
      dialogues: anchor.dialogue?.map((d) => ({
        characterId: d.characterId,
        characterName: context.presentCharacters.find((c) => c.character.id === d.characterId)?.character.name || d.characterId,
        text: d.text,
        emotion: d.emotion,
      })) || [],
      choices: [],
    };
  }

  private generateFallbackTransitionScene(
    transition: TransitionNode,
    _context: NarrativeGenerationContext
  ): GeneratedTurn {
    return {
      narration: transition.description,
      dialogues: [],
      choices: [],
    };
  }

  private generateFallbackMergeScene(
    merge: MergeNode,
    incomingPath: string,
    _context: NarrativeGenerationContext
  ): GeneratedTurn {
    const pathText = merge.pathVariations?.[incomingPath] || '';

    return {
      narration: merge.description + (pathText ? '\n\n' + pathText : ''),
      dialogues: [],
      choices: [],
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private describeRelationship(value: number): string {
    if (value >= 75) return 'deeply trusted';
    if (value >= 50) return 'friendly';
    if (value >= 25) return 'warm';
    if (value >= 0) return 'neutral';
    if (value >= -25) return 'cool';
    if (value >= -50) return 'distrustful';
    if (value >= -75) return 'hostile';
    return 'bitter enemy';
  }
}
