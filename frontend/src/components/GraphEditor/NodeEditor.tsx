/**
 * NodeEditor - Modal for editing story nodes
 *
 * Supports all node types:
 * - Entry: Starting scenarios
 * - Story: Main narrative beats (legacy)
 * - Branch: Conditional routing
 * - Converge: Legacy path merger
 * - Ending: Terminal outcomes
 * - Anchor: Key story moments all paths go through
 * - Transition: AI-generated connective tissue
 * - Merge: Path convergence points
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { GeneratedNode, GeneratedCharacter, GeneratedNodeType } from '../../../../src/types/storyCreation';
import styles from './NodeEditor.module.css';

interface NodeEditorProps {
  node: GeneratedNode;
  characters: GeneratedCharacter[];
  onSave: (node: GeneratedNode) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeEditor({ node, characters, onSave, onDelete, onClose }: NodeEditorProps): React.ReactElement {
  const [editedNode, setEditedNode] = useState<GeneratedNode>({ ...node });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onSave(editedNode);
  };

  const updateField = <K extends keyof GeneratedNode>(field: K, value: GeneratedNode[K]) => {
    setEditedNode({ ...editedNode, [field]: value });
  };

  const updateContext = (field: string, value: string) => {
    setEditedNode({
      ...editedNode,
      context: {
        ...editedNode.context,
        [field]: value,
      } as GeneratedNode['context'],
    });
  };

  const toggleCharacter = (charId: string) => {
    const current = editedNode.characters || [];
    if (current.includes(charId)) {
      updateField('characters', current.filter(c => c !== charId));
    } else {
      updateField('characters', [...current, charId]);
    }
  };

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
          <h2>Edit Node</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Node ID</label>
              <input
                type="text"
                className={styles.input}
                value={editedNode.id}
                disabled
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Type</label>
              <select
                className={styles.select}
                value={editedNode.type}
                onChange={e => updateField('type', e.target.value as GeneratedNodeType)}
              >
                <option value="entry">Entry</option>
                <option value="story">Story</option>
                <option value="branch">Branch</option>
                <option value="converge">Converge</option>
                <option value="ending">Ending</option>
                <option value="anchor">Anchor</option>
                <option value="transition">Transition</option>
                <option value="merge">Merge</option>
              </select>
            </div>
          </div>

          {(editedNode.type === 'entry' || editedNode.type === 'ending' || editedNode.type === 'anchor' || editedNode.type === 'merge') && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Title</label>
              <input
                type="text"
                className={styles.input}
                value={editedNode.title || ''}
                onChange={e => updateField('title', e.target.value)}
                placeholder="Scene title"
              />
            </div>
          )}

          {editedNode.type === 'entry' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Preview</label>
              <input
                type="text"
                className={styles.input}
                value={editedNode.preview || ''}
                onChange={e => updateField('preview', e.target.value)}
                placeholder="Short preview for scenario selection"
              />
            </div>
          )}

          {(editedNode.type === 'story' || editedNode.type === 'anchor') && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Beat</label>
              <input
                type="text"
                className={styles.input}
                value={editedNode.beat || ''}
                onChange={e => updateField('beat', e.target.value)}
                placeholder="Key narrative moment"
              />
            </div>
          )}

          {editedNode.type === 'ending' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ending Type</label>
                <select
                  className={styles.select}
                  value={editedNode.endingType || 'neutral'}
                  onChange={e => updateField('endingType', e.target.value as GeneratedNode['endingType'])}
                >
                  <option value="good">Good</option>
                  <option value="neutral">Neutral</option>
                  <option value="bad">Bad</option>
                  <option value="secret">Secret</option>
                  <option value="bittersweet">Bittersweet</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Epilogue</label>
                <textarea
                  className={styles.textarea}
                  value={editedNode.epilogue || ''}
                  onChange={e => updateField('epilogue', e.target.value)}
                  placeholder="What happens after..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Anchor Node Fields */}
          {editedNode.type === 'anchor' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Significance</label>
                <textarea
                  className={styles.textarea}
                  value={editedNode.significance || ''}
                  onChange={e => updateField('significance', e.target.value)}
                  placeholder="Why this moment matters to the story..."
                  rows={2}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Required</label>
                  <select
                    className={styles.select}
                    value={editedNode.required ? 'true' : 'false'}
                    onChange={e => updateField('required', e.target.value === 'true')}
                  >
                    <option value="true">Yes - All paths must visit</option>
                    <option value="false">No - Optional anchor</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Order Hint</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={editedNode.orderHint ?? 0}
                    onChange={e => updateField('orderHint', parseInt(e.target.value) || 0)}
                    placeholder="Lower = earlier"
                    min={0}
                  />
                </div>
              </div>
            </>
          )}

          {/* Transition Node Fields */}
          {editedNode.type === 'transition' && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Purpose</label>
                  <select
                    className={styles.select}
                    value={editedNode.purpose || 'bridge'}
                    onChange={e => updateField('purpose', e.target.value as GeneratedNode['purpose'])}
                  >
                    <option value="bridge">Bridge - Connect scenes</option>
                    <option value="escalation">Escalation - Raise tension</option>
                    <option value="relief">Relief - Lower tension</option>
                    <option value="revelation">Revelation - Reveal information</option>
                    <option value="preparation">Preparation - Set up future events</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>AI Generated</label>
                  <select
                    className={styles.select}
                    value={editedNode.isGenerated ? 'true' : 'false'}
                    onChange={e => updateField('isGenerated', e.target.value === 'true')}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No - Manually created</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Active Conflict</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editedNode.activeConflict || ''}
                  onChange={e => updateField('activeConflict', e.target.value)}
                  placeholder="Value conflict being explored (e.g., 'loyalty vs truth')"
                />
              </div>
            </>
          )}

          {/* Merge Node Fields */}
          {editedNode.type === 'merge' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Merge Strategy</label>
                <select
                  className={styles.select}
                  value={editedNode.mergeStrategy || 'acknowledge_differences'}
                  onChange={e => updateField('mergeStrategy', e.target.value as GeneratedNode['mergeStrategy'])}
                >
                  <option value="acknowledge_differences">Acknowledge Differences - Reference past choices</option>
                  <option value="common_ground">Common Ground - Focus on shared outcomes</option>
                  <option value="forced_unity">Forced Unity - Converge regardless of path</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Canonical Continuation</label>
                <textarea
                  className={styles.textarea}
                  value={editedNode.canonicalContinuation || ''}
                  onChange={e => updateField('canonicalContinuation', e.target.value)}
                  placeholder="The story continuation after paths merge..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Description *</label>
            <textarea
              className={styles.textarea}
              value={editedNode.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Scene description - what the player sees and experiences"
              rows={4}
            />
          </div>

          <div className={styles.section}>
            <h3>Scene Context</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Location</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editedNode.context?.location || ''}
                  onChange={e => updateContext('location', e.target.value)}
                  placeholder="Where does this happen?"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mood</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editedNode.context?.mood || ''}
                  onChange={e => updateContext('mood', e.target.value)}
                  placeholder="Emotional tone"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Time of Day</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editedNode.context?.timeOfDay || ''}
                  onChange={e => updateContext('timeOfDay', e.target.value)}
                  placeholder="morning, night, etc."
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Characters Present</h3>
            <div className={styles.characterGrid}>
              {characters.map(char => (
                <label key={char.id} className={styles.characterCheckbox}>
                  <input
                    type="checkbox"
                    checked={editedNode.characters?.includes(char.id) || false}
                    onChange={() => toggleCharacter(char.id)}
                  />
                  <span className={styles.characterName}>{char.name}</span>
                  <span className={styles.characterId}>{char.id}</span>
                </label>
              ))}
            </div>
          </div>

          {editedNode.onEnter && editedNode.onEnter.length > 0 && (
            <div className={styles.section}>
              <h3>On Enter Effects</h3>
              <div className={styles.effectsList}>
                {editedNode.onEnter.map((effect, i) => (
                  <div key={i} className={styles.effectItem}>
                    <span className={styles.effectType}>{effect.type}</span>
                    <span className={styles.effectTarget}>{effect.target}</span>
                    <span className={styles.effectValue}>{String(effect.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <span>Delete this node?</span>
              <button className={styles.confirmYes} onClick={onDelete}>Yes, Delete</button>
              <button className={styles.confirmNo} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <button className={styles.deleteButton} onClick={() => setConfirmDelete(true)}>
                Delete Node
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
