/**
 * Story Graph Generator Service
 * Uses AI to generate narrative graphs from user input
 *
 * Supports both legacy format and new Story Seed architecture:
 * - Legacy: StoryCreationInput → GeneratedGraph
 * - New: StorySeedInput → StorySeed + NarrativeSkeleton
 */

import { AIService } from './ai.js';
import type {
  StoryCreationInput,
  GraphGenerationConfig,
  GeneratedGraph,
  GeneratedNode,
  GeneratedEdge,
  GeneratedCharacter,
  GeneratedWorldState,
} from '../types/storyCreation.js';

// Types for the new Story Seed architecture
export interface StorySeedInput {
  title: string;
  description: string;
  tags: string[];
  /** Value conflicts: pairs of opposing values */
  valueConflicts: Array<{
    value1: string;
    value2: string;
    description?: string;
  }>;
  /** Core tension: 1-3 sentences describing the central conflict */
  coreTension: string;
  /** Characters with archetype, contradiction, and bond */
  characters: Array<{
    name: string;
    archetype: string;
    contradiction: string;
    bond: string;
    traits?: string[];
    description?: string;
  }>;
  /** World rules: causal laws that govern consequences */
  worldRules: Array<{
    rule: string;
    category: 'violence' | 'trust' | 'secrets' | 'resources' | 'relationships' | 'time' | 'custom';
  }>;
  /** Ending dimensions: axes defining outcome space */
  endingDimensions: Array<{
    name: string;
    lowEnd: string;
    highEnd: string;
  }>;
  /** World context */
  worldContext: {
    setting: string;
    timePeriod: string;
    mood: string;
    playerRole: string;
  };
  /** Beginning scenario */
  beginningScenario: string;
  /** Estimated playtime */
  estimatedMinutes: number;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'challenging';
}

export interface GeneratedStorySeed {
  id: string;
  title: string;
  description: string;
  tags: string[];
  valueConflicts: Array<{
    id: string;
    value1: string;
    value2: string;
    description?: string;
    weight: number;
  }>;
  coreTension: {
    description: string;
    internalConflict?: string;
    stakes?: string;
  };
  characters: Array<{
    id: string;
    name: string;
    archetype: string;
    contradiction: string;
    bond: string;
    initialRelationship: number;
    description: string;
    traits: string[];
    secret?: string;
    desire?: string;
    fear?: string;
  }>;
  worldRules: Array<{
    id: string;
    rule: string;
    category: string;
    mechanicalEffect?: string;
    priority: number;
  }>;
  endingDimensions: Array<{
    id: string;
    name: string;
    lowEnd: string;
    highEnd: string;
    description?: string;
  }>;
  endings: Array<{
    id: string;
    title: string;
    dimensionPositions: Record<string, number>;
    requirements?: string;
    epilogue: string;
    classification: 'good' | 'neutral' | 'bad' | 'secret' | 'bittersweet';
  }>;
  worldContext: {
    setting: string;
    timePeriod: string;
    mood: string;
    playerRole: string;
  };
  beginningScenario: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'challenging';
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_CONFIG: GraphGenerationConfig = {
  minStoryNodes: 8,
  maxStoryNodes: 15,
  entryScenarios: 2,
  branchingFactor: 3,
  conflictIntensity: 0.8,
  includeBranchNodes: true,
  includeConvergeNodes: true,
};

/**
 * Progress event types for streaming story generation
 */
export type StreamingProgressEvent =
  | { type: 'start'; message: string; totalSteps: number }
  | { type: 'step'; step: number; message: string; data?: unknown }
  | { type: 'node_generated'; node: GeneratedNode }
  | { type: 'edge_generated'; edge: GeneratedEdge }
  | { type: 'branch_start'; branchIndex: number; totalBranches: number; sourceNode: string }
  | { type: 'branch_complete'; branchIndex: number; nodesGenerated: number; edgesGenerated: number }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'complete'; graph: GeneratedGraph };

export class StoryGeneratorService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Generate a complete story graph from user input
   */
  async generateStoryGraph(
    input: StoryCreationInput,
    config: Partial<GraphGenerationConfig> = {}
  ): Promise<GeneratedGraph> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    console.log(`[StoryGenerator] Starting story generation for: "${input.title}"`);
    console.log(`[StoryGenerator] Config:`, JSON.stringify(fullConfig));

    // Step 1: Generate characters
    console.log('[StoryGenerator] Step 1/3: Generating characters...');
    let characters: GeneratedCharacter[];
    try {
      characters = await this.generateCharacters(input);
      console.log(`[StoryGenerator] Generated ${characters.length} characters`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[StoryGenerator] Character generation failed:', message);
      throw new Error(`Character generation failed: ${message}`);
    }

    // Step 2: Generate world state
    console.log('[StoryGenerator] Step 2/3: Generating world state...');
    let worldState: GeneratedWorldState;
    try {
      worldState = await this.generateWorldState(input, characters);
      console.log(`[StoryGenerator] Generated world state with ${Object.keys(worldState.player || {}).length} player attributes, ${Object.keys(worldState.flags || {}).length} flags, ${Object.keys(worldState.resources || {}).length} resources`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[StoryGenerator] World state generation failed:', message);
      throw new Error(`World state generation failed: ${message}`);
    }

    // Step 3: Generate the narrative graph structure
    console.log('[StoryGenerator] Step 3/3: Generating graph structure...');
    let nodes: GeneratedNode[];
    let edges: GeneratedEdge[];
    try {
      const result = await this.generateGraphStructure(input, characters, worldState, fullConfig);
      nodes = result.nodes;
      edges = result.edges;
      console.log(`[StoryGenerator] Generated ${nodes.length} nodes and ${edges.length} edges`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[StoryGenerator] Graph structure generation failed:', message);
      throw new Error(`Graph structure generation failed: ${message}`);
    }

    // Create the complete graph
    const graph: GeneratedGraph = {
      metadata: {
        id: this.generateId(input.title),
        title: input.title,
        description: input.plot,
        author: 'User Created',
        version: '1.0.0',
        tags: input.tags,
      },
      characters,
      worldState,
      nodes,
      edges,
    };

    // Validate and add warnings
    graph.warnings = this.validateGraph(graph);
    if (graph.warnings.length > 0) {
      console.warn('[StoryGenerator] Validation warnings:', graph.warnings);
    }

    console.log(`[StoryGenerator] Story generation complete for: "${input.title}"`);
    return graph;
  }

  /**
   * Generate a complete story graph using step-by-step streaming approach
   * This prevents context length issues by generating nodes incrementally
   */
  async *generateStoryGraphStreaming(
    input: StoryCreationInput,
    config: Partial<GraphGenerationConfig> = {}
  ): AsyncGenerator<StreamingProgressEvent, GeneratedGraph, unknown> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    console.log(`[StoryGenerator] Starting streaming story generation for: "${input.title}"`);

    // Calculate total steps: characters + world state + skeleton + branches
    const estimatedBranches = fullConfig.minStoryNodes;
    const totalSteps = 3 + estimatedBranches; // 3 base steps + branch generation

    yield {
      type: 'start',
      message: `Starting story generation for "${input.title}"`,
      totalSteps,
    };

    // Step 1: Generate characters
    yield { type: 'step', step: 1, message: 'Generating characters...' };
    let characters: GeneratedCharacter[];
    try {
      characters = await this.generateCharacters(input);
      yield { type: 'step', step: 1, message: `Generated ${characters.length} characters`, data: characters };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      yield { type: 'error', message: `Character generation failed: ${message}`, recoverable: false };
      throw new Error(`Character generation failed: ${message}`);
    }

    // Step 2: Generate world state
    yield { type: 'step', step: 2, message: 'Generating world state...' };
    let worldState: GeneratedWorldState;
    try {
      worldState = await this.generateWorldState(input, characters);
      yield { type: 'step', step: 2, message: 'World state generated', data: worldState };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      yield { type: 'error', message: `World state generation failed: ${message}`, recoverable: false };
      throw new Error(`World state generation failed: ${message}`);
    }

    // Step 3: Generate story skeleton (entry nodes, main path, ending nodes)
    yield { type: 'step', step: 3, message: 'Generating story skeleton...' };
    let skeleton: { nodes: GeneratedNode[]; edges: GeneratedEdge[] };
    try {
      skeleton = await this.generateStorySkeleton(input, characters, worldState, fullConfig);
      yield { type: 'step', step: 3, message: `Generated skeleton with ${skeleton.nodes.length} nodes`, data: skeleton };

      // Emit each node from skeleton
      for (const node of skeleton.nodes) {
        yield { type: 'node_generated', node };
      }
      for (const edge of skeleton.edges) {
        yield { type: 'edge_generated', edge };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      yield { type: 'error', message: `Skeleton generation failed: ${message}`, recoverable: false };
      throw new Error(`Skeleton generation failed: ${message}`);
    }

    // Step 4+: Generate branches for each story node
    const allNodes = [...skeleton.nodes];
    const allEdges = [...skeleton.edges];
    const storyNodes = skeleton.nodes.filter(n => n.type === 'story');

    for (let i = 0; i < storyNodes.length; i++) {
      const node = storyNodes[i];
      const stepNum = 4 + i;

      yield {
        type: 'branch_start',
        branchIndex: i + 1,
        totalBranches: storyNodes.length,
        sourceNode: node.id,
      };
      yield { type: 'step', step: stepNum, message: `Generating branches for "${node.title || node.id}"...` };

      try {
        const branchResult = await this.generateBranchForNode(
          input, characters, worldState, fullConfig,
          node, allNodes, allEdges
        );

        // Add new nodes and edges
        for (const newNode of branchResult.nodes) {
          if (!allNodes.find(n => n.id === newNode.id)) {
            allNodes.push(newNode);
            yield { type: 'node_generated', node: newNode };
          }
        }
        for (const newEdge of branchResult.edges) {
          if (!allEdges.find(e => e.id === newEdge.id)) {
            allEdges.push(newEdge);
            yield { type: 'edge_generated', edge: newEdge };
          }
        }

        yield {
          type: 'branch_complete',
          branchIndex: i + 1,
          nodesGenerated: branchResult.nodes.length,
          edgesGenerated: branchResult.edges.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        yield {
          type: 'error',
          message: `Branch generation for "${node.id}" failed: ${message}`,
          recoverable: true,
        };
        // Continue with other branches even if one fails
      }
    }

    // Create the complete graph
    const graph: GeneratedGraph = {
      metadata: {
        id: this.generateId(input.title),
        title: input.title,
        description: input.plot,
        author: 'User Created',
        version: '1.0.0',
        tags: input.tags,
      },
      characters,
      worldState,
      nodes: allNodes,
      edges: allEdges,
    };

    // Validate and add warnings
    graph.warnings = this.validateGraph(graph);

    yield { type: 'complete', graph };
    console.log(`[StoryGenerator] Streaming story generation complete: ${allNodes.length} nodes, ${allEdges.length} edges`);

    return graph;
  }

  /**
   * Generate the story skeleton: entry nodes, main story path, and ending nodes
   * This is a smaller, focused generation that establishes the core structure
   */
  private async generateStorySkeleton(
    input: StoryCreationInput,
    characters: GeneratedCharacter[],
    worldState: GeneratedWorldState,
    config: GraphGenerationConfig
  ): Promise<{ nodes: GeneratedNode[]; edges: GeneratedEdge[] }> {
    const systemPrompt = `You are a master narrative designer creating the SKELETON of an interactive story.
Your goal is to create the core structure: entry points, main story beats, and endings.
DO NOT create branch paths yet - only the main spine of the story.

CRITICAL DESIGN PRINCIPLES:
1. Create a clear narrative arc from beginning to end
2. Each story node represents a KEY MOMENT in the story
3. Entry nodes introduce the player to the world
4. Story nodes contain the main beats/scenes
5. Ending nodes conclude the story

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {
5. Keep descriptions CONCISE (1-2 sentences max) to avoid token limits

Output this exact JSON structure:
{
  "nodes": [
    {
      "id": "entry_1",
      "type": "entry",
      "title": "Entry Title",
      "preview": "Short preview",
      "description": "Brief scene description",
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    },
    {
      "id": "story_1",
      "type": "story",
      "title": "Scene Title",
      "beat": "Key story moment",
      "description": "What happens",
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    },
    {
      "id": "ending_good",
      "type": "ending",
      "title": "Ending Title",
      "endingType": "good",
      "description": "Ending scene",
      "epilogue": "Brief epilogue"
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "entry_1",
      "to": "story_1",
      "choiceType": "action_type",
      "choiceHint": "What happens"
    }
  ]
}`;

    const userPrompt = `Create the SKELETON (main spine) for this story:

TITLE: ${input.title}
PLOT: ${input.plot}
${input.coreTension ? `CORE TENSION: ${input.coreTension}` : ''}
BEGINNING: ${input.beginningScenario}

ENDINGS NEEDED:
${input.endingScenarios.map(e => `- ${e.type.toUpperCase()}: ${e.description}`).join('\n')}

SETTING: ${input.worldSettings.setting}
MOOD: ${input.worldSettings.mood}
CHARACTERS: ${characters.map(c => `${c.name} (${c.id})`).join(', ')}

REQUIREMENTS:
- Create ${config.entryScenarios} entry node(s)
- Create ${Math.min(config.minStoryNodes, 5)} main story nodes (key scenes only)
- Create ${input.endingScenarios.length} ending nodes
- Connect nodes with simple edges (ONE path from entry to each ending)
- Keep descriptions SHORT - branches will be added later

Generate the skeleton JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 3000,
    });

    return this.parseJSON(response);
  }

  /**
   * Generate branches and additional choices for a specific story node
   * This creates the 3 choices per node and any intermediate nodes needed
   */
  private async generateBranchForNode(
    input: StoryCreationInput,
    characters: GeneratedCharacter[],
    worldState: GeneratedWorldState,
    config: GraphGenerationConfig,
    sourceNode: GeneratedNode,
    existingNodes: GeneratedNode[],
    existingEdges: GeneratedEdge[]
  ): Promise<{ nodes: GeneratedNode[]; edges: GeneratedEdge[] }> {
    // Find what edges already exist from this node
    const existingOutgoingEdges = existingEdges.filter(e => e.from === sourceNode.id);
    const edgesNeeded = 3 - existingOutgoingEdges.length;

    if (edgesNeeded <= 0) {
      return { nodes: [], edges: [] };
    }

    // Find potential target nodes (existing nodes this could connect to)
    const potentialTargets = existingNodes
      .filter(n => n.id !== sourceNode.id && n.type !== 'entry')
      .map(n => `${n.id}: ${n.title || n.description?.slice(0, 50)}`);

    const systemPrompt = `You are a narrative designer adding BRANCHING CHOICES to a story node.
Create meaningful choices that lead to different outcomes.

CRITICAL DESIGN PRINCIPLES:
1. NO PERFECT CHOICES - Every option has trade-offs
2. Each choice should feel DISTINCT (not just different wording)
3. Choices can lead to existing nodes OR create new intermediate nodes
4. Include conflict, benefit, and cost for each choice

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {
5. Keep descriptions VERY SHORT

Output this exact JSON structure:
{
  "nodes": [
    {
      "id": "new_node_id",
      "type": "story",
      "title": "Scene Title",
      "beat": "What happens",
      "description": "Brief description",
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "from": "source_node_id",
      "to": "target_node_id",
      "choiceType": "investigate|confront|help|betray|etc",
      "choiceHint": "What the player does",
      "conflict": "The dilemma",
      "benefit": "What you gain",
      "cost": "What you risk"
    }
  ]
}`;

    const userPrompt = `Add ${edgesNeeded} branching choice(s) to this story node:

SOURCE NODE:
ID: ${sourceNode.id}
Title: ${sourceNode.title || 'Untitled'}
Description: ${sourceNode.description || sourceNode.beat || 'No description'}
Characters present: ${sourceNode.characters?.join(', ') || 'None'}

STORY CONTEXT:
Title: ${input.title}
Themes: ${input.worldSettings.themes.join(', ')}
Conflict intensity: ${Math.round(config.conflictIntensity * 100)}%

EXISTING EDGES FROM THIS NODE:
${existingOutgoingEdges.map(e => `- To "${e.to}": "${e.choiceHint}"`).join('\n') || 'None yet'}

EXISTING NODES TO POTENTIALLY CONNECT TO:
${potentialTargets.slice(0, 10).join('\n')}

AVAILABLE STATE VARIABLES:
${Object.keys(worldState.player).join(', ')}

REQUIREMENTS:
- Create ${edgesNeeded} NEW choice(s) that are DIFFERENT from existing edges
- Each choice needs a dilemma with clear trade-offs
- You can create 0-2 new intermediate nodes if needed
- Prefer connecting to existing nodes when it makes narrative sense
- If creating new nodes, they should eventually connect to existing nodes

Generate the branches JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 2000,
    });

    const result = this.parseJSON(response);
    return {
      nodes: result.nodes || [],
      edges: result.edges || [],
    };
  }

  /**
   * Generate characters based on user input
   */
  private async generateCharacters(input: StoryCreationInput): Promise<GeneratedCharacter[]> {
    const systemPrompt = `You are a narrative designer creating characters for an interactive story.
Generate detailed character definitions based on the user's input.
CRITICAL: Characters must have clear motivations that can create CONFLICT with the player's goals.
Each character should have secrets, flaws, and competing interests.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks (\`\`\`json or \`\`\`)
4. Do NOT include phrases like "Here is the JSON:" or "Output:"
5. Start your response IMMEDIATELY with the opening brace {
6. Ensure all strings are properly escaped (use \\" for quotes, \\n for newlines)

Output this exact JSON structure:
{
  "characters": [
    {
      "id": "character_id_snake_case",
      "name": "Full Name",
      "description": "Physical and role description",
      "personality": "Detailed personality that drives conflict",
      "traits": ["trait1", "trait2", "trait3", "trait4"],
      "initialRelationship": 0
    }
  ]
}`;

    const userPrompt = `Create characters for this story:

TITLE: ${input.title}
PLOT: ${input.plot}
SETTING: ${input.worldSettings.setting}
MOOD: ${input.worldSettings.mood}
THEMES: ${input.worldSettings.themes.join(', ')}

USER'S CHARACTER IDEAS:
${input.characters.map((c, i) => `
${i + 1}. ${c.name} (${c.role})
   Description: ${c.description}
   Personality: ${c.personality}
   Initial Relationship: ${c.initialRelationship ?? 0}
`).join('\n')}

IMPORTANT REQUIREMENTS:
- Every character must have a hidden agenda or secret that creates tension
- Relationships should start tense or complicated (rarely purely friendly)
- Traits should hint at both strengths and dangerous flaws
- Antagonists should have sympathetic motivations
- Allies should have their own needs that may conflict with the player

Generate the characters JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const parsed = this.parseJSON(response);
    return parsed.characters || [];
  }

  /**
   * Generate world state definition
   */
  private async generateWorldState(
    input: StoryCreationInput,
    characters: GeneratedCharacter[]
  ): Promise<GeneratedWorldState> {
    const systemPrompt = `You are designing the state tracking system for an interactive story.
Create variables that track meaningful choices, resources, and story flags.
These should create TRADE-OFFS - gaining one thing should risk losing another.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks (\`\`\`json or \`\`\`)
4. Do NOT include phrases like "Here is the JSON:" or "Output:"
5. Start your response IMMEDIATELY with the opening brace {
6. Ensure all strings are properly escaped (use \\" for quotes, \\n for newlines)

Output this exact JSON structure:
{
  "player": {
    "attribute_name": {
      "type": "number",
      "default": 50,
      "description": "What this tracks",
      "min": 0,
      "max": 100
    }
  },
  "flags": {
    "flag_name": {
      "type": "boolean",
      "default": false,
      "description": "What this represents"
    }
  },
  "resources": {
    "resource_name": {
      "type": "number",
      "default": 5,
      "description": "What this represents"
    }
  }
}`;

    const userPrompt = `Design the state system for:

TITLE: ${input.title}
THEMES: ${input.worldSettings.themes.join(', ')}
SETTING: ${input.worldSettings.setting}

CHARACTERS: ${characters.map(c => c.name).join(', ')}

ENDINGS THAT NEED TO BE TRACKED:
${input.endingScenarios.map(e => `- ${e.type.toUpperCase()}: ${e.description}`).join('\n')}

Create state variables that:
1. Track player attributes that affect story outcomes (reputation, sanity, trust, etc.)
2. Track key story flags (discovered secrets, made promises, etc.)
3. Track limited resources that force hard choices (time, money, allies, etc.)

Each resource should be LIMITED - spending it on one thing means not having it for another.

Generate the world state JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      maxTokens: 1500,
    });

    return this.parseJSON(response);
  }

  /**
   * Generate the narrative graph structure (nodes and edges)
   */
  private async generateGraphStructure(
    input: StoryCreationInput,
    characters: GeneratedCharacter[],
    worldState: GeneratedWorldState,
    config: GraphGenerationConfig
  ): Promise<{ nodes: GeneratedNode[]; edges: GeneratedEdge[] }> {
    const systemPrompt = `You are a master narrative designer creating an interactive story graph.
Your goal is to create a compelling narrative where EVERY CHOICE HAS MEANINGFUL CONSEQUENCES.

CRITICAL DESIGN PRINCIPLES:
1. NO PERFECT CHOICES - Every option should have clear trade-offs
2. MORAL DILEMMAS - Put players in situations where doing "the right thing" has costs
3. TIME PRESSURE - Create urgency that forces imperfect decisions
4. COMPETING LOYALTIES - Helping one character should risk disappointing another
5. HIDDEN CONSEQUENCES - Some effects of choices should be delayed or unexpected
6. SACRIFICE - Sometimes the best outcomes require giving up something valuable

CONFLICT TYPES TO USE:
- Personal vs Greater Good (save one vs save many)
- Truth vs Kindness (honest but hurtful vs comforting lie)
- Safety vs Justice (protect yourself vs do what's right)
- Loyalty vs Morality (help a friend do wrong vs betray them)
- Present vs Future (quick fix vs long-term solution)

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks (\`\`\`json or \`\`\`)
4. Do NOT include phrases like "Here is the JSON:" or "Output:"
5. Start your response IMMEDIATELY with the opening brace {
6. Ensure all strings are properly escaped (use \\" for quotes, \\n for newlines inside strings)
7. Keep descriptions concise to avoid hitting token limits

Output this exact JSON structure (required fields shown):
{
  "nodes": [
    {
      "id": "node_id",
      "type": "entry",
      "title": "Entry Title",
      "preview": "Short preview text",
      "description": "Scene description",
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone", "timeOfDay": "time" }
    },
    {
      "id": "story_node_id",
      "type": "story",
      "beat": "Key story moment",
      "description": "What happens",
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    },
    {
      "id": "ending_id",
      "type": "ending",
      "title": "Ending Title",
      "endingType": "good",
      "description": "Ending scene",
      "epilogue": "What happens after"
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "from": "source_node",
      "to": "target_node",
      "choiceType": "investigate",
      "choiceHint": "What player says/does",
      "conflict": "The dilemma",
      "benefit": "What you gain",
      "cost": "What you risk"
    }
  ]
}`;

    const userPrompt = `Create a narrative graph for:

TITLE: ${input.title}
PLOT: ${input.plot}
${input.coreTension ? `\nCORE TENSION (central conflict driving all hard choices): ${input.coreTension}` : ''}

BEGINNING: ${input.beginningScenario}

ENDINGS:
${input.endingScenarios.map(e => `- ${e.type.toUpperCase()}: ${e.description}${e.conditions ? ` (Conditions: ${e.conditions})` : ''}`).join('\n')}

SETTING: ${input.worldSettings.setting}
TIME PERIOD: ${input.worldSettings.timePeriod}
MOOD: ${input.worldSettings.mood}
THEMES: ${input.worldSettings.themes.join(', ')}
${input.worldSettings.specialRules ? `SPECIAL RULES: ${input.worldSettings.specialRules}` : ''}

CHARACTERS:
${characters.map(c => `- ${c.name} (${c.id}): ${c.description}`).join('\n')}

AVAILABLE STATE VARIABLES:
Player attributes: ${Object.keys(worldState.player).join(', ')}
Flags: ${Object.keys(worldState.flags).join(', ')}
Resources: ${Object.keys(worldState.resources).join(', ')}

REQUIREMENTS:
- Create ${config.entryScenarios} entry nodes (different starting points)
- Create ${config.minStoryNodes}-${config.maxStoryNodes} story nodes
- Create ${input.endingScenarios.length} ending nodes matching the user's endings
${config.includeBranchNodes ? '- Include 1-2 branch nodes for state-based automatic routing' : ''}
${config.includeConvergeNodes ? '- Include 1-2 converge nodes where different paths meet' : ''}
- Each story node should have exactly 3 outgoing edges (choices)
- EVERY CHOICE must have meaningful trade-offs documented in conflict/benefit/cost
- Conflict intensity: ${Math.round(config.conflictIntensity * 100)}% (higher = more agonizing choices)

REMEMBER: The player should feel the weight of every decision. No easy outs.

Generate the complete graph JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 8000,
    });

    return this.parseJSON(response);
  }

  /**
   * Regenerate a single node
   */
  async regenerateNode(
    graph: GeneratedGraph,
    nodeId: string,
    instructions?: string
  ): Promise<GeneratedNode> {
    const existingNode = graph.nodes.find(n => n.id === nodeId);
    const incomingEdges = graph.edges.filter(e => e.to === nodeId);
    const outgoingEdges = graph.edges.filter(e => e.from === nodeId);

    const systemPrompt = `You are a narrative designer improving a single scene in an interactive story.
The scene should create conflict and difficult choices.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {`;

    const userPrompt = `Regenerate this scene:

CURRENT SCENE:
${JSON.stringify(existingNode, null, 2)}

STORY CONTEXT:
Title: ${graph.metadata.title}
Plot: ${graph.metadata.description}

INCOMING PATHS (how players arrive):
${incomingEdges.map(e => `- From "${e.from}": "${e.choiceHint}"`).join('\n')}

OUTGOING CHOICES (where players can go):
${outgoingEdges.map(e => `- To "${e.to}": "${e.choiceHint}"`).join('\n')}

CHARACTERS AVAILABLE: ${graph.characters.map(c => c.name).join(', ')}

${instructions ? `SPECIFIC INSTRUCTIONS: ${instructions}` : ''}

Create a more compelling version of this scene that:
1. Raises the emotional stakes
2. Creates tension or conflict
3. Makes the player feel the weight of their situation

Generate the node JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 1000,
    });

    return this.parseJSON(response);
  }

  /**
   * Regenerate a single edge (choice)
   */
  async regenerateEdge(
    graph: GeneratedGraph,
    edgeId: string,
    instructions?: string
  ): Promise<GeneratedEdge> {
    const existingEdge = graph.edges.find(e => e.id === edgeId);
    const fromNode = graph.nodes.find(n => n.id === existingEdge?.from);
    const toNode = graph.nodes.find(n => n.id === existingEdge?.to);

    const systemPrompt = `You are a narrative designer improving a single choice in an interactive story.
The choice should present a meaningful dilemma with clear trade-offs.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {`;

    const userPrompt = `Regenerate this choice:

CURRENT CHOICE:
${JSON.stringify(existingEdge, null, 2)}

FROM SCENE: ${fromNode?.description}
TO SCENE: ${toNode?.description}

STORY CONTEXT:
Title: ${graph.metadata.title}
Themes: ${graph.metadata.tags.join(', ')}

${instructions ? `SPECIFIC INSTRUCTIONS: ${instructions}` : ''}

Create a more compelling version of this choice that:
1. Has clear costs AND benefits
2. Creates a genuine dilemma (no obvious right answer)
3. Affects relationships or resources meaningfully

Generate the edge JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 500,
    });

    return this.parseJSON(response);
  }

  /**
   * Validate graph structure
   */
  private validateGraph(graph: GeneratedGraph): string[] {
    const warnings: string[] = [];
    const nodeIds = new Set(graph.nodes.map(n => n.id));

    // Check for orphan nodes
    const entryNodes = graph.nodes.filter(n => n.type === 'entry');
    const reachableNodes = new Set(entryNodes.map(n => n.id));

    // BFS to find all reachable nodes
    const queue = [...entryNodes.map(n => n.id)];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = graph.edges.filter(e => e.from === current);
      for (const edge of outgoing) {
        if (!reachableNodes.has(edge.to)) {
          reachableNodes.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    const orphans = graph.nodes.filter(n => !reachableNodes.has(n.id));
    if (orphans.length > 0) {
      warnings.push(`Unreachable nodes: ${orphans.map(n => n.id).join(', ')}`);
    }

    // Check for dead ends (non-ending nodes with no outgoing edges)
    const endings = new Set(graph.nodes.filter(n => n.type === 'ending').map(n => n.id));
    const branches = new Set(graph.nodes.filter(n => n.type === 'branch').map(n => n.id));

    for (const node of graph.nodes) {
      if (endings.has(node.id) || branches.has(node.id)) continue;

      const outgoing = graph.edges.filter(e => e.from === node.id);
      if (outgoing.length === 0) {
        warnings.push(`Dead end: ${node.id} has no outgoing edges`);
      } else if (outgoing.length < 3 && node.type === 'story') {
        warnings.push(`${node.id} has only ${outgoing.length} choices (recommend 3)`);
      }
    }

    // Check for invalid edge references
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.from)) {
        warnings.push(`Invalid edge ${edge.id}: source node "${edge.from}" not found`);
      }
      if (!nodeIds.has(edge.to)) {
        warnings.push(`Invalid edge ${edge.id}: target node "${edge.to}" not found`);
      }
    }

    // Check for at least one entry and one ending
    if (entryNodes.length === 0) {
      warnings.push('No entry nodes defined');
    }
    if (graph.nodes.filter(n => n.type === 'ending').length === 0) {
      warnings.push('No ending nodes defined');
    }

    return warnings;
  }

  /**
   * Generate URL-safe ID from title
   */
  private generateId(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base}-${Date.now().toString(36)}`;
  }

  /**
   * Clean response of BOM, control characters, and other problematic content
   */
  private cleanResponseForParsing(response: string): string {
    // Remove BOM (Byte Order Mark)
    let cleaned = response.replace(/^\uFEFF/, '');

    // Remove null characters
    cleaned = cleaned.replace(/\x00/g, '');

    // Remove other control characters except newline, carriage return, tab
    cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return cleaned;
  }

  /**
   * Attempt to repair truncated JSON by closing open brackets
   */
  private repairTruncatedJson(json: string): string | null {
    // Count open brackets that need to be closed
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    const openBrackets: string[] = [];

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          openBrackets.push(char);
          depth++;
        } else if (char === '}' || char === ']') {
          openBrackets.pop();
          depth--;
        }
      }
    }

    // If we're still in a string, close it first
    let repaired = json;
    if (inString) {
      repaired += '"';
    }

    // Remove any trailing incomplete key-value pairs or array elements
    // Look for trailing comma and incomplete content
    repaired = repaired.replace(/,\s*$/, '');
    repaired = repaired.replace(/,\s*"[^"]*$/, ''); // Remove incomplete string key
    repaired = repaired.replace(/:\s*$/, ': null'); // Complete incomplete value
    repaired = repaired.replace(/:\s*"[^"]*$/, ': ""'); // Complete incomplete string value

    // Close remaining open brackets in reverse order
    for (let i = openBrackets.length - 1; i >= 0; i--) {
      const bracket = openBrackets[i];
      repaired += bracket === '{' ? '}' : ']';
    }

    return repaired;
  }

  /**
   * Parse JSON from AI response, handling various formats and edge cases
   */
  private parseJSON(response: string): any {
    // Pre-process: clean the response
    const cleanedResponse = this.cleanResponseForParsing(response);

    console.log(`[StoryGenerator] parseJSON: Attempting to parse response (${cleanedResponse.length} chars)`);

    // Strategy 1: Try to extract JSON from markdown code blocks first
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const extracted = codeBlockMatch[1].trim();
      console.log('[StoryGenerator] parseJSON: Found code block, attempting parse');
      const result = this.tryParseJson(extracted);
      if (result !== null) {
        console.log('[StoryGenerator] parseJSON: Successfully parsed from code block');
        return result;
      }
    }

    // Strategy 2: Try the raw response after basic cleanup
    let cleaned = cleanedResponse.trim();
    // Remove any leading/trailing markdown code block markers
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    const directResult = this.tryParseJson(cleaned);
    if (directResult !== null) {
      console.log('[StoryGenerator] parseJSON: Successfully parsed cleaned response directly');
      return directResult;
    }

    // Strategy 3: Find the start of JSON and extract balanced brackets
    // Look for the first { or [ that starts a JSON structure
    const jsonStartObj = cleaned.indexOf('{');
    const jsonStartArr = cleaned.indexOf('[');

    let jsonStart = -1;
    if (jsonStartObj >= 0 && jsonStartArr >= 0) {
      jsonStart = Math.min(jsonStartObj, jsonStartArr);
    } else if (jsonStartObj >= 0) {
      jsonStart = jsonStartObj;
    } else if (jsonStartArr >= 0) {
      jsonStart = jsonStartArr;
    }

    if (jsonStart >= 0) {
      const jsonSubstring = cleaned.slice(jsonStart);
      console.log(`[StoryGenerator] parseJSON: Found JSON start at position ${jsonStart}`);
      const balancedJson = this.extractBalancedJson(jsonSubstring);
      if (balancedJson) {
        const result = this.tryParseJson(balancedJson);
        if (result !== null) {
          console.log('[StoryGenerator] parseJSON: Successfully parsed balanced JSON from cleaned response');
          return result;
        }
      } else {
        // Balanced JSON extraction failed - likely truncated response
        console.warn('[StoryGenerator] parseJSON: Balanced JSON extraction failed, attempting repair');
        const repaired = this.repairTruncatedJson(jsonSubstring);
        if (repaired) {
          const result = this.tryParseJson(repaired);
          if (result !== null) {
            console.log('[StoryGenerator] parseJSON: Successfully parsed repaired truncated JSON');
            return result;
          }
        }
      }
    }

    // Strategy 4: Try the original response with same approach
    if (cleanedResponse !== cleaned) {
      const origJsonStartObj = cleanedResponse.indexOf('{');
      const origJsonStartArr = cleanedResponse.indexOf('[');

      let origJsonStart = -1;
      if (origJsonStartObj >= 0 && origJsonStartArr >= 0) {
        origJsonStart = Math.min(origJsonStartObj, origJsonStartArr);
      } else if (origJsonStartObj >= 0) {
        origJsonStart = origJsonStartObj;
      } else if (origJsonStartArr >= 0) {
        origJsonStart = origJsonStartArr;
      }

      if (origJsonStart >= 0) {
        const jsonSubstring = cleanedResponse.slice(origJsonStart);
        const balancedJson = this.extractBalancedJson(jsonSubstring);
        if (balancedJson) {
          const result = this.tryParseJson(balancedJson);
          if (result !== null) {
            console.log('[StoryGenerator] parseJSON: Successfully parsed balanced JSON from original response');
            return result;
          }
        } else {
          // Try repair on original too
          const repaired = this.repairTruncatedJson(jsonSubstring);
          if (repaired) {
            const result = this.tryParseJson(repaired);
            if (result !== null) {
              console.log('[StoryGenerator] parseJSON: Successfully parsed repaired truncated JSON from original');
              return result;
            }
          }
        }
      }
    }

    // Strategy 5: Look for JSON after common AI prefixes
    const prefixPatterns = [
      /(?:here(?:'s| is) (?:the )?(?:json|response|output)[:\s]*)/i,
      /(?:json[:\s]*)/i,
      /(?:output[:\s]*)/i,
      /(?:result[:\s]*)/i,
    ];

    for (const pattern of prefixPatterns) {
      const match = cleanedResponse.match(pattern);
      if (match && match.index !== undefined) {
        const afterPrefix = cleanedResponse.slice(match.index + match[0].length).trim();
        if (afterPrefix.startsWith('{') || afterPrefix.startsWith('[')) {
          const balancedJson = this.extractBalancedJson(afterPrefix);
          if (balancedJson) {
            const result = this.tryParseJson(balancedJson);
            if (result !== null) {
              console.log('[StoryGenerator] parseJSON: Successfully parsed JSON after prefix pattern');
              return result;
            }
          }
        }
      }
    }

    // Strategy 6: Last resort - try to find any valid JSON object in the response
    // Look for patterns like {"nodes": or {"characters":
    const knownRootKeys = ['nodes', 'edges', 'characters', 'conflicts', 'rules', 'dimensions', 'endings', 'player', 'flags', 'resources'];
    for (const key of knownRootKeys) {
      const keyPattern = new RegExp(`\\{\\s*"${key}"\\s*:`);
      const keyMatch = cleanedResponse.match(keyPattern);
      if (keyMatch && keyMatch.index !== undefined) {
        const fromKey = cleanedResponse.slice(keyMatch.index);
        const balancedJson = this.extractBalancedJson(fromKey);
        if (balancedJson) {
          const result = this.tryParseJson(balancedJson);
          if (result !== null) {
            console.log(`[StoryGenerator] parseJSON: Successfully parsed JSON starting with key "${key}"`);
            return result;
          }
        } else {
          // Try repair
          const repaired = this.repairTruncatedJson(fromKey);
          if (repaired) {
            const result = this.tryParseJson(repaired);
            if (result !== null) {
              console.log(`[StoryGenerator] parseJSON: Successfully parsed repaired JSON starting with key "${key}"`);
              return result;
            }
          }
        }
      }
    }

    // Log detailed error information for debugging
    console.error('[StoryGenerator] ============ JSON PARSING FAILED ============');
    console.error('[StoryGenerator] Response length:', response.length);
    console.error('[StoryGenerator] Cleaned response length:', cleanedResponse.length);
    console.error('[StoryGenerator] First 100 chars:', JSON.stringify(cleanedResponse.slice(0, 100)));
    console.error('[StoryGenerator] Last 100 chars:', JSON.stringify(cleanedResponse.slice(-100)));
    console.error('[StoryGenerator] Response preview (first 1500 chars):');
    console.error(cleanedResponse.slice(0, 1500));
    console.error('[StoryGenerator] Response preview (last 500 chars):');
    console.error(cleanedResponse.slice(-500));
    console.error('[StoryGenerator] ============================================');

    // Provide more specific error message
    if (cleanedResponse.length === 0) {
      throw new Error('Failed to parse AI response as JSON: Response was empty');
    } else if (jsonStart === -1) {
      throw new Error('Failed to parse AI response as JSON: No JSON object or array found in response');
    } else {
      throw new Error('Failed to parse AI response as JSON: Response contains malformed or truncated JSON');
    }
  }

  /**
   * Try to parse JSON with multiple fix strategies
   */
  private tryParseJson(str: string): any | null {
    let lastError: Error | null = null;

    // Try direct parse first
    try {
      return JSON.parse(str);
    } catch (e) {
      lastError = e as Error;
      // Continue to fixes
    }

    // Try removing trailing commas
    const withoutTrailingCommas = this.fixTrailingCommas(str);
    try {
      return JSON.parse(withoutTrailingCommas);
    } catch {
      // Continue
    }

    // Try removing JavaScript-style comments
    const withoutComments = this.removeJsonComments(str);
    try {
      return JSON.parse(withoutComments);
    } catch {
      // Continue
    }

    // Try both fixes together
    const fullyFixed = this.fixTrailingCommas(this.removeJsonComments(str));
    try {
      return JSON.parse(fullyFixed);
    } catch {
      // Continue
    }

    // Try fixing unescaped newlines in strings
    const withFixedNewlines = this.fixUnescapedNewlines(fullyFixed);
    try {
      return JSON.parse(withFixedNewlines);
    } catch {
      // Continue
    }

    // Try fixing common escape issues
    const withFixedEscapes = this.fixEscapeIssues(withFixedNewlines);
    try {
      return JSON.parse(withFixedEscapes);
    } catch {
      // Continue
    }

    // Try removing any trailing incomplete content after the last complete value
    const trimmedToLastComplete = this.trimToLastCompleteValue(withFixedEscapes);
    if (trimmedToLastComplete !== withFixedEscapes) {
      try {
        return JSON.parse(trimmedToLastComplete);
      } catch {
        // Continue
      }
    }

    // Log the last error for debugging if all strategies failed
    if (lastError) {
      console.warn(`[StoryGenerator] tryParseJson: All strategies failed. Last error: ${lastError.message}`);
    }

    return null;
  }

  /**
   * Fix common escape issues in JSON strings
   */
  private fixEscapeIssues(json: string): string {
    // Fix single backslashes that aren't valid escapes
    // Valid escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    let result = '';
    let inString = false;
    let i = 0;

    while (i < json.length) {
      const char = json[i];

      if (char === '"' && (i === 0 || json[i - 1] !== '\\')) {
        inString = !inString;
        result += char;
        i++;
        continue;
      }

      if (inString && char === '\\' && i + 1 < json.length) {
        const nextChar = json[i + 1];
        // Check if it's a valid escape sequence
        if (['\"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(nextChar)) {
          result += char;
          i++;
          continue;
        }
        // Check for unicode escape
        if (nextChar === 'u' && i + 5 < json.length) {
          const hexPart = json.slice(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hexPart)) {
            result += char;
            i++;
            continue;
          }
        }
        // Invalid escape - double the backslash to escape it
        result += '\\\\';
        i++;
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * Trim JSON to the last complete value by finding balanced structure
   */
  private trimToLastCompleteValue(json: string): string {
    // Find the last position where the JSON could be complete
    // This handles cases where the response was cut off mid-value
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let lastCompletePosition = 0;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            lastCompletePosition = i + 1;
          }
        }
      }
    }

    if (lastCompletePosition > 0 && lastCompletePosition < json.length) {
      return json.slice(0, lastCompletePosition);
    }

    return json;
  }

  /**
   * Remove JavaScript-style comments from JSON
   */
  private removeJsonComments(json: string): string {
    // Remove single-line comments (// ...)
    // Be careful not to match // inside strings
    let result = '';
    let inString = false;
    let escapeNext = false;
    let i = 0;

    while (i < json.length) {
      const char = json[i];
      const nextChar = json[i + 1];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\' && inString) {
        result += char;
        escapeNext = true;
        i++;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        i++;
        continue;
      }

      if (!inString && char === '/' && nextChar === '/') {
        // Skip until end of line
        while (i < json.length && json[i] !== '\n') {
          i++;
        }
        continue;
      }

      if (!inString && char === '/' && nextChar === '*') {
        // Skip until */
        i += 2;
        while (i < json.length - 1 && !(json[i] === '*' && json[i + 1] === '/')) {
          i++;
        }
        i += 2; // Skip */
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * Fix unescaped newlines inside JSON strings
   */
  private fixUnescapedNewlines(json: string): string {
    // This is a heuristic fix - replace literal newlines inside strings with \n
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        if (inString) {
          escapeNext = true;
        }
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString && (char === '\n' || char === '\r')) {
        result += '\\n';
        if (char === '\r' && json[i + 1] === '\n') {
          i++; // Skip the \n in \r\n
        }
        continue;
      }

      result += char;
    }

    return result;
  }

  /**
   * Extract balanced JSON by tracking bracket depth
   * Returns null if brackets are not balanced (truncated response)
   */
  private extractBalancedJson(str: string): string | null {
    const startChar = str[0];
    if (startChar !== '{' && startChar !== '[') {
      return null;
    }

    const endChar = startChar === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === startChar) {
          depth++;
        } else if (char === endChar) {
          depth--;
          if (depth === 0) {
            return str.slice(0, i + 1);
          }
        }
      }
    }

    // If we couldn't find balanced brackets, the JSON is incomplete/truncated
    // Return null to indicate parsing failure rather than returning invalid JSON
    console.warn(`[StoryGenerator] extractBalancedJson: Unbalanced brackets detected (depth=${depth}, inString=${inString})`);
    return null;
  }

  /**
   * Fix common JSON issues like trailing commas
   */
  private fixTrailingCommas(json: string): string {
    // Remove trailing commas before closing brackets/braces
    return json
      .replace(/,(\s*[\]}])/g, '$1')
      .replace(/,(\s*})/g, '$1')
      .replace(/,(\s*])/g, '$1');
  }

  // ============================================================================
  // New Story Seed Architecture Methods
  // ============================================================================

  /**
   * Generate a complete Story Seed from input
   * This uses the new architecture with value conflicts, world rules, and ending dimensions
   */
  async generateStorySeed(input: StorySeedInput): Promise<GeneratedStorySeed> {
    console.log(`[StoryGenerator] Starting Story Seed generation for: "${input.title}"`);

    // Step 1: Enhance value conflicts with AI
    console.log('[StoryGenerator] Step 1/4: Enhancing value conflicts...');
    const valueConflicts = await this.enhanceValueConflicts(input);

    // Step 2: Enhance characters with AI
    console.log('[StoryGenerator] Step 2/4: Enhancing characters...');
    const characters = await this.enhanceCharactersForStorySeed(input);

    // Step 3: Enhance world rules with AI
    console.log('[StoryGenerator] Step 3/4: Enhancing world rules...');
    const worldRules = await this.enhanceWorldRules(input);

    // Step 4: Generate endings based on dimensions
    console.log('[StoryGenerator] Step 4/4: Generating endings from dimensions...');
    const { endingDimensions, endings } = await this.generateDimensionalEndings(input);

    // Step 5: Enhance core tension
    const coreTension = await this.enhanceCoreTension(input);

    const storySeed: GeneratedStorySeed = {
      id: this.generateId(input.title),
      title: input.title,
      description: input.description,
      tags: input.tags,
      valueConflicts,
      coreTension,
      characters,
      worldRules,
      endingDimensions,
      endings,
      worldContext: input.worldContext,
      beginningScenario: input.beginningScenario,
      estimatedMinutes: input.estimatedMinutes,
      difficulty: input.difficulty,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log(`[StoryGenerator] Story Seed generation complete for: "${input.title}"`);
    return storySeed;
  }

  /**
   * Enhance value conflicts with descriptions and weights
   */
  private async enhanceValueConflicts(input: StorySeedInput): Promise<GeneratedStorySeed['valueConflicts']> {
    const systemPrompt = `You are designing value conflicts for an interactive narrative.
Each conflict should represent a genuine moral dilemma where both values are legitimate.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {

Output ONLY valid JSON matching this structure:
{
  "conflicts": [
    {
      "id": "conflict_id",
      "value1": "First Value",
      "value2": "Second Value",
      "description": "How this conflict manifests in the story",
      "weight": 1.0
    }
  ]
}`;

    const userPrompt = `Enhance these value conflicts for the story "${input.title}":

STORY CONTEXT:
${input.description}
Core Tension: ${input.coreTension}
Setting: ${input.worldContext.setting}

INPUT CONFLICTS:
${input.valueConflicts.map((c, i) => `${i + 1}. ${c.value1} vs ${c.value2}${c.description ? `: ${c.description}` : ''}`).join('\n')}

For each conflict:
1. Clarify how it connects to the story
2. Describe situations where this conflict arises
3. Assign a weight (0.5 to 1.5) based on centrality to the narrative

Generate the enhanced conflicts JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    const parsed = this.parseJSON(response);
    return parsed.conflicts || [];
  }

  /**
   * Enhance characters for the story seed format
   */
  private async enhanceCharactersForStorySeed(input: StorySeedInput): Promise<GeneratedStorySeed['characters']> {
    const systemPrompt = `You are designing characters for a value-driven interactive narrative.
Each character should embody specific values and have internal contradictions.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {

Output ONLY valid JSON matching this structure:
{
  "characters": [
    {
      "id": "character_id",
      "name": "Full Name",
      "archetype": "the archetype",
      "contradiction": "What they appear to be vs what they truly are",
      "bond": "Their connection to the player",
      "initialRelationship": number (-100 to 100),
      "description": "Physical and role description",
      "traits": ["trait1", "trait2", "trait3"],
      "secret": "What they're hiding",
      "desire": "What they want most",
      "fear": "What they fear most"
    }
  ]
}`;

    const userPrompt = `Enhance these characters for the story "${input.title}":

STORY CONTEXT:
${input.description}
Core Tension: ${input.coreTension}
Value Conflicts: ${input.valueConflicts.map(c => `${c.value1} vs ${c.value2}`).join(', ')}

INPUT CHARACTERS:
${input.characters.map((c, i) => `
${i + 1}. ${c.name}
   Archetype: ${c.archetype}
   Contradiction: ${c.contradiction}
   Bond: ${c.bond}
   ${c.traits ? `Traits: ${c.traits.join(', ')}` : ''}
   ${c.description ? `Description: ${c.description}` : ''}
`).join('\n')}

For each character:
1. Deepen their contradiction to create internal conflict
2. Connect their bond to the player meaningfully
3. Give them a secret that could change everything
4. Define their core desire and fear

Generate the enhanced characters JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const parsed = this.parseJSON(response);
    return parsed.characters || [];
  }

  /**
   * Enhance world rules with mechanical effects
   */
  private async enhanceWorldRules(input: StorySeedInput): Promise<GeneratedStorySeed['worldRules']> {
    const systemPrompt = `You are designing the causal rules for an interactive narrative.
These rules govern how player actions lead to consequences.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {

Output ONLY valid JSON matching this structure:
{
  "rules": [
    {
      "id": "rule_id",
      "rule": "The rule statement",
      "category": "violence|trust|secrets|resources|relationships|time|custom",
      "mechanicalEffect": "How this affects gameplay",
      "priority": 1
    }
  ]
}`;

    const userPrompt = `Enhance these world rules for the story "${input.title}":

STORY CONTEXT:
${input.description}
Value Conflicts: ${input.valueConflicts.map(c => `${c.value1} vs ${c.value2}`).join(', ')}

INPUT RULES:
${input.worldRules.map((r, i) => `${i + 1}. [${r.category}] ${r.rule}`).join('\n')}

For each rule:
1. Clarify the mechanical effect on gameplay
2. Assign priority (1 = highest, applied first)
3. Ensure rules create interesting consequences, not punishments

If fewer than 5 rules provided, add complementary rules.

Generate the enhanced rules JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    const parsed = this.parseJSON(response);
    return parsed.rules || [];
  }

  /**
   * Generate endings based on ending dimensions
   */
  private async generateDimensionalEndings(input: StorySeedInput): Promise<{
    endingDimensions: GeneratedStorySeed['endingDimensions'];
    endings: GeneratedStorySeed['endings'];
  }> {
    const systemPrompt = `You are designing the ending system for an interactive narrative.
Endings are determined by the player's position on multiple dimensions.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {

Output ONLY valid JSON matching this structure:
{
  "dimensions": [
    {
      "id": "dimension_id",
      "name": "Dimension Name",
      "lowEnd": "What the low end represents",
      "highEnd": "What the high end represents",
      "description": "What this dimension tracks"
    }
  ],
  "endings": [
    {
      "id": "ending_id",
      "title": "Ending Title",
      "dimensionPositions": { "dimension_id": 0.8 },
      "requirements": "What led to this ending",
      "epilogue": "The ending text",
      "classification": "good|neutral|bad|secret|bittersweet"
    }
  ]
}`;

    const userPrompt = `Generate endings for the story "${input.title}":

STORY CONTEXT:
${input.description}
Core Tension: ${input.coreTension}

VALUE CONFLICTS:
${input.valueConflicts.map(c => `${c.value1} vs ${c.value2}`).join('\n')}

INPUT ENDING DIMENSIONS:
${input.endingDimensions.map((d, i) => `${i + 1}. ${d.name}: ${d.lowEnd} ↔ ${d.highEnd}`).join('\n')}

Requirements:
1. Create 4-6 distinct endings based on dimension combinations
2. Each ending should feel like a natural consequence of choices
3. Include at least one "good", one "bad", and one "bittersweet" ending
4. Consider a "secret" ending for unusual dimension combinations
5. Epilogues should be 2-3 sentences

Generate the dimensions and endings JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 2500,
    });

    const parsed = this.parseJSON(response);
    return {
      endingDimensions: parsed.dimensions || [],
      endings: parsed.endings || [],
    };
  }

  /**
   * Enhance the core tension with internal conflict and stakes
   */
  private async enhanceCoreTension(input: StorySeedInput): Promise<GeneratedStorySeed['coreTension']> {
    const systemPrompt = `You are defining the central dramatic tension for an interactive narrative.
The core tension should drive every major decision in the story.

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text, explanation, or commentary before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {

Output ONLY valid JSON matching this structure:
{
  "description": "The main tension in 2-3 sentences",
  "internalConflict": "The protagonist's internal struggle",
  "stakes": "What happens if the player fails"
}`;

    const userPrompt = `Enhance the core tension for the story "${input.title}":

INPUT CORE TENSION:
${input.coreTension}

STORY CONTEXT:
${input.description}
Value Conflicts: ${input.valueConflicts.map(c => `${c.value1} vs ${c.value2}`).join(', ')}
Characters: ${input.characters.map(c => `${c.name} (${c.archetype})`).join(', ')}

Deepen the tension to:
1. Connect to the value conflicts
2. Make it personal through the protagonist's internal struggle
3. Establish clear stakes

Generate the enhanced core tension JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    return this.parseJSON(response);
  }
}
