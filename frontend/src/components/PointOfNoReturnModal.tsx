import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PointOfNoReturnModal.module.css';

interface PointOfNoReturnModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PointOfNoReturnModal({
  isOpen,
  onConfirm,
  onCancel,
}: PointOfNoReturnModalProps): React.ReactElement | null {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.content}>
              <motion.div
                className={styles.iconWrapper}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                <WarningIcon />
              </motion.div>

              <motion.h2
                className={styles.title}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                Point of No Return
              </motion.h2>

              <motion.p
                className={styles.description}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                This is your final choice before the story reaches its conclusion.
                Once you proceed, the ending will be determined by the decisions
                you have made throughout your journey. There is no turning back.
              </motion.p>

              <div className={styles.divider} />

              <motion.div
                className={styles.actions}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <button className={styles.confirmButton} onClick={onConfirm}>
                  I'm ready — reveal my fate
                </button>
                <button className={styles.cancelButton} onClick={onCancel}>
                  Let me reconsider
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WarningIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
