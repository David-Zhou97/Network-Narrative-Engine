import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './contexts/GameContext';
import {
  TitleScreen,
  StoryMarketplace,
  SavedGamesScreen,
  StorySelectScreen,
  GameScreen,
  EndingScreen,
  SettingsScreen,
} from './components';

function AppContent(): React.ReactElement {
  const { currentScreen, settings } = useGame();

  // Apply font size class to root
  const fontSizeClass = `font-${settings.fontSize}`;

  return (
    <div className={fontSizeClass}>
      <AnimatePresence mode="wait">
        {currentScreen === 'title' && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TitleScreen />
          </motion.div>
        )}

        {currentScreen === 'marketplace' && (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StoryMarketplace />
          </motion.div>
        )}

        {currentScreen === 'saved-games' && (
          <motion.div
            key="saved-games"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SavedGamesScreen />
          </motion.div>
        )}

        {currentScreen === 'story-select' && (
          <motion.div
            key="story-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StorySelectScreen />
          </motion.div>
        )}

        {currentScreen === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%' }}
          >
            <GameScreen />
          </motion.div>
        )}

        {currentScreen === 'ending' && (
          <motion.div
            key="ending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <EndingScreen />
          </motion.div>
        )}

        {currentScreen === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <SettingsScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
