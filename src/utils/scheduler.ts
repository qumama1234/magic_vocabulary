import { Word, ProgressMap, WordListName } from '../types';
import { getWords } from '../data';
import { getWordProgress } from './storage';

const DAY_MS = 24 * 60 * 60 * 1000;

function getBox(consecutiveCorrect: number): number {
  if (consecutiveCorrect >= 3) return 3;
  if (consecutiveCorrect >= 1) return 2;
  return 1;
}

function daysSince(isoDate: string | null): number {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / DAY_MS;
}

function isDue(progress: ReturnType<typeof getWordProgress>): boolean {
  const box = getBox(progress.consecutiveCorrect);
  if (box === 1) return true;
  if (box === 2) return daysSince(progress.lastSeen) >= 2;
  if (box === 3) return daysSince(progress.lastSeen) >= 7;
  return true;
}

export function selectWords(
  lists: WordListName[],
  count: number,
  progress: ProgressMap
): Word[] {
  const allWords = getWords(lists);

  if (allWords.length === 0) return [];

  const scored = allWords.map((word) => {
    const p = getWordProgress(progress, word.id);
    const mastered = p.consecutiveCorrect >= 3;
    const neverPracticed = p.totalAttempts === 0;
    const mistakeCount = p.mistakes.length;

    let priority = 0;
    if (mastered) priority += 0;
    else priority += 100;
    priority += mistakeCount * 30;
    if (neverPracticed) priority += 50;
    priority += Math.random() * 40;

    return { word, priority, due: isDue(p) };
  });

  // Filter to due words first, then sort by priority descending
  const dueWords = scored.filter((s) => s.due);
  const candidates = dueWords.length >= count ? dueWords : scored;

  candidates.sort((a, b) => b.priority - a.priority);

  return candidates.slice(0, count).map((s) => s.word);
}
