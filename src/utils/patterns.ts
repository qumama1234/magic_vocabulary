import { ErrorPattern, ErrorType, Word, PatternStats } from '../types';
import { diffWords, analyzeErrorTypes } from './diff';
import { getAllWords } from '../data';
import { loadPatterns, savePatterns } from './storage';

export function recordErrorPattern(
  wordId: string,
  word: string,
  userInput: string
): void {
  const diff = diffWords(word, userInput);
  const errorTypes = analyzeErrorTypes(word, userInput);
  const pattern: ErrorPattern = {
    wordId,
    word,
    userInput,
    diff,
    errorTypes,
    timestamp: new Date().toISOString(),
  };

  const stats = loadPatterns();
  stats.totalErrors++;
  stats.errorPatterns.push(pattern);
  for (const t of errorTypes) {
    stats.errorTypeCounts[t] = (stats.errorTypeCounts[t] || 0) + 1;
  }
  // Keep only last 100 error patterns
  if (stats.errorPatterns.length > 100) {
    stats.errorPatterns = stats.errorPatterns.slice(-100);
  }
  savePatterns(stats);
}

export function getPatternStats(): PatternStats {
  return loadPatterns();
}

// Find words that share similar spelling challenges with the user's error patterns
export function findSimilarWords(count: number): Word[] {
  const stats = loadPatterns();
  const allWords = getAllWords();

  if (stats.errorPatterns.length === 0) return [];

  // Find the top error types
  const topErrorTypes = Object.entries(stats.errorTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type as ErrorType);

  // Analyze recently mis-spelled words to extract challenge patterns
  const recentErrors = stats.errorPatterns.slice(-20);
  const errorWords = new Set(recentErrors.map((p) => p.wordId));

  // Extract substrings that the user got wrong
  const errorNgrams = extractErrorNgrams(recentErrors);

  // Score all words by similarity to error patterns (exclude already practiced errors)
  const scored = allWords
    .filter((w) => !errorWords.has(w.id))
    .map((word) => {
      let score = 0;
      for (const ngram of errorNgrams) {
        if (word.word.toLowerCase().includes(ngram)) {
          score += ngram.length * 5;
        }
      }
      // Bonus for matching error types (e.g., double letters, silent letters)
      for (const et of topErrorTypes) {
        score += scoreForErrorType(word, et);
      }
      // Random factor
      score += Math.random() * 10;
      return { word, score };
    });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.word);
}

export function findWordsForErrorType(errorType: ErrorType, count: number): Word[] {
  const stats = loadPatterns();
  const allWords = getAllWords();
  const recentErrorWords = new Set(
    stats.errorPatterns
      .filter((p) => p.errorTypes.includes(errorType))
      .slice(-20)
      .map((p) => p.wordId)
  );

  const scored = allWords
    .filter((word) => !recentErrorWords.has(word.id))
    .map((word) => ({
      word,
      score: scoreForErrorType(word, errorType) + Math.random() * 8,
    }))
    .filter((entry) => entry.score > 0);

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, count).map((entry) => entry.word);
  if (selected.length >= count) return selected;

  const fallback = findSimilarWords(count - selected.length).filter(
    (word) => !selected.some((selectedWord) => selectedWord.id === word.id)
  );
  return [...selected, ...fallback].slice(0, count);
}

function extractErrorNgrams(patterns: ErrorPattern[]): string[] {
  const ngrams: Map<string, number> = new Map();
  for (const p of patterns) {
    // Extract 2-3 char sequences around the error positions
    const wrongSegs = p.diff.filter((s) => !s.correct);
    for (const seg of wrongSegs) {
      const idx = p.diff.indexOf(seg);
      // Get surrounding 2-3 chars from the correct word context
      const start = Math.max(0, idx - 1);
      const end = Math.min(p.diff.length, idx + 3);
      const context = p.diff.slice(start, end).map((s) => s.char).join('');
      if (context.length >= 2) {
        ngrams.set(context.toLowerCase(), (ngrams.get(context.toLowerCase()) || 0) + 1);
      }
    }
  }
  // Return frequent ngrams
  return Array.from(ngrams.entries())
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ngram]) => ngram);
}

function scoreForErrorType(word: Word, errorType: ErrorType): number {
  const w = word.word.toLowerCase();
  switch (errorType) {
    case 'double_letter_missing':
    case 'double_letter_extra':
      // Check if word contains double letters
      return /(.)\1/.test(w) ? 15 : 0;
    case 'silent_letter':
      // Words with potential silent letters
      return /(kn|wr|gn|ps|mb|rh)/.test(w) ? 15 : 0;
    case 'vowel_substitution':
      // Words with multiple vowels close together
      return /[aeiou]{2,}/.test(w) ? 10 : 0;
    case 'letter_order':
      // Words with ie/ei patterns
      return /(ie|ei)/.test(w) ? 15 : 0;
    case 'ending_error':
      // Words with common tricky endings
      return /(tion|sion|able|ible|ence|ance)$/.test(w) ? 12 : 0;
    case 'consonant_substitution':
      // Words with c/s/g/j confusable consonants
      return /[csgj]/.test(w) ? 8 : 0;
    default:
      return 5;
  }
}

// Find similar words specifically for a misspelling error
// Used by the mastery challenge system to find words sharing the same error patterns
export function findSimilarForMisspelling(
  correctWord: string,
  userInput: string,
  count: number,
  excludeWordIds: string[] = []
): Word[] {
  const allWords = getAllWords();
  const diff = diffWords(correctWord, userInput);
  const errorTypes = analyzeErrorTypes(correctWord, userInput);

  // Build exclude set
  const excludeSet = new Set(excludeWordIds.map((id) => id.toLowerCase()));
  excludeSet.add(correctWord.toLowerCase());

  // Extract challenge features from the error
  const features = extractChallengeFeatures(correctWord, userInput, diff, errorTypes);

  // Score all words
  const scored = allWords
    .filter((w) => !excludeSet.has(w.id.toLowerCase()) && w.word.toLowerCase() !== correctWord.toLowerCase())
    .map((word) => {
      let score = 0;

      // n-gram matching (error position context)
      for (const ngram of features.ngrams) {
        if (word.word.toLowerCase().includes(ngram)) {
          score += Math.min(ngram.length * 3, 12);
        }
      }

      // Ending match
      for (const ending of features.endings) {
        if (word.word.toLowerCase().endsWith(ending)) {
          score += ending.length >= 3 ? 20 : 10;
        }
      }

      // Double letter pattern
      if (features.hasDoubleLetter && /(.)\1/.test(word.word.toLowerCase())) {
        score += 15;
      }

      // Silent letter patterns
      if (features.hasSilentLetters) {
        for (const pattern of features.silentPatterns) {
          if (word.word.toLowerCase().includes(pattern)) {
            score += 18;
            break;
          }
        }
      }

      // Vowel sequence
      if (features.hasVowelSequence && /[aeiou]{2,}/.test(word.word.toLowerCase())) {
        score += 12;
      }

      // Error type bonuses
      for (const et of errorTypes) {
        score += scoreForErrorType(word, et);
      }

      // Random factor for variety
      score += Math.random() * 8;

      return { word, score };
    });

  scored.sort((a, b) => b.score - a.score);
  const result = scored.slice(0, count).map((s) => s.word);

  // Fallback: not enough, supplement with findSimilarWords (historical)
  if (result.length < count) {
    const fallback = findSimilarWords(count - result.length).filter(
      (w) => !excludeSet.has(w.id.toLowerCase()) && w.word.toLowerCase() !== correctWord.toLowerCase()
    );
    return [...result, ...fallback].slice(0, count);
  }

  return result;
}

interface ChallengeFeatures {
  ngrams: string[];
  endings: string[];
  hasDoubleLetter: boolean;
  hasSilentLetters: boolean;
  silentPatterns: string[];
  hasVowelSequence: boolean;
}

function extractChallengeFeatures(
  correctWord: string,
  _userInput: string,
  diff: import('../types').DiffSegment[],
  errorTypes: import('../types').ErrorType[]
): ChallengeFeatures {
  const cl = correctWord.toLowerCase();

  // Extract n-grams around error positions (2-4 char)
  const ngrams: string[] = [];
  const wrongIdxs = diff
    .map((s, i) => (!s.correct ? i : -1))
    .filter((i) => i >= 0);

  for (const idx of wrongIdxs) {
    const start = Math.max(0, idx - 1);
    const end = Math.min(cl.length, idx + 3);
    const ngram = cl.slice(start, end);
    if (ngram.length >= 2) {
      ngrams.push(ngram);
    }
  }

  // Extract word endings (last 2-4 chars)
  const endings: string[] = [];
  for (let len = 2; len <= 4; len++) {
    if (cl.length >= len) {
      endings.push(cl.slice(-len));
    }
  }

  // Check for double letter patterns in correct word
  const hasDoubleLetter = /(.)\1/.test(cl);

  // Check for silent letter patterns
  const silentPatterns: string[] = [];
  const SILENT_COMBOS = ['kn', 'wr', 'gn', 'ps', 'mb', 'rh', 'gh', 'wh'];
  for (const pat of SILENT_COMBOS) {
    if (cl.includes(pat)) {
      silentPatterns.push(pat);
    }
  }
  const hasSilentLetters = silentPatterns.length > 0 ||
    errorTypes.includes('silent_letter');

  // Check for vowel sequences
  const hasVowelSequence = /[aeiou]{2,}/.test(cl);

  return {
    ngrams,
    endings,
    hasDoubleLetter,
    hasSilentLetters,
    silentPatterns,
    hasVowelSequence,
  };
}

// Get a summary of user's weak areas for display
export function getWeaknessSummary(): { type: ErrorType; label: string; count: number }[] {
  const stats = loadPatterns();
  return Object.entries(stats.errorTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({
      type: type as ErrorType,
      label: getErrorLabel(type as ErrorType),
      count,
    }));
}

function getErrorLabel(type: ErrorType): string {
  const labels: Record<ErrorType, string> = {
    vowel_substitution: '元音混淆 (a/e/i/o/u)',
    vowel_missing: '漏写元音',
    vowel_extra: '多余元音',
    double_letter_missing: '漏写双字母',
    double_letter_extra: '多余双字母',
    consonant_substitution: '辅音混淆',
    consonant_missing: '漏写辅音',
    consonant_extra: '多余辅音',
    letter_order: '字母顺序 (ei/ie等)',
    silent_letter: '不发音字母 (kn/wr等)',
    ending_error: '词尾拼写 (-tion/-sion等)',
  };
  return labels[type] || type;
}
