import { ProgressMap, WordProgress, PatternStats } from '../types';

const PROGRESS_KEY = 'english_spell_progress';

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function getWordProgress(progress: ProgressMap, wordId: string): WordProgress {
  return (
    progress[wordId] || {
      totalAttempts: 0,
      correctAttempts: 0,
      consecutiveCorrect: 0,
      lastSeen: null,
      mistakes: [],
    }
  );
}

export function updateWordProgress(
  progress: ProgressMap,
  wordId: string,
  correct: boolean,
  userInput: string
): ProgressMap {
  const prev = getWordProgress(progress, wordId);
  const updated: WordProgress = {
    totalAttempts: prev.totalAttempts + 1,
    correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
    consecutiveCorrect: correct ? prev.consecutiveCorrect + 1 : 0,
    lastSeen: new Date().toISOString(),
    mistakes: correct ? prev.mistakes : [...prev.mistakes, userInput],
  };
  return { ...progress, [wordId]: updated };
}

// Error pattern storage
const PATTERNS_KEY = 'english_spell_patterns';

const EMPTY_PATTERN_STATS: PatternStats = {
  totalErrors: 0,
  errorTypeCounts: {},
  errorPatterns: [],
};

export function loadPatterns(): PatternStats {
  try {
    const raw = localStorage.getItem(PATTERNS_KEY);
    if (!raw) return { ...EMPTY_PATTERN_STATS, errorTypeCounts: {} };
    return JSON.parse(raw) as PatternStats;
  } catch {
    return { ...EMPTY_PATTERN_STATS, errorTypeCounts: {} };
  }
}

export function savePatterns(stats: PatternStats): void {
  try {
    localStorage.setItem(PATTERNS_KEY, JSON.stringify(stats));
  } catch {
    // Storage full or unavailable
  }
}
