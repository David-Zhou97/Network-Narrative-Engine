import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import detectiveStory from '../../../examples/detective-mystery.json';
import type { NarrativeDefinition } from '../types';
import styles from './TitleScreen.module.css';

export function TitleScreen(): React.ReactElement {
  const { loadStory, savedGames, setCurrentScreen } = useGame();

  const handleNewStory = () => {
    loadStory(detectiveStory as NarrativeDefinition);
  };

  const handleContinue = () => {
    // For now, just load the story and go to story select
    loadStory(detectiveStory as NarrativeDefinition);
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.titleGroup}>
          <motion.div
            className={styles.iconWrapper}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <BookIcon />
          </motion.div>
          <h1 className={styles.title}>Story Engine</h1>
          <p className={styles.subtitle}>Interactive Narrative Adventures</p>
        </div>

        <motion.div
          className={styles.buttonGroup}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button className={styles.primaryButton} onClick={handleNewStory}>
            <PlayIcon />
            <span>New Story</span>
          </button>

          {savedGames.length > 0 && (
            <button className={styles.secondaryButton} onClick={handleContinue}>
              <ContinueIcon />
              <span>Continue</span>
            </button>
          )}

          <button
            className={styles.tertiaryButton}
            onClick={() => setCurrentScreen('settings')}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
        </motion.div>

        <motion.p
          className={styles.version}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Powered by Network Narrative Engine
        </motion.p>
      </motion.div>

      <div className={styles.backgroundDecoration}>
        <div className={styles.gradientOrb} />
        <div className={styles.gradientOrb2} />
      </div>
    </div>
  );
}

// Icons
function BookIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ContinueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
