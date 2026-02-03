import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import styles from './StorySelectScreen.module.css';

export function StorySelectScreen(): React.ReactElement {
  const {
    storyMetadata,
    availableScenarios,
    selectScenario,
    unloadStory,
    isLoading,
  } = useGame();

  if (!storyMetadata) {
    return <div className={styles.container}>No story loaded</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={unloadStory}>
          <BackIcon />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{storyMetadata.title}</h1>
          {storyMetadata.author && (
            <p className={styles.author}>by {storyMetadata.author}</p>
          )}
        </div>
      </header>

      <motion.div
        className={styles.content}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <p className={styles.description}>{storyMetadata.description}</p>

        {storyMetadata.tags && storyMetadata.tags.length > 0 && (
          <div className={styles.tags}>
            {storyMetadata.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className={styles.divider}>
          <span>Choose Your Beginning</span>
        </div>

        <div className={styles.scenarioList}>
          {availableScenarios.map((scenario, index) => (
            <motion.button
              key={scenario.id}
              className={styles.scenarioCard}
              onClick={() => selectScenario(scenario.id)}
              disabled={isLoading}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.scenarioNumber}>{index + 1}</div>
              <div className={styles.scenarioContent}>
                <h3 className={styles.scenarioTitle}>{scenario.title}</h3>
                <p className={styles.scenarioPreview}>{scenario.preview}</p>
              </div>
              <ChevronIcon />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Loading story...</p>
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
