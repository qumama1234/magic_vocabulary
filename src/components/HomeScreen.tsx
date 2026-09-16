import { useState } from 'react';
import { PracticeMode, WordListName, WORD_LIST_LABELS, Screen, ErrorType } from '../types';
import { getPatternStats, getWeaknessSummary } from '../utils/patterns';
import { getApiKey, saveApiKey } from '../utils/llm';

interface HomeScreenProps {
  mode: PracticeMode;
  selectedLists: WordListName[];
  wordCount: number;
  selectedWeakness: ErrorType | null;
  onModeChange: (mode: PracticeMode) => void;
  onWeaknessChange: (type: ErrorType | null) => void;
  onListToggle: (list: WordListName) => void;
  onWordCountChange: (count: number) => void;
  onStart: () => void;
  onNavigate: (screen: Screen) => void;
}

const ALL_LISTS: WordListName[] = ['cet4', 'cet6', 'ielts', 'toefl', 'postgrad'];
const WORD_COUNT_OPTIONS = [10, 20, 30, 50];

export default function HomeScreen({
  mode,
  selectedLists,
  wordCount,
  selectedWeakness,
  onModeChange,
  onWeaknessChange,
  onListToggle,
  onWordCountChange,
  onStart,
  onNavigate,
}: HomeScreenProps) {
  const patternStats = getPatternStats();
  const weaknesses = getWeaknessSummary();
  const hasErrorData = patternStats.totalErrors > 0;
  const canStart = mode === 'weakness-practice' ? hasErrorData : selectedLists.length > 0;

  const [apiKey, setApiKeyState] = useState(() => getApiKey());
  const [showKey, setShowKey] = useState(false);

  const handleApiKeySave = (key: string) => {
    setApiKeyState(key);
    saveApiKey(key);
  };

  return (
    <div className="home-screen">
      <h1 className="app-title">English Spelling Practice</h1>
      <p className="app-subtitle">Improve your spelling through listening and writing</p>

      <div className="card">
        <h3>Practice Mode</h3>
        <div className="mode-select">
          <label className={`mode-option ${mode === 'listen-spell' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="mode"
              value="listen-spell"
              checked={mode === 'listen-spell'}
              onChange={() => onModeChange('listen-spell')}
            />
            <div className="mode-content">
              <span className="mode-icon">&#x1f50a;</span>
              <div>
                <strong>Listen & Spell</strong>
                <p>Hear the word and type the spelling</p>
              </div>
            </div>
          </label>
          <label className={`mode-option ${mode === 'sentence-fill' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="mode"
              value="sentence-fill"
              checked={mode === 'sentence-fill'}
              onChange={() => onModeChange('sentence-fill')}
            />
            <div className="mode-content">
              <span className="mode-icon">&#x1f4dd;</span>
              <div>
                <strong>Sentence Fill</strong>
                <p>Read the sentence and fill in the blank</p>
              </div>
            </div>
          </label>
          <label className={`mode-option weakness-mode ${mode === 'weakness-practice' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="mode"
              value="weakness-practice"
              checked={mode === 'weakness-practice'}
              onChange={() => onModeChange('weakness-practice')}
            />
            <div className="mode-content">
              <span className="mode-icon">&#x25ce;</span>
              <div>
                <strong>Weakness Drill</strong>
                <p>Practice words that match your recent spelling mistakes</p>
                {hasErrorData && (
                  <span className="weakness-badge">{patternStats.totalErrors} errors analyzed</span>
                )}
                {!hasErrorData && (
                  <span className="weakness-badge disabled">Need error data first</span>
                )}
              </div>
            </div>
          </label>
        </div>
      </div>

      {mode !== 'weakness-practice' && (
        <div className="card">
          <h3>Word Lists</h3>
          <div className="list-checkboxes">
            {ALL_LISTS.map((list) => (
              <label key={list} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedLists.includes(list)}
                  onChange={() => onListToggle(list)}
                />
                <span>{WORD_LIST_LABELS[list]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === 'weakness-practice' && hasErrorData && (
        <div className="card weakness-info-card">
          <h3>Weak Areas</h3>
          <p className="weakness-info-text">
            Pick one weak pattern for a focused drill, or leave all unselected for a mixed weakness round.
          </p>
          <div className="weakness-pattern-tags">
            <button
              className={`weakness-pattern-tag ${selectedWeakness === null ? 'selected' : ''}`}
              onClick={() => onWeaknessChange(null)}
            >
              Mixed weak spots
            </button>
            {weaknesses.map(({ type, label, count }) => (
              <button
                key={type}
                className={`weakness-pattern-tag ${selectedWeakness === type ? 'selected' : ''}`}
                onClick={() => onWeaknessChange(type)}
              >
                {label} ({count}x)
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Words per Round</h3>
        <div className="word-count-select">
          {WORD_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              className={`count-btn ${wordCount === n ? 'selected' : ''}`}
              onClick={() => onWordCountChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="card api-key-card">
        <h3>DeepSeek API Key (可选)</h3>
        <p className="api-key-hint">用于 AI 深入拆解单词功能，不填则跳过</p>
        <div className="api-key-input-wrap">
          <input
            type={showKey ? 'text' : 'password'}
            className="api-key-input"
            value={apiKey}
            onChange={(e) => handleApiKeySave(e.target.value)}
            placeholder="sk-..."
          />
          <button
            className="btn-toggle-key"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? '隐藏' : '显示'}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <button className="btn-primary" disabled={!canStart} onClick={onStart}>
        {mode === 'weakness-practice' ? 'Start Weakness Drill' : 'Start Practice'}
      </button>

      <button className="btn-link" onClick={() => onNavigate('progress')}>
        View Progress &#x2192;
      </button>
    </div>
  );
}
