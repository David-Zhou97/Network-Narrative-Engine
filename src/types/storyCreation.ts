/**
 * Types for AI-powered story creation and graph generation
 */

/**
 * User input for creating a new story
 */
export interface StoryCreationInput {
  /** General plot summary */
  plot: string;
  /** Core tension - the central dramatic conflict that drives hard choices */
  coreTension?: string;
  /** The beginning scenario - how the story starts */
  beginningScenario: string;
  /** Multiple possible endings for the story */
  endingScenarios: EndingScenarioInput[];
  /** World settings and atmosphere */
  worldSettings: WorldSettingsInput;
  /** Key characters in the story */
  characters: CharacterInput[];
  /** Genre/theme tags */
  tags: string[];
  /** Story title */
  title: string;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'challenging';
  /** Estimated playtime in minutes */
  estimatedMinutes: number;
}

export interface EndingScenarioInput {
  /** Type of ending */
  type: 'good' | 'neutral' | 'bad' | 'secret';
  /** Brief description of how to reach this ending */
  description: string;
  /** What conditions should lead here */
  conditions?: string;
}

export interface WorldSettingsInput {
  /** Physical setting (city, fantasy realm, spaceship, etc.) */
  setting: string;
  /** Time period or era */
  timePeriod: string;
  /** Overall mood/tone */
  mood: string;
  /** Key themes to explore */
  themes: string[];
  /** Special rules or mechanics of this world */
  specialRules?: string;
}

export interface CharacterInput {
  /** Character name */
  name: string;
  /** Brief description */
  description: string;
  /** Personality traits */
  personality: string;
  /** Role in the story (protagonist, antagonist, ally, etc.) */
  role: 'protagonist' | 'antagonist' | 'ally' | 'neutral' | 'wildcard';
  /** Initial relationship with player (-100 to 100) */
  initialRelationship?: number;
}

/**
 * Configuration for graph generation
 */
export interface GraphGenerationConfig {
  /** Minimum number of story nodes */
  minStoryNodes: number;
  /** Maximum number of story nodes */
  maxStoryNodes: number;
  /** Number of entry scenarios to generate */
  entryScenarios: number;
  /** Branching factor (choices per node, typically 3) */
  branchingFactor: number;
  /** How much to emphasize conflicts (0-1) */
  conflictIntensity: number;
  /** Whether to include branch nodes for state-based routing */
  includeBranchNodes: boolean;
  /** Whether to include converge nodes to merge paths */
  includeConvergeNodes: boolean;
}

export const DEFAULT_GRAPH_CONFIG: GraphGenerationConfig = {
  minStoryNodes: 8,
  maxStoryNodes: 15,
  entryScenarios: 2,
  branchingFactor: 3,
  conflictIntensity: 0.8, // High conflict by default
  includeBranchNodes: true,
  includeConvergeNodes: true,
};

/**
 * Result from AI graph generation
 */
export interface GeneratedGraph {
  /** Story metadata */
  metadata: {
    id: string;
    title: string;
    description: string;
    author: string;
    version: string;
    tags: string[];
  };
  /** Generated characters */
  characters: GeneratedCharacter[];
  /** World state definition */
  worldState: GeneratedWorldState;
  /** All nodes in the graph */
  nodes: GeneratedNode[];
  /** All edges (choices) in the graph */
  edges: GeneratedEdge[];
  /** Validation warnings */
  warnings?: string[];
}

export interface GeneratedCharacter {
  id: string;
  name: string;
  description: string;
  personality: string;
  traits: string[];
  initialRelationship: number;
}

export interface GeneratedWorldState {
  player: Record<string, {
    type: 'number' | 'boolean' | 'string';
    default: number | boolean | string;
    description: string;
    min?: number;
    max?: number;
  }>;
  flags: Record<string, {
    type: 'boolean';
    default: boolean;
    description: string;
  }>;
  resources: Record<string, {
    type: 'number';
    default: number;
    description: string;
    min?: number;
    max?: number;
  }>;
}

/**
 * Node types in the narrative graph:
 * - entry: Starting scenarios (where player begins)
 * - story: Main narrative beats (legacy, still supported)
 * - branch: Conditional routing based on state
 * - converge: Legacy path merger (still supported)
 * - ending: Terminal outcomes
 * - anchor: Key story moments that all paths must go through
 * - transition: AI-generated connective tissue between nodes
 * - merge: Path convergence points where multiple paths become one
 */
export type GeneratedNodeType = 'entry' | 'story' | 'branch' | 'converge' | 'ending' | 'anchor' | 'transition' | 'merge';

export interface GeneratedNode {
  id: string;
  type: GeneratedNodeType;
  description: string;
  /** For entry and anchor nodes */
  title?: string;
  /** For entry nodes */
  preview?: string;
  /** For story and anchor nodes */
  beat?: string;
  /** For ending nodes */
  endingType?: 'good' | 'neutral' | 'bad' | 'secret' | 'bittersweet';
  epilogue?: string;
  /** Characters present */
  characters?: string[];
  /** Scene context */
  context?: {
    location: string;
    mood: string;
    timeOfDay?: string;
  };
  /** State changes on enter */
  onEnter?: Array<{
    type: 'set' | 'add' | 'subtract';
    target: string;
    value: number | boolean | string;
  }>;
  /** For branch nodes - conditions */
  conditions?: Array<{
    targetNodeId: string;
    conditions: Array<{
      type: 'state' | 'relationship' | 'flag' | 'resource';
      target: string;
      operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
      value: number | boolean | string;
    }>;
    isDefault?: boolean;
  }>;
  /** Position for visualization (added by frontend) */
  position?: { x: number; y: number };

  // ============================================================================
  // Anchor Node Properties
  // ============================================================================
  /** Why this moment matters to the story (for anchor nodes) */
  significance?: string;
  /** Whether this anchor is required or optional */
  required?: boolean;
  /** Order hint for when this should occur (lower = earlier) */
  orderHint?: number;

  // ============================================================================
  // Transition Node Properties
  // ============================================================================
  /** The purpose of this transition */
  purpose?: 'bridge' | 'escalation' | 'relief' | 'revelation' | 'preparation';
  /** What value conflict is being explored */
  activeConflict?: string;
  /** Whether this was AI-generated */
  isGenerated?: boolean;
  /** Context for regeneration */
  generationContext?: {
    fromAnchorId?: string;
    toAnchorId?: string;
    playerChoicesInfluence?: string[];
  };

  // ============================================================================
  // Merge Node Properties
  // ============================================================================
  /** How different paths are reconciled (for merge nodes) */
  mergeStrategy?: 'acknowledge_differences' | 'common_ground' | 'forced_unity';
  /** Text variations based on incoming path */
  pathVariations?: Record<string, string>;
  /** The canonical continuation after merge */
  canonicalContinuation?: string;
}

export interface GeneratedEdge {
  id: string;
  from: string;
  to: string;
  choiceType: 'agree' | 'refuse' | 'question' | 'deflect' | 'confront' | 'comfort' | 'investigate' | 'leave' | 'custom';
  choiceHint: string;
  /** Dilemma/conflict description - what makes this choice hard */
  conflict?: string;
  /** What you gain by choosing this */
  benefit?: string;
  /** What you lose/risk by choosing this */
  cost?: string;
  conditions?: Array<{
    type: 'state' | 'relationship' | 'flag' | 'resource';
    target: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
    value: number | boolean | string;
  }>;
  effects?: Array<{
    type: 'set' | 'add' | 'subtract';
    target: string;
    value: number | boolean | string;
  }>;
  priority?: number;
}

/**
 * Story draft being edited (includes position data for visualization)
 */
export interface StoryDraft {
  input: StoryCreationInput;
  config: GraphGenerationConfig;
  generatedGraph: GeneratedGraph | null;
  status: 'input' | 'generating' | 'editing' | 'ready';
  createdAt: number;
  updatedAt: number;
}

/**
 * Request to generate a story graph
 */
export interface StoryGenerationRequest {
  input: StoryCreationInput;
  config?: Partial<GraphGenerationConfig>;
}

/**
 * Response from story generation
 */
export interface StoryGenerationResponse {
  success: boolean;
  graph?: GeneratedGraph;
  error?: string;
  warnings?: string[];
}

/**
 * Request to regenerate part of a story
 */
export interface RegenerateRequest {
  /** Type of element to regenerate */
  type: 'node' | 'edge' | 'character' | 'worldState';
  /** ID of element to regenerate (if applicable) */
  elementId?: string;
  /** Context from surrounding elements */
  context: {
    graph: GeneratedGraph;
    instructions?: string;
  };
}

/**
 * User-created story ready for publishing
 */
export interface PublishableStory {
  /** The complete narrative definition */
  narrative: GeneratedGraph;
  /** Thumbnail (SVG or data URL) */
  thumbnail?: string;
  /** Short description for cards */
  shortDescription: string;
  /** Whether this is featured */
  featured?: boolean;
}

/**
 * Convert a GeneratedGraph to a NarrativeDefinition format
 * for use with the game engine
 */
export function graphToNarrativeDefinition(graph: GeneratedGraph): unknown {
  return {
    metadata: graph.metadata,
    characters: graph.characters.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      personality: c.personality,
      traits: c.traits,
      initialRelationship: c.initialRelationship,
    })),
    worldState: graph.worldState,
    nodes: graph.nodes.map(n => {
      const base = {
        id: n.id,
        type: n.type,
        description: n.description,
        characters: n.characters,
        context: n.context,
        onEnter: n.onEnter,
      };

      switch (n.type) {
        case 'entry':
          return { ...base, title: n.title, preview: n.preview };

        case 'story':
          return { ...base, beat: n.beat };

        case 'ending':
          return { ...base, title: n.title, endingType: n.endingType, epilogue: n.epilogue };

        case 'branch':
          return { ...base, conditions: n.conditions };

        case 'anchor':
          return {
            ...base,
            title: n.title,
            beat: n.beat,
            significance: n.significance,
            required: n.required ?? true,
            orderHint: n.orderHint,
          };

        case 'transition':
          return {
            ...base,
            purpose: n.purpose ?? 'bridge',
            activeConflict: n.activeConflict,
            isGenerated: n.isGenerated ?? true,
            generationContext: n.generationContext,
          };

        case 'merge':
          return {
            ...base,
            title: n.title,
            mergeStrategy: n.mergeStrategy ?? 'acknowledge_differences',
            pathVariations: n.pathVariations,
            canonicalContinuation: n.canonicalContinuation,
          };

        case 'converge':
        default:
          return base;
      }
    }),
    edges: graph.edges.map(e => ({
      id: e.id,
      from: e.from,
      to: e.to,
      choiceType: e.choiceType,
      choiceHint: e.choiceHint,
      conditions: e.conditions,
      effects: e.effects,
      priority: e.priority,
    })),
  };
}
