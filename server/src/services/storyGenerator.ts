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
  minStoryNodes: 25,
  maxStoryNodes: 40,
  entryScenarios: 2,
  branchingFactor: 2, // Reduced from 3 to keep total nodes under 200
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

    // Fix any dead ends before validation
    console.log('[StoryGenerator] Fixing any dead ends in the graph...');
    this.fixDeadEnds(graph);

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

    // Step 4+: Generate branches for each anchor/transition node that needs choices
    const allNodes = [...skeleton.nodes];
    const allEdges = [...skeleton.edges];
    // Branch from anchor nodes and transition nodes (not from entry, merge, or ending nodes)
    const branchableNodes = skeleton.nodes.filter(n =>
      n.type === 'anchor' || n.type === 'transition' || n.type === 'story'
    );

    for (let i = 0; i < branchableNodes.length; i++) {
      const node = branchableNodes[i];
      const stepNum = 4 + i;

      yield {
        type: 'branch_start',
        branchIndex: i + 1,
        totalBranches: branchableNodes.length,
        sourceNode: node.id,
      };
      yield { type: 'step', step: stepNum, message: `Generating branches for "${node.title || node.id}"...` };

      try {
        const branchResult = await this.generateBranchForNode(
          input, characters, worldState, fullConfig,
          node, allNodes, allEdges
        );

        // Add new nodes and edges, renaming duplicates instead of dropping them
        for (const newNode of branchResult.nodes) {
          if (allNodes.find(n => n.id === newNode.id)) {
            // Rename duplicate node ID instead of dropping it
            const oldId = newNode.id;
            newNode.id = `${oldId}_b${i}`;
            // Update any edges that reference the old ID
            for (const edge of branchResult.edges) {
              if (edge.from === oldId) edge.from = newNode.id;
              if (edge.to === oldId) edge.to = newNode.id;
            }
            console.log(`[StoryGenerator] Renamed duplicate node "${oldId}" to "${newNode.id}"`);
          }
          allNodes.push(newNode);
          yield { type: 'node_generated', node: newNode };
        }
        for (const newEdge of branchResult.edges) {
          if (allEdges.find(e => e.id === newEdge.id)) {
            // Rename duplicate edge ID instead of dropping it
            const oldId = newEdge.id;
            newEdge.id = `${oldId}_b${i}`;
            console.log(`[StoryGenerator] Renamed duplicate edge "${oldId}" to "${newEdge.id}"`);
          }
          allEdges.push(newEdge);
          yield { type: 'edge_generated', edge: newEdge };
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

    // Fix any dead ends before validation
    console.log('[StoryGenerator] Fixing any dead ends in the streaming graph...');
    this.fixDeadEnds(graph);

    // Validate and add warnings
    graph.warnings = this.validateGraph(graph);

    yield { type: 'complete', graph };
    console.log(`[StoryGenerator] Streaming story generation complete: ${allNodes.length} nodes, ${allEdges.length} edges`);

    return graph;
  }

  /**
   * Generate the story skeleton using the new node architecture:
   * - Entry nodes: Starting scenarios
   * - Anchor nodes: Key moments all paths must go through
   * - Transition nodes: AI-generated connective tissue (placeholders for now)
   * - Merge nodes: Where multiple paths converge
   * - Ending nodes: Terminal outcomes
   */
  private async generateStorySkeleton(
    input: StoryCreationInput,
    characters: GeneratedCharacter[],
    worldState: GeneratedWorldState,
    config: GraphGenerationConfig
  ): Promise<{ nodes: GeneratedNode[]; edges: GeneratedEdge[] }> {
    const systemPrompt = `You are a master narrative designer creating the SKELETON of an interactive story.
Your goal is to create an EXTENDED narrative with many story beats, plot twists, and dramatic turns.

NODE TYPES:
1. ENTRY nodes: Starting scenarios where the player begins
2. ANCHOR nodes: Key story moments that ALL paths must go through (required=true) or most paths should visit (required=false)
3. TRANSITION nodes: AI-generated connective tissue between anchors (these will be expanded later)
4. MERGE nodes: Where multiple divergent paths converge back into one
5. ENDING nodes: Terminal outcomes

CRITICAL DESIGN PRINCIPLES:
1. Create an EXTENDED narrative arc with many ANCHOR nodes as key beats
2. Anchor nodes are REQUIRED checkpoints - all story paths must visit them
3. Use TRANSITION nodes between anchors for AI-generated content
4. Use MERGE nodes when branching paths need to reconverge
5. Entry nodes introduce the player to the world
6. Ending nodes conclude the story

STORY STRUCTURE - CREATE A LONG, ENGAGING JOURNEY:
- ACT 1 (Setup): 2-3 anchors establishing the world and conflict
- ACT 2A (Rising Action): 3-4 anchors with escalating challenges
- MIDPOINT TWIST: 1 anchor with a major revelation or reversal
- ACT 2B (Complications): 3-4 anchors where everything gets harder
- DARK MOMENT: 1 anchor where all seems lost
- ACT 3 (Resolution): 2-3 anchors leading to climax and ending

PLOT TWIST REQUIREMENTS:
- Include at least ONE major betrayal or revelation at the midpoint
- Include at least ONE false victory that leads to complications
- Include at least ONE "all is lost" moment before the climax
- Subvert expectations - allies may have hidden agendas, enemies may have sympathetic reasons

CRITICAL: NO DEAD ENDS ALLOWED!
- EVERY non-ending node MUST have at least one outgoing edge
- Entry nodes MUST connect to anchor or transition nodes
- Transition nodes MUST connect to anchors, merges, or endings
- Anchor nodes MUST connect to transitions, merges, or endings
- Merge nodes MUST connect to anchors or endings
- Create a COMPLETE PATH from every entry to at least one ending

CRITICAL RESPONSE FORMAT RULES:
1. Your ENTIRE response must be valid JSON - nothing else
2. Do NOT include any text before or after the JSON
3. Do NOT wrap the JSON in markdown code blocks
4. Start your response IMMEDIATELY with the opening brace {
5. Keep descriptions CONCISE (1-2 sentences max)

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
      "id": "anchor_1",
      "type": "anchor",
      "title": "Key Moment Title",
      "beat": "The dramatic moment",
      "description": "What happens",
      "significance": "Why this matters",
      "required": true,
      "orderHint": 1,
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    },
    {
      "id": "transition_1",
      "type": "transition",
      "description": "Connective scene description",
      "purpose": "bridge",
      "isGenerated": true,
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    },
    {
      "id": "merge_1",
      "type": "merge",
      "title": "Convergence Point",
      "description": "Where paths meet",
      "mergeStrategy": "acknowledge_differences",
      "canonicalContinuation": "What happens next",
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
      "to": "anchor_1",
      "choiceType": "action_type",
      "choiceHint": "What happens"
    }
  ]
}`;

    const userPrompt = `Create an EXTENDED SKELETON (main spine) for this story with many story beats and plot twists:

TITLE: ${input.title}
PLOT: ${input.plot}
${input.coreTension ? `CORE TENSION: ${input.coreTension}` : ''}
BEGINNING: ${input.beginningScenario}

ENDINGS NEEDED:
${input.endingScenarios.map(e => `- ${e.type.toUpperCase()}: ${e.description}`).join('\n')}

SETTING: ${input.worldSettings.setting}
MOOD: ${input.worldSettings.mood}
CHARACTERS: ${characters.map(c => `${c.name} (${c.id})`).join(', ')}

REQUIREMENTS FOR A LONG, ENGAGING STORY:
- Create ${config.entryScenarios} ENTRY node(s) as starting points
- Create 12-18 ANCHOR nodes following this structure:
  * ACT 1 (orderHint 1-3): Setup anchors - introduce world, characters, initial conflict
  * ACT 2A (orderHint 4-7): Rising action - escalating challenges, building stakes
  * MIDPOINT (orderHint 8): Major twist - betrayal, revelation, or dramatic reversal
  * ACT 2B (orderHint 9-12): Complications - consequences of midpoint, harder challenges
  * DARK MOMENT (orderHint 13): All seems lost - lowest point for protagonist
  * ACT 3 (orderHint 14-16): Resolution - climax and paths to endings
- Create 6-10 TRANSITION nodes as connective tissue between anchors
- Create 2-4 MERGE nodes where branching paths converge
- Create ${input.endingScenarios.length} ENDING nodes

PLOT TWIST REQUIREMENTS:
- At least ONE anchor should be a BETRAYAL or shocking revelation
- At least ONE anchor should be a FALSE VICTORY that leads to worse complications
- At least ONE anchor should be an "ALL IS LOST" moment
- Use REVELATION transitions to build mystery and uncover hidden truths
- Use ESCALATION transitions to raise stakes progressively

NODE SPECIFICATIONS:
- All ANCHOR nodes should have required=true and appropriate orderHint values (1-16+)
- TRANSITION nodes should have purpose: bridge/escalation/relief/revelation/preparation
- MERGE nodes should specify mergeStrategy: acknowledge_differences/common_ground/forced_unity

CRITICAL CONNECTIVITY REQUIREMENTS:
- EVERY entry node must have an edge to the first anchor or a transition
- EVERY anchor node must have edges leading to the next anchor, a transition, a merge, or an ending
- EVERY transition node must have an edge to an anchor, merge, or ending
- EVERY merge node must have an edge to the next anchor or an ending
- The LAST anchor (highest orderHint) must connect to endings
- NO NODE except endings should be a dead end!

Generate the extended skeleton JSON:`;

    const response = await this.aiService.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 6000, // Increased for longer stories with more nodes
    });

    return this.parseJSON(response);
  }

  /**
   * Generate branches and additional choices for a node
   * Creates choices that can lead to existing nodes or new transition/merge nodes
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
    // Reduced from 3 to 2 edges per node to keep total nodes under 200
    const edgesNeeded = 2 - existingOutgoingEdges.length;

    if (edgesNeeded <= 0) {
      return { nodes: [], edges: [] };
    }

    // Find potential target nodes (existing nodes this could connect to)
    const potentialTargets = existingNodes
      .filter(n => n.id !== sourceNode.id && n.type !== 'entry')
      .map(n => `${n.id} (${n.type}): ${n.title || n.description?.slice(0, 50)}`);

    const systemPrompt = `You are a narrative designer adding BRANCHING CHOICES to a story node.
Create meaningful choices that lead to different outcomes, with potential for PLOT TWISTS.

NODE TYPES YOU CAN CREATE:
1. TRANSITION nodes: Connective scenes between key moments (purpose: bridge/escalation/relief/revelation/preparation)
2. MERGE nodes: Where divergent paths reconverge (mergeStrategy: acknowledge_differences/common_ground/forced_unity)
3. BRANCH nodes: Conditional routing based on state (with conditions array)
4. STORY nodes: Legacy story beats (still supported)

CRITICAL DESIGN PRINCIPLES:
1. NO PERFECT CHOICES - Every option has trade-offs
2. Each choice should feel DISTINCT (not just different wording)
3. Choices can lead to existing nodes OR create new intermediate nodes
4. Include conflict, benefit, and cost for each choice
5. Use TRANSITION nodes for new intermediate content
6. Use MERGE nodes when paths need to converge

PLOT TWIST OPPORTUNITIES:
- Consider if a choice could lead to an unexpected REVELATION
- Could one path lead to a BETRAYAL by a trusted character?
- Could success on one path be a FALSE VICTORY with hidden costs?
- Could a difficult choice lead to an unexpected ally or enemy?
- Use "revelation" purpose transitions to uncover hidden truths

CRITICAL: NO DEAD ENDS!
- If you create a NEW node, it MUST have at least one outgoing edge
- New TRANSITION nodes must connect to an existing anchor, merge, or ending
- New MERGE nodes must connect to an existing anchor or ending
- PREFER connecting to EXISTING nodes (anchors, merges, endings) over creating new nodes
- Every new node you create MUST appear in BOTH the "nodes" array AND as a source in an "edges" entry

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
      "id": "transition_new_1",
      "type": "transition",
      "description": "What happens in this scene",
      "purpose": "bridge",
      "isGenerated": true,
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    },
    {
      "id": "merge_new_1",
      "type": "merge",
      "title": "Convergence Point",
      "description": "Where paths meet",
      "mergeStrategy": "acknowledge_differences",
      "canonicalContinuation": "What happens after merge",
      "characters": ["character_id"],
      "context": { "location": "Place", "mood": "tone" }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "from": "source_node_id",
      "to": "target_node_id",
      "choiceType": "agree|refuse|question|deflect|confront|comfort|investigate|leave|custom",
      "choiceHint": "What the player does",
      "conflict": "The dilemma",
      "benefit": "What you gain",
      "cost": "What you risk"
    }
  ]
}`;

    const userPrompt = `Add ${edgesNeeded} branching choice(s) to this node:

SOURCE NODE:
ID: ${sourceNode.id}
Type: ${sourceNode.type}
Title: ${sourceNode.title || 'Untitled'}
Description: ${sourceNode.description || sourceNode.beat || 'No description'}
${sourceNode.type === 'anchor' ? `Significance: ${sourceNode.significance || 'Key moment'}` : ''}
${sourceNode.type === 'transition' ? `Purpose: ${sourceNode.purpose || 'bridge'}` : ''}
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
- Create TRANSITION nodes for new intermediate content (use "revelation" purpose for plot twists)
- Create MERGE nodes when paths should converge
- Prefer connecting to existing anchor/merge/ending nodes when it makes narrative sense
- If creating new nodes, they should eventually connect to existing nodes
- Consider opportunities for PLOT TWISTS: betrayals, revelations, false victories

CRITICAL - NO DEAD ENDS:
- If you create ANY new nodes, you MUST also create edges FROM those new nodes TO existing nodes
- Example: If you create "transition_new_1", you MUST also create an edge from "transition_new_1" to an existing anchor/merge/ending
- Every node in your "nodes" array MUST have a corresponding outgoing edge in your "edges" array
- This is MANDATORY - stories with dead ends are broken!

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
    const systemPrompt = `You are a master narrative designer creating an EXTENDED interactive story graph.
Your goal is to create a LONG, compelling narrative with MANY story beats, PLOT TWISTS, and meaningful consequences.

CRITICAL DESIGN PRINCIPLES:
1. NO PERFECT CHOICES - Every option should have clear trade-offs
2. MORAL DILEMMAS - Put players in situations where doing "the right thing" has costs
3. TIME PRESSURE - Create urgency that forces imperfect decisions
4. COMPETING LOYALTIES - Helping one character should risk disappointing another
5. HIDDEN CONSEQUENCES - Some effects of choices should be delayed or unexpected
6. SACRIFICE - Sometimes the best outcomes require giving up something valuable
7. PLOT TWISTS - Include betrayals, revelations, and dramatic reversals
8. LONG JOURNEY - Create an extended story with multiple acts and many story beats

STORY STRUCTURE FOR EXTENDED NARRATIVES:
- ACT 1 (Setup, 3-5 nodes): Establish world, characters, initial conflict
- ACT 2A (Rising Action, 5-8 nodes): Escalating challenges, building stakes
- MIDPOINT TWIST (1-2 nodes): Major revelation, betrayal, or reversal
- ACT 2B (Complications, 5-8 nodes): Consequences of twist, harder challenges
- DARK MOMENT (1-2 nodes): All seems lost, lowest point
- ACT 3 (Resolution, 4-6 nodes): Climax and paths to various endings

REQUIRED PLOT TWIST TYPES (include at least one of each):
- BETRAYAL: A trusted ally reveals hidden agenda or switches sides
- FALSE VICTORY: Initial success that leads to worse complications
- REVELATION: Shocking truth that changes everything the player believed
- REVERSAL: A clear villain shows sympathetic motivations, or vice versa
- ALL IS LOST: Moment where the protagonist loses everything

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

    const userPrompt = `Create an EXTENDED narrative graph with MANY story beats and PLOT TWISTS:

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

REQUIREMENTS FOR EXTENDED STORY:
- Create ${config.entryScenarios} entry nodes (different starting points)
- Create ${config.minStoryNodes}-${config.maxStoryNodes} story nodes following this structure:
  * ACT 1 (3-5 nodes): Setup - introduce world, characters, and initial conflict
  * ACT 2A (5-8 nodes): Rising Action - escalating challenges, building stakes
  * MIDPOINT TWIST (1-2 nodes): Major betrayal, revelation, or dramatic reversal
  * ACT 2B (5-8 nodes): Complications - consequences of twist, everything gets harder
  * DARK MOMENT (1-2 nodes): All is lost - protagonist at their lowest point
  * ACT 3 (4-6 nodes): Resolution - climax and paths to various endings
- Create ${input.endingScenarios.length} ending nodes matching the user's endings
${config.includeBranchNodes ? '- Include 2-3 branch nodes for state-based automatic routing' : ''}
${config.includeConvergeNodes ? '- Include 2-4 converge nodes where different paths meet' : ''}
- Each story node should have exactly 2 outgoing edges (choices) to keep total nodes under 200
- EVERY CHOICE must have meaningful trade-offs documented in conflict/benefit/cost
- Conflict intensity: ${Math.round(config.conflictIntensity * 100)}% (higher = more agonizing choices)

REQUIRED PLOT TWISTS (mark these clearly in node descriptions):
- At least ONE "betrayal" node where a trusted character reveals hidden motives
- At least ONE "false_victory" node where initial success leads to complications
- At least ONE "revelation" node with a shocking truth that changes everything
- At least ONE "all_is_lost" node where the protagonist loses everything

CRITICAL - NO DEAD ENDS ALLOWED:
- EVERY entry node must have outgoing edges to story nodes
- EVERY story node must have exactly 2 outgoing edges leading to other story nodes or endings
- EVERY converge node must have outgoing edges to story nodes or endings
- The ONLY nodes without outgoing edges should be ENDING nodes
- Create a COMPLETE graph where every path eventually leads to an ending
- Before finishing, verify: for each non-ending node, there must be at least one edge with that node as "from"

REMEMBER: The player should feel the weight of every decision. Create a LONG journey with MANY twists before reaching the end.

Generate the complete extended graph JSON:`;

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
   * Fix dead ends in the graph by connecting orphaned nodes to appropriate targets
   * This ensures all non-ending nodes have at least one outgoing edge
   */
  private fixDeadEnds(graph: GeneratedGraph): void {
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    const endingNodes = graph.nodes.filter(n => n.type === 'ending');
    const branchNodes = new Set(graph.nodes.filter(n => n.type === 'branch').map(n => n.id));
    const anchorNodes = graph.nodes.filter(n => n.type === 'anchor').sort((a, b) => (a.orderHint ?? 0) - (b.orderHint ?? 0));
    const mergeNodes = graph.nodes.filter(n => n.type === 'merge');

    // Step 1: Remove edges referencing non-existent nodes (both 'from' and 'to')
    const validEdgesBefore = graph.edges.length;
    graph.edges = graph.edges.filter(edge => {
      if (!nodeIds.has(edge.from)) {
        console.log(`[StoryGenerator] fixDeadEnds: Removed edge "${edge.id}" with non-existent source "${edge.from}"`);
        return false;
      }
      if (!nodeIds.has(edge.to)) {
        console.log(`[StoryGenerator] fixDeadEnds: Removed edge "${edge.id}" with non-existent target "${edge.to}"`);
        return false;
      }
      return true;
    });
    if (graph.edges.length < validEdgesBefore) {
      console.log(`[StoryGenerator] fixDeadEnds: Removed ${validEdgesBefore - graph.edges.length} invalid edges`);
    }

    // Step 2: Build edge maps
    const outgoingEdgesMap = new Map<string, GeneratedEdge[]>();
    const incomingEdgesMap = new Map<string, GeneratedEdge[]>();
    for (const node of graph.nodes) {
      outgoingEdgesMap.set(node.id, []);
      incomingEdgesMap.set(node.id, []);
    }
    for (const edge of graph.edges) {
      outgoingEdgesMap.get(edge.from)?.push(edge);
      incomingEdgesMap.get(edge.to)?.push(edge);
    }

    // Step 3: Find and fix dead-end nodes (non-ending, non-branch nodes without outgoing edges)
    const deadEndNodes: GeneratedNode[] = [];
    for (const node of graph.nodes) {
      if (node.type === 'ending') continue;
      if (branchNodes.has(node.id)) continue;

      const outgoing = outgoingEdgesMap.get(node.id) ?? [];
      if (outgoing.length === 0) {
        deadEndNodes.push(node);
      }
    }

    if (deadEndNodes.length > 0) {
      console.log(`[StoryGenerator] fixDeadEnds: Found ${deadEndNodes.length} dead-end nodes, fixing...`);
    }

    // For each dead-end node, find an appropriate target and create an edge
    for (const deadEndNode of deadEndNodes) {
      const target = this.findBestTargetForNode(deadEndNode, graph.nodes, graph.edges, anchorNodes, mergeNodes, endingNodes);

      if (target) {
        const newEdge = this.createFixEdge(deadEndNode, target);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(deadEndNode.id)?.push(newEdge);
        incomingEdgesMap.get(target.id)?.push(newEdge);
        console.log(`[StoryGenerator] fixDeadEnds: Connected "${deadEndNode.id}" to "${target.id}"`);
      } else if (endingNodes.length > 0) {
        // Last resort: connect to the first available ending
        const endingTarget = endingNodes[0];
        const newEdge = this.createFixEdge(deadEndNode, endingTarget);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(deadEndNode.id)?.push(newEdge);
        incomingEdgesMap.get(endingTarget.id)?.push(newEdge);
        console.log(`[StoryGenerator] fixDeadEnds: Connected "${deadEndNode.id}" to ending "${endingTarget.id}" (fallback)`);
      } else {
        console.warn(`[StoryGenerator] fixDeadEnds: Could not find target for dead-end node "${deadEndNode.id}"`);
      }
    }

    // Step 4: Fix merge nodes that don't have enough incoming edges (need >= 2)
    this.fixMergeNodes(graph, outgoingEdgesMap, incomingEdgesMap);

    // Step 5: Ensure all endings are reachable from entry nodes
    this.ensureEndingsReachable(graph, outgoingEdgesMap, incomingEdgesMap);

    // Step 6: Connect orphan nodes (unreachable from any entry) into the graph
    this.fixOrphanNodes(graph, outgoingEdgesMap, incomingEdgesMap);

    // Step 7: Ensure no nodes are trapped in cycles with no exit to an ending
    this.fixCycleTraps(graph, outgoingEdgesMap, incomingEdgesMap);
  }

  /**
   * Fix merge nodes that lack the required multiple incoming edges.
   * Merge nodes should have >= 2 incoming edges; if they only have 1,
   * either connect nearby nodes to them or downgrade to transition nodes.
   */
  private fixMergeNodes(
    graph: GeneratedGraph,
    outgoingEdgesMap: Map<string, GeneratedEdge[]>,
    incomingEdgesMap: Map<string, GeneratedEdge[]>
  ): void {
    const mergeNodes = graph.nodes.filter(n => n.type === 'merge');

    for (const mergeNode of mergeNodes) {
      const incoming = incomingEdgesMap.get(mergeNode.id) ?? [];

      if (incoming.length >= 2) continue;

      console.log(`[StoryGenerator] fixMergeNodes: Merge node "${mergeNode.id}" has ${incoming.length} incoming edge(s), needs >= 2`);

      // Find candidate nodes that could connect to this merge node
      const incomingSourceIds = new Set(incoming.map(e => e.from));
      const outgoingTargetIds = new Set(
        (outgoingEdgesMap.get(mergeNode.id) ?? []).map(e => e.to)
      );

      // Look for nodes that are "nearby" in the graph - nodes that share
      // targets with the merge node's incoming sources, or nodes at a similar
      // story position (e.g., same anchor orderHint range)
      const candidates: GeneratedNode[] = [];
      for (const node of graph.nodes) {
        if (node.id === mergeNode.id) continue;
        if (node.type === 'ending' || node.type === 'entry') continue;
        if (incomingSourceIds.has(node.id)) continue;
        // Don't connect nodes that the merge already points to (would create cycle)
        if (outgoingTargetIds.has(node.id)) continue;

        // Check that the node has outgoing edges (and could spare one more)
        const nodeOutgoing = outgoingEdgesMap.get(node.id) ?? [];
        if (nodeOutgoing.length >= 1) {
          // Good candidate - this node already has paths forward
          // and adding an edge to the merge gives the merge more incoming
          candidates.push(node);
        }
      }

      // Prefer anchor/transition/story nodes that are near the merge's
      // incoming nodes in the story flow
      const incomingOrders = incoming
        .map(e => graph.nodes.find(n => n.id === e.from))
        .filter((n): n is GeneratedNode => n !== undefined)
        .map(n => n.orderHint ?? 0);
      const avgOrder = incomingOrders.length > 0
        ? incomingOrders.reduce((a, b) => a + b, 0) / incomingOrders.length
        : 0;

      // Sort candidates by proximity to the merge's position in the story
      candidates.sort((a, b) => {
        const aDist = Math.abs((a.orderHint ?? 0) - avgOrder);
        const bDist = Math.abs((b.orderHint ?? 0) - avgOrder);
        return aDist - bDist;
      });

      const edgesNeeded = 2 - incoming.length;
      let edgesAdded = 0;

      for (const candidate of candidates) {
        if (edgesAdded >= edgesNeeded) break;

        // Verify we won't create a direct 2-node cycle
        const candidateIncoming = incomingEdgesMap.get(candidate.id) ?? [];
        const wouldCreateCycle = candidateIncoming.some(e => e.from === mergeNode.id);
        if (wouldCreateCycle) continue;

        const newEdge = this.createFixEdge(candidate, mergeNode);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(candidate.id)?.push(newEdge);
        incomingEdgesMap.get(mergeNode.id)?.push(newEdge);
        edgesAdded++;
        console.log(`[StoryGenerator] fixMergeNodes: Added edge from "${candidate.id}" to merge "${mergeNode.id}"`);
      }

      // If we still couldn't get 2 incoming edges, downgrade merge to transition
      if ((incomingEdgesMap.get(mergeNode.id) ?? []).length < 2) {
        console.log(`[StoryGenerator] fixMergeNodes: Downgrading merge "${mergeNode.id}" to transition (couldn't find enough incoming sources)`);
        (mergeNode as any).type = 'transition';
        (mergeNode as any).purpose = 'bridge';
        (mergeNode as any).isGenerated = true;
      }
    }
  }

  /**
   * Fix orphan nodes that are unreachable from any entry node.
   * These nodes exist in the graph but no path from an entry leads to them.
   * Connect them by adding incoming edges from nearby reachable nodes.
   */
  private fixOrphanNodes(
    graph: GeneratedGraph,
    outgoingEdgesMap: Map<string, GeneratedEdge[]>,
    incomingEdgesMap: Map<string, GeneratedEdge[]>
  ): void {
    const entryNodes = graph.nodes.filter(n => n.type === 'entry');
    if (entryNodes.length === 0) return;

    // BFS forward from entries to find all reachable nodes
    const reachable = new Set<string>();
    const queue = entryNodes.map(n => n.id);
    for (const id of queue) reachable.add(id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of (outgoingEdgesMap.get(current) ?? [])) {
        if (!reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    // Find orphan nodes (non-entry, unreachable)
    const orphans = graph.nodes.filter(n => n.type !== 'entry' && !reachable.has(n.id));
    if (orphans.length === 0) {
      console.log('[StoryGenerator] fixOrphanNodes: No orphan nodes found');
      return;
    }

    console.log(`[StoryGenerator] fixOrphanNodes: ${orphans.length} orphan node(s) found, connecting...`);

    // Sort reachable non-ending nodes by orderHint descending to prefer connecting from later nodes
    const reachableNodes = graph.nodes
      .filter(n => n.type !== 'ending' && reachable.has(n.id))
      .sort((a, b) => (b.orderHint ?? 0) - (a.orderHint ?? 0));

    for (const orphan of orphans) {
      const orphanOrder = orphan.orderHint ?? this.estimateNodeOrder(orphan, graph.edges, graph.nodes);

      // Find the best reachable node to connect FROM → orphan
      // Prefer a node with a similar or slightly earlier orderHint
      let bestSource: GeneratedNode | null = null;
      let bestDist = Infinity;
      for (const candidate of reachableNodes) {
        const candidateOrder = candidate.orderHint ?? 0;
        // Prefer candidates slightly before the orphan (candidateOrder <= orphanOrder)
        if (candidateOrder <= orphanOrder) {
          const dist = orphanOrder - candidateOrder;
          if (dist < bestDist) {
            // Avoid creating 2-node cycle
            const candidateIncoming = (incomingEdgesMap.get(candidate.id) ?? []).map(e => e.from);
            if (!candidateIncoming.includes(orphan.id)) {
              bestDist = dist;
              bestSource = candidate;
            }
          }
        }
      }

      // Fallback: any reachable node
      if (!bestSource && reachableNodes.length > 0) {
        bestSource = reachableNodes[0];
      }

      if (bestSource) {
        const newEdge = this.createFixEdge(bestSource, orphan);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(bestSource.id)?.push(newEdge);
        incomingEdgesMap.get(orphan.id)?.push(newEdge);
        // Mark the orphan as now reachable so other orphans can connect to it
        reachable.add(orphan.id);
        reachableNodes.push(orphan);
        console.log(`[StoryGenerator] fixOrphanNodes: Connected "${bestSource.id}" → "${orphan.id}"`);
      } else {
        console.warn(`[StoryGenerator] fixOrphanNodes: Could not find source for orphan "${orphan.id}"`);
      }
    }
  }

  /**
   * Ensure all ending nodes are reachable from at least one entry node.
   * Uses reverse BFS from endings to check reachability, then connects
   * unreachable endings to late-stage nodes.
   */
  private ensureEndingsReachable(
    graph: GeneratedGraph,
    outgoingEdgesMap: Map<string, GeneratedEdge[]>,
    incomingEdgesMap: Map<string, GeneratedEdge[]>
  ): void {
    const entryNodes = graph.nodes.filter(n => n.type === 'entry');
    const endingNodes = graph.nodes.filter(n => n.type === 'ending');

    if (entryNodes.length === 0 || endingNodes.length === 0) return;

    // BFS forward from all entry nodes to find all reachable nodes
    const reachableFromEntry = new Set<string>();
    const queue = entryNodes.map(n => n.id);
    for (const id of queue) {
      reachableFromEntry.add(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = outgoingEdgesMap.get(current) ?? [];
      for (const edge of outgoing) {
        if (!reachableFromEntry.has(edge.to)) {
          reachableFromEntry.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    // Check which endings are unreachable
    const unreachableEndings = endingNodes.filter(e => !reachableFromEntry.has(e.id));

    if (unreachableEndings.length === 0) {
      console.log('[StoryGenerator] ensureEndingsReachable: All endings are reachable');
      return;
    }

    console.log(`[StoryGenerator] ensureEndingsReachable: ${unreachableEndings.length} ending(s) are unreachable, fixing...`);

    // Find late-stage nodes (reachable from entry, with high orderHint or near endings)
    const anchorNodes = graph.nodes
      .filter(n => n.type === 'anchor' && reachableFromEntry.has(n.id))
      .sort((a, b) => (b.orderHint ?? 0) - (a.orderHint ?? 0)); // Highest orderHint first

    const reachableNonEnding = graph.nodes.filter(
      n => n.type !== 'ending' && n.type !== 'entry' && reachableFromEntry.has(n.id)
    );

    for (const unreachableEnding of unreachableEndings) {
      // Check if the ending already has incoming edges (just from unreachable nodes)
      const existingIncoming = incomingEdgesMap.get(unreachableEnding.id) ?? [];
      const existingIncomingSources = new Set(existingIncoming.map(e => e.from));

      // Strategy 1: Connect a late-stage anchor to this ending
      let connected = false;
      for (const anchor of anchorNodes) {
        if (existingIncomingSources.has(anchor.id)) continue;

        const newEdge = this.createFixEdge(anchor, unreachableEnding);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(anchor.id)?.push(newEdge);
        incomingEdgesMap.get(unreachableEnding.id)?.push(newEdge);
        connected = true;
        console.log(`[StoryGenerator] ensureEndingsReachable: Connected anchor "${anchor.id}" to ending "${unreachableEnding.id}"`);
        break;
      }

      if (connected) continue;

      // Strategy 2: Connect any reachable non-ending node
      for (const node of reachableNonEnding) {
        if (existingIncomingSources.has(node.id)) continue;

        const newEdge = this.createFixEdge(node, unreachableEnding);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(node.id)?.push(newEdge);
        incomingEdgesMap.get(unreachableEnding.id)?.push(newEdge);
        console.log(`[StoryGenerator] ensureEndingsReachable: Connected "${node.id}" to ending "${unreachableEnding.id}" (fallback)`);
        break;
      }
    }
  }

  /**
   * Detect and fix nodes trapped in cycles with no exit path to an ending.
   * A node is "trapped" if following all its outgoing edges only leads back
   * to already-visited nodes (infinite loop).
   */
  private fixCycleTraps(
    graph: GeneratedGraph,
    outgoingEdgesMap: Map<string, GeneratedEdge[]>,
    incomingEdgesMap: Map<string, GeneratedEdge[]>
  ): void {
    const endingIds = new Set(graph.nodes.filter(n => n.type === 'ending').map(n => n.id));
    const endingNodes = graph.nodes.filter(n => n.type === 'ending');

    if (endingNodes.length === 0) return;

    // BFS backward from endings to find all nodes that can reach an ending
    const canReachEnding = new Set<string>(endingIds);
    const queue = [...endingIds];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const incoming = incomingEdgesMap.get(current) ?? [];
      for (const edge of incoming) {
        if (!canReachEnding.has(edge.from)) {
          canReachEnding.add(edge.from);
          queue.push(edge.from);
        }
      }
    }

    // Find nodes that exist but can't reach any ending
    const trappedNodes = graph.nodes.filter(
      n => n.type !== 'ending' && !canReachEnding.has(n.id)
    );

    if (trappedNodes.length === 0) {
      console.log('[StoryGenerator] fixCycleTraps: No cycle traps found');
      return;
    }

    console.log(`[StoryGenerator] fixCycleTraps: ${trappedNodes.length} node(s) cannot reach any ending, fixing...`);

    // For each trapped node, connect it to a FORWARD node that CAN reach an ending
    const reachableAnchors = graph.nodes
      .filter(n => n.type === 'anchor' && canReachEnding.has(n.id))
      .sort((a, b) => (a.orderHint ?? 0) - (b.orderHint ?? 0)); // ascending for forward search

    const exitNodes = graph.nodes.filter(
      n => n.type !== 'ending' && canReachEnding.has(n.id)
    );

    for (const trapped of trappedNodes) {
      const existingOutgoing = new Set(
        (outgoingEdgesMap.get(trapped.id) ?? []).map(e => e.to)
      );
      const trappedOrder = this.estimateNodeOrder(trapped, graph.edges, graph.nodes);

      // Strategy 1: Connect to a reachable FORWARD anchor (higher orderHint)
      let connected = false;
      const forwardAnchors = reachableAnchors.filter(a => (a.orderHint ?? 0) > trappedOrder);
      // Fall back to all reachable anchors (prefer later ones) if no forward anchors
      const candidateAnchors = forwardAnchors.length > 0
        ? forwardAnchors
        : [...reachableAnchors].sort((a, b) => (b.orderHint ?? 0) - (a.orderHint ?? 0));

      for (const anchor of candidateAnchors) {
        if (existingOutgoing.has(anchor.id)) continue;
        // Avoid creating 2-node cycle
        const anchorOutgoing = (outgoingEdgesMap.get(anchor.id) ?? []).map(e => e.to);
        if (anchorOutgoing.includes(trapped.id)) continue;

        const newEdge = this.createFixEdge(trapped, anchor);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(trapped.id)?.push(newEdge);
        incomingEdgesMap.get(anchor.id)?.push(newEdge);
        connected = true;
        console.log(`[StoryGenerator] fixCycleTraps: Connected trapped "${trapped.id}" to forward anchor "${anchor.id}"`);
        break;
      }

      if (connected) continue;

      // Strategy 2: Connect to a FORWARD node that can reach an ending
      // Sort exit nodes by orderHint, preferring those forward from the trapped node
      const sortedExits = [...exitNodes].sort((a, b) => {
        const aOrder = a.orderHint ?? 0;
        const bOrder = b.orderHint ?? 0;
        const aForward = aOrder > trappedOrder ? 0 : 1;
        const bForward = bOrder > trappedOrder ? 0 : 1;
        if (aForward !== bForward) return aForward - bForward; // forward first
        return aOrder - bOrder; // then by orderHint ascending
      });
      for (const exit of sortedExits) {
        if (existingOutgoing.has(exit.id)) continue;
        if (exit.id === trapped.id) continue;
        // Avoid creating 2-node cycle
        const exitOutgoing = (outgoingEdgesMap.get(exit.id) ?? []).map(e => e.to);
        if (exitOutgoing.includes(trapped.id)) continue;

        const newEdge = this.createFixEdge(trapped, exit);
        graph.edges.push(newEdge);
        outgoingEdgesMap.get(trapped.id)?.push(newEdge);
        incomingEdgesMap.get(exit.id)?.push(newEdge);
        connected = true;
        console.log(`[StoryGenerator] fixCycleTraps: Connected trapped "${trapped.id}" to "${exit.id}"`);
        break;
      }

      if (connected) continue;

      // Strategy 3: Last resort - connect directly to an ending
      if (endingNodes.length > 0) {
        const ending = endingNodes[0];
        if (!existingOutgoing.has(ending.id)) {
          const newEdge = this.createFixEdge(trapped, ending);
          graph.edges.push(newEdge);
          outgoingEdgesMap.get(trapped.id)?.push(newEdge);
          incomingEdgesMap.get(ending.id)?.push(newEdge);
          console.log(`[StoryGenerator] fixCycleTraps: Connected trapped "${trapped.id}" directly to ending "${ending.id}"`);
        }
      }
    }
  }

  /**
   * Create a fix edge between two nodes with valid choiceType and contextual hints
   */
  private createFixEdge(source: GeneratedNode, target: GeneratedNode): GeneratedEdge {
    const edgeId = `edge_fix_${source.id}_to_${target.id}_${Date.now().toString(36)}`;
    return {
      id: edgeId,
      from: source.id,
      to: target.id,
      choiceType: 'custom',
      choiceHint: this.generateContinueHint(source, target),
      conflict: 'The path forward is uncertain',
      benefit: 'Progress in the story',
      cost: 'Unknown consequences',
    };
  }

  /**
   * Find the best target node for a dead-end node based on story structure.
   * Avoids creating 2-node cycles by checking both incoming and outgoing connections.
   */
  private findBestTargetForNode(
    sourceNode: GeneratedNode,
    allNodes: GeneratedNode[],
    allEdges: GeneratedEdge[],
    anchorNodes: GeneratedNode[],
    mergeNodes: GeneratedNode[],
    endingNodes: GeneratedNode[]
  ): GeneratedNode | null {
    // Build sets of nodes already connected from/to source
    const sourceOutgoing = new Set(allEdges.filter(e => e.from === sourceNode.id).map(e => e.to));
    const sourceIncoming = new Set(allEdges.filter(e => e.to === sourceNode.id).map(e => e.from));

    // Helper: check if connecting source → target would create a 2-node cycle
    const wouldCreateCycle = (targetId: string): boolean => {
      return sourceIncoming.has(targetId) && !sourceOutgoing.has(targetId);
    };

    // Strategy 1: For transition nodes, connect to a FORWARD anchor or merge.
    // Estimate the transition's position from its incoming edges' source orderHints.
    if (sourceNode.type === 'transition') {
      const sourceOrder = this.estimateNodeOrder(sourceNode, allEdges, allNodes);
      // Pick the nearest forward anchor (higher orderHint than source)
      const forwardAnchors = anchorNodes
        .filter(a => (a.orderHint ?? 0) > sourceOrder && !sourceOutgoing.has(a.id) && !wouldCreateCycle(a.id) && a.id !== sourceNode.id);
      if (forwardAnchors.length > 0) {
        return forwardAnchors[0]; // Already sorted ascending, first is nearest forward
      }
      for (const merge of mergeNodes) {
        if (!sourceOutgoing.has(merge.id) && !wouldCreateCycle(merge.id) && merge.id !== sourceNode.id) {
          return merge;
        }
      }
      // Last resort for transitions: any anchor (even backward) is better than nothing,
      // but prefer endings over going backward
      if (endingNodes.length > 0) {
        return endingNodes[0];
      }
    }

    // Strategy 2: For anchor nodes, connect to next anchor by orderHint, avoiding cycles
    if (sourceNode.type === 'anchor') {
      const currentOrder = sourceNode.orderHint ?? 0;
      for (const anchor of anchorNodes) {
        const anchorOrder = anchor.orderHint ?? 0;
        if (anchorOrder > currentOrder && !sourceOutgoing.has(anchor.id) && !wouldCreateCycle(anchor.id) && anchor.id !== sourceNode.id) {
          return anchor;
        }
      }
      for (const merge of mergeNodes) {
        if (!sourceOutgoing.has(merge.id) && !wouldCreateCycle(merge.id) && merge.id !== sourceNode.id) {
          return merge;
        }
      }
      const transitionNodes = allNodes.filter(n => n.type === 'transition');
      for (const transition of transitionNodes) {
        if (!sourceOutgoing.has(transition.id) && !wouldCreateCycle(transition.id) && transition.id !== sourceNode.id) {
          return transition;
        }
      }
    }

    // Strategy 3: For entry nodes, connect to first anchor or transition
    if (sourceNode.type === 'entry') {
      if (anchorNodes.length > 0) {
        return anchorNodes[0];
      }
      const transitionNodes = allNodes.filter(n => n.type === 'transition');
      if (transitionNodes.length > 0) {
        return transitionNodes[0];
      }
    }

    // Strategy 4: For merge nodes, connect to next anchor or ending (avoiding cycles)
    if (sourceNode.type === 'merge') {
      for (const anchor of anchorNodes) {
        if (!sourceOutgoing.has(anchor.id) && !wouldCreateCycle(anchor.id) && anchor.id !== sourceNode.id) {
          return anchor;
        }
      }
      if (endingNodes.length > 0) {
        return endingNodes[0];
      }
    }

    // Strategy 5: For story/converge nodes, connect to any forward node
    if (sourceNode.type === 'story' || sourceNode.type === 'converge') {
      for (const anchor of anchorNodes) {
        if (!sourceOutgoing.has(anchor.id) && !wouldCreateCycle(anchor.id) && anchor.id !== sourceNode.id) {
          return anchor;
        }
      }
      for (const merge of mergeNodes) {
        if (!sourceOutgoing.has(merge.id) && !wouldCreateCycle(merge.id) && merge.id !== sourceNode.id) {
          return merge;
        }
      }
    }

    // Fallback: Return first ending (endings can't create cycles since they have no outgoing)
    if (endingNodes.length > 0) {
      return endingNodes[0];
    }

    return null;
  }

  /**
   * Estimate a node's position in the story based on its orderHint or
   * the orderHints of its incoming edge sources.
   */
  private estimateNodeOrder(
    node: GeneratedNode,
    allEdges: GeneratedEdge[],
    allNodes: GeneratedNode[]
  ): number {
    if (node.orderHint !== undefined) return node.orderHint;
    // For nodes without orderHint, estimate from incoming edges
    const incomingSources = allEdges
      .filter(e => e.to === node.id)
      .map(e => allNodes.find(n => n.id === e.from))
      .filter((n): n is GeneratedNode => n !== undefined);
    if (incomingSources.length > 0) {
      const orders = incomingSources.map(n => n.orderHint ?? 0);
      return Math.max(...orders);
    }
    return 0;
  }

  /**
   * Generate a contextual hint for continue edges
   */
  private generateContinueHint(source: GeneratedNode, target: GeneratedNode): string {
    if (target.type === 'ending') {
      return 'See how the story ends';
    }
    if (target.type === 'anchor') {
      return `Move toward ${target.title || 'the next key moment'}`;
    }
    if (target.type === 'merge') {
      return 'Continue forward';
    }
    if (target.type === 'transition') {
      return 'See what happens next';
    }
    return 'Continue the story';
  }

  /**
   * Validate graph structure for all node types
   */
  private validateGraph(graph: GeneratedGraph): string[] {
    const warnings: string[] = [];
    const nodeIds = new Set(graph.nodes.map(n => n.id));

    // Check for orphan nodes - start from entry nodes or anchor nodes if no entries
    const entryNodes = graph.nodes.filter(n => n.type === 'entry');
    const anchorNodes = graph.nodes.filter(n => n.type === 'anchor');
    const endingNodes = graph.nodes.filter(n => n.type === 'ending');
    const startNodes = entryNodes.length > 0 ? entryNodes : anchorNodes;
    const reachableNodes = new Set(startNodes.map(n => n.id));

    // BFS forward to find all reachable nodes
    const queue = [...startNodes.map(n => n.id)];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = graph.edges.filter(e => e.from === current);
      for (const edge of outgoing) {
        if (!reachableNodes.has(edge.to) && nodeIds.has(edge.to)) {
          reachableNodes.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    const orphans = graph.nodes.filter(n => !reachableNodes.has(n.id));
    if (orphans.length > 0) {
      warnings.push(`Unreachable nodes: ${orphans.map(n => n.id).join(', ')}`);
    }

    // Check for dead ends (nodes that should have outgoing edges but don't)
    const endings = new Set(endingNodes.map(n => n.id));
    const branches = new Set(graph.nodes.filter(n => n.type === 'branch').map(n => n.id));

    for (const node of graph.nodes) {
      if (endings.has(node.id)) continue;
      if (branches.has(node.id)) continue;

      const outgoing = graph.edges.filter(e => e.from === node.id);
      if (outgoing.length === 0) {
        warnings.push(`Dead end: ${node.id} (${node.type}) has no outgoing edges`);
      } else if (outgoing.length < 2 && (node.type === 'story' || node.type === 'anchor')) {
        warnings.push(`${node.id} has only ${outgoing.length} choices (recommend 2)`);
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

    // Check for at least one starting point and one ending
    if (entryNodes.length === 0 && anchorNodes.length === 0) {
      warnings.push('No entry or anchor nodes defined - story has no starting point');
    }
    if (endingNodes.length === 0) {
      warnings.push('No ending nodes defined');
    }

    // Check ending reachability
    for (const ending of endingNodes) {
      if (!reachableNodes.has(ending.id)) {
        warnings.push(`Ending "${ending.id}" is not reachable from any entry node`);
      }
    }

    // Check for nodes trapped in cycles (can't reach any ending)
    if (endingNodes.length > 0) {
      const canReachEnding = new Set<string>(endings);
      const reverseQueue = [...endings];
      while (reverseQueue.length > 0) {
        const current = reverseQueue.shift()!;
        const incoming = graph.edges.filter(e => e.to === current);
        for (const edge of incoming) {
          if (!canReachEnding.has(edge.from) && nodeIds.has(edge.from)) {
            canReachEnding.add(edge.from);
            reverseQueue.push(edge.from);
          }
        }
      }

      for (const node of graph.nodes) {
        if (node.type !== 'ending' && reachableNodes.has(node.id) && !canReachEnding.has(node.id)) {
          warnings.push(`Node "${node.id}" is reachable but trapped in a cycle (cannot reach any ending)`);
        }
      }
    }

    // Check anchor node ordering (should have orderHint set)
    const requiredAnchors = anchorNodes.filter(n => n.required);
    const anchorsWithoutOrder = requiredAnchors.filter(n => n.orderHint === undefined);
    if (anchorsWithoutOrder.length > 0) {
      warnings.push(`Required anchor nodes without orderHint: ${anchorsWithoutOrder.map(n => n.id).join(', ')}`);
    }

    // Check merge nodes have incoming edges from multiple sources
    const mergeNodes = graph.nodes.filter(n => n.type === 'merge');
    for (const merge of mergeNodes) {
      const incomingEdges = graph.edges.filter(e => e.to === merge.id);
      if (incomingEdges.length < 2) {
        warnings.push(`Merge node ${merge.id} has only ${incomingEdges.length} incoming edge(s) (expected 2+)`);
      }
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
