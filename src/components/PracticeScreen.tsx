import { Word, PracticeResult, PracticeMode, DiffSegment } from '../types';
import SpellMode from './SpellMode';
import SentenceMode from './SentenceMode';
import { diffWords } from '../utils/diff';
import { speak } from '../utils/speech';
import AnalysisModal from './AnalysisModal';
import { useAnalysis } from '../hooks/useAnalysis';

interface PracticeScreenProps {
  currentWord: Word;
  mode: PracticeMode;
  lastResult: PracticeResult | null;
  phase: 'answering' | 'feedback' | 'finished';
  progress: number;
  totalWords: number;
  isMasteryMode: boolean;
  consecutiveCorrect: number;
  masteryTarget: number;
  recheckPool: Word[];
  onSubmit: (input: string) => void;
  onNext: () => void;
  onExit: () => void;
}

function DiffDisplay({ diff }: { diff: DiffSegment[] }) {
  return (
    <span className="diff-display">
      {diff.map((seg, i) => (
        <span
          key={i}
          className={`diff-char diff-${seg.type}`}
          title={seg.type === 'wrong' ? '错误字母' : seg.type === 'missing' ? '漏写' : seg.type === 'extra' ? '多余' : ''}
        >
          {seg.char}
        </span>
      ))}
    </span>
  );
}

export default function PracticeScreen({
  currentWord,
  mode,
  lastResult,
  phase,
  progress,
  totalWords,
  isMasteryMode,
  consecutiveCorrect,
  masteryTarget,
  recheckPool,
  onSubmit,
  onNext,
  onExit,
}: PracticeScreenProps) {
  const { analysisState, startAnalysis, sendMessage, closeAnalysis } = useAnalysis();

  const wrongDiff = lastResult && !lastResult.correct
    ? diffWords(lastResult.word.word, lastResult.userInput)
    : null;

  const handleDeepAnalyze = () => {
    if (!lastResult) return;
    startAnalysis(lastResult.word.word, lastResult.userInput, lastResult.word.phonetic);
  };

  return (
    <div className="practice-screen">
      <div className="practice-header">
        <button className="btn-back" onClick={onExit}>
          &#x2190; Quit
        </button>
        <div className="progress-info">
          <span className="progress-text">
            {progress + 1} / {totalWords}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((progress + 1) / totalWords) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {isMasteryMode && (
        <div className="mastery-banner">
          <span className="mastery-icon">🎯</span>
          <span className="mastery-label">Mastery Challenge</span>
          <span className="mastery-streak">{consecutiveCorrect} / {masteryTarget}</span>
          <div className="mastery-streak-bar">
            <div
              className="mastery-streak-fill"
              style={{ width: `${masteryTarget > 0 ? (consecutiveCorrect / masteryTarget) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {phase === 'answering' && currentWord && (
        <div className="practice-content">
          {recheckPool.some((w) => w.id === currentWord.id) && (
            <div className="recheck-indicator">🔁 Recheck</div>
          )}
          {mode === 'listen-spell' || mode === 'weakness-practice' ? (
            <SpellMode
              key={currentWord.id}
              word={currentWord}
              onSubmit={onSubmit}
              disabled={false}
            />
          ) : (
            <SentenceMode
              key={currentWord.id}
              word={currentWord}
              onSubmit={onSubmit}
              disabled={false}
            />
          )}
        </div>
      )}

      {phase === 'feedback' && lastResult && (
        <div className="practice-content">
          <div className={`feedback-card ${lastResult.correct ? 'correct' : 'wrong'}`}>
            <div className="feedback-icon">{lastResult.correct ? '✓' : '✗'}</div>
            <div className="feedback-detail">
              {lastResult.correct ? (
                <p className="feedback-msg">Correct!</p>
              ) : (
                <>
                  <p className="feedback-msg">Wrong!</p>
                  {isMasteryMode && (
                    <p className="mastery-reset-msg">
                      Streak reset! Need {masteryTarget} consecutive correct.
                    </p>
                  )}
                  <div className="answer-compare">
                    <span className="wrong-spelling">{lastResult.userInput || '(empty)'}</span>
                    <span className="arrow">→</span>
                    <span className="correct-spelling">{lastResult.word.word}</span>
                  </div>
                  {wrongDiff && (
                    <div className="diff-highlight">
                      <div className="diff-label">错误分析：</div>
                      <DiffDisplay diff={wrongDiff} />
                      <div className="diff-legend-inline">
                        <span className="legend-badge wrong-bg">红色=错误</span>
                        <span className="legend-badge missing-bg">灰色=漏写</span>
                        <span className="legend-badge extra-bg">橙色=多余</span>
                      </div>
                    </div>
                  )}
                  <button className="btn-deep-analyze" onClick={handleDeepAnalyze}>
                    🧠 AI 深入拆解
                  </button>
                </>
              )}
              <div className="word-def">
                <strong>{lastResult.word.word}</strong> {lastResult.word.phonetic} {lastResult.word.chinese}
                <button
                  className="btn-play-small"
                  onClick={() => speak(lastResult.word.word)}
                  title="听读音"
                >
                  🔊
                </button>
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={onNext}>
            {isMasteryMode ? 'Next Challenge →' : 'Next →'}
          </button>
        </div>
      )}

      <AnalysisModal state={analysisState} onClose={closeAnalysis} onSendMessage={sendMessage} />
    </div>
  );
}
