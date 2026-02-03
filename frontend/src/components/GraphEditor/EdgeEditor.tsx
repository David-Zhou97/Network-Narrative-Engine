/**
 * EdgeEditor - Modal for editing story edges (choices)
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { GeneratedEdge, GeneratedNode } from '../../../../src/types/storyCreation';
import styles from './NodeEditor.module.css';

interface EdgeEditorProps {
  edge: GeneratedEdge;
  nodes: GeneratedNode[];
  onSave: (edge: GeneratedEdge) => void;
  onDelete: () => void;
  onClose: () => void;
}

const CHOICE_TYPES = [
  { value: 'agree', label: 'Agree - Positive, cooperative' },
  { value: 'refuse', label: 'Refuse - Negative, resistant' },
  { value: 'question', label: 'Question - Seek more info' },
  { value: 'deflect', label: 'Deflect - Avoid, change subject' },
  { value: 'confront', label: 'Confront - Direct, aggressive' },
  { value: 'comfort', label: 'Comfort - Supportive, empathetic' },
  { value: 'investigate', label: 'Investigate - Explore, examine' },
  { value: 'leave', label: 'Leave - Exit, depart' },
  { value: 'custom', label: 'Custom' },
];

export function EdgeEditor({ edge, nodes, onSave, onDelete, onClose }: EdgeEditorProps): React.ReactElement {
  const [editedEdge, setEditedEdge] = useState<GeneratedEdge>({ ...edge });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onSave(editedEdge);
  };

  const updateField = <K extends keyof GeneratedEdge>(field: K, value: GeneratedEdge[K]) => {
    setEditedEdge({ ...editedEdge, [field]: value });
  };

  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2>Edit Choice</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.routeInfo}>
            <div className={styles.routeNode}>
              <span className={styles.routeLabel}>From</span>
              <span className={styles.routeValue}>{fromNode?.title || fromNode?.beat || edge.from}</span>
            </div>
            <div className={styles.routeArrow}>→</div>
            <div className={styles.routeNode}>
              <span className={styles.routeLabel}>To</span>
              <span className={styles.routeValue}>{toNode?.title || toNode?.beat || edge.to}</span>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Choice Type</label>
              <select
                className={styles.select}
                value={editedEdge.choiceType}
                onChange={e => updateField('choiceType', e.target.value as GeneratedEdge['choiceType'])}
              >
                {CHOICE_TYPES.map(ct => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Priority</label>
              <input
                type="number"
                className={styles.input}
                value={editedEdge.priority || 1}
                onChange={e => updateField('priority', parseInt(e.target.value) || 1)}
                min={1}
                max={10}
              />
              <span className={styles.hint}>Higher = displayed first</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Choice Text *</label>
            <textarea
              className={styles.textarea}
              value={editedEdge.choiceHint}
              onChange={e => updateField('choiceHint', e.target.value)}
              placeholder="What the player says or does"
              rows={2}
            />
          </div>

          <div className={styles.section}>
            <h3>Dilemma Details</h3>
            <p className={styles.sectionHint}>
              Make this choice difficult. What does the player gain? What do they risk losing?
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Conflict / Dilemma</label>
              <textarea
                className={styles.textarea}
                value={editedEdge.conflict || ''}
                onChange={e => updateField('conflict', e.target.value)}
                placeholder="What makes this choice hard? What's the catch?"
                rows={2}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Benefit</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editedEdge.benefit || ''}
                  onChange={e => updateField('benefit', e.target.value)}
                  placeholder="What you gain"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Cost</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editedEdge.cost || ''}
                  onChange={e => updateField('cost', e.target.value)}
                  placeholder="What you risk/lose"
                />
              </div>
            </div>
          </div>

          {editedEdge.effects && editedEdge.effects.length > 0 && (
            <div className={styles.section}>
              <h3>Effects</h3>
              <div className={styles.effectsList}>
                {editedEdge.effects.map((effect, i) => (
                  <div key={i} className={styles.effectItem}>
                    <span className={styles.effectType}>{effect.type}</span>
                    <span className={styles.effectTarget}>{effect.target}</span>
                    <span className={styles.effectValue}>{String(effect.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editedEdge.conditions && editedEdge.conditions.length > 0 && (
            <div className={styles.section}>
              <h3>Conditions (must be met to show this choice)</h3>
              <div className={styles.effectsList}>
                {editedEdge.conditions.map((cond, i) => (
                  <div key={i} className={styles.effectItem}>
                    <span className={styles.effectType}>{cond.type}</span>
                    <span className={styles.effectTarget}>{cond.target}</span>
                    <span className={styles.effectValue}>{cond.operator} {String(cond.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <span>Delete this choice?</span>
              <button className={styles.confirmYes} onClick={onDelete}>Yes, Delete</button>
              <button className={styles.confirmNo} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <button className={styles.deleteButton} onClick={() => setConfirmDelete(true)}>
                Delete Choice
              </button>
              <div className={styles.actions}>
                <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
                <button className={styles.saveButton} onClick={handleSave}>Save Changes</button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
