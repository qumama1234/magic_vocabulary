import { PracticeResult, Screen, DiffSegment } from '../types';
import { diffWords, analyzeErrorTypes } from '../utils/diff';
import { speak } from '../utils/speech';
import { ERROR_TYPE_LABELS } from '../types';
import AnalysisModal from './AnalysisModal';
import { useAnalysis } from '../hooks/useAnalysis';

interface ResultScreenProps {
  results: PracticeResult[];
  onReview: () => void;
  onNewPractice: () => void;
  onNavigate: (screen: Screen) => void;
}

function DiffInline({ diff }: { diff: DiffSegment[] }) {
  return (
    <span className="diff-display">
      {diff.map((seg, i) => (
        <span key={i} className={`diff-char diff-${seg.type}`}>
          {seg.char}
        </span>
      ))}
    </span>
  );
}

export default function ResultScreen({
  results,
  onReview,
  onNewPractice,
  onNavigate,
}: ResultScreenProps) {
  const { analysisState, startAnalysis, sendMessage, closeAnalysis } = useAnalysis();
  const correctCount = results.filter((r) => r.correct).length;
  const total = results.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const wrongResults = results.filter((r) => !r.correct);

  return (
    <div className="result-screen">
      <h2>Round Complete!</h2>

      <div className="score-card">
        <div className="score-circle">
          <span className="score-number">{accuracy}%</span>
          <span className="score-label">Accuracy</span>
        </div>
        <div className="score-detail">
          <div className="score-row">
            <span>Total</span>
            <span>{total}</span>
          </div>
          <div className="score-row correct">
            <span>Correct</span>
            <span>{correctCount}</span>
          </div>
          <div className="score-row wrong">
            <span>Wrong</span>
            <span>{total - correctCount}</span>
          </div>
        </div>
      </div>

      {wrongResults.length > 0 && (
        <div className="wrong-list-card">
          <h3>Words to Review ({wrongResults.length})</h3>
          <ul className="wrong-list">
            {wrongResults.map((r, i) => {
              const diff = diffWords(r.word.word, r.userInput);
              const errorTypes = analyzeErrorTypes(r.word.word, r.userInput);
              return (
                <li key={i} className="wrong-item">
                  <div className="wrong-word-row">
                    <span className="wrong-input">{r.userInput || '(empty)'}</span>
                    <span className="arrow">→</span>
                    <span className="right-word">{r.word.word}</span>
                    <button
                      className="btn-play-mini"
                      onClick={() => speak(r.word.word)}
                      title="听读音"
                    >
                      🔊
                    </button>
                    <button
                      className="btn-analyze-mini"
                      onClick={() => startAnalysis(r.word.word, r.userInput, r.word.phonetic)}
                      title="AI 深入拆解"
                    >
                      🧠
                    </button>
                  </div>
                  <div className="diff-row">
                    <DiffInline diff={diff} />
                  </div>
                  {errorTypes.length > 0 && (
                    <div className="error-tags">
                      {errorTypes.map((et) => (
                        <span key={et} className="error-tag">{ERROR_TYPE_LABELS[et]}</span>
                      ))}
                    </div>
                  )}
                  <div className="word-meta">
                    {r.word.phonetic} · {r.word.chinese}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="result-actions">
        {wrongResults.length > 0 && (
          <button className="btn-primary" onClick={onReview}>
            Retry Wrong Words ({wrongResults.length})
          </button>
        )}
        <button className="btn-secondary" onClick={onNewPractice}>
          New Practice
        </button>
        <button className="btn-link" onClick={() => onNavigate('progress')}>
          View Progress
        </button>
        <button className="btn-link" onClick={() => onNavigate('home')}>
          Back to Home
        </button>
      </div>

      <AnalysisModal state={analysisState} onClose={closeAnalysis} onSendMessage={sendMessage} />
    </div>
  );
}
