export type PracticeMode = 'listen-spell' | 'sentence-fill' | 'weakness-practice';

export type WordListName = 'cet4' | 'cet6' | 'ielts' | 'toefl' | 'postgrad';

export const WORD_LIST_LABELS: Record<WordListName, string> = {
  cet4: 'CET-4',
  cet6: 'CET-6',
  ielts: 'IELTS',
  toefl: 'TOEFL',
  postgrad: '考研',
};

export interface Word {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  chinese: string;
  example: string;
  list: WordListName;
}

export interface WordProgress {
  totalAttempts: number;
  correctAttempts: number;
  consecutiveCorrect: number;
  lastSeen: string | null;
  mistakes: string[];
}

export interface ProgressMap {
  [wordId: string]: WordProgress;
}

export type Screen = 'home' | 'practice' | 'result' | 'progress';

export interface PracticeResult {
  word: Word;
  userInput: string;
  correct: boolean;
}

export interface SessionConfig {
  mode: PracticeMode;
  lists: WordListName[];
  wordCount: number;
}

// Error pattern analysis types
export type ErrorType =
  | 'vowel_substitution'
  | 'vowel_missing'
  | 'vowel_extra'
  | 'double_letter_missing'
  | 'double_letter_extra'
  | 'consonant_substitution'
  | 'consonant_missing'
  | 'consonant_extra'
  | 'letter_order'
  | 'silent_letter'
  | 'ending_error';

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  vowel_substitution: '元音替换',
  vowel_missing: '漏写元音',
  vowel_extra: '多余元音',
  double_letter_missing: '漏写双写字母',
  double_letter_extra: '多余双写字母',
  consonant_substitution: '辅音替换',
  consonant_missing: '漏写辅音',
  consonant_extra: '多余辅音',
  letter_order: '字母顺序错误',
  silent_letter: '不发音字母',
  ending_error: '词尾错误',
};

export interface DiffSegment {
  char: string;
  correct: boolean;
  type: 'correct' | 'wrong' | 'missing' | 'extra';
}

export interface ErrorPattern {
  wordId: string;
  word: string;
  userInput: string;
  diff: DiffSegment[];
  errorTypes: ErrorType[];
  timestamp: string;
}

export interface PatternStats {
  totalErrors: number;
  errorTypeCounts: Partial<Record<ErrorType, number>>;
  errorPatterns: ErrorPattern[];
}
