import React from 'react';
import { useGame } from '../contexts/GameContext';
import styles from './DialogueBubble.module.css';

interface DialogueBubbleProps {
  characterId: string;
  text: string;
  emotion?: string;
}

export function DialogueBubble({ characterId, text, emotion }: DialogueBubbleProps): React.ReactElement {
  const { loadedStory } = useGame();

  // Find character info from the loaded story
  const character = loadedStory?.characters.find(c => c.id === characterId);
  const characterName = character?.name ?? characterId;

  // Generate a consistent color for the character based on their ID
  const characterColor = getCharacterColor(characterId);

  return (
    <div className={styles.container}>
      <div className={styles.avatar} style={{ background: characterColor }}>
        {characterName.charAt(0).toUpperCase()}
      </div>
      <div className={styles.bubble}>
        <div className={styles.header}>
          <span className={styles.name} style={{ color: characterColor }}>
            {characterName}
          </span>
          {emotion && (
            <span className={styles.emotion}>
              {getEmotionEmoji(emotion)} {emotion}
            </span>
          )}
        </div>
        <p className={styles.text}>"{text}"</p>
      </div>
    </div>
  );
}

function getCharacterColor(id: string): string {
  // Generate a hue based on the character ID hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 60%)`;
}

function getEmotionEmoji(emotion: string): string {
  const emotionMap: Record<string, string> = {
    happy: '',
    sad: '',
    angry: '',
    surprised: '',
    fearful: '',
    disgusted: '',
    contempt: '',
    neutral: '',
    concerned: '',
    suspicious: '',
    thoughtful: '',
    excited: '',
    nervous: '',
    confident: '',
    hesitant: '',
  };
  return emotionMap[emotion.toLowerCase()] ?? '';
}
