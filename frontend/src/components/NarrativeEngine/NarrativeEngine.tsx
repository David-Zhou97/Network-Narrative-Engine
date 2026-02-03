/**
 * NarrativeEngine - Main component for story creation workflow
 * Ties together StoryCreator, GraphEditor, and publish flow
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryCreator } from '../StoryCreator';
import { GraphEditor } from '../GraphEditor';
import { apiClient } from '../../api/client';
import type { GeneratedGraph } from '../../../../src/types/storyCreation';
import styles from './NarrativeEngine.module.css';

interface NarrativeEngineProps {
  onBack: () => void;
  onPublished: (storyId: string) => void;
}

type Stage = 'create' | 'edit' | 'publish' | 'success';

export function NarrativeEngine({ onBack, onPublished }: NarrativeEngineProps): React.ReactElement {
  const [stage, setStage] = useState<Stage>('create');
  const [graph, setGraph] = useState<GeneratedGraph | null>(null);
  const [shortDescription, setShortDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedStoryId, setPublishedStoryId] = useState<string | null>(null);

  const handleGenerated = useCallback((generatedGraph: GeneratedGraph) => {
    setGraph(generatedGraph);
    setStage('edit');
  }, []);

  const handleBackFromEdit = useCallback(() => {
    // Go back to create stage but keep the existing input
    setStage('create');
  }, []);

  const handlePublishClick = useCallback(() => {
    setStage('publish');
    setPublishError(null);
  }, []);

  const handleConfirmPublish = useCallback(async () => {
    if (!graph || !shortDescription.trim()) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await apiClient.publishStory(
        graph,
        shortDescription.trim()
      );

      if (result.success && result.storyId) {
        setPublishedStoryId(result.storyId);
        setStage('success');
      } else {
        setPublishError(result.error || 'Failed to publish story');
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish story');
    } finally {
      setIsPublishing(false);
    }
  }, [graph, shortDescription]);

  const handleViewInMarketplace = useCallback(() => {
    if (publishedStoryId) {
      onPublished(publishedStoryId);
    }
  }, [publishedStoryId, onPublished]);

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {stage === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.fullHeight}
          >
            <StoryCreator
              onBack={onBack}
              onGenerated={handleGenerated}
            />
          </motion.div>
        )}

        {stage === 'edit' && graph && (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.fullHeight}
          >
            <GraphEditor
              graph={graph}
              onUpdateGraph={setGraph}
              onBack={handleBackFromEdit}
              onPublish={handlePublishClick}
            />
          </motion.div>
        )}

        {stage === 'publish' && graph && (
          <motion.div
            key="publish"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.publishContainer}
          >
            <div className={styles.publishModal}>
              <h2 className={styles.publishTitle}>Publish Your Story</h2>
              <p className={styles.publishSubtitle}>
                Your story will be added to the marketplace for others to play.
              </p>

              <div className={styles.publishPreview}>
                <div className={styles.previewCard}>
                  <div className={styles.previewThumbnail}>
                    <div className={styles.previewPlaceholder}>
                      {graph.metadata.title.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.previewInfo}>
                    <h3>{graph.metadata.title}</h3>
                    <div className={styles.previewStats}>
                      <span>{graph.nodes.length} nodes</span>
                      <span>{graph.edges.length} choices</span>
                      <span>{graph.nodes.filter(n => n.type === 'ending').length} endings</span>
                    </div>
                    <div className={styles.previewTags}>
                      {graph.metadata.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.publishForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Short Description *</label>
                  <textarea
                    className={styles.textarea}
                    value={shortDescription}
                    onChange={e => setShortDescription(e.target.value)}
                    placeholder="A brief, engaging description for the marketplace card..."
                    rows={3}
                    maxLength={150}
                  />
                  <span className={styles.charCount}>
                    {shortDescription.length}/150
                  </span>
                </div>
              </div>

              {publishError && (
                <div className={styles.error}>
                  {publishError}
                </div>
              )}

              <div className={styles.publishActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setStage('edit')}
                  disabled={isPublishing}
                >
                  Back to Editing
                </button>
                <button
                  className={styles.publishButton}
                  onClick={handleConfirmPublish}
                  disabled={!shortDescription.trim() || isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish to Marketplace'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.successContainer}
          >
            <div className={styles.successContent}>
              <div className={styles.successIcon}>
                <CheckIcon />
              </div>
              <h2 className={styles.successTitle}>Story Published!</h2>
              <p className={styles.successText}>
                "{graph?.metadata.title}" is now available in the marketplace.
                Other players can discover and play your story.
              </p>
              <div className={styles.successActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={onBack}
                >
                  Create Another Story
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleViewInMarketplace}
                >
                  View in Marketplace
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}
