// Re-export types from the narrative engine
export type {
  NarrativeDefinition,
  NarrativeMetadata,
  Character,
  NarrativeNode,
  EntryNode,
  StoryNode,
  BranchNode,
  ConvergeNode,
  EndingNode,
  Edge,
  WorldState,
  GameSession,
  TurnResult,
  GeneratedDialogue,
  PlayerChoice,
  EndingResult,
} from '../../../src/types/narrative';

// Import PlayerChoice for local use
import type { PlayerChoice } from '../../../src/types/narrative';

// Frontend-specific types
export type GameScreen =
  | 'title'
  | 'marketplace'
  | 'saved-games'
  | 'story-select'
  | 'playing'
  | 'ending'
  | 'settings';

export interface SavedGame {
  id: string;
  narrativeId: string;
  narrativeTitle: string;
  sessionData: string;
  savedAt: number;
  turnCount: number;
  currentNodeId?: string;
}

export interface GameSettings {
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  autoScroll: boolean;
}

export type ChoiceTone = 'positive' | 'neutral' | 'negative';

export interface CustomResponseState {
  isOpen: boolean;
  baseChoice: PlayerChoice | null;
  choiceIndex: number | null;
}
