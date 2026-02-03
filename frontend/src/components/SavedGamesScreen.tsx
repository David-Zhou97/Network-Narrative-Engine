import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import styles from './SavedGamesScreen.module.css';

export function SavedGamesScreen(): React.ReactElement {
  const { savedGames, loadGame, deleteSave, setCurrentScreen, isLoading, error } = useGame();

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => setCurrentScreen('title')}
          >
            <BackIcon />
          </button>
          <h1 className={styles.title}>Saved Games</h1>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {savedGames.length === 0 ? (
          <div className={styles.empty}>
            <p>No saved games yet.</p>
            <p className={styles.emptyHint}>Start a new story and save your progress!</p>
          </div>
        ) : (
          <div className={styles.saveList}>
            {savedGames.map((save, index) => (
              <motion.div
                key={save.id}
                className={styles.saveCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={styles.saveInfo}>
                  <h3 className={styles.saveTitle}>{save.narrativeTitle}</h3>
                  <div className={styles.saveMeta}>
                    <span>{formatDate(save.savedAt)}</span>
                    <span className={styles.separator}>•</span>
                    <span>{save.turnCount} turns</span>
                  </div>
                </div>
                <div className={styles.saveActions}>
                  <button
                    className={styles.loadButton}
                    onClick={() => loadGame(save.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Continue'}
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => deleteSave(save.id)}
                    aria-label="Delete save"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
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

function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
