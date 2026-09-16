import { useState, useEffect, useRef } from 'react';
import { Word } from '../types';

interface SentenceModeProps {
  word: Word;
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export default function SentenceMode({ word, onSubmit, disabled }: SentenceModeProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [word.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSubmit(input);
  };

  // Replace ___ with styled blank in the example sentence
  const sentenceParts = word.example.split('___');

  return (
    <div className="sentence-mode">
      <div className="sentence-display">
        {sentenceParts.map((part, i) => (
          <span key={i}>
            {part}
            {i < sentenceParts.length - 1 && (
              <span className="blank-slot">______</span>
            )}
          </span>
        ))}
      </div>

      <div className="word-hints">
        <span className="pos-tag">{word.partOfSpeech}</span>
        <span className="chinese-hint">{word.chinese}</span>
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <input
          ref={inputRef}
          type="text"
          className="spell-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type the missing word..."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          autoFocus
        />
        <button type="submit" className="btn-submit" disabled={disabled || !input.trim()}>
          Submit
        </button>
      </form>
    </div>
  );
}
