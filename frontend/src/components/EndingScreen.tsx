import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import styles from './EndingScreen.module.css';

export function EndingScreen(): React.ReactElement {
  const { endingResult, restartGame, unloadStory, storyMetadata, turnHistory } = useGame();

  if (!endingResult) {
    return <div className={styles.container}>No ending data</div>;
  }

  const endingTypeStyles = {
    good: {
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      icon: '',
      label: 'Good Ending',
    },
    neutral: {
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      icon: '',
      label: 'Neutral Ending',
    },
    bad: {
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
      icon: '',
      label: 'Bad Ending',
    },
    secret: {
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      icon: '',
      label: 'Secret Ending',
    },
  };

  const style = endingTypeStyles[endingResult.type] || endingTypeStyles.neutral;

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={styles.iconWrapper}
          style={{ background: style.gradient }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <span className={styles.icon}>{style.icon}</span>
        </motion.div>

        <motion.div
          className={styles.badge}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {style.label}
        </motion.div>

        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {endingResult.title}
        </motion.h1>

        <motion.div
          className={styles.epilogueBox}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className={styles.epilogue}>{endingResult.epilogue}</p>
        </motion.div>

        <motion.div
          className={styles.stats}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className={styles.statsTitle}>Your Journey</h3>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{endingResult.stats.turnsPlayed}</span>
              <span className={styles.statLabel}>Turns Played</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{endingResult.stats.choicesMade}</span>
              <span className={styles.statLabel}>Choices Made</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {endingResult.stats.relationshipsFormed.length}
              </span>
              <span className={styles.statLabel}>Connections</span>
            </div>
          </div>

          {endingResult.stats.relationshipsFormed.length > 0 && (
            <div className={styles.relationships}>
              <span className={styles.relationshipsLabel}>Key Relationships:</span>
              <div className={styles.relationshipTags}>
                {endingResult.stats.relationshipsFormed.map((rel, index) => (
                  <span key={index} className={styles.relationshipTag}>
                    {rel}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button className={styles.primaryButton} onClick={restartGame}>
            <RestartIcon />
            <span>Play Again</span>
          </button>

          <button className={styles.secondaryButton} onClick={unloadStory}>
            <HomeIcon />
            <span>Return to Title</span>
          </button>
        </motion.div>

        <motion.p
          className={styles.storyTitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {storyMetadata?.title}
        </motion.p>
      </motion.div>

      <div className={styles.backgroundDecoration}>
        <div className={styles.confetti} />
      </div>
    </div>
  );
}

function RestartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
