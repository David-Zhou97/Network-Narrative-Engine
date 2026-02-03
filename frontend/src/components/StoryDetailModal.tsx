import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import type { StoryInfo } from '../data/storyRegistry';
import styles from './StoryDetailModal.module.css';

interface StoryDetailModalProps {
  story: StoryInfo;
  onClose: () => void;
}

export function StoryDetailModal({ story, onClose }: StoryDetailModalProps): React.ReactElement {
  const { loadStoryById, isLoading } = useGame();

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleBeginStory = async () => {
    await loadStoryById(story.id);
  };

  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return { class: styles.difficultyEasy, label: 'Easy', description: 'Relaxed pacing, forgiving choices' };
      case 'medium':
        return { class: styles.difficultyMedium, label: 'Medium', description: 'Balanced challenge, meaningful consequences' };
      case 'challenging':
        return { class: styles.difficultyChallenging, label: 'Challenging', description: 'Complex paths, high stakes decisions' };
      default:
        return { class: '', label: difficulty, description: '' };
    }
  };

  const difficultyInfo = getDifficultyInfo(story.difficulty);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Close Button */}
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon />
          </button>

          {/* Thumbnail */}
          <div className={styles.thumbnailSection}>
            <img src={story.thumbnail} alt={story.title} className={styles.thumbnail} />
            <div className={styles.thumbnailOverlay} />
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.title}>{story.title}</h2>
              <p className={styles.author}>by {story.author}</p>
            </div>

            {/* Tags */}
            <div className={styles.tags}>
              {story.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>

            {/* Description */}
            <div className={styles.descriptionSection}>
              <p className={styles.description}>{story.description}</p>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statIcon}>
                  <ClockIcon />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Play Time</span>
                  <span className={styles.statValue}>{story.estimatedTime}</span>
                </div>
              </div>

              <div className={styles.stat}>
                <div className={styles.statIcon}>
                  <DifficultyIcon />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Difficulty</span>
                  <span className={`${styles.statValue} ${difficultyInfo.class}`}>
                    {difficultyInfo.label}
                  </span>
                </div>
              </div>

              <div className={styles.stat}>
                <div className={styles.statIcon}>
                  <PathIcon />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Endings</span>
                  <span className={styles.statValue}>Multiple</span>
                </div>
              </div>
            </div>

            {/* Difficulty Description */}
            <div className={styles.difficultyDescription}>
              <span className={`${styles.difficultyBadge} ${difficultyInfo.class}`}>
                {difficultyInfo.label}
              </span>
              <span className={styles.difficultyText}>{difficultyInfo.description}</span>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button className={styles.cancelButton} onClick={onClose}>
                Cancel
              </button>
              <button
                className={styles.beginButton}
                onClick={handleBeginStory}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Loading...
                  </>
                ) : (
                  <>
                    <PlayIcon />
                    Begin Story
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Icons
function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function DifficultyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function PathIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M6 9v6" />
      <path d="M6 9c0-2 2-3 4-3h4" />
      <path d="M14 6l3 3-3 3" />
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

function LoadingSpinner() {
  return (
    <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="31.4"
        strokeDashoffset="10"
      />
    </svg>
  );
}
