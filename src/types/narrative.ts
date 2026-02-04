/**
 * Core type definitions for the Network Narrative Engine
 *
 * Node Types in the new architecture:
 * - Anchor nodes: Preset key moments that must occur
 * - Branch nodes: Player choice points
 * - Transition nodes: AI-generated connective tissue
 * - Merge nodes: Path convergence points
 * - Ending nodes: Terminal outcomes
 */

// Story seed types are imported by consumer modules, not used directly here

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
  /** Reference to the source Story Seed */
  storySeedId?: string;
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
  /** Memories of past choices and their consequences */
  memories: Memory[];
  /** Tracking which value conflicts have been presented */
  valueConflictHistory: ValueConflictRecord[];
  /** Current position on ending dimensions */
  endingDimensionScores: Record<string, number>;
  /** Active world rule effects */
  activeRuleEffects: ActiveRuleEffect[];
}

/**
 * A memory of a past event or choice
 */
export interface Memory {
  id: string;
  /** Type of memory */
  type: 'choice' | 'revelation' | 'relationship' | 'consequence';
  /** Brief description */
  description: string;
  /** When this memory was created (turn number) */
  createdAt: number;
  /** How significant this memory is (1-10) */
  significance: number;
  /** Characters involved */
  involvedCharacters?: string[];
  /** Value conflict related to this memory */
  relatedConflict?: string;
  /** Whether this memory has been "surfaced" (recalled) */
  hasSurfaced?: boolean;
}

/**
 * Record of a value conflict that was presented to the player
 */
export interface ValueConflictRecord {
  conflictId: string;
  /** Which turn this was presented */
  presentedAt: number;
  /** What choice the player made */
  choiceMade: 'value1' | 'value2' | 'both' | 'neither';
  /** The specific choice text */
  choiceText: string;
  /** Node where this occurred */
  nodeId: string;
}

/**
 * An active world rule effect
 */
export interface ActiveRuleEffect {
  ruleId: string;
  /** When this effect was triggered */
  triggeredAt: number;
  /** How many turns until this effect resolves */
  turnsRemaining?: number;
  /** Description of the pending effect */
  pendingEffect: string;
  /** Target of the effect (character, player, world) */
  target: string;
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

/**
 * Node types in the narrative skeleton:
 * - entry: Starting scenarios (legacy, still supported)
 * - anchor: Preset key moments that must occur
 * - branch: Player choice points with value conflict dilemmas
 * - transition: AI-generated connective tissue
 * - merge: Path convergence points
 * - ending: Terminal outcomes with dimensional positions
 * - story: Legacy story node (still supported for backwards compatibility)
 * - converge: Legacy converge node (still supported)
 */
export type NodeType = 'entry' | 'story' | 'branch' | 'converge' | 'ending' | 'anchor' | 'transition' | 'merge';

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
  endingType: 'good' | 'neutral' | 'bad' | 'secret' | 'bittersweet';
  /** Title for this ending */
  title: string;
  /** Epilogue text */
  epilogue: string;
  /** Conditions that led to this ending (for analytics) */
  achievementConditions?: string[];
  /** Position on ending dimensions (for new architecture) */
  dimensionPositions?: Record<string, number>;
}

// ============================================================================
// New Node Types for Value-Conflict Architecture
// ============================================================================

/**
 * Anchor Node: Preset key moments that must occur
 * These are the author-defined dramatic beats that anchor the narrative
 */
export interface AnchorNode extends BaseNode {
  type: 'anchor';
  /** Title for this key moment */
  title: string;
  /** The dramatic beat this represents */
  beat: string;
  /** Why this moment matters to the story */
  significance: string;
  /** Scripted dialogue for this moment (AI will expand) */
  dialogue?: ScriptedDialogue[];
  /** Whether this anchor is optional or required */
  required: boolean;
  /** Order hint for when this should occur (lower = earlier) */
  orderHint?: number;
}

/**
 * Transition Node: AI-generated connective tissue between anchors
 * These nodes are dynamically generated based on player choices
 */
export interface TransitionNode extends BaseNode {
  type: 'transition';
  /** The purpose of this transition */
  purpose: 'bridge' | 'escalation' | 'relief' | 'revelation' | 'preparation';
  /** What value conflict is being explored */
  activeConflict?: string;
  /** Generated dynamically - can be regenerated */
  isGenerated: boolean;
  /** Seed data used for regeneration */
  generationContext?: {
    fromAnchorId?: string;
    toAnchorId?: string;
    playerChoicesInfluence: string[];
  };
}

/**
 * Merge Node: Path convergence points
 * Multiple story paths can lead here, but the story continues as one
 */
export interface MergeNode extends BaseNode {
  type: 'merge';
  /** Title for this convergence point */
  title: string;
  /** How different paths are reconciled */
  mergeStrategy: 'acknowledge_differences' | 'common_ground' | 'forced_unity';
  /** Text variations based on incoming path */
  pathVariations?: Record<string, string>;
  /** The canonical continuation after merge */
  canonicalContinuation: string;
}

/**
 * Hard Choice: A player choice point with genuine dilemmas
 * Generated by the HardChoiceGenerator based on value conflicts
 */
export interface HardChoiceNode extends BaseNode {
  type: 'branch';
  /** The value conflict being explored */
  valueConflict: {
    value1: string;
    value2: string;
    conflictId: string;
  };
  /** The dilemma presented to the player */
  dilemma: string;
  /** The four choice options */
  choices: HardChoice[];
  /** Characters involved in this choice */
  involvedCharacters: string[];
  /** World rules that apply to this choice */
  applicableRules: string[];
}

/**
 * A hard choice option with clear tradeoffs
 */
export interface HardChoice {
  id: string;
  /** Display text for the choice */
  text: string;
  /** Which value this favors */
  favors: 'value1' | 'value2' | 'both' | 'neither';
  /** What the player gains */
  benefit: string;
  /** What the player loses or risks */
  cost: string;
  /** Hidden consequences not immediately visible */
  hiddenConsequences?: string;
  /** Conditions required to show this choice */
  conditions?: EdgeCondition[];
  /** Whether this is the "third path" option */
  isThirdPath?: boolean;
}

export type NarrativeNode =
  | EntryNode
  | StoryNode
  | BranchNode
  | ConvergeNode
  | EndingNode
  | AnchorNode
  | TransitionNode
  | MergeNode;

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
  type: 'good' | 'neutral' | 'bad' | 'secret' | 'bittersweet';
  title: string;
  epilogue: string;
  stats: {
    turnsPlayed: number;
    choicesMade: number;
    relationshipsFormed: string[];
  };
}
