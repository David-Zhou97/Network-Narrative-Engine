import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import type { PlayerChoice } from '../types';
import styles from './ChoicePanel.module.css';

interface ChoicePanelProps {
  choices: PlayerChoice[];
  isLoading: boolean;
}

// Wildcard prompts that add excitement and unpredictability
const WILDCARD_PROMPTS = [
  "Take a chance...",
  "Trust your instincts",
  "Let fate decide",
  "Go with the flow",
  "Take the leap",
  "Embrace the unknown",
  "Roll the dice",
  "Follow your heart",
  "Surprise yourself",
  "Break the pattern",
];

export function ChoicePanel({ choices, isLoading }: ChoicePanelProps): React.ReactElement {
  const { makeChoice, openCustomResponse } = useGame();

  // Generate a random wildcard prompt (memoized per render cycle)
  const wildcardPrompt = useMemo(() => {
    return WILDCARD_PROMPTS[Math.floor(Math.random() * WILDCARD_PROMPTS.length)];
  }, [choices]);

  const handleChoiceClick = (index: number) => {
    if (!isLoading) {
      makeChoice(index);
    }
  };

  const handleWildcardClick = () => {
    if (!isLoading && choices.length > 0) {
      // Pick a random choice from available choices
      const randomIndex = Math.floor(Math.random() * Math.min(choices.length, 3));
      makeChoice(randomIndex);
    }
  };

  const handleCustomize = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    openCustomResponse(index);
  };

  // Show up to 3 regular choices
  const displayChoices = choices.slice(0, 3);

  return (
    <div className={styles.container}>
      <div className={styles.choiceList}>
        {displayChoices.map((choice, index) => (
          <motion.div
            key={index}
            className={styles.choiceWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button
              className={styles.choiceButton}
              onClick={() => handleChoiceClick(index)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleCustomize(index, e);
              }}
              disabled={isLoading}
            >
              <div className={styles.choiceContent}>
                <p className={styles.choiceText}>{choice.text}</p>
              </div>
              <button
                className={styles.customizeButton}
                onClick={(e) => handleCustomize(index, e)}
                aria-label="Customize this choice"
              >
                <EditIcon />
              </button>
            </button>
          </motion.div>
        ))}

        {/* Wildcard Option - Always present */}
        <motion.div
          className={styles.choiceWrapper}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + displayChoices.length * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <button
            className={`${styles.choiceButton} ${styles.wildcardButton}`}
            onClick={handleWildcardClick}
            disabled={isLoading || choices.length === 0}
          >
            <div className={styles.wildcardIcon}>
              <DiceIcon />
            </div>
            <div className={styles.choiceContent}>
              <p className={styles.wildcardText}>{wildcardPrompt}</p>
            </div>
            <div className={styles.wildcardGlow} />
          </button>
        </motion.div>
      </div>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner} />
            <span>Weaving your story...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
