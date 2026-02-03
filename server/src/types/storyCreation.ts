/**
 * Types for AI-powered story creation and graph generation
 * (Duplicated from src/types/storyCreation.ts for server use)
 */

/**
 * User input for creating a new story
 */
export interface StoryCreationInput {
  /** General plot summary */
  plot: string;
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

export interface GeneratedNode {
  id: string;
  type: 'entry' | 'story' | 'branch' | 'converge' | 'ending';
  description: string;
  /** For entry nodes */
  title?: string;
  preview?: string;
  /** For story nodes */
  beat?: string;
  /** For ending nodes */
  endingType?: 'good' | 'neutral' | 'bad' | 'secret';
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
