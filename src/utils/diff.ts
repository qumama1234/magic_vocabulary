import { DiffSegment, ErrorType } from '../types';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const SILENT_LETTER_PATTERNS = [
  { after: 'k', before: 'n' },  // knight, know
  { after: 'w', before: 'r' },  // write, wrong
  { after: 'g', before: 'n' },  // gnaw, sign
  { after: 'p', before: 's' },  // psychology
  { after: 'h', before: 'r' },  // rhythm
  { after: 'm', before: 'b' }, // bomb, comb, lamb (silent b after m)
];

export function diffWords(correct: string, userInput: string): DiffSegment[] {
  const correctLower = correct.toLowerCase();
  const userLower = userInput.toLowerCase();
  const result: DiffSegment[] = [];

  let ci = 0;
  let ui = 0;

  while (ci < correctLower.length || ui < userLower.length) {
    if (ci < correctLower.length && ui < userLower.length && correctLower[ci] === userLower[ui]) {
      result.push({ char: correct[ci], correct: true, type: 'correct' });
      ci++;
      ui++;
    } else if (ci < correctLower.length && ui < userLower.length) {
      // Mismatch — look ahead to see if it's a substitution, missing, or extra
      const nextCorrectMatch = correctLower.indexOf(userLower[ui], ci + 1);
      const nextUserMatch = userLower.indexOf(correctLower[ci], ui + 1);

      if (nextCorrectMatch !== -1 && nextCorrectMatch <= ci + 2) {
        // Correct has extra char(s) that user missed
        while (ci < nextCorrectMatch) {
          result.push({ char: correct[ci], correct: false, type: 'missing' });
          ci++;
        }
      } else if (nextUserMatch !== -1 && nextUserMatch <= ui + 2) {
        // User typed extra char(s)
        while (ui < nextUserMatch) {
          result.push({ char: userInput[ui] || userLower[ui], correct: false, type: 'extra' });
          ui++;
        }
      } else {
        // Simple substitution
        result.push({ char: correct[ci], correct: false, type: 'wrong' });
        ci++;
        ui++;
      }
    } else if (ci < correctLower.length) {
      // User input ended, rest of correct is missing
      while (ci < correctLower.length) {
        result.push({ char: correct[ci], correct: false, type: 'missing' });
        ci++;
      }
    } else {
      // User typed extra beyond correct length
      while (ui < userLower.length) {
        result.push({ char: userInput[ui] || userLower[ui], correct: false, type: 'extra' });
        ui++;
      }
    }
  }

  return result;
}

export function analyzeErrorTypes(correct: string, userInput: string): ErrorType[] {
  const diff = diffWords(correct, userInput);
  const types: ErrorType[] = [];

  const wrongSegments = diff.filter((s) => !s.correct);

  for (const seg of wrongSegments) {
    const ch = seg.char.toLowerCase();

    if (seg.type === 'missing') {
      if (VOWELS.has(ch)) {
        addType(types, 'vowel_missing');
      } else {
        addType(types, 'consonant_missing');
      }
      // Check if it's a double letter issue
      if (isDoubleLetterPart(correct, seg, diff)) {
        addType(types, 'double_letter_missing');
      }
    } else if (seg.type === 'extra') {
      if (VOWELS.has(ch)) {
        addType(types, 'vowel_extra');
      } else {
        addType(types, 'consonant_extra');
      }
      if (isDoubleLetterPart(userInput, seg, diff)) {
        addType(types, 'double_letter_extra');
      }
    } else if (seg.type === 'wrong') {
      if (VOWELS.has(ch)) {
        addType(types, 'vowel_substitution');
      } else {
        addType(types, 'consonant_substitution');
      }
    }
  }

  // Check for letter order errors by comparing character sets
  const correctSorted = correct.toLowerCase().split('').sort().join('');
  const userSorted = userInput.toLowerCase().split('').sort().join('');
  if (correctSorted === userSorted && correct.toLowerCase() !== userInput.toLowerCase()) {
    addType(types, 'letter_order');
  }

  // Check for silent letter issues
  if (hasSilentLetterIssue(correct, userInput)) {
    addType(types, 'silent_letter');
  }

  // Check for ending errors (last 3 chars)
  const end1 = correct.slice(-3).toLowerCase();
  const end2 = userInput.slice(-3).toLowerCase();
  if (end1 !== end2 && Math.abs(correct.length - userInput.length) <= 2) {
    addType(types, 'ending_error');
  }

  return types;
}

function addType(types: ErrorType[], type: ErrorType) {
  if (!types.includes(type)) {
    types.push(type);
  }
}

function isDoubleLetterPart(word: string, seg: DiffSegment, diff: DiffSegment[]): boolean {
  const idx = diff.indexOf(seg);
  if (idx < 0) return false;
  // Check if previous or next character in word is the same letter
  const prevChar = diff[idx - 1];
  const nextChar = diff[idx + 1];
  return (
    (prevChar && prevChar.char.toLowerCase() === seg.char.toLowerCase()) ||
    (nextChar && nextChar.char.toLowerCase() === seg.char.toLowerCase())
  );
}

function hasSilentLetterIssue(correct: string, userInput: string): boolean {
  const cl = correct.toLowerCase();
  const ul = userInput.toLowerCase();
  for (const { after, before } of SILENT_LETTER_PATTERNS) {
    // Check if correct has silent letter pattern but user missed the silent letter
    for (let i = 0; i < cl.length - 1; i++) {
      if (cl[i] === after && cl[i + 1] === before) {
        // Check if user has 'before' but not 'after' + 'before'
        if (!ul.includes(after + before) && ul.includes(before)) {
          return true;
        }
      }
    }
  }
  return false;
}
