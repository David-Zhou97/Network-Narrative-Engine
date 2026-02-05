import React from 'react';
import { useGame } from '../contexts/GameContext';
import styles from './DialogueBubble.module.css';

interface DialogueBubbleProps {
  characterId: string;
  text: string;
  emotion?: string;
}

// Segment type for parsed dialogue text
interface TextSegment {
  type: 'action' | 'speech';
  content: string;
}

// Parse dialogue text to separate actions (in asterisks) from spoken dialogue
function parseDialogueText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Match text within asterisks as actions
  const regex = /(\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add speech segment before the action (if any)
    if (match.index > lastIndex) {
      const speechContent = text.slice(lastIndex, match.index).trim();
      if (speechContent) {
        segments.push({ type: 'speech', content: speechContent });
      }
    }
    // Add action segment (without the asterisks)
    const actionContent = match[1].slice(1, -1).trim();
    if (actionContent) {
      segments.push({ type: 'action', content: actionContent });
    }
    lastIndex = regex.lastIndex;
  }

  // Add remaining speech after the last action (if any)
  if (lastIndex < text.length) {
    const speechContent = text.slice(lastIndex).trim();
    if (speechContent) {
      segments.push({ type: 'speech', content: speechContent });
    }
  }

  // If no segments were found, treat the whole text as speech
  if (segments.length === 0) {
    segments.push({ type: 'speech', content: text });
  }

  return segments;
}

export function DialogueBubble({ characterId, text, emotion }: DialogueBubbleProps): React.ReactElement {
  const { loadedStory } = useGame();

  // Find character info from the loaded story
  const character = loadedStory?.characters.find(c => c.id === characterId);
  const characterName = character?.name ?? characterId;

  // Generate a consistent color for the character based on their ID
  const characterColor = getCharacterColor(characterId);

  // Parse the dialogue text to separate actions from speech
  const segments = parseDialogueText(text);

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
        <p className={styles.text}>
          {segments.map((segment, index) => (
            segment.type === 'action' ? (
              <span key={index} className={styles.action}>{segment.content} </span>
            ) : (
              <span key={index} className={styles.speech}>"{segment.content}" </span>
            )
          ))}
        </p>
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
