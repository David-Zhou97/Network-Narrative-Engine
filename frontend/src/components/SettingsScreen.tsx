import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import type { GameSettings } from '../types';
import styles from './SettingsScreen.module.css';

export function SettingsScreen(): React.ReactElement {
  const { settings, updateSettings, setCurrentScreen, savedGames, deleteSave } = useGame();

  const handleBack = () => {
    setCurrentScreen('title');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>Settings</h1>
        <div className={styles.placeholder} />
      </header>

      <div className={styles.content}>
        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className={styles.sectionTitle}>Display</h2>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Text Speed</span>
              <span className={styles.settingDescription}>
                How fast text appears on screen
              </span>
            </div>
            <div className={styles.segmentedControl}>
              {(['slow', 'normal', 'fast', 'instant'] as const).map(speed => (
                <button
                  key={speed}
                  className={`${styles.segment} ${settings.textSpeed === speed ? styles.segmentActive : ''}`}
                  onClick={() => updateSettings({ textSpeed: speed })}
                >
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Font Size</span>
              <span className={styles.settingDescription}>
                Adjust text size for readability
              </span>
            </div>
            <div className={styles.segmentedControl}>
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  className={`${styles.segment} ${settings.fontSize === size ? styles.segmentActive : ''}`}
                  onClick={() => updateSettings({ fontSize: size })}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Auto-Scroll</span>
              <span className={styles.settingDescription}>
                Automatically scroll to new content
              </span>
            </div>
            <ToggleSwitch
              checked={settings.autoScroll}
              onChange={checked => updateSettings({ autoScroll: checked })}
            />
          </div>
        </motion.section>

        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={styles.sectionTitle}>Feedback</h2>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Sound Effects</span>
              <span className={styles.settingDescription}>
                Play sounds for interactions
              </span>
            </div>
            <ToggleSwitch
              checked={settings.soundEnabled}
              onChange={checked => updateSettings({ soundEnabled: checked })}
            />
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Vibration</span>
              <span className={styles.settingDescription}>
                Haptic feedback on choices
              </span>
            </div>
            <ToggleSwitch
              checked={settings.vibrationEnabled}
              onChange={checked => updateSettings({ vibrationEnabled: checked })}
            />
          </div>
        </motion.section>

        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className={styles.sectionTitle}>Saved Games</h2>

          {savedGames.length === 0 ? (
            <p className={styles.emptyMessage}>No saved games yet</p>
          ) : (
            <div className={styles.saveList}>
              {savedGames.map(save => (
                <div key={save.id} className={styles.saveItem}>
                  <div className={styles.saveInfo}>
                    <span className={styles.saveName}>{save.narrativeTitle}</span>
                    <span className={styles.saveDetails}>
                      Turn {save.turnCount} • {formatDate(save.savedAt)}
                    </span>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => {
                      if (confirm('Delete this save?')) {
                        deleteSave(save.id);
                      }
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className={styles.sectionTitle}>About</h2>
          <div className={styles.aboutInfo}>
            <p>Story Engine v1.0.0</p>
            <p>Powered by Network Narrative Engine</p>
            <p className={styles.copyright}>Made with care</p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps): React.ReactElement {
  return (
    <button
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
