import React, { useState, useEffect } from 'react';
import styles from './NarrationDisplay.module.css';

interface NarrationDisplayProps {
  text: string;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
}

export function NarrationDisplay({ text, textSpeed }: NarrationDisplayProps): React.ReactElement {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (textSpeed === 'instant') {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    const speeds = {
      slow: 50,
      normal: 25,
      fast: 10,
      instant: 0,
    };

    const speed = speeds[textSpeed];
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, textSpeed]);

  const handleClick = () => {
    if (!isComplete) {
      setDisplayedText(text);
      setIsComplete(true);
    }
  };

  return (
    <div className={styles.container} onClick={handleClick}>
      <div className={styles.narrationBox}>
        <p className={styles.text}>
          {displayedText}
          {!isComplete && <span className={styles.cursor}>|</span>}
        </p>
      </div>
      {!isComplete && (
        <p className={styles.tapHint}>Tap to skip</p>
      )}
    </div>
  );
}
