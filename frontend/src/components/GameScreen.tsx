import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { NarrationDisplay } from './NarrationDisplay';
import { DialogueBubble } from './DialogueBubble';
import { ChoicePanel } from './ChoicePanel';
import { CustomResponseDialog } from './CustomResponseDialog';
import { GameHeader } from './GameHeader';
import styles from './GameScreen.module.css';

export function GameScreen(): React.ReactElement {
  const {
    currentTurn,
    isLoading,
    error,
    settings,
    customResponse,
  } = useGame();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    if (settings.autoScroll && scrollContainerRef.current && currentTurn) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [currentTurn, settings.autoScroll]);

  if (!currentTurn) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading your adventure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <GameHeader />

      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        <div className={styles.content}>
          {/* Narration */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <NarrationDisplay
              text={currentTurn.narration}
              textSpeed={settings.textSpeed}
            />
          </motion.div>

          {/* Dialogues */}
          <AnimatePresence mode="wait">
            {currentTurn.dialogues && currentTurn.dialogues.length > 0 && (
              <motion.div
                className={styles.dialogueSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {currentTurn.dialogues.map((dialogue, index) => (
                  <motion.div
                    key={`${dialogue.characterId}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.15 }}
                  >
                    <DialogueBubble
                      characterId={dialogue.characterId}
                      text={dialogue.text}
                      emotion={dialogue.emotion}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          {error && (
            <motion.div
              className={styles.errorMessage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ErrorIcon />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Choice Panel - Fixed at bottom */}
      <ChoicePanel
        choices={currentTurn.choices}
        isLoading={isLoading}
        isPointOfNoReturn={currentTurn.isPointOfNoReturn}
      />

      {/* Custom Response Dialog */}
      <AnimatePresence>
        {customResponse.isOpen && <CustomResponseDialog />}
      </AnimatePresence>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
