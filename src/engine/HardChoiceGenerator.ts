/**
 * HardChoiceGenerator - Creates meaningful dilemmas from value conflicts
 *
 * This component implements the Hard Choice Generation Algorithm:
 * 1. Select value conflict (avoid recent repeats)
 * 2. Embody abstract values into characters/events
 * 3. Generate options with clear tradeoffs
 * 4. Balance to ensure no "correct answer"
 */

import type {
  ValueConflict,
  StoryCharacter,
  WorldRule,
} from '../types/storySeed.js';
import type {
  WorldState,
  HardChoice,
  CharacterInstance,
  ValueConflictRecord,
} from '../types/narrative.js';

/**
 * Context for generating a hard choice
 */
export interface HardChoiceContext {
  /** Available value conflicts */
  valueConflicts: ValueConflict[];
  /** Characters available for the scene */
  characters: StoryCharacter[];
  /** Present character instances with current relationships */
  presentCharacters: CharacterInstance[];
  /** World rules that should influence consequences */
  worldRules: WorldRule[];
  /** Current world state */
  worldState: WorldState;
  /** Scene context */
  sceneContext: {
    location: string;
    mood: string;
    situation: string;
  };
}

/**
 * A generated hard choice scenario
 */
export interface GeneratedHardChoice {
  /** The selected value conflict */
  valueConflict: ValueConflict;
  /** The dilemma description */
  dilemma: string;
  /** The situation that creates the dilemma */
  situation: string;
  /** Characters embodying the conflict */
  embodiments: CharacterEmbodiment[];
  /** The choice options */
  choices: HardChoice[];
  /** World rules that apply */
  applicableRules: WorldRule[];
  /** Prompt for LLM to generate display text */
  generationPrompt: string;
}

/**
 * How a character embodies a value
 */
export interface CharacterEmbodiment {
  characterId: string;
  characterName: string;
  embodiedValue: string;
  manifestation: string;
}

/**
 * Configuration for the hard choice generator
 */
export interface HardChoiceConfig {
  /** Minimum turns between repeating the same value conflict */
  conflictRepeatCooldown: number;
  /** Whether to include a "third path" option */
  includeThirdPath: boolean;
  /** Whether to include a "both values" option (with hidden cost) */
  includeBothOption: boolean;
  /** How many choices to generate (typically 3-4) */
  choiceCount: number;
}

const DEFAULT_CONFIG: HardChoiceConfig = {
  conflictRepeatCooldown: 3,
  includeThirdPath: true,
  includeBothOption: true,
  choiceCount: 4,
};

export class HardChoiceGenerator {
  private config: HardChoiceConfig;

  constructor(config: Partial<HardChoiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a hard choice based on the current context
   */
  generateHardChoice(context: HardChoiceContext): GeneratedHardChoice {
    // Step 1: Select value conflict (avoid recent repeats)
    const selectedConflict = this.selectValueConflict(
      context.valueConflicts,
      context.worldState.valueConflictHistory
    );

    // Step 2: Embody abstract values into characters/events
    const embodiments = this.embodifyValues(
      selectedConflict,
      context.characters,
      context.presentCharacters
    );

    // Step 3: Determine applicable world rules
    const applicableRules = this.findApplicableRules(
      selectedConflict,
      context.worldRules
    );

    // Step 4: Generate the dilemma situation
    const { dilemma, situation } = this.generateDilemma(
      selectedConflict,
      embodiments,
      context.sceneContext
    );

    // Step 5: Generate choice options with clear tradeoffs
    const choices = this.generateChoices(
      selectedConflict,
      embodiments,
      applicableRules,
      context.worldState
    );

    // Step 6: Create the generation prompt for LLM
    const generationPrompt = this.buildGenerationPrompt(
      selectedConflict,
      dilemma,
      situation,
      embodiments,
      choices,
      context.sceneContext
    );

    return {
      valueConflict: selectedConflict,
      dilemma,
      situation,
      embodiments,
      choices,
      applicableRules,
      generationPrompt,
    };
  }

  /**
   * Step 1: Select a value conflict, avoiding recent repeats
   */
  private selectValueConflict(
    conflicts: ValueConflict[],
    history: ValueConflictRecord[]
  ): ValueConflict {
    // Get recently used conflicts
    const recentConflicts = new Set(
      history
        .slice(-this.config.conflictRepeatCooldown)
        .map((h) => h.conflictId)
    );

    // Filter out recently used conflicts
    const availableConflicts = conflicts.filter(
      (c) => !recentConflicts.has(c.id)
    );

    // If all conflicts are on cooldown, use any
    const pool = availableConflicts.length > 0 ? availableConflicts : conflicts;

    // Weight-based selection
    const totalWeight = pool.reduce((sum, c) => sum + (c.weight ?? 1), 0);
    let random = Math.random() * totalWeight;

    for (const conflict of pool) {
      random -= conflict.weight ?? 1;
      if (random <= 0) {
        return conflict;
      }
    }

    return pool[0];
  }

  /**
   * Step 2: Embody abstract values into characters
   */
  private embodifyValues(
    conflict: ValueConflict,
    characters: StoryCharacter[],
    presentCharacters: CharacterInstance[]
  ): CharacterEmbodiment[] {
    const embodiments: CharacterEmbodiment[] = [];
    const presentIds = new Set(presentCharacters.map((c) => c.character.id));

    // Find characters that could embody each value
    const value1Candidates = characters.filter(
      (c) =>
        presentIds.has(c.id) &&
        this.characterCouldEmbody(c, conflict.value1)
    );
    const value2Candidates = characters.filter(
      (c) =>
        presentIds.has(c.id) &&
        this.characterCouldEmbody(c, conflict.value2)
    );

    // Assign characters to values
    if (value1Candidates.length > 0) {
      const char = value1Candidates[Math.floor(Math.random() * value1Candidates.length)];
      embodiments.push({
        characterId: char.id,
        characterName: char.name,
        embodiedValue: conflict.value1,
        manifestation: this.generateManifestation(char, conflict.value1),
      });
    }

    if (value2Candidates.length > 0) {
      // Avoid assigning the same character to both values
      const available = value2Candidates.filter(
        (c) => !embodiments.some((e) => e.characterId === c.id)
      );
      if (available.length > 0) {
        const char = available[Math.floor(Math.random() * available.length)];
        embodiments.push({
          characterId: char.id,
          characterName: char.name,
          embodiedValue: conflict.value2,
          manifestation: this.generateManifestation(char, conflict.value2),
        });
      }
    }

    return embodiments;
  }

  /**
   * Check if a character could embody a value based on their traits
   */
  private characterCouldEmbody(character: StoryCharacter, value: string): boolean {
    const valueLower = value.toLowerCase();
    const traits = character.traits.map((t) => t.toLowerCase());
    const description = character.description.toLowerCase();
    const contradiction = character.contradiction.toLowerCase();

    // Check if any trait or description relates to the value
    return (
      traits.some((t) => t.includes(valueLower) || valueLower.includes(t)) ||
      description.includes(valueLower) ||
      contradiction.includes(valueLower) ||
      // Also check for related concepts
      this.isRelatedValue(value, traits.concat([description, contradiction]))
    );
  }

  /**
   * Check if value is related to any of the texts
   */
  private isRelatedValue(value: string, texts: string[]): boolean {
    const valueRelations: Record<string, string[]> = {
      truth: ['honest', 'reveal', 'discover', 'expose', 'authentic'],
      peace: ['calm', 'harmony', 'protect', 'safe', 'quiet'],
      loyalty: ['faithful', 'devoted', 'trustworthy', 'committed'],
      justice: ['fair', 'right', 'punish', 'law', 'moral'],
      survival: ['live', 'escape', 'endure', 'persist'],
      dignity: ['honor', 'respect', 'pride', 'noble'],
      freedom: ['liberty', 'choice', 'autonomous', 'independent'],
      love: ['care', 'affection', 'compassion', 'bond'],
      duty: ['obligation', 'responsibility', 'serve'],
      mercy: ['forgive', 'compassion', 'spare', 'kind'],
    };

    const valueLower = value.toLowerCase();
    const related = valueRelations[valueLower] || [];

    return texts.some((text) =>
      related.some((r) => text.includes(r))
    );
  }

  /**
   * Generate how a character manifests a value
   */
  private generateManifestation(character: StoryCharacter, value: string): string {
    const templates = [
      `${character.name} represents ${value} through their ${character.traits[0] || 'actions'}`,
      `${character.name}'s commitment to ${value} is evident in their stance`,
      `${character.name} embodies ${value}, despite their ${character.contradiction.split(' ')[0] || 'flaws'}`,
      `For ${character.name}, ${value} is not just a principle but a way of life`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Step 3: Find world rules that apply to this conflict
   */
  private findApplicableRules(
    conflict: ValueConflict,
    rules: WorldRule[]
  ): WorldRule[] {
    return rules.filter((rule) => {
      const ruleLower = rule.rule.toLowerCase();
      const v1Lower = conflict.value1.toLowerCase();
      const v2Lower = conflict.value2.toLowerCase();

      return (
        ruleLower.includes(v1Lower) ||
        ruleLower.includes(v2Lower) ||
        this.ruleRelatesTo(rule, conflict)
      );
    });
  }

  /**
   * Check if a rule relates to the conflict
   */
  private ruleRelatesTo(rule: WorldRule, conflict: ValueConflict): boolean {
    // Category-based matching
    const categoryMappings: Record<string, string[]> = {
      violence: ['survival', 'peace', 'justice', 'mercy'],
      trust: ['loyalty', 'truth', 'betrayal'],
      secrets: ['truth', 'peace', 'protection'],
      relationships: ['loyalty', 'love', 'duty'],
      resources: ['survival', 'duty', 'freedom'],
    };

    const relatedValues = categoryMappings[rule.category] || [];
    return (
      relatedValues.includes(conflict.value1.toLowerCase()) ||
      relatedValues.includes(conflict.value2.toLowerCase())
    );
  }

  /**
   * Step 4: Generate the dilemma situation
   */
  private generateDilemma(
    conflict: ValueConflict,
    embodiments: CharacterEmbodiment[],
    sceneContext: { location: string; mood: string; situation: string }
  ): { dilemma: string; situation: string } {
    const char1 = embodiments[0];
    const char2 = embodiments[1];

    let situation: string;
    let dilemma: string;

    if (char1 && char2) {
      situation = `In ${sceneContext.location}, ${char1.characterName} and ${char2.characterName} present opposing paths forward. ${sceneContext.situation}`;
      dilemma = `You must choose between ${conflict.value1} (represented by ${char1.characterName}) and ${conflict.value2} (represented by ${char2.characterName}). There is no way to fully satisfy both.`;
    } else if (char1) {
      situation = `In ${sceneContext.location}, ${char1.characterName} forces you to confront the true cost of ${conflict.value1}. ${sceneContext.situation}`;
      dilemma = `Upholding ${conflict.value1} will require sacrificing ${conflict.value2}. The choice is yours alone.`;
    } else {
      situation = `The situation in ${sceneContext.location} crystallizes into a stark choice. ${sceneContext.situation}`;
      dilemma = `You must decide: ${conflict.value1} or ${conflict.value2}? Each path has consequences you cannot fully foresee.`;
    }

    return { dilemma, situation };
  }

  /**
   * Step 5: Generate choice options
   */
  private generateChoices(
    conflict: ValueConflict,
    embodiments: CharacterEmbodiment[],
    applicableRules: WorldRule[],
    worldState: WorldState
  ): HardChoice[] {
    const choices: HardChoice[] = [];
    const char1 = embodiments.find((e) => e.embodiedValue === conflict.value1);
    const char2 = embodiments.find((e) => e.embodiedValue === conflict.value2);

    // Option A: Favor Value1, sacrifice Value2
    choices.push({
      id: `choice-${conflict.id}-a`,
      text: `[Uphold ${conflict.value1}]`,
      favors: 'value1',
      benefit: `You maintain your commitment to ${conflict.value1}${char1 ? ` and strengthen your bond with ${char1.characterName}` : ''}`,
      cost: `You sacrifice ${conflict.value2}${char2 ? `, potentially damaging your relationship with ${char2.characterName}` : ''}`,
      hiddenConsequences: this.generateHiddenConsequence(conflict.value1, applicableRules),
    });

    // Option B: Favor Value2, sacrifice Value1
    choices.push({
      id: `choice-${conflict.id}-b`,
      text: `[Embrace ${conflict.value2}]`,
      favors: 'value2',
      benefit: `You prioritize ${conflict.value2}${char2 ? ` and earn ${char2.characterName}'s respect` : ''}`,
      cost: `You compromise on ${conflict.value1}${char1 ? `, which may disappoint ${char1.characterName}` : ''}`,
      hiddenConsequences: this.generateHiddenConsequence(conflict.value2, applicableRules),
    });

    // Option C: Attempt both (hidden cost) - if enabled
    if (this.config.includeBothOption) {
      choices.push({
        id: `choice-${conflict.id}-c`,
        text: `[Find a middle ground]`,
        favors: 'both',
        benefit: `You attempt to honor both ${conflict.value1} and ${conflict.value2}`,
        cost: `The compromise may satisfy no one fully`,
        hiddenConsequences: `The half-measures will come back to haunt you. Both values suffer in the attempt to preserve both.`,
      });
    }

    // Option D: Third path (requires conditions) - if enabled
    if (this.config.includeThirdPath) {
      const thirdPathAvailable = this.isThirdPathAvailable(worldState, conflict);
      choices.push({
        id: `choice-${conflict.id}-d`,
        text: `[Reject the premise]`,
        favors: 'neither',
        benefit: `You refuse to play by the expected rules, seeking an unconventional solution`,
        cost: `This path requires resources, allies, or knowledge you may not have`,
        hiddenConsequences: `The unconventional path has its own risks - you may find yourself alone`,
        isThirdPath: true,
        conditions: thirdPathAvailable ? undefined : [
          {
            type: 'state',
            target: 'player.insight',
            operator: '>=',
            value: 50,
          },
        ],
      });
    }

    return choices;
  }

  /**
   * Generate a hidden consequence based on applicable world rules
   */
  private generateHiddenConsequence(
    chosenValue: string,
    rules: WorldRule[]
  ): string {
    const relevantRules = rules.filter((r) =>
      r.rule.toLowerCase().includes(chosenValue.toLowerCase())
    );

    if (relevantRules.length > 0) {
      return `World rule in effect: "${relevantRules[0].rule}"`;
    }

    const genericConsequences = [
      'Your choice will echo in ways you cannot yet see',
      'This decision plants a seed that will grow over time',
      'Others will remember what you chose here',
      'The consequences may not be immediate, but they will come',
    ];

    return genericConsequences[Math.floor(Math.random() * genericConsequences.length)];
  }

  /**
   * Check if third path conditions are met
   */
  private isThirdPathAvailable(worldState: WorldState, conflict: ValueConflict): boolean {
    // Third path is available if player has sufficient resources or special flags
    const insightScore = worldState.player['insight'] as number | undefined;
    const hasThirdPathFlag = worldState.flags[`third_path_${conflict.id}`];

    return (insightScore !== undefined && insightScore >= 50) || hasThirdPathFlag === true;
  }

  /**
   * Step 6: Build the LLM generation prompt
   */
  private buildGenerationPrompt(
    conflict: ValueConflict,
    dilemma: string,
    situation: string,
    embodiments: CharacterEmbodiment[],
    choices: HardChoice[],
    sceneContext: { location: string; mood: string; situation: string }
  ): string {
    return `Generate dialogue and narration for a hard choice scene.

VALUE CONFLICT: ${conflict.value1} vs ${conflict.value2}
${conflict.description ? `Context: ${conflict.description}` : ''}

SITUATION: ${situation}
DILEMMA: ${dilemma}

LOCATION: ${sceneContext.location}
MOOD: ${sceneContext.mood}

CHARACTERS AND THEIR ROLES:
${embodiments.map((e) => `- ${e.characterName} embodies ${e.embodiedValue}: ${e.manifestation}`).join('\n')}

CHOICE OPTIONS (generate compelling dialogue for each):
${choices.map((c, i) => `${i + 1}. ${c.text}
   - Player gains: ${c.benefit}
   - Player risks: ${c.cost}`).join('\n\n')}

REQUIREMENTS:
1. The narration should set up the conflict naturally
2. Each character should speak in their distinct voice
3. The tension between values should feel genuine
4. No choice should be obviously "correct"
5. The dialogue should make the player feel the weight of the decision

Generate the scene with narration, character dialogues, and 4 distinct choice options.`;
  }

  /**
   * Balance check: Ensure no choice is obviously correct
   */
  validateBalance(choices: HardChoice[]): { balanced: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check that each choice has both benefits and costs
    for (const choice of choices) {
      if (!choice.benefit || choice.benefit.length < 10) {
        issues.push(`Choice "${choice.text}" lacks a clear benefit`);
      }
      if (!choice.cost || choice.cost.length < 10) {
        issues.push(`Choice "${choice.text}" lacks a clear cost`);
      }
    }

    // Check that we have options favoring different values
    const favorsValue1 = choices.some((c) => c.favors === 'value1');
    const favorsValue2 = choices.some((c) => c.favors === 'value2');

    if (!favorsValue1) {
      issues.push('No choice clearly favors value1');
    }
    if (!favorsValue2) {
      issues.push('No choice clearly favors value2');
    }

    return {
      balanced: issues.length === 0,
      issues,
    };
  }
}
