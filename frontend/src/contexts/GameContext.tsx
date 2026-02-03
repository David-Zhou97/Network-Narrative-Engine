import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { NarrativeEngine } from '../../../src/engine/NarrativeEngine';
import { DialogueGenerator, MockAIClient } from '../../../src/ai/DialogueGenerator';
import { apiClient } from '../api/client';
import type {
  NarrativeDefinition,
  NarrativeMetadata,
  EntryNode,
  GameSession,
  WorldState,
  GameScreen,
  SavedGame,
  GameSettings,
  CustomResponseState,
} from '../types';
import type { TurnResult, EndingResult } from '../../../src/types/narrative';

interface GameContextValue {
  // API status
  isApiAvailable: boolean;

  // Screen navigation
  currentScreen: GameScreen;
  setCurrentScreen: (screen: GameScreen) => void;

  // Story management
  loadedStory: NarrativeDefinition | null;
  storyMetadata: NarrativeMetadata | null;
  loadStory: (story: NarrativeDefinition) => void;
  unloadStory: () => void;

  // Scenario selection
  availableScenarios: EntryNode[];
  selectScenario: (scenarioId: string) => Promise<void>;

  // Game session
  session: GameSession | null;
  currentTurn: TurnResult | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  makeChoice: (choiceIndex: number, customResponse?: string) => Promise<void>;
  restartGame: () => void;

  // Custom response
  customResponse: CustomResponseState;
  openCustomResponse: (choiceIndex: number) => void;
  closeCustomResponse: () => void;
  submitCustomResponse: (text: string) => Promise<void>;

  // World state
  worldState: WorldState | null;

  // Ending
  endingResult: EndingResult | null;

  // Saved games
  savedGames: SavedGame[];
  saveGame: () => void;
  loadGame: (saveId: string) => Promise<void>;
  deleteSave: (saveId: string) => void;

  // Settings
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;

  // Turn history for display
  turnHistory: TurnResult[];
}

const defaultSettings: GameSettings = {
  textSpeed: 'normal',
  soundEnabled: true,
  vibrationEnabled: true,
  fontSize: 'medium',
  autoScroll: true,
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: React.ReactNode;
}

export function GameProvider({ children }: GameProviderProps): React.ReactElement {
  // Refs
  const engineRef = useRef<NarrativeEngine | null>(null);

  // API status
  const [isApiAvailable, setIsApiAvailable] = useState(false);

  // Screen state
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('title');

  // Story state
  const [loadedStory, setLoadedStory] = useState<NarrativeDefinition | null>(null);
  const [storyMetadata, setStoryMetadata] = useState<NarrativeMetadata | null>(null);
  const [availableScenarios, setAvailableScenarios] = useState<EntryNode[]>([]);

  // Game session state
  const [session, setSession] = useState<GameSession | null>(null);
  const [currentTurn, setCurrentTurn] = useState<TurnResult | null>(null);
  const [turnHistory, setTurnHistory] = useState<TurnResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom response state
  const [customResponse, setCustomResponse] = useState<CustomResponseState>({
    isOpen: false,
    baseChoice: null,
    choiceIndex: null,
  });

  // Ending state
  const [endingResult, setEndingResult] = useState<EndingResult | null>(null);

  // Saved games
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);

  // Check API availability and load saved data on mount
  useEffect(() => {
    // Check if backend API is available
    apiClient.checkHealth().then((available) => {
      setIsApiAvailable(available);
      if (available) {
        console.log('Backend API connected - AI generation enabled');
      } else {
        console.log('Backend API not available - using mock responses');
      }
    });

    // Load saved games and settings
    try {
      const savedGamesData = localStorage.getItem('narrative-saved-games');
      if (savedGamesData) {
        setSavedGames(JSON.parse(savedGamesData));
      }

      const savedSettings = localStorage.getItem('narrative-settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (err) {
      console.error('Failed to load saved data:', err);
    }
  }, []);

  // Save games to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('narrative-saved-games', JSON.stringify(savedGames));
    } catch (err) {
      console.error('Failed to save games:', err);
    }
  }, [savedGames]);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('narrative-settings', JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [settings]);

  // Load a story definition
  const loadStory = useCallback((story: NarrativeDefinition) => {
    try {
      const engine = new NarrativeEngine(story);

      // Set up AI provider - use API client if available, otherwise mock
      const client = isApiAvailable ? apiClient : new MockAIClient();
      const dialogueGenerator = new DialogueGenerator(
        { temperature: 0.8, maxTokens: 1024 },
        client
      );
      engine.setAIProvider(dialogueGenerator);

      engineRef.current = engine;
      setLoadedStory(story);
      setStoryMetadata(engine.getMetadata());
      setAvailableScenarios(engine.getStartingScenarios());
      setError(null);
      setCurrentScreen('story-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story');
    }
  }, [isApiAvailable]);

  // Unload the current story
  const unloadStory = useCallback(() => {
    engineRef.current = null;
    setLoadedStory(null);
    setStoryMetadata(null);
    setAvailableScenarios([]);
    setSession(null);
    setCurrentTurn(null);
    setTurnHistory([]);
    setEndingResult(null);
    setError(null);
    setCurrentScreen('title');
  }, []);

  // Select a scenario and start the game
  const selectScenario = useCallback(async (scenarioId: string) => {
    const engine = engineRef.current;
    if (!engine) {
      setError('No story loaded');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const gameSession = engine.startSession(scenarioId);
      setSession(gameSession);

      const turn = await engine.getCurrentTurn();
      setCurrentTurn(turn);
      setTurnHistory([turn]);
      setCurrentScreen('playing');

      if (turn.isEnding && turn.ending) {
        setEndingResult(turn.ending);
        setCurrentScreen('ending');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Make a choice
  const makeChoice = useCallback(async (choiceIndex: number, customResponse?: string) => {
    const engine = engineRef.current;
    if (!engine) {
      setError('No active game session');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If there's a custom response, we could potentially send it to the AI
      // For now, we just use the choice index
      const turn = await engine.makeChoice(choiceIndex);
      setCurrentTurn(turn);
      setTurnHistory(prev => [...prev, turn]);
      setSession(engine.getSession());

      if (turn.isEnding && turn.ending) {
        setEndingResult(turn.ending);
        setCurrentScreen('ending');
      }

      // Vibrate on choice (if enabled)
      if (settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make choice');
    } finally {
      setIsLoading(false);
    }
  }, [settings.vibrationEnabled]);

  // Restart the game
  const restartGame = useCallback(() => {
    setSession(null);
    setCurrentTurn(null);
    setTurnHistory([]);
    setEndingResult(null);
    setError(null);
    setCurrentScreen('story-select');
  }, []);

  // Custom response handlers
  const openCustomResponse = useCallback((choiceIndex: number) => {
    if (!currentTurn?.choices[choiceIndex]) return;
    setCustomResponse({
      isOpen: true,
      baseChoice: currentTurn.choices[choiceIndex],
      choiceIndex,
    });
  }, [currentTurn]);

  const closeCustomResponse = useCallback(() => {
    setCustomResponse({
      isOpen: false,
      baseChoice: null,
      choiceIndex: null,
    });
  }, []);

  const submitCustomResponse = useCallback(async (text: string) => {
    if (customResponse.choiceIndex === null) return;
    await makeChoice(customResponse.choiceIndex, text);
    closeCustomResponse();
  }, [customResponse.choiceIndex, makeChoice, closeCustomResponse]);

  // Get world state
  const worldState = engineRef.current?.getWorldState() ?? null;

  // Save game
  const saveGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !storyMetadata) return;

    const sessionData = engine.exportSession();
    const currentState = engine.getWorldState();
    const save: SavedGame = {
      id: `save-${Date.now()}`,
      narrativeId: storyMetadata.id,
      narrativeTitle: storyMetadata.title,
      sessionData,
      savedAt: Date.now(),
      turnCount: turnHistory.length,
      currentNodeId: currentState?.currentNodeId,
    };

    setSavedGames(prev => [save, ...prev.slice(0, 9)]); // Keep max 10 saves

    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  }, [storyMetadata, turnHistory.length, settings.vibrationEnabled]);

  // Load game
  const loadGame = useCallback(async (saveId: string) => {
    const save = savedGames.find(s => s.id === saveId);
    if (!save) {
      setError('Save not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse the saved session data
      const savedSession = JSON.parse(save.sessionData);

      // Ensure the story is loaded
      if (!loadedStory || storyMetadata?.id !== save.narrativeId) {
        // For now we only support the detective story
        // In a full implementation, this would fetch the story by ID
        const detectiveStory = await import('../../../examples/detective-mystery.json');
        loadStory(detectiveStory.default as NarrativeDefinition);
      }

      // Wait a tick for the engine to be set up
      await new Promise(resolve => setTimeout(resolve, 50));

      const engine = engineRef.current;
      if (!engine) {
        throw new Error('Failed to initialize game engine');
      }

      // Resume the saved session
      engine.resumeSession(savedSession);
      setSession(savedSession);

      // Get the current turn
      const turn = await engine.getCurrentTurn();
      setCurrentTurn(turn);
      setTurnHistory([turn]); // Start fresh history display

      setCurrentScreen('playing');

      if (turn.isEnding && turn.ending) {
        setEndingResult(turn.ending);
        setCurrentScreen('ending');
      }
    } catch (err) {
      console.error('Failed to load game:', err);
      setError(err instanceof Error ? err.message : 'Failed to load saved game');
    } finally {
      setIsLoading(false);
    }
  }, [savedGames, loadedStory, storyMetadata, loadStory]);

  // Delete save
  const deleteSave = useCallback((saveId: string) => {
    setSavedGames(prev => prev.filter(s => s.id !== saveId));
  }, []);

  // Update settings
  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const value: GameContextValue = {
    isApiAvailable,
    currentScreen,
    setCurrentScreen,
    loadedStory,
    storyMetadata,
    loadStory,
    unloadStory,
    availableScenarios,
    selectScenario,
    session,
    currentTurn,
    isLoading,
    error,
    makeChoice,
    restartGame,
    customResponse,
    openCustomResponse,
    closeCustomResponse,
    submitCustomResponse,
    worldState,
    endingResult,
    savedGames,
    saveGame,
    loadGame,
    deleteSave,
    settings,
    updateSettings,
    turnHistory,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
