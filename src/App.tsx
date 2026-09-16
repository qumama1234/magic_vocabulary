import { useState, useCallback, useEffect, useRef } from 'react';
import { Screen, PracticeMode, WordListName, ErrorType } from './types';
import { selectWords } from './utils/scheduler';
import {
  findSimilarWords,
  findWordsForErrorType,
  recordErrorPattern,
  findSimilarForMisspelling,
} from './utils/patterns';
import { usePractice } from './hooks/usePractice';
import { useProgress } from './hooks/useProgress';
import HomeScreen from './components/HomeScreen';
import PracticeScreen from './components/PracticeScreen';
import ResultScreen from './components/ResultScreen';
import ProgressScreen from './components/ProgressScreen';
import './App.css';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<PracticeMode>('listen-spell');
  const [selectedLists, setSelectedLists] = useState<WordListName[]>(['cet4']);
  const [selectedWeakness, setSelectedWeakness] = useState<ErrorType | null>(null);
  const [wordCount, setWordCount] = useState(10);
  const { progress, recordAnswer } = useProgress();
  const {
    state: practiceState,
    currentWord,
    lastResult,
    totalWords,
    progress: practiceProgress,
    isMasteryMode,
    consecutiveCorrect,
    masteryTarget,
    recheckPool,
    start,
    submit,
    next,
    review,
    exit,
    insertChallenge,
    removeFromRecheck,
  } = usePractice();

  const handleStart = useCallback(() => {
    let words;
    if (mode === 'weakness-practice') {
      words = selectedWeakness
        ? findWordsForErrorType(selectedWeakness, wordCount)
        : findSimilarWords(wordCount);
    } else {
      words = selectWords(selectedLists, wordCount, progress);
    }
    if (words.length === 0) return;
    const config = { mode, lists: selectedLists, wordCount };
    start(words, config);
    setScreen('practice');
  }, [selectedLists, selectedWeakness, wordCount, mode, progress, start]);

  const handleSubmit = useCallback(
    (input: string) => {
      submit(input);
      // Record result after submit triggers state update
    },
    [submit]
  );

  const handleNext = useCallback(() => {
    if (!lastResult || !currentWord) {
      next();
      return;
    }

    // Record the previous answer
    recordAnswer(currentWord.id, lastResult.correct, lastResult.userInput);

    if (!lastResult.correct) {
      // Record error pattern for persistent analysis
      recordErrorPattern(currentWord.id, currentWord.word, lastResult.userInput);

      // Find similar words for mastery challenge (3-5)
      const excludeIds = practiceState.queue.map((w) => w.id);
      const similarWords = findSimilarForMisspelling(
        currentWord.word,
        lastResult.userInput,
        4,
        excludeIds
      );
      // Insert similar words + the original error word as the last challenge
      insertChallenge([...similarWords, currentWord]);
      return;
    }

    // Correct answer: remove from recheck pool if present
    if (recheckPool.some((w) => w.id === currentWord.id)) {
      removeFromRecheck(currentWord.id);
    }

    // Normal mode recheck: 25% chance to insert a word from recheck pool
    if (!isMasteryMode && recheckPool.length > 0 && Math.random() < 0.25) {
      const recheckWord = recheckPool[Math.floor(Math.random() * recheckPool.length)];
      insertChallenge([recheckWord]);
      return;
    }

    next();
  }, [
    lastResult,
    currentWord,
    recordAnswer,
    next,
    practiceState.queue,
    isMasteryMode,
    recheckPool,
    insertChallenge,
    removeFromRecheck,
  ]);

  const handleExit = useCallback(() => {
    exit();
    setScreen('home');
  }, [exit]);

  const handleReview = useCallback(() => {
    review();
    setScreen('practice');
  }, [review]);

  const handleNewPractice = useCallback(() => {
    exit();
    setScreen('home');
  }, [exit]);

  const handleNavigate = useCallback((newScreen: Screen) => {
    setScreen(newScreen);
  }, []);

  const handleListToggle = useCallback((list: WordListName) => {
    setSelectedLists((prev) =>
      prev.includes(list) ? prev.filter((l) => l !== list) : [...prev, list]
    );
  }, []);

  const prevPhaseRef = useRef(practiceState.phase);

  useEffect(() => {
    if (prevPhaseRef.current !== 'finished' && practiceState.phase === 'finished' && screen === 'practice') {
      setScreen('result');
    }
    prevPhaseRef.current = practiceState.phase;
  }, [practiceState.phase, screen]);

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          mode={mode}
          selectedLists={selectedLists}
          wordCount={wordCount}
          onModeChange={setMode}
          selectedWeakness={selectedWeakness}
          onWeaknessChange={setSelectedWeakness}
          onListToggle={handleListToggle}
          onWordCountChange={setWordCount}
          onStart={handleStart}
          onNavigate={handleNavigate}
        />
      )}

      {screen === 'practice' && currentWord && (
        <PracticeScreen
          currentWord={currentWord}
          mode={mode}
          lastResult={lastResult}
          phase={practiceState.phase}
          progress={practiceProgress}
          totalWords={totalWords}
          isMasteryMode={isMasteryMode}
          consecutiveCorrect={consecutiveCorrect}
          masteryTarget={masteryTarget}
          recheckPool={recheckPool}
          onSubmit={handleSubmit}
          onNext={handleNext}
          onExit={handleExit}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          results={practiceState.results}
          onReview={handleReview}
          onNewPractice={handleNewPractice}
          onNavigate={handleNavigate}
        />
      )}

      {screen === 'progress' && (
        <ProgressScreen onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
