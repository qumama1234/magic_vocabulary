import { useState, useCallback } from 'react';
import { ProgressMap, WordProgress, WordListName } from '../types';
import { loadProgress, saveProgress, updateWordProgress } from '../utils/storage';
import { getAllWords } from '../data';

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(loadProgress);

  const recordAnswer = useCallback((wordId: string, correct: boolean, userInput: string) => {
    setProgress((prev) => {
      const updated = updateWordProgress(prev, wordId, correct, userInput);
      saveProgress(updated);
      return updated;
    });
  }, []);

  const getWordStats = useCallback(
    (wordId: string): WordProgress => {
      return (
        progress[wordId] || {
          totalAttempts: 0,
          correctAttempts: 0,
          consecutiveCorrect: 0,
          lastSeen: null,
          mistakes: [],
        }
      );
    },
    [progress]
  );

  const getListStats = useCallback(
    (list: WordListName) => {
      const words = getAllWords().filter((w) => w.list === list);
      let totalAttempts = 0;
      let totalCorrect = 0;
      for (const w of words) {
        const p = progress[w.id];
        if (p) {
          totalAttempts += p.totalAttempts;
          totalCorrect += p.correctAttempts;
        }
      }
      const practiced = words.filter((w) => (progress[w.id]?.totalAttempts ?? 0) > 0).length;
      const mastered = words.filter((w) => (progress[w.id]?.consecutiveCorrect ?? 0) >= 3).length;
      return {
        total: words.length,
        practiced,
        mastered,
        totalAttempts,
        totalCorrect,
        accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      };
    },
    [progress]
  );

  const getHardestWords = useCallback((limit: number = 10) => {
    const words = getAllWords();
    const entries = words
      .map((w) => ({ word: w, progress: progress[w.id] }))
      .filter((e) => e.progress && e.progress.totalAttempts > 0)
      .sort((a, b) => {
        const aRate = a.progress.correctAttempts / a.progress.totalAttempts;
        const bRate = b.progress.correctAttempts / b.progress.totalAttempts;
        return aRate - bRate;
      })
      .slice(0, limit);
    return entries;
  }, [progress]);

  const resetProgress = useCallback(() => {
    setProgress({});
    saveProgress({});
  }, []);

  return {
    progress,
    recordAnswer,
    getWordStats,
    getListStats,
    getHardestWords,
    resetProgress,
  };
}
