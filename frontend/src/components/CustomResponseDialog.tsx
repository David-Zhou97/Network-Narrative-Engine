import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import styles from './CustomResponseDialog.module.css';

export function CustomResponseDialog(): React.ReactElement {
  const { customResponse, closeCustomResponse, submitCustomResponse, isLoading } = useGame();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea when dialog opens
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    // Pre-fill with the base choice text
    if (customResponse.baseChoice) {
      setText(customResponse.baseChoice.text);
    }
  }, [customResponse.baseChoice]);

  const handleSubmit = () => {
    if (text.trim() && !isLoading) {
      submitCustomResponse(text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      closeCustomResponse();
    }
  };

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closeCustomResponse}
    >
      <motion.div
        className={styles.dialog}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <h2 className={styles.title}>Customize Your Response</h2>
          <p className={styles.subtitle}>
            Express yourself in your own words. Your choice will still follow path {(customResponse.choiceIndex ?? 0) + 1}.
          </p>
        </div>

        {customResponse.baseChoice && (
          <div className={styles.originalChoice}>
            <span className={styles.originalLabel}>Original choice:</span>
            <p className={styles.originalText}>"{customResponse.baseChoice.text}"</p>
          </div>
        )}

        <div className={styles.inputSection}>
          <label htmlFor="customResponse" className={styles.inputLabel}>
            Your response:
          </label>
          <textarea
            ref={textareaRef}
            id="customResponse"
            className={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your custom response..."
            rows={3}
            maxLength={500}
          />
          <div className={styles.charCount}>
            {text.length}/500
          </div>
        </div>

        <div className={styles.suggestions}>
          <span className={styles.suggestionsLabel}>Quick edits:</span>
          <div className={styles.suggestionButtons}>
            <button
              className={styles.suggestionButton}
              onClick={() => setText(text + ' (cautiously)')}
            >
              + Cautiously
            </button>
            <button
              className={styles.suggestionButton}
              onClick={() => setText(text + ' (firmly)')}
            >
              + Firmly
            </button>
            <button
              className={styles.suggestionButton}
              onClick={() => setText(text + ' (kindly)')}
            >
              + Kindly
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={closeCustomResponse}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.buttonSpinner} />
                Submitting...
              </>
            ) : (
              <>
                <SendIcon />
                Submit Response
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
