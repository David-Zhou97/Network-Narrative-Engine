/**
 * Core type definitions for the Network Narrative Engine
 */

// ============================================================================
// Narrative Metadata
// ============================================================================

export interface NarrativeMetadata {
  id: string;
  title: string;
  description: string;
  author?: string;
  version?: string;
  tags?: string[];
}

// ============================================================================
// Characters
// ============================================================================

export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  /** Key traits that influence dialogue generation */
  traits: string[];
  /** Initial relationship value with player (-100 to 100) */
  initialRelationship?: number;
  /** Character-specific state variables */
  initialState?: Record<string, unknown>;
}

export interface CharacterInstance {
  character: Character;
  relationship: number;
  state: Record<string, unknown>;
  /** Whether character is present in current scene */
  present: boolean;
}

// ============================================================================
// World State
// ============================================================================

export interface WorldStateDefinition {
  /** Player attributes */
  player: Record<string, StateVariable>;
  /** Global story flags */
  flags: Record<string, StateVariable>;
  /** Resource counters */
  resources?: Record<string, StateVariable>;
}

export interface StateVariable {
  type: 'number' | 'boolean' | 'string';
  default: number | boolean | string;
  description?: string;
  min?: number;
  max?: number;
}

export interface WorldState {
  player: Record<string, number | boolean | string>;
  flags: Record<string, boolean>;
  resources: Record<string, number>;
  characters: Record<string, CharacterInstance>;
  currentNodeId: string;
  turnCount: number;
  history: HistoryEntry[];
}

export interface HistoryEntry {
  nodeId: string;
  choiceIndex: number;
  choiceText: string;
  timestamp: number;
}

// ============================================================================
// Narrative Graph - Nodes
// ============================================================================

export type NodeType = 'entry' | 'story' | 'branch' | 'converge' | 'ending';

export interface BaseNode {
  id: string;
  type: NodeType;
  /** Scene description for AI context */
  description: string;
  /** Characters present in this scene */
  characters?: string[];
  /** Ambient context (location, mood, time) */
  context?: SceneContext;
  /** State modifications when entering this node */
  onEnter?: StateModification[];
}

export interface SceneContext {
  location: string;
  mood?: string;
  timeOfDay?: string;
  weather?: string;
  custom?: Record<string, string>;
}

export interface EntryNode extends BaseNode {
  type: 'entry';
  /** Display title for scenario selection */
  title: string;
  /** Preview text for scenario selection */
  preview: string;
}

export interface StoryNode extends BaseNode {
  type: 'story';
  /** Narrative beat or key moment description */
  beat: string;
  /** Optional scripted dialogue (AI will expand) */
  dialogue?: ScriptedDialogue[];
}

export interface BranchNode extends BaseNode {
  type: 'branch';
  /** Conditions evaluated to determine automatic transition */
  conditions: BranchCondition[];
}

export interface ConvergeNode extends BaseNode {
  type: 'converge';
  /** How to handle different incoming paths */
  mergeStrategy?: 'first' | 'accumulate' | 'custom';
}

export interface EndingNode extends BaseNode {
  type: 'ending';
  /** Ending classification */
  endingType: 'good' | 'neutral' | 'bad' | 'secret';
  /** Title for this ending */
  title: string;
  /** Epilogue text */
  epilogue: string;
  /** Conditions that led to this ending (for analytics) */
  achievementConditions?: string[];
}

export type NarrativeNode = EntryNode | StoryNode | BranchNode | ConvergeNode | EndingNode;

// ============================================================================
// Narrative Graph - Edges
// ============================================================================

export interface Edge {
  id: string;
  from: string;
  to: string;
  /** Choice archetype that guides AI generation */
  choiceType: ChoiceType;
  /** Author hint for AI dialogue generation */
  choiceHint: string;
  /** Conditions required to make this choice available */
  conditions?: EdgeCondition[];
  /** State modifications when traversing this edge */
  effects?: StateModification[];
  /** Priority for choice ordering (higher = first) */
  priority?: number;
}

export type ChoiceType =
  | 'agree'      // Positive, cooperative
  | 'refuse'     // Negative, resistant
  | 'question'   // Seek more information
  | 'deflect'    // Change subject, avoid
  | 'confront'   // Direct, aggressive
  | 'comfort'    // Supportive, empathetic
  | 'investigate'// Explore, examine
  | 'leave'      // Exit, depart
  | 'custom';    // Author-defined

// ============================================================================
// Conditions and Effects
// ============================================================================

export interface EdgeCondition {
  type: 'state' | 'relationship' | 'flag' | 'resource' | 'history';
  target: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'has' | 'lacks';
  value: number | boolean | string;
}

export interface BranchCondition {
  targetNodeId: string;
  conditions: EdgeCondition[];
  /** If true, this is the default when no conditions match */
  isDefault?: boolean;
}

export interface StateModification {
  type: 'set' | 'add' | 'subtract' | 'multiply' | 'toggle';
  target: string;
  value: number | boolean | string;
}

export interface ScriptedDialogue {
  characterId: string;
  text: string;
  emotion?: string;
}

// ============================================================================
// Complete Narrative Definition
// ============================================================================

export interface NarrativeDefinition {
  metadata: NarrativeMetadata;
  characters: Character[];
  worldState: WorldStateDefinition;
  nodes: NarrativeNode[];
  edges: Edge[];
}

// ============================================================================
// Runtime Types
// ============================================================================

export interface GameSession {
  id: string;
  narrativeId: string;
  state: WorldState;
  startedAt: number;
  lastUpdatedAt: number;
}

export interface TurnResult {
  /** Current scene narration */
  narration: string;
  /** NPC dialogues in order */
  dialogues: GeneratedDialogue[];
  /** Three choices for the player */
  choices: PlayerChoice[];
  /** Whether this is an ending */
  isEnding: boolean;
  /** Ending details if applicable */
  ending?: EndingResult;
}

export interface GeneratedDialogue {
  characterId: string;
  characterName: string;
  text: string;
  emotion?: string;
}

export interface PlayerChoice {
  index: number;
  text: string;
  /** Internal edge reference */
  edgeId: string;
  /** Visual hint for choice tone */
  tone?: 'positive' | 'neutral' | 'negative';
}

export interface EndingResult {
  type: 'good' | 'neutral' | 'bad' | 'secret';
  title: string;
  epilogue: string;
  stats: {
    turnsPlayed: number;
    choicesMade: number;
    relationshipsFormed: string[];
  };
}
