import { useReducer, useCallback } from 'react';
import { Word, PracticeResult, SessionConfig } from '../types';

interface PracticeState {
  queue: Word[];
  reviewQueue: Word[];
  currentIndex: number;
  results: PracticeResult[];
  phase: 'answering' | 'feedback' | 'finished';
  config: SessionConfig | null;
  initialTotal: number;

  // Mastery mode
  isMasteryMode: boolean;
  consecutiveCorrect: number;
  masteryTarget: number;

  // Recheck pool (session-only, words the user got wrong)
  recheckPool: Word[];

  // Saved state for restoring after mastery
  savedQueue: Word[];
  savedQueueIndex: number;
}

type Action =
  | { type: 'START'; queue: Word[]; config: SessionConfig }
  | { type: 'SUBMIT'; userInput: string }
  | { type: 'NEXT' }
  | { type: 'REVIEW' }
  | { type: 'EXIT' }
  | { type: 'INSERT_CHALLENGE'; words: Word[] }
  | { type: 'REMOVE_FROM_RECHECK'; wordId: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function checkAnswer(word: Word, userInput: string): boolean {
  return userInput.trim().toLowerCase() === word.word.toLowerCase();
}

function randomMasteryTarget(): number {
  return 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
}

function reducer(state: PracticeState, action: Action): PracticeState {
  switch (action.type) {
    case 'START':
      return {
        queue: action.queue,
        reviewQueue: [],
        currentIndex: 0,
        results: [],
        phase: 'answering',
        config: action.config,
        initialTotal: action.queue.length,
        isMasteryMode: false,
        consecutiveCorrect: 0,
        masteryTarget: 0,
        recheckPool: [],
        savedQueue: [],
        savedQueueIndex: 0,
      };

    case 'SUBMIT': {
      const currentWord = state.queue[state.currentIndex];
      const correct = checkAnswer(currentWord, action.userInput);
      const result: PracticeResult = {
        word: currentWord,
        userInput: action.userInput,
        correct,
      };
      const newResults = [...state.results, result];

      if (state.isMasteryMode) {
        // In mastery mode: don't add to reviewQueue, add to recheckPool
        const alreadyInRecheck = state.recheckPool.some((w) => w.id === currentWord.id);
        const newRecheckPool = correct
          ? state.recheckPool
          : alreadyInRecheck
            ? state.recheckPool
            : [...state.recheckPool, currentWord];
        return {
          ...state,
          results: newResults,
          recheckPool: newRecheckPool,
          phase: 'feedback',
        };
      }

      const newReviewQueue = correct
        ? state.reviewQueue
        : [...state.reviewQueue, currentWord];
      return {
        ...state,
        results: newResults,
        reviewQueue: newReviewQueue,
        phase: 'feedback',
      };
    }

    case 'NEXT': {
      if (state.isMasteryMode) {
        const newStreak = state.consecutiveCorrect + 1;
        if (newStreak >= state.masteryTarget) {
          // Mastery achieved — restore saved queue
          const restoredQueue = state.savedQueue;
          const restoredIndex = state.savedQueueIndex + 1;

          // If saved queue is exhausted, fall through to finish/review logic
          if (restoredQueue.length === 0 || restoredIndex >= restoredQueue.length) {
            if (state.reviewQueue.length > 0) {
              return {
                ...state,
                queue: shuffle(state.reviewQueue),
                reviewQueue: [],
                currentIndex: 0,
                phase: 'answering',
                isMasteryMode: false,
                consecutiveCorrect: 0,
                masteryTarget: 0,
                savedQueue: [],
                savedQueueIndex: 0,
              };
            }
            return {
              ...state,
              phase: 'finished',
              isMasteryMode: false,
              consecutiveCorrect: 0,
              masteryTarget: 0,
              savedQueue: [],
              savedQueueIndex: 0,
            };
          }

          return {
            ...state,
            queue: restoredQueue,
            currentIndex: restoredIndex,
            isMasteryMode: false,
            consecutiveCorrect: 0,
            masteryTarget: 0,
            savedQueue: [],
            savedQueueIndex: 0,
            phase: 'answering',
          };
        }
        // Still in mastery, move to next challenge word
        const nextIdx = state.currentIndex + 1;
        // Mastery queue should have enough words, but guard against running out
        if (nextIdx >= state.queue.length) {
          return { ...state, phase: 'finished' };
        }
        return {
          ...state,
          currentIndex: nextIdx,
          consecutiveCorrect: newStreak,
          phase: 'answering',
        };
      }

      // Normal mode
      const nextIndex = state.currentIndex + 1;
      if (nextIndex < state.queue.length) {
        return {
          ...state,
          currentIndex: nextIndex,
          phase: 'answering',
        };
      }
      // Round done — if review queue has items, start review round
      if (state.reviewQueue.length > 0) {
        return {
          ...state,
          queue: shuffle(state.reviewQueue),
          reviewQueue: [],
          currentIndex: 0,
          phase: 'answering',
        };
      }
      return { ...state, phase: 'finished' };
    }

    case 'REVIEW': {
      const wrongResults = state.results.filter((r) => !r.correct);
      const wrongWords = wrongResults.map((r) => r.word);
      if (wrongWords.length === 0) {
        return { ...state, phase: 'finished' };
      }
      return {
        ...state,
        queue: shuffle(wrongWords),
        reviewQueue: [],
        currentIndex: 0,
        results: [],
        phase: 'answering',
        config: state.config,
        initialTotal: wrongWords.length,
        isMasteryMode: false,
        consecutiveCorrect: 0,
        masteryTarget: 0,
        recheckPool: [],
        savedQueue: [],
        savedQueueIndex: 0,
      };
    }

    case 'EXIT':
      return {
        queue: [],
        reviewQueue: [],
        currentIndex: 0,
        results: [],
        phase: 'finished',
        config: null,
        initialTotal: 0,
        isMasteryMode: false,
        consecutiveCorrect: 0,
        masteryTarget: 0,
        recheckPool: [],
        savedQueue: [],
        savedQueueIndex: 0,
      };

    case 'INSERT_CHALLENGE': {
      const target = randomMasteryTarget();
      const insertIdx = state.currentIndex + 1;
      const newQueue = [
        ...state.queue.slice(0, insertIdx),
        ...action.words,
        ...state.queue.slice(insertIdx),
      ];

      if (state.isMasteryMode) {
        // Already in mastery — just insert more words and reset streak
        return {
          ...state,
          queue: newQueue,
          masteryTarget: target,
          consecutiveCorrect: 0,
          phase: 'answering',
        };
      }

      // Entering mastery mode for the first time
      return {
        ...state,
        queue: newQueue,
        isMasteryMode: true,
        consecutiveCorrect: 0,
        masteryTarget: target,
        savedQueue: state.queue,
        savedQueueIndex: state.currentIndex,
        phase: 'answering',
      };
    }

    case 'REMOVE_FROM_RECHECK': {
      return {
        ...state,
        recheckPool: state.recheckPool.filter((w) => w.id !== action.wordId),
      };
    }

    default:
      return state;
  }
}

const initialState: PracticeState = {
  queue: [],
  reviewQueue: [],
  currentIndex: 0,
  results: [],
  phase: 'finished',
  config: null,
  initialTotal: 0,
  isMasteryMode: false,
  consecutiveCorrect: 0,
  masteryTarget: 0,
  recheckPool: [],
  savedQueue: [],
  savedQueueIndex: 0,
};

export function usePractice() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const start = useCallback((queue: Word[], config: SessionConfig) => {
    dispatch({ type: 'START', queue, config });
  }, []);

  const submit = useCallback((userInput: string) => {
    dispatch({ type: 'SUBMIT', userInput });
  }, []);

  const next = useCallback(() => {
    dispatch({ type: 'NEXT' });
  }, []);

  const review = useCallback(() => {
    dispatch({ type: 'REVIEW' });
  }, []);

  const exit = useCallback(() => {
    dispatch({ type: 'EXIT' });
  }, []);

  const insertChallenge = useCallback((words: Word[]) => {
    dispatch({ type: 'INSERT_CHALLENGE', words });
  }, []);

  const removeFromRecheck = useCallback((wordId: string) => {
    dispatch({ type: 'REMOVE_FROM_RECHECK', wordId });
  }, []);

  const currentWord = state.queue[state.currentIndex] || null;
  const lastResult = state.results[state.results.length - 1] || null;
  const totalWords = state.queue.length;
  const progress = state.currentIndex;
  const initialTotal = state.initialTotal;

  return {
    state,
    currentWord,
    lastResult,
    totalWords,
    progress,
    initialTotal,
    isMasteryMode: state.isMasteryMode,
    consecutiveCorrect: state.consecutiveCorrect,
    masteryTarget: state.masteryTarget,
    recheckPool: state.recheckPool,
    start,
    submit,
    next,
    review,
    exit,
    insertChallenge,
    removeFromRecheck,
  };
}
