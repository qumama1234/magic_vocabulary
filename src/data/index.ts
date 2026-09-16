import { Word, WordListName } from '../types';
import cet4Words from './cet4';
import cet6Words from './cet6';
import ieltsWords from './ielts';
import toeflWords from './toefl';
import postgradWords from './postgrad';

const wordLists: Record<WordListName, Word[]> = {
  cet4: cet4Words,
  cet6: cet6Words,
  ielts: ieltsWords,
  toefl: toeflWords,
  postgrad: postgradWords,
};

export function getWords(lists: WordListName[]): Word[] {
  const words: Word[] = [];
  for (const list of lists) {
    words.push(...wordLists[list]);
  }
  return words;
}

export function getAllWords(): Word[] {
  return Object.values(wordLists).flat();
}

export function getWordCount(lists: WordListName[]): number {
  return getWords(lists).length;
}
