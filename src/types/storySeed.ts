/**
 * Story Seed Types - Core definitions for the new narrative engine architecture
 *
 * The Story Seed is the creator's input that defines the fundamental elements
 * of a narrative: value conflicts, core tension, characters, world rules, and ending dimensions.
 */

// ============================================================================
// Value Conflicts
// ============================================================================

/**
 * A pair of opposing values that generate hard choices
 * Players must often sacrifice one value to uphold another
 */
export interface ValueConflict {
  id: string;
  /** First value (e.g., "Truth") */
  value1: string;
  /** Second value (e.g., "Peace") */
  value2: string;
  /** Optional description of how this conflict manifests */
  description?: string;
  /** Weight for selection algorithm (higher = more likely to appear) */
  weight?: number;
}

// ============================================================================
// Core Tension
// ============================================================================

/**
 * The central dramatic conflict of the narrative
 * This is the overarching question the player must grapple with
 */
export interface CoreTension {
  /** 1-3 sentences describing the central conflict */
  description: string;
  /** The protagonist's internal struggle */
  internalConflict?: string;
  /** What's at stake if the player fails or succeeds */
  stakes?: string;
}

// ============================================================================
// Characters (Enhanced)
// ============================================================================

/**
 * Character archetype that influences behavior and role
 */
export type CharacterArchetype =
  | 'fallen_idealist'      // Once believed, now disillusioned
  | 'reluctant_hero'       // Doesn't want responsibility but has it
  | 'trickster'            // Uses deception, morally ambiguous
  | 'mentor'               // Guides but has own agenda
  | 'innocent'             // Pure but vulnerable
  | 'shadow'               // Represents player's darker potential
  | 'guardian'             // Protects something at great cost
  | 'shapeshifter'         // Loyalty uncertain
  | 'herald'               // Brings change and challenges
  | 'outcast'              // Rejected by society
  | 'redeemer'             // Seeks to make amends
  | 'avenger'              // Driven by past wrongs
  | 'custom';              // User-defined archetype

/**
 * A character with archetype, internal contradiction, and bond with player
 */
export interface StoryCharacter {
  id: string;
  name: string;
  /** Character archetype that guides behavior */
  archetype: CharacterArchetype;
  /** Custom archetype description if type is 'custom' */
  customArchetype?: string;
  /** Internal contradiction: what the character appears to be vs what they truly are */
  contradiction: string;
  /** Bond with the player - how they're connected */
  bond: string;
  /** Initial relationship value (-100 to 100) */
  initialRelationship: number;
  /** Physical/role description */
  description: string;
  /** Key personality traits */
  traits: string[];
  /** Character's secret or hidden agenda */
  secret?: string;
  /** What the character wants most */
  desire?: string;
  /** What the character fears most */
  fear?: string;
}

// ============================================================================
// World Rules
// ============================================================================

/**
 * A causal law that governs narrative consequences
 * These rules create predictable but meaningful consequences
 */
export interface WorldRule {
  id: string;
  /** Human-readable rule description */
  rule: string;
  /** Category of rule for organization */
  category: 'violence' | 'trust' | 'secrets' | 'resources' | 'relationships' | 'time' | 'custom';
  /** How the rule affects gameplay mechanically */
  mechanicalEffect?: string;
  /** Priority when multiple rules conflict (higher = applied first) */
  priority?: number;
}

/**
 * Predefined common world rules
 */
export const COMMON_WORLD_RULES: WorldRule[] = [
  {
    id: 'violence_revenge',
    rule: 'Violence always creates revenge cycles',
    category: 'violence',
    mechanicalEffect: 'Using violence against a character or faction creates an enemy who will seek retribution',
    priority: 1,
  },
  {
    id: 'secrets_surface',
    rule: 'Secrets surface at the worst moments',
    category: 'secrets',
    mechanicalEffect: 'Hidden information tends to be revealed when it can cause maximum damage',
    priority: 2,
  },
  {
    id: 'trust_broken',
    rule: 'Trust once broken takes 3x effort to repair',
    category: 'trust',
    mechanicalEffect: 'Betraying a character requires much more effort to regain their trust',
    priority: 1,
  },
  {
    id: 'power_corrupts',
    rule: 'Power corrupts those who seek it',
    category: 'relationships',
    mechanicalEffect: 'Gaining power tends to alienate former allies',
    priority: 3,
  },
  {
    id: 'debts_collected',
    rule: 'Debts are always collected',
    category: 'resources',
    mechanicalEffect: 'Favors and debts create obligations that will be called upon',
    priority: 2,
  },
  {
    id: 'time_heals',
    rule: 'Time heals wounds but fades memories',
    category: 'time',
    mechanicalEffect: 'Passage of time reduces hostility but also reduces positive bonds',
    priority: 3,
  },
  {
    id: 'lies_compound',
    rule: 'Lies require more lies to maintain',
    category: 'secrets',
    mechanicalEffect: 'Deception increases the complexity of maintaining the narrative',
    priority: 1,
  },
  {
    id: 'mercy_remembered',
    rule: 'Mercy is remembered when you need it most',
    category: 'relationships',
    mechanicalEffect: 'Showing mercy to an enemy may pay off later',
    priority: 2,
  },
];

// ============================================================================
// Ending Dimensions
// ============================================================================

/**
 * An axis defining one dimension of the outcome space
 * The combination of positions on all axes creates distinct endings
 */
export interface EndingDimension {
  id: string;
  /** Name of the dimension */
  name: string;
  /** The low end of the spectrum */
  lowEnd: string;
  /** The high end of the spectrum */
  highEnd: string;
  /** Description of what this dimension represents */
  description?: string;
  /** The state variables that contribute to this dimension */
  trackedStates?: string[];
}

/**
 * An ending defined by positions on multiple dimensions
 */
export interface DimensionalEnding {
  id: string;
  title: string;
  /** Position on each ending dimension (0.0 to 1.0) */
  dimensionPositions: Record<string, number>;
  /** Requirements to achieve this ending */
  requirements?: string;
  /** The epilogue text for this ending */
  epilogue: string;
  /** Ending classification */
  classification: 'good' | 'neutral' | 'bad' | 'secret' | 'bittersweet';
}

// ============================================================================
// Complete Story Seed
// ============================================================================

/**
 * The complete Story Seed that defines a narrative
 * This is the creator's primary input to the system
 */
export interface StorySeed {
  /** Unique identifier */
  id: string;
  /** Story title */
  title: string;
  /** Story description/summary */
  description: string;
  /** Genre tags */
  tags: string[];

  /** 3-5 pairs of opposing values that generate hard choices */
  valueConflicts: ValueConflict[];

  /** 1-3 sentences describing the central dramatic conflict */
  coreTension: CoreTension;

  /** 2-4 characters with archetype, contradiction, and bond */
  characters: StoryCharacter[];

  /** 5-10 causal laws that govern narrative consequences */
  worldRules: WorldRule[];

  /** 2-3 axes defining the outcome space */
  endingDimensions: EndingDimension[];

  /** Pre-defined endings based on dimension positions */
  endings: DimensionalEnding[];

  /** Setting and world context */
  worldContext: WorldContext;

  /** Beginning scenario */
  beginningScenario: string;

  /** Estimated playtime in minutes */
  estimatedMinutes: number;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'challenging';

  /** Creation metadata */
  createdAt: number;
  updatedAt: number;
  author?: string;
}

/**
 * World context and setting information
 */
export interface WorldContext {
  /** Physical setting description */
  setting: string;
  /** Time period */
  timePeriod: string;
  /** Overall mood/atmosphere */
  mood: string;
  /** How the player is referred to */
  playerRole: string;
}

// ============================================================================
// Story Seed Validation
// ============================================================================

/**
 * Validation result for a Story Seed
 */
export interface StorySeedValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a Story Seed
 */
export function validateStorySeed(seed: StorySeed): StorySeedValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Value conflicts validation
  if (seed.valueConflicts.length < 3) {
    errors.push('At least 3 value conflicts are required');
  }
  if (seed.valueConflicts.length > 5) {
    warnings.push('More than 5 value conflicts may be overwhelming');
  }

  // Core tension validation
  if (!seed.coreTension.description || seed.coreTension.description.length < 20) {
    errors.push('Core tension description is required (at least 20 characters)');
  }

  // Characters validation
  if (seed.characters.length < 2) {
    errors.push('At least 2 characters are required');
  }
  if (seed.characters.length > 4) {
    warnings.push('More than 4 characters may dilute focus');
  }
  for (const char of seed.characters) {
    if (!char.contradiction) {
      errors.push(`Character "${char.name}" needs an internal contradiction`);
    }
    if (!char.bond) {
      errors.push(`Character "${char.name}" needs a bond with the player`);
    }
  }

  // World rules validation
  if (seed.worldRules.length < 5) {
    errors.push('At least 5 world rules are required');
  }
  if (seed.worldRules.length > 10) {
    warnings.push('More than 10 world rules may be hard to track');
  }

  // Ending dimensions validation
  if (seed.endingDimensions.length < 2) {
    errors.push('At least 2 ending dimensions are required');
  }
  if (seed.endingDimensions.length > 3) {
    warnings.push('More than 3 ending dimensions creates many possible endings');
  }

  // Endings validation
  if (seed.endings.length < 2) {
    errors.push('At least 2 endings are required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Story Seed Creation Helpers
// ============================================================================

/**
 * Create an empty Story Seed with defaults
 */
export function createEmptyStorySeed(): Partial<StorySeed> {
  return {
    id: `seed-${Date.now()}`,
    title: '',
    description: '',
    tags: [],
    valueConflicts: [],
    coreTension: { description: '' },
    characters: [],
    worldRules: [],
    endingDimensions: [],
    endings: [],
    worldContext: {
      setting: '',
      timePeriod: '',
      mood: '',
      playerRole: 'the protagonist',
    },
    beginningScenario: '',
    estimatedMinutes: 25,
    difficulty: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create a value conflict
 */
export function createValueConflict(value1: string, value2: string, description?: string): ValueConflict {
  return {
    id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    value1,
    value2,
    description,
    weight: 1,
  };
}

/**
 * Create a world rule
 */
export function createWorldRule(rule: string, category: WorldRule['category']): WorldRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rule,
    category,
    priority: 1,
  };
}

/**
 * Create an ending dimension
 */
export function createEndingDimension(name: string, lowEnd: string, highEnd: string): EndingDimension {
  return {
    id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    lowEnd,
    highEnd,
  };
}
