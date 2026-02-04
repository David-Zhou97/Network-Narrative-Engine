/**
 * System prompts for AI-powered narrative generation
 */

export const NARRATOR_SYSTEM_PROMPT = `You are an immersive narrative AI for an interactive story called "{narrativeTitle}".

Your role is to:
1. Generate vivid, engaging scene narration that fits the story's tone
2. Voice NPCs authentically based on their personality and relationship with the player
3. Present three distinct dialogue choices that feel natural and meaningful

STORY PREMISE:
{narrativeDescription}

GUIDELINES:
- Write in second person ("You see...", "You feel...")
- Keep narration concise but atmospheric (2-3 sentences)
- NPCs should speak in character with distinct voices
- Choices should feel like genuine options, not obvious good/bad splits
- Maintain continuity with the conversation history
- React appropriately to the player's previous choices

RESPONSE FORMAT: You must respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON. Start your response with { and end with }.

Output ONLY valid JSON in this exact structure:
{
  "narration": "Scene description in second person",
  "dialogues": [
    {"character": "character_id", "text": "What they say", "emotion": "their emotional state"}
  ],
  "choices": [
    {"text": "First choice dialogue option", "tone": "positive"},
    {"text": "Second choice dialogue option", "tone": "neutral"},
    {"text": "Third choice dialogue option", "tone": "negative"}
  ]
}

TONE VALUES: "positive", "neutral", or "negative" (describes the approach, not the outcome)
`;

export const TURN_GENERATION_PROMPT = `CURRENT SCENE:
{sceneDescription}

LOCATION: {location}
MOOD: {mood}

CHARACTERS PRESENT:
{characterDetails}

WORLD STATE (relevant facts):
{worldState}

RECENT HISTORY:
{recentHistory}

CHOICE DIRECTIONS:
The player must choose between options that lead to these outcomes:
{choiceHints}

Generate the narration, any NPC dialogue, and three player choice options.
Each choice should feel distinct and reflect different player approaches.
Match the choice text style to the story's tone.`;

export const CHARACTER_DIALOGUE_PROMPT = `You are {characterName}, with these traits: {traits}

Your personality: {personality}

Your relationship with the player: {relationshipLevel} (-100 to 100 scale)

Current situation: {situation}

{previousContext}

Respond in character with 1-2 sentences of dialogue. Stay authentic to your personality.
Output only the dialogue, no quotation marks or attribution.`;

export function buildNarratorSystemPrompt(
  narrativeTitle: string,
  narrativeDescription: string
): string {
  return NARRATOR_SYSTEM_PROMPT
    .replace('{narrativeTitle}', narrativeTitle)
    .replace('{narrativeDescription}', narrativeDescription);
}

export function buildTurnPrompt(params: {
  sceneDescription: string;
  location: string;
  mood: string;
  characterDetails: string;
  worldState: string;
  recentHistory: string;
  choiceHints: string;
}): string {
  return TURN_GENERATION_PROMPT
    .replace('{sceneDescription}', params.sceneDescription)
    .replace('{location}', params.location)
    .replace('{mood}', params.mood)
    .replace('{characterDetails}', params.characterDetails)
    .replace('{worldState}', params.worldState)
    .replace('{recentHistory}', params.recentHistory)
    .replace('{choiceHints}', params.choiceHints);
}

export function buildCharacterPrompt(params: {
  characterName: string;
  traits: string;
  personality: string;
  relationshipLevel: number;
  situation: string;
  previousContext?: string;
}): string {
  return CHARACTER_DIALOGUE_PROMPT
    .replace('{characterName}', params.characterName)
    .replace('{traits}', params.traits)
    .replace('{personality}', params.personality)
    .replace('{relationshipLevel}', params.relationshipLevel.toString())
    .replace('{situation}', params.situation)
    .replace(
      '{previousContext}',
      params.previousContext
        ? `The player just said: "${params.previousContext}"`
        : ''
    );
}

// ============================================================================
// New Architecture Prompts - Hard Choice Generation
// ============================================================================

/**
 * System prompt for hard choice scene generation
 * This creates scenes where players must make meaningful value-based decisions
 */
export const HARD_CHOICE_SYSTEM_PROMPT = `You are a narrative AI specializing in creating moments of genuine moral conflict.

Your role is to:
1. Present dilemmas where no choice is obviously "correct"
2. Give each option clear benefits AND costs
3. Embody abstract values through character actions and dialogue
4. Create tension that feels earned and meaningful
5. Make the player feel the weight of their decision

CORE PRINCIPLES:
- Every choice should sacrifice something valuable
- Characters should represent values authentically, not as strawmen
- The "right" answer should depend on the player's priorities
- Hidden consequences should feel logical in retrospect
- Relationships should be affected by value-based choices

STORY CONTEXT:
Title: {narrativeTitle}
Core Tension: {coreTension}

VALUE CONFLICT IN THIS SCENE:
{value1} vs {value2}
{conflictDescription}

RESPONSE FORMAT: You must respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON. Start your response with { and end with }.

Output ONLY valid JSON in this exact structure:
{
  "narration": "Scene setup in second person (3-4 sentences)",
  "dialogues": [
    {"character": "character_id", "text": "Their perspective on the dilemma", "emotion": "emotional state"}
  ],
  "choices": [
    {"text": "Choice favoring {value1}", "tone": "positive"},
    {"text": "Choice favoring {value2}", "tone": "neutral"},
    {"text": "Attempt compromise (with hidden cost)", "tone": "neutral"},
    {"text": "Unconventional third path", "tone": "negative"}
  ],
  "hiddenContext": "What the player cannot yet see about this situation"
}

REMEMBER: Make every option feel like it could be the right choice, given the right values.
`;

/**
 * Prompt for generating a hard choice scene
 */
export const HARD_CHOICE_SCENE_PROMPT = `VALUE CONFLICT: {value1} vs {value2}
{conflictDescription}

CURRENT SITUATION:
{situation}

THE DILEMMA:
{dilemma}

LOCATION: {location}
MOOD: {mood}

CHARACTERS AND THEIR POSITIONS:
{characterEmbodiments}

CHOICE OPTIONS TO GENERATE:
{choiceOptions}

PLAYER'S RECENT HISTORY:
{recentHistory}

RELEVANT MEMORIES:
{memories}

ACTIVE WORLD RULES:
{worldRules}

CURRENT RELATIONSHIPS:
{relationships}

Generate a scene that:
1. Builds tension naturally through dialogue and description
2. Makes each character's position feel understandable
3. Presents all choices as viable but costly
4. Creates emotional investment before the decision
5. Hints at the stakes without revealing all consequences

Each choice should include:
- Clear immediate benefit
- Visible cost or risk
- Natural dialogue option for the player`;

/**
 * Prompt for generating consequence narration
 */
export const CONSEQUENCE_PROMPT = `A WORLD RULE HAS TRIGGERED:
"{worldRule}"

WHAT HAPPENED:
{trigger}

CURRENT SITUATION:
{situation}

AFFECTED CHARACTERS:
{affectedCharacters}

Generate narration (2-3 sentences) that:
1. Shows the consequence unfolding naturally
2. Connects it to the player's past choice
3. Creates emotional impact
4. Sets up the player's next decision

The player should feel the weight of their past actions without it feeling punitive.`;

/**
 * Prompt for anchor node scenes (key story moments)
 */
export const ANCHOR_SCENE_PROMPT = `KEY STORY MOMENT: {anchorTitle}

DRAMATIC BEAT: {beat}

SIGNIFICANCE: {significance}

SCENE DESCRIPTION: {sceneDescription}

LOCATION: {location}
MOOD: {mood}

CHARACTERS PRESENT:
{characters}

SCRIPTED DIALOGUE TO EXPAND:
{scriptedDialogue}

PLAYER'S JOURNEY SO FAR:
{playerHistory}

Generate a scene that:
1. Makes this moment feel pivotal and memorable
2. Builds on the player's previous choices
3. Expands the scripted dialogue naturally
4. Creates a strong emotional beat
5. Sets up the choices that will follow`;

/**
 * Prompt for transition scene generation
 */
export const TRANSITION_SCENE_PROMPT = `TRANSITION PURPOSE: {purpose}

FROM SCENE: {fromScene}
TO SCENE: {toScene}

{activeConflict}

LOCATION: {location}
MOOD: {mood}

CHARACTERS PRESENT:
{characters}

PLAYER'S RECENT CHOICES:
{recentChoices}

Generate a transition that:
1. {purposeGuideline}
2. Maintains narrative momentum
3. Gives characters time to react
4. Prepares the player for what's coming`;

/**
 * Prompt for merge node (path convergence)
 */
export const MERGE_SCENE_PROMPT = `CONVERGENCE POINT: {mergeTitle}

MERGE STRATEGY: {mergeStrategy}

PLAYER'S PATH: {playerPath}
PATH-SPECIFIC VARIATION: {pathVariation}

CANONICAL CONTINUATION: {continuation}

SCENE DESCRIPTION: {sceneDescription}

Generate a scene that:
1. Acknowledges the player's unique journey
2. Smoothly transitions to the common path
3. Makes the convergence feel natural
4. References past choices where meaningful`;

// ============================================================================
// Prompt Builder Functions for New Architecture
// ============================================================================

export function buildHardChoiceSystemPrompt(params: {
  narrativeTitle: string;
  coreTension: string;
  value1: string;
  value2: string;
  conflictDescription: string;
}): string {
  return HARD_CHOICE_SYSTEM_PROMPT
    .replace('{narrativeTitle}', params.narrativeTitle)
    .replace('{coreTension}', params.coreTension)
    .replace(/{value1}/g, params.value1)
    .replace(/{value2}/g, params.value2)
    .replace('{conflictDescription}', params.conflictDescription);
}

export function buildHardChoiceScenePrompt(params: {
  value1: string;
  value2: string;
  conflictDescription: string;
  situation: string;
  dilemma: string;
  location: string;
  mood: string;
  characterEmbodiments: string;
  choiceOptions: string;
  recentHistory: string;
  memories: string;
  worldRules: string;
  relationships: string;
}): string {
  return HARD_CHOICE_SCENE_PROMPT
    .replace('{value1}', params.value1)
    .replace('{value2}', params.value2)
    .replace('{conflictDescription}', params.conflictDescription)
    .replace('{situation}', params.situation)
    .replace('{dilemma}', params.dilemma)
    .replace('{location}', params.location)
    .replace('{mood}', params.mood)
    .replace('{characterEmbodiments}', params.characterEmbodiments)
    .replace('{choiceOptions}', params.choiceOptions)
    .replace('{recentHistory}', params.recentHistory)
    .replace('{memories}', params.memories)
    .replace('{worldRules}', params.worldRules)
    .replace('{relationships}', params.relationships);
}

export function buildConsequencePrompt(params: {
  worldRule: string;
  trigger: string;
  situation: string;
  affectedCharacters: string;
}): string {
  return CONSEQUENCE_PROMPT
    .replace('{worldRule}', params.worldRule)
    .replace('{trigger}', params.trigger)
    .replace('{situation}', params.situation)
    .replace('{affectedCharacters}', params.affectedCharacters);
}

export function buildAnchorScenePrompt(params: {
  anchorTitle: string;
  beat: string;
  significance: string;
  sceneDescription: string;
  location: string;
  mood: string;
  characters: string;
  scriptedDialogue: string;
  playerHistory: string;
}): string {
  return ANCHOR_SCENE_PROMPT
    .replace('{anchorTitle}', params.anchorTitle)
    .replace('{beat}', params.beat)
    .replace('{significance}', params.significance)
    .replace('{sceneDescription}', params.sceneDescription)
    .replace('{location}', params.location)
    .replace('{mood}', params.mood)
    .replace('{characters}', params.characters)
    .replace('{scriptedDialogue}', params.scriptedDialogue)
    .replace('{playerHistory}', params.playerHistory);
}

export function buildTransitionScenePrompt(params: {
  purpose: string;
  purposeGuideline: string;
  fromScene: string;
  toScene: string;
  activeConflict: string;
  location: string;
  mood: string;
  characters: string;
  recentChoices: string;
}): string {
  return TRANSITION_SCENE_PROMPT
    .replace('{purpose}', params.purpose)
    .replace('{purposeGuideline}', params.purposeGuideline)
    .replace('{fromScene}', params.fromScene)
    .replace('{toScene}', params.toScene)
    .replace('{activeConflict}', params.activeConflict ? `ACTIVE VALUE CONFLICT: ${params.activeConflict}` : '')
    .replace('{location}', params.location)
    .replace('{mood}', params.mood)
    .replace('{characters}', params.characters)
    .replace('{recentChoices}', params.recentChoices);
}

export function buildMergeScenePrompt(params: {
  mergeTitle: string;
  mergeStrategy: string;
  playerPath: string;
  pathVariation: string;
  continuation: string;
  sceneDescription: string;
}): string {
  return MERGE_SCENE_PROMPT
    .replace('{mergeTitle}', params.mergeTitle)
    .replace('{mergeStrategy}', params.mergeStrategy)
    .replace('{playerPath}', params.playerPath)
    .replace('{pathVariation}', params.pathVariation)
    .replace('{continuation}', params.continuation)
    .replace('{sceneDescription}', params.sceneDescription);
}

/**
 * Get purpose guideline for transition scenes
 */
export function getTransitionPurposeGuideline(purpose: string): string {
  const guidelines: Record<string, string> = {
    bridge: 'Connect the scenes smoothly without losing momentum',
    escalation: 'Raise the stakes and build tension',
    relief: 'Provide a moment of respite while maintaining engagement',
    revelation: 'Reveal new information that changes the player perspective',
    preparation: 'Set up expectations for the coming challenge',
  };
  return guidelines[purpose] || 'Connect the scenes naturally';
}
