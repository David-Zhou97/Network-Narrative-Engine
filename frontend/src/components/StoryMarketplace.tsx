import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { storyRegistry, type StoryInfo } from '../data/storyRegistry';
import { StoryDetailModal } from './StoryDetailModal';
import styles from './StoryMarketplace.module.css';

export function StoryMarketplace(): React.ReactElement {
  const { setCurrentScreen } = useGame();
  const [selectedStory, setSelectedStory] = useState<StoryInfo | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const allTags = Array.from(
    new Set(storyRegistry.flatMap(story => story.tags))
  ).sort();

  const filteredStories = filter === 'all'
    ? storyRegistry
    : storyRegistry.filter(story => story.tags.includes(filter));

  const featuredStories = storyRegistry.filter(s => s.featured);

  const handleBack = () => {
    setCurrentScreen('title');
  };

  const handleStoryClick = (story: StoryInfo) => {
    setSelectedStory(story);
  };

  const handleCloseModal = () => {
    setSelectedStory(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return styles.difficultyEasy;
      case 'medium': return styles.difficultyMedium;
      case 'challenging': return styles.difficultyChallenging;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button className={styles.backButton} onClick={handleBack}>
          <BackIcon />
          <span>Back</span>
        </button>
        <h1 className={styles.title}>Story Marketplace</h1>
        <div className={styles.headerSpacer} />
      </motion.header>

      {/* Featured Section */}
      {filter === 'all' && featuredStories.length > 0 && (
        <motion.section
          className={styles.featuredSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className={styles.sectionTitle}>
            <StarIcon />
            Featured Stories
          </h2>
          <div className={styles.featuredGrid}>
            {featuredStories.map((story, index) => (
              <motion.button
                key={story.id}
                className={styles.featuredCard}
                onClick={() => handleStoryClick(story)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.featuredThumbnail}>
                  <img src={story.thumbnail} alt={story.title} />
                  <div className={styles.featuredOverlay}>
                    <span className={styles.featuredBadge}>Featured</span>
                  </div>
                </div>
                <div className={styles.featuredInfo}>
                  <h3 className={styles.featuredTitle}>{story.title}</h3>
                  <p className={styles.featuredDescription}>{story.shortDescription}</p>
                  <div className={styles.featuredMeta}>
                    <span className={`${styles.difficulty} ${getDifficultyColor(story.difficulty)}`}>
                      {story.difficulty}
                    </span>
                    <span className={styles.time}>
                      <ClockIcon />
                      {story.estimatedTime}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Filter Tags */}
      <motion.div
        className={styles.filterSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <button
          className={`${styles.filterTag} ${filter === 'all' ? styles.filterTagActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All Stories
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            className={`${styles.filterTag} ${filter === tag ? styles.filterTagActive : ''}`}
            onClick={() => setFilter(tag)}
          >
            {tag}
          </button>
        ))}
      </motion.div>

      {/* All Stories Grid */}
      <motion.section
        className={styles.storiesSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className={styles.sectionTitle}>
          {filter === 'all' ? 'All Stories' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Stories`}
          <span className={styles.storyCount}>({filteredStories.length})</span>
        </h2>
        <div className={styles.storiesGrid}>
          {filteredStories.map((story, index) => (
            <motion.button
              key={story.id}
              className={styles.storyCard}
              onClick={() => handleStoryClick(story)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.storyThumbnail}>
                <img src={story.thumbnail} alt={story.title} />
              </div>
              <div className={styles.storyInfo}>
                <h3 className={styles.storyTitle}>{story.title}</h3>
                <p className={styles.storyDescription}>{story.shortDescription}</p>
                <div className={styles.storyTags}>
                  {story.tags.slice(0, 2).map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
                <div className={styles.storyMeta}>
                  <span className={`${styles.difficulty} ${getDifficultyColor(story.difficulty)}`}>
                    {story.difficulty}
                  </span>
                  <span className={styles.time}>
                    <ClockIcon />
                    {story.estimatedTime}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Story Detail Modal */}
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// Icons
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
