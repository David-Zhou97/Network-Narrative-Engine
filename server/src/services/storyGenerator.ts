/**
 * Story Graph Generator Service
 * Uses AI to generate narrative graphs from user input
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

const DEFAULT_CONFIG: GraphGenerationConfig = {
  minStoryNodes: 8,
  maxStoryNodes: 15,
  entryScenarios: 2,
  branchingFactor: 3,
  conflictIntensity: 0.8,
  includeBranchNodes: true,
  includeConvergeNodes: true,
};

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

    // Generate characters first
    const characters = await this.generateCharacters(input);

    // Generate world state
    const worldState = await this.generateWorldState(input, characters);

    // Generate the narrative graph structure
    const { nodes, edges } = await this.generateGraphStructure(input, characters, worldState, fullConfig);

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

    return graph;
  }

  /**
   * Generate characters based on user input
   */
  private async generateCharacters(input: StoryCreationInput): Promise<GeneratedCharacter[]> {
    const systemPrompt = `You are a narrative designer creating characters for an interactive story.
Generate detailed character definitions based on the user's input.
CRITICAL: Characters must have clear motivations that can create CONFLICT with the player's goals.
Each character should have secrets, flaws, and competing interests.

Output ONLY valid JSON matching this structure:
{
  "characters": [
    {
      "id": "character_id_snake_case",
      "name": "Full Name",
      "description": "Physical and role description",
      "personality": "Detailed personality that drives conflict",
      "traits": ["trait1", "trait2", "trait3", "trait4"],
      "initialRelationship": number between -100 and 100
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

Output ONLY valid JSON matching this structure:
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

Output ONLY valid JSON matching this structure:
{
  "nodes": [
    {
      "id": "node_id",
      "type": "entry|story|branch|converge|ending",
      "description": "Scene description",
      "title": "For entry/ending nodes",
      "preview": "For entry nodes",
      "beat": "For story nodes - the key moment",
      "endingType": "good|neutral|bad|secret - for endings",
      "epilogue": "For ending nodes",
      "characters": ["character_id"],
      "context": {
        "location": "Where this happens",
        "mood": "emotional tone",
        "timeOfDay": "time"
      },
      "onEnter": [
        { "type": "set|add|subtract", "target": "flags.example", "value": true }
      ],
      "conditions": [
        {
          "targetNodeId": "ending_id",
          "conditions": [
            { "type": "flag", "target": "example", "operator": "==", "value": true }
          ],
          "isDefault": false
        }
      ]
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "from": "source_node",
      "to": "target_node",
      "choiceType": "agree|refuse|question|deflect|confront|comfort|investigate|leave",
      "choiceHint": "What the player says/does",
      "conflict": "What makes this choice hard",
      "benefit": "What you gain",
      "cost": "What you risk/lose",
      "conditions": [],
      "effects": [
        { "type": "add", "target": "character.name.relationship", "value": 10 }
      ],
      "priority": 1
    }
  ]
}`;

    const userPrompt = `Create a narrative graph for:

TITLE: ${input.title}
PLOT: ${input.plot}

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
Output ONLY valid JSON for a single node.`;

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
Output ONLY valid JSON for a single edge.`;

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
   * Parse JSON from AI response, handling markdown code blocks
   */
  private parseJSON(response: string): any {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', cleaned.slice(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}
