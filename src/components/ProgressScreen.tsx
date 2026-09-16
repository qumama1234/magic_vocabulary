import { WordListName, WORD_LIST_LABELS, Screen } from '../types';
import { useProgress } from '../hooks/useProgress';

interface ProgressScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function ProgressScreen({ onNavigate }: ProgressScreenProps) {
  const { getListStats, getHardestWords, resetProgress } = useProgress();

  const allLists: WordListName[] = ['cet4', 'cet6', 'ielts', 'toefl', 'postgrad'];
  const hardest = getHardestWords(10);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      resetProgress();
    }
  };

  return (
    <div className="progress-screen">
      <div className="progress-header">
        <button className="btn-back" onClick={() => onNavigate('home')}>
          &#x2190; Home
        </button>
        <h2>Study Progress</h2>
        <button className="btn-reset" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="card">
        <h3>Word Lists Progress</h3>
        {allLists.map((list) => {
          const stats = getListStats(list);
          const pct = stats.total > 0 ? Math.round((stats.practiced / stats.total) * 100) : 0;
          const masteredPct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
          return (
            <div key={list} className="list-progress">
              <div className="list-progress-header">
                <span className="list-name">{WORD_LIST_LABELS[list]}</span>
                <span className="list-stats">
                  {stats.practiced}/{stats.total} practiced · {stats.accuracy}% correct
                </span>
              </div>
              <div className="multi-bar">
                <div
                  className="bar-practiced"
                  style={{ width: `${pct}%` }}
                  title={`${pct}% practiced`}
                />
                <div
                  className="bar-mastered"
                  style={{ width: `${masteredPct}%` }}
                  title={`${masteredPct}% mastered`}
                />
              </div>
              <div className="bar-legend">
                <span><span className="legend-dot practiced" /> Practiced</span>
                <span><span className="legend-dot mastered" /> Mastered</span>
              </div>
            </div>
          );
        })}
      </div>

      {hardest.length > 0 && (
        <div className="card">
          <h3>Hardest Words (Top {hardest.length})</h3>
          <ul className="hardest-list">
            {hardest.map(({ word, progress: p }) => {
              const rate = p.totalAttempts > 0
                ? Math.round((p.correctAttempts / p.totalAttempts) * 100)
                : 0;
              return (
                <li key={word.id} className="hardest-item">
                  <div className="hardest-word-row">
                    <span className="hardest-word">{word.word}</span>
                    <span className={`hardest-rate ${rate < 50 ? 'poor' : ''}`}>
                      {rate}% ({p.correctAttempts}/{p.totalAttempts})
                    </span>
                  </div>
                  <div className="word-meta">{word.phonetic} · {word.chinese}</div>
                  {p.mistakes.length > 0 && (
                    <div className="mistake-list">
                      Mistakes: {p.mistakes.slice(-3).join(', ')}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
