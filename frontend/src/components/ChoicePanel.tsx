import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import type { PlayerChoice } from '../types';
import styles from './ChoicePanel.module.css';

interface ChoicePanelProps {
  choices: PlayerChoice[];
  isLoading: boolean;
}

export function ChoicePanel({ choices, isLoading }: ChoicePanelProps): React.ReactElement {
  const { makeChoice, openCustomResponse } = useGame();

  const handleChoiceClick = (index: number) => {
    if (!isLoading) {
      makeChoice(index);
    }
  };

  const handleCustomize = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    openCustomResponse(index);
  };

  // Ensure we always show 3 choices (or loading placeholders)
  const displayChoices = choices.length >= 3
    ? choices.slice(0, 3)
    : [...choices, ...Array(3 - choices.length).fill(null)];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Choose Your Path</span>
        <span className={styles.hint}>Hold to customize</span>
      </div>

      <div className={styles.choiceList}>
        {displayChoices.map((choice, index) => (
          <motion.div
            key={index}
            className={styles.choiceWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.1 }}
          >
            {choice ? (
              <button
                className={`${styles.choiceButton} ${styles[`tone${getToneClass(choice.tone)}`]}`}
                onClick={() => handleChoiceClick(index)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleCustomize(index, e);
                }}
                disabled={isLoading}
              >
                <div className={styles.choiceNumber}>
                  <span>{index + 1}</span>
                </div>
                <div className={styles.choiceContent}>
                  <p className={styles.choiceText}>{choice.text}</p>
                  <span className={styles.toneBadge}>
                    {getToneIcon(choice.tone)} {choice.tone}
                  </span>
                </div>
                <button
                  className={styles.customizeButton}
                  onClick={(e) => handleCustomize(index, e)}
                  aria-label="Customize this choice"
                >
                  <EditIcon />
                </button>
              </button>
            ) : (
              <div className={styles.choicePlaceholder}>
                <span>Path {index + 1} unavailable</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Making your choice...</span>
        </div>
      )}
    </div>
  );
}

function getToneClass(tone: string): string {
  switch (tone) {
    case 'positive':
      return 'Positive';
    case 'negative':
      return 'Negative';
    default:
      return 'Neutral';
  }
}

function getToneIcon(tone: string): string {
  switch (tone) {
    case 'positive':
      return '';
    case 'negative':
      return '';
    default:
      return '';
  }
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
