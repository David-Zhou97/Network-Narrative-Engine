/**
 * StoryCreator - Multi-step form for creating AI-generated stories
 *
 * New Architecture: Story Seed based creation
 * - Value Conflicts (3-5 pairs of opposing values)
 * - Core Tension (central dramatic conflict)
 * - Characters (with archetype, contradiction, bond)
 * - World Rules (causal laws governing consequences)
 * - Ending Dimensions (axes defining outcome space)
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import type {
  StoryCreationInput,
  CharacterInput,
  EndingScenarioInput,
  WorldSettingsInput,
  GraphGenerationConfig,
  GeneratedGraph,
} from '../../../../src/types/storyCreation';
import styles from './StoryCreator.module.css';

// New architecture types
interface ValueConflictInput {
  value1: string;
  value2: string;
  description: string;
}

interface StoryCharacterInput {
  name: string;
  archetype: string;
  contradiction: string;
  bond: string;
  traits: string[];
  description: string;
}

interface WorldRuleInput {
  rule: string;
  category: 'violence' | 'trust' | 'secrets' | 'resources' | 'relationships' | 'time' | 'custom';
}

interface EndingDimensionInput {
  name: string;
  lowEnd: string;
  highEnd: string;
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

const CHARACTER_ARCHETYPES = [
  { value: 'fallen_idealist', label: 'Fallen Idealist - Once believed, now disillusioned' },
  { value: 'reluctant_hero', label: 'Reluctant Hero - Doesn\'t want responsibility but has it' },
  { value: 'trickster', label: 'Trickster - Uses deception, morally ambiguous' },
  { value: 'mentor', label: 'Mentor - Guides but has own agenda' },
  { value: 'innocent', label: 'Innocent - Pure but vulnerable' },
  { value: 'shadow', label: 'Shadow - Represents player\'s darker potential' },
  { value: 'guardian', label: 'Guardian - Protects something at great cost' },
  { value: 'shapeshifter', label: 'Shapeshifter - Loyalty uncertain' },
  { value: 'herald', label: 'Herald - Brings change and challenges' },
  { value: 'outcast', label: 'Outcast - Rejected by society' },
  { value: 'redeemer', label: 'Redeemer - Seeks to make amends' },
  { value: 'avenger', label: 'Avenger - Driven by past wrongs' },
];

const WORLD_RULE_CATEGORIES = [
  { value: 'violence', label: 'Violence - Rules about conflict and force' },
  { value: 'trust', label: 'Trust - Rules about loyalty and betrayal' },
  { value: 'secrets', label: 'Secrets - Rules about hidden information' },
  { value: 'resources', label: 'Resources - Rules about scarcity' },
  { value: 'relationships', label: 'Relationships - Rules about bonds' },
  { value: 'time', label: 'Time - Rules about passage of time' },
  { value: 'custom', label: 'Custom - Other rules' },
];

const COMMON_VALUE_CONFLICTS = [
  { value1: 'Truth', value2: 'Peace', description: 'Reveal painful truths or maintain harmony' },
  { value1: 'Loyalty', value2: 'Justice', description: 'Protect loved ones or do what\'s right' },
  { value1: 'Survival', value2: 'Dignity', description: 'Do whatever it takes or maintain honor' },
  { value1: 'Freedom', value2: 'Security', description: 'Independence or safety' },
  { value1: 'Mercy', value2: 'Vengeance', description: 'Forgive or punish' },
];

interface StoryCreatorProps {
  onBack: () => void;
  onGenerated: (graph: GeneratedGraph) => void;
}

type Step = 'basics' | 'conflicts' | 'characters' | 'rules' | 'endings' | 'config' | 'generating';

const AVAILABLE_TAGS = [
  'mystery', 'horror', 'sci-fi', 'fantasy', 'romance', 'thriller',
  'noir', 'cyberpunk', 'adventure', 'drama', 'comedy', 'historical',
  'supernatural', 'post-apocalyptic', 'slice-of-life', 'political'
];

export function StoryCreator({ onBack, onGenerated }: StoryCreatorProps): React.ReactElement {
  const [step, setStep] = useState<Step>('basics');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Basic info
  const [title, setTitle] = useState('');
  const [plot, setPlot] = useState('');
  const [coreTension, setCoreTension] = useState('');
  const [beginningScenario, setBeginningScenario] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'challenging'>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);

  // World context
  const [worldSettings, setWorldSettings] = useState<WorldSettingsInput>({
    setting: '',
    timePeriod: '',
    mood: '',
    themes: [],
    specialRules: '',
  });

  // New architecture: Value Conflicts
  const [valueConflicts, setValueConflicts] = useState<ValueConflictInput[]>([
    { value1: '', value2: '', description: '' },
    { value1: '', value2: '', description: '' },
    { value1: '', value2: '', description: '' },
  ]);

  // New architecture: Characters with archetype, contradiction, bond
  const [storyCharacters, setStoryCharacters] = useState<StoryCharacterInput[]>([
    { name: '', archetype: 'fallen_idealist', contradiction: '', bond: '', traits: [], description: '' },
  ]);

  // New architecture: World Rules
  const [worldRules, setWorldRules] = useState<WorldRuleInput[]>([
    { rule: 'Violence always creates revenge cycles', category: 'violence' },
    { rule: 'Secrets surface at the worst moments', category: 'secrets' },
    { rule: 'Trust once broken takes 3x effort to repair', category: 'trust' },
  ]);

  // New architecture: Ending Dimensions
  const [endingDimensions, setEndingDimensions] = useState<EndingDimensionInput[]>([
    { name: '', lowEnd: '', highEnd: '' },
    { name: '', lowEnd: '', highEnd: '' },
  ]);

  // Legacy - kept for compatibility
  const [characters, setCharacters] = useState<CharacterInput[]>([
    { name: '', description: '', personality: '', role: 'protagonist', initialRelationship: 0 },
  ]);

  const [endings, setEndings] = useState<EndingScenarioInput[]>([
    { type: 'good', description: '' },
    { type: 'bad', description: '' },
    { type: 'neutral', description: '' },
  ]);

  const [config, setConfig] = useState<GraphGenerationConfig>(DEFAULT_CONFIG);

  // Navigation - new architecture steps
  const steps: Step[] = ['basics', 'conflicts', 'characters', 'rules', 'endings', 'config'];
  const currentStepIndex = steps.indexOf(step);

  const canGoNext = useCallback(() => {
    switch (step) {
      case 'basics':
        return title.trim() && plot.trim() && coreTension.trim() && beginningScenario.trim() && tags.length > 0;
      case 'conflicts':
        // Need at least 3 value conflicts with both values filled
        return valueConflicts.filter(c => c.value1.trim() && c.value2.trim()).length >= 3;
      case 'characters':
        // Need at least 2 characters with required fields
        return storyCharacters.filter(c =>
          c.name.trim() && c.archetype && c.contradiction.trim() && c.bond.trim()
        ).length >= 2;
      case 'rules':
        // Need at least 5 world rules
        return worldRules.filter(r => r.rule.trim()).length >= 5;
      case 'endings':
        // Need at least 2 ending dimensions
        return endingDimensions.filter(d => d.name.trim() && d.lowEnd.trim() && d.highEnd.trim()).length >= 2;
      case 'config':
        return true;
      default:
        return false;
    }
  }, [step, title, plot, coreTension, beginningScenario, tags, valueConflicts, storyCharacters, worldRules, endingDimensions]);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStep('generating');
    setError(null);
    setGenerationProgress('Preparing story input...');

    try {
      const input: StoryCreationInput = {
        title,
        plot,
        beginningScenario,
        tags,
        difficulty,
        estimatedMinutes,
        worldSettings,
        characters,
        endingScenarios: endings,
      };

      setGenerationProgress('Generating characters and world state...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setGenerationProgress('Building narrative graph with AI...');
      const response = await apiClient.generateStory(input, config);

      if (!response.success || !response.graph) {
        throw new Error(response.error || 'Failed to generate story');
      }

      setGenerationProgress('Story generated successfully!');
      await new Promise(resolve => setTimeout(resolve, 500));

      onGenerated(response.graph);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      setStep('config');
    } finally {
      setIsGenerating(false);
    }
  };

  // Character management
  const addCharacter = () => {
    setCharacters([...characters, {
      name: '',
      description: '',
      personality: '',
      role: 'neutral',
      initialRelationship: 0,
    }]);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const updateCharacter = (index: number, updates: Partial<CharacterInput>) => {
    setCharacters(characters.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  // Ending management
  const addEnding = () => {
    setEndings([...endings, { type: 'neutral', description: '' }]);
  };

  const removeEnding = (index: number) => {
    if (endings.length > 1) {
      setEndings(endings.filter((_, i) => i !== index));
    }
  };

  const updateEnding = (index: number, updates: Partial<EndingScenarioInput>) => {
    setEndings(endings.map((e, i) => i === index ? { ...e, ...updates } : e));
  };

  // Theme management
  const addTheme = (theme: string) => {
    if (theme && !worldSettings.themes.includes(theme)) {
      setWorldSettings({ ...worldSettings, themes: [...worldSettings.themes, theme] });
    }
  };

  const removeTheme = (theme: string) => {
    setWorldSettings({
      ...worldSettings,
      themes: worldSettings.themes.filter(t => t !== theme),
    });
  };

  // Tag management
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Value Conflict management
  const addValueConflict = () => {
    setValueConflicts([...valueConflicts, { value1: '', value2: '', description: '' }]);
  };

  const removeValueConflict = (index: number) => {
    if (valueConflicts.length > 3) {
      setValueConflicts(valueConflicts.filter((_, i) => i !== index));
    }
  };

  const updateValueConflict = (index: number, updates: Partial<ValueConflictInput>) => {
    setValueConflicts(valueConflicts.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const applyPresetConflict = (preset: typeof COMMON_VALUE_CONFLICTS[0], index: number) => {
    updateValueConflict(index, preset);
  };

  // Story Character management (new architecture)
  const addStoryCharacter = () => {
    setStoryCharacters([...storyCharacters, {
      name: '',
      archetype: 'fallen_idealist',
      contradiction: '',
      bond: '',
      traits: [],
      description: '',
    }]);
  };

  const removeStoryCharacter = (index: number) => {
    if (storyCharacters.length > 2) {
      setStoryCharacters(storyCharacters.filter((_, i) => i !== index));
    }
  };

  const updateStoryCharacter = (index: number, updates: Partial<StoryCharacterInput>) => {
    setStoryCharacters(storyCharacters.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const addCharacterTrait = (charIndex: number, trait: string) => {
    if (trait.trim() && storyCharacters[charIndex].traits.length < 5) {
      const updated = [...storyCharacters];
      updated[charIndex] = {
        ...updated[charIndex],
        traits: [...updated[charIndex].traits, trait.trim()],
      };
      setStoryCharacters(updated);
    }
  };

  const removeCharacterTrait = (charIndex: number, traitIndex: number) => {
    const updated = [...storyCharacters];
    updated[charIndex] = {
      ...updated[charIndex],
      traits: updated[charIndex].traits.filter((_, i) => i !== traitIndex),
    };
    setStoryCharacters(updated);
  };

  // World Rule management
  const addWorldRule = () => {
    setWorldRules([...worldRules, { rule: '', category: 'custom' }]);
  };

  const removeWorldRule = (index: number) => {
    if (worldRules.length > 5) {
      setWorldRules(worldRules.filter((_, i) => i !== index));
    }
  };

  const updateWorldRule = (index: number, updates: Partial<WorldRuleInput>) => {
    setWorldRules(worldRules.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  // Ending Dimension management
  const addEndingDimension = () => {
    if (endingDimensions.length < 3) {
      setEndingDimensions([...endingDimensions, { name: '', lowEnd: '', highEnd: '' }]);
    }
  };

  const removeEndingDimension = (index: number) => {
    if (endingDimensions.length > 2) {
      setEndingDimensions(endingDimensions.filter((_, i) => i !== index));
    }
  };

  const updateEndingDimension = (index: number, updates: Partial<EndingDimensionInput>) => {
    setEndingDimensions(endingDimensions.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <BackIcon />
          <span>Back</span>
        </button>
        <h1 className={styles.title}>Create Your Story</h1>
        <div className={styles.stepIndicator}>
          {steps.map((s, i) => (
            <div
              key={s}
              className={`${styles.stepDot} ${i <= currentStepIndex ? styles.stepActive : ''}`}
            />
          ))}
        </div>
      </header>

      {error && (
        <motion.div
          className={styles.error}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 'basics' && (
          <motion.div
            key="basics"
            className={styles.stepContent}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className={styles.stepTitle}>Story Basics</h2>
            <p className={styles.stepDescription}>
              Start with the core concept of your interactive narrative.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Story Title *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="The Crimson Conspiracy"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Plot Summary *</label>
              <textarea
                className={styles.textarea}
                placeholder="A gripping tale of intrigue where the player must navigate a web of political conspiracies, make impossible choices, and face the consequences of their decisions..."
                value={plot}
                onChange={e => setPlot(e.target.value)}
                rows={3}
              />
              <span className={styles.hint}>
                Brief overview of the story.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Core Tension * (The Central Conflict)</label>
              <textarea
                className={styles.textarea}
                placeholder="An amnesiac enforcer discovers he may be the perpetrator of a massacre, torn between uncovering the truth and protecting those he now loves..."
                value={coreTension}
                onChange={e => setCoreTension(e.target.value)}
                rows={3}
              />
              <span className={styles.hint}>
                1-3 sentences describing the central dramatic conflict. This drives all the hard choices in your story.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Opening Scenario *</label>
              <textarea
                className={styles.textarea}
                placeholder="The player arrives at a gala event, unaware that tonight's events will change everything. They must decide who to trust..."
                value={beginningScenario}
                onChange={e => setBeginningScenario(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Genre Tags * (select at least one)</label>
              <div className={styles.tagGrid}>
                {AVAILABLE_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.tagButton} ${tags.includes(tag) ? styles.tagSelected : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Difficulty</label>
                <select
                  className={styles.select}
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'challenging')}
                >
                  <option value="easy">Easy - Forgiving choices</option>
                  <option value="medium">Medium - Balanced challenge</option>
                  <option value="challenging">Challenging - Every choice matters</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Estimated Time (minutes)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={estimatedMinutes}
                  onChange={e => setEstimatedMinutes(parseInt(e.target.value) || 20)}
                  min={10}
                  max={60}
                />
              </div>
            </div>
          </motion.div>
        )}

        {step === 'world' && (
          <motion.div
            key="world"
            className={styles.stepContent}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className={styles.stepTitle}>World Settings</h2>
            <p className={styles.stepDescription}>
              Define the world where your story takes place.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Setting *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="A rain-soaked cyberpunk metropolis, a medieval castle, a space station..."
                value={worldSettings.setting}
                onChange={e => setWorldSettings({ ...worldSettings, setting: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Time Period</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Near future (2087), Victorian era, Fantasy medieval..."
                value={worldSettings.timePeriod}
                onChange={e => setWorldSettings({ ...worldSettings, timePeriod: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Mood/Atmosphere *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Tense and paranoid, cozy yet mysterious, dark and oppressive..."
                value={worldSettings.mood}
                onChange={e => setWorldSettings({ ...worldSettings, mood: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Key Themes (optional - what moral questions should players face?)</label>
              <div className={styles.themeInputRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., 'loyalty vs truth', 'power corrupts'"
                  id="theme-input"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTheme((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.addThemeButton}
                  onClick={() => {
                    const input = document.getElementById('theme-input') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      addTheme(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Add
                </button>
              </div>
              <div className={styles.themeList}>
                {worldSettings.themes.map(theme => (
                  <span key={theme} className={styles.themeTag}>
                    {theme}
                    <button type="button" onClick={() => removeTheme(theme)}>x</button>
                  </span>
                ))}
              </div>
              <span className={styles.hint}>
                Press Enter to add. Themes guide the moral dilemmas in your story.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Special Rules (optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Magic has a cost, information is currency, trust is fragile..."
                value={worldSettings.specialRules}
                onChange={e => setWorldSettings({ ...worldSettings, specialRules: e.target.value })}
                rows={2}
              />
            </div>
          </motion.div>
        )}

        {step === 'characters' && (
          <motion.div
            key="characters"
            className={styles.stepContent}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className={styles.stepTitle}>Key Characters</h2>
            <p className={styles.stepDescription}>
              Define the characters players will interact with. Each should have their own agenda.
            </p>

            <div className={styles.characterList}>
              {characters.map((char, index) => (
                <div key={index} className={styles.characterCard}>
                  <div className={styles.characterHeader}>
                    <span className={styles.characterNumber}>Character {index + 1}</span>
                    {characters.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeCharacter(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className={styles.characterFields}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Name *</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Victoria Ashworth"
                          value={char.name}
                          onChange={e => updateCharacter(index, { name: e.target.value })}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Role</label>
                        <select
                          className={styles.select}
                          value={char.role}
                          onChange={e => updateCharacter(index, { role: e.target.value as CharacterInput['role'] })}
                        >
                          <option value="protagonist">Protagonist (ally)</option>
                          <option value="antagonist">Antagonist (opponent)</option>
                          <option value="ally">Ally (helpful)</option>
                          <option value="neutral">Neutral (unpredictable)</option>
                          <option value="wildcard">Wildcard (chaotic)</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Description *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="The family matriarch, elegant but hiding dark secrets"
                        value={char.description}
                        onChange={e => updateCharacter(index, { description: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Personality</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Calculating, manipulative, desperate to maintain control"
                        value={char.personality}
                        onChange={e => updateCharacter(index, { personality: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Initial Relationship: {char.initialRelationship}
                      </label>
                      <input
                        type="range"
                        className={styles.slider}
                        min={-100}
                        max={100}
                        value={char.initialRelationship}
                        onChange={e => updateCharacter(index, { initialRelationship: parseInt(e.target.value) })}
                      />
                      <div className={styles.sliderLabels}>
                        <span>Hostile</span>
                        <span>Neutral</span>
                        <span>Friendly</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className={styles.addButton} onClick={addCharacter}>
              <PlusIcon /> Add Character
            </button>
          </motion.div>
        )}

        {step === 'endings' && (
          <motion.div
            key="endings"
            className={styles.stepContent}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className={styles.stepTitle}>Possible Endings</h2>
            <p className={styles.stepDescription}>
              Define the different ways your story can conclude. Players' choices will lead them to these outcomes.
            </p>

            <div className={styles.endingList}>
              {endings.map((ending, index) => (
                <div key={index} className={`${styles.endingCard} ${styles[`ending${ending.type}`]}`}>
                  <div className={styles.endingHeader}>
                    <select
                      className={styles.endingType}
                      value={ending.type}
                      onChange={e => updateEnding(index, { type: e.target.value as EndingScenarioInput['type'] })}
                    >
                      <option value="good">Good Ending</option>
                      <option value="neutral">Neutral Ending</option>
                      <option value="bad">Bad Ending</option>
                      <option value="secret">Secret Ending</option>
                    </select>
                    {endings.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeEnding(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Description *</label>
                    <textarea
                      className={styles.textarea}
                      placeholder={`What happens in this ${ending.type} ending? What did the player achieve or lose?`}
                      value={ending.description}
                      onChange={e => updateEnding(index, { description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Conditions (optional)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="What choices/states lead here? (e.g., 'high trust, kept promises')"
                      value={ending.conditions || ''}
                      onChange={e => updateEnding(index, { conditions: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className={styles.addButton} onClick={addEnding}>
              <PlusIcon /> Add Ending
            </button>
          </motion.div>
        )}

        {step === 'config' && (
          <motion.div
            key="config"
            className={styles.stepContent}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className={styles.stepTitle}>Generation Settings</h2>
            <p className={styles.stepDescription}>
              Fine-tune how the AI builds your story graph.
            </p>

            <div className={styles.configGrid}>
              <div className={styles.configCard}>
                <h3>Story Size</h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Minimum Story Nodes: {config.minStoryNodes}
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min={5}
                    max={20}
                    value={config.minStoryNodes}
                    onChange={e => setConfig({ ...config, minStoryNodes: parseInt(e.target.value) })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Maximum Story Nodes: {config.maxStoryNodes}
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min={config.minStoryNodes}
                    max={30}
                    value={config.maxStoryNodes}
                    onChange={e => setConfig({ ...config, maxStoryNodes: parseInt(e.target.value) })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Entry Scenarios: {config.entryScenarios}
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min={1}
                    max={4}
                    value={config.entryScenarios}
                    onChange={e => setConfig({ ...config, entryScenarios: parseInt(e.target.value) })}
                  />
                  <span className={styles.hint}>Different starting points for replayability</span>
                </div>
              </div>

              <div className={styles.configCard}>
                <h3>Conflict Intensity</h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Intensity: {Math.round(config.conflictIntensity * 100)}%
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min={30}
                    max={100}
                    value={config.conflictIntensity * 100}
                    onChange={e => setConfig({ ...config, conflictIntensity: parseInt(e.target.value) / 100 })}
                  />
                  <div className={styles.sliderLabels}>
                    <span>Light</span>
                    <span>Balanced</span>
                    <span>Agonizing</span>
                  </div>
                  <span className={styles.hint}>
                    Higher = harder choices with no clear "right" answer
                  </span>
                </div>
              </div>

              <div className={styles.configCard}>
                <h3>Graph Structure</h3>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={config.includeBranchNodes}
                      onChange={e => setConfig({ ...config, includeBranchNodes: e.target.checked })}
                    />
                    <span>Include branch nodes (automatic routing based on state)</span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={config.includeConvergeNodes}
                      onChange={e => setConfig({ ...config, includeConvergeNodes: e.target.checked })}
                    />
                    <span>Include converge nodes (paths merging together)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.summary}>
              <h3>Story Summary</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Title</span>
                  <span className={styles.summaryValue}>{title}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Characters</span>
                  <span className={styles.summaryValue}>{characters.length}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Endings</span>
                  <span className={styles.summaryValue}>{endings.length}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Tags</span>
                  <span className={styles.summaryValue}>{tags.join(', ')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'generating' && (
          <motion.div
            key="generating"
            className={styles.generatingContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={styles.generatingSpinner}>
              <div className={styles.spinner}></div>
            </div>
            <h2 className={styles.generatingTitle}>Generating Your Story</h2>
            <p className={styles.generatingStatus}>{generationProgress}</p>
            <p className={styles.generatingHint}>
              The AI is crafting a narrative filled with difficult choices and meaningful consequences...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'generating' && (
        <div className={styles.navigation}>
          <button
            className={styles.navButton}
            onClick={step === 'basics' ? onBack : goBack}
          >
            {step === 'basics' ? 'Cancel' : 'Back'}
          </button>

          {step === 'config' ? (
            <button
              className={`${styles.navButton} ${styles.primary}`}
              onClick={handleGenerate}
              disabled={!canGoNext() || isGenerating}
            >
              Generate Story
            </button>
          ) : (
            <button
              className={`${styles.navButton} ${styles.primary}`}
              onClick={goNext}
              disabled={!canGoNext()}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Icons
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
