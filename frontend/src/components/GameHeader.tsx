import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import styles from './GameHeader.module.css';

export function GameHeader(): React.ReactElement {
  const {
    storyMetadata,
    restartGame,
    saveGame,
    worldState,
    turnHistory,
  } = useGame();

  const [showMenu, setShowMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <button
          className={styles.menuButton}
          onClick={() => setShowMenu(true)}
          aria-label="Menu"
        >
          <MenuIcon />
        </button>

        <div className={styles.titleArea}>
          <h1 className={styles.title}>{storyMetadata?.title ?? 'Story'}</h1>
          <span className={styles.turnCount}>Turn {turnHistory.length}</span>
        </div>

        <button
          className={styles.statsButton}
          onClick={() => setShowStats(true)}
          aria-label="View stats"
        >
          <StatsIcon />
        </button>
      </header>

      {/* Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              className={styles.menuPanel}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.menuHeader}>
                <h2>Menu</h2>
                <button onClick={() => setShowMenu(false)}>
                  <CloseIcon />
                </button>
              </div>

              <nav className={styles.menuNav}>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    saveGame();
                    setShowMenu(false);
                  }}
                >
                  <SaveIcon />
                  <span>Save Game</span>
                </button>

                <button
                  className={styles.menuItem}
                  onClick={() => {
                    if (confirm('Restart the story? Your progress will be lost.')) {
                      restartGame();
                    }
                  }}
                >
                  <RestartIcon />
                  <span>Restart Story</span>
                </button>

                <button
                  className={styles.menuItem}
                  onClick={() => {
                    if (confirm('Exit to title? Your unsaved progress will be lost.')) {
                      restartGame();
                    }
                  }}
                >
                  <ExitIcon />
                  <span>Exit to Title</span>
                </button>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overlay */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStats(false)}
          >
            <motion.div
              className={styles.statsPanel}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.statsHeader}>
                <h2>Your Progress</h2>
                <button onClick={() => setShowStats(false)}>
                  <CloseIcon />
                </button>
              </div>

              <div className={styles.statsContent}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Turns Played</span>
                  <span className={styles.statValue}>{turnHistory.length}</span>
                </div>

                {worldState && (
                  <>
                    {Object.entries(worldState.player).map(([key, value]) => (
                      <div key={key} className={styles.statItem}>
                        <span className={styles.statLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <span className={styles.statValue}>{String(value)}</span>
                      </div>
                    ))}

                    {Object.entries(worldState.characters).length > 0 && (
                      <div className={styles.statSection}>
                        <h3>Relationships</h3>
                        {Object.entries(worldState.characters).map(([charId, instance]) => (
                          <div key={charId} className={styles.relationshipItem}>
                            <span>{instance.character.name}</span>
                            <div className={styles.relationshipBar}>
                              <div
                                className={styles.relationshipFill}
                                style={{
                                  width: `${(instance.relationship + 100) / 2}%`,
                                  background: instance.relationship >= 0
                                    ? 'var(--color-choice-positive)'
                                    : 'var(--color-choice-negative)',
                                }}
                              />
                            </div>
                            <span>{instance.relationship}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Icons
function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
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

function ExitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
