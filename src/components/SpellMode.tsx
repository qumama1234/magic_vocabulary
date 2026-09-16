import { useState, useEffect, useRef } from 'react';
import { Word } from '../types';
import { speak } from '../utils/speech';

interface SpellModeProps {
  word: Word;
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export default function SpellMode({ word, onSubmit, disabled }: SpellModeProps) {
  const [input, setInput] = useState('');
  const [played, setPlayed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [word.id]);

  const handlePlay = () => {
    speak(word.word);
    setPlayed(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSubmit(input);
  };

  return (
    <div className="spell-mode">
      <div className="play-area">
        <button
          className={`btn-play ${played ? 'played' : ''}`}
          onClick={handlePlay}
          title="Click to hear the word"
        >
          {played ? '🔊 Play Again' : '🔊 Play Word'}
        </button>
        {!played && <p className="hint-text">Click the button to hear the word</p>}
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
          placeholder="Type the word here..."
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
