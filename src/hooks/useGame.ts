"use client";

import { useState, useCallback, useRef } from "react";
import type { Level } from "@/lib/levels";
import {
  createGameState,
  addToSelection,
  clearSelection,
  submitWord,
  useHintReveal,
  getCurrentWord,
  calculateStars,
  type GameState,
} from "@/lib/game-engine";
import { saveProgress, type UserProgress } from "@/lib/firebase-db";

export type FeedbackType = "correct" | "already" | "wrong" | null;

export function useGame(uid: string | null, progress: UserProgress | null, setProgress: (p: UserProgress) => void) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startLevel = useCallback((level: Level) => {
    setGameState(createGameState(level));
    setFeedback(null);
  }, []);

  const handleTileSelect = useCallback((row: number, col: number) => {
    setGameState((prev) => (prev ? addToSelection(prev, row, col) : prev));
  }, []);

  const handleClear = useCallback(() => {
    setGameState((prev) => (prev ? clearSelection(prev) : prev));
  }, []);

  const handleSubmit = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const word = getCurrentWord(prev);
      if (word.length < 2) return prev;

      const { state: newState, result } = submitWord(prev);

      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      setFeedback(result);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 1200);

      if (newState.isComplete && progress) {
        const stars = calculateStars(newState);
        const elapsed = Math.floor((Date.now() - newState.startTime) / 1000);
        const updated: UserProgress = {
          ...progress,
          completedLevels: {
            ...progress.completedLevels,
            [newState.levelId]: { stars, score: newState.score, bestTime: elapsed },
          },
          totalScore: progress.totalScore + newState.score,
          currentLevel: Math.max(progress.currentLevel, newState.levelId + 1),
        };
        saveProgress(uid, updated);
        setProgress(updated);
      }

      return newState;
    });
  }, [uid, progress, setProgress]);

  const handleHint = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (progress && progress.hintsRemaining <= 0) return prev;
      if (progress) {
        const updated = { ...progress, hintsRemaining: progress.hintsRemaining - 1 };
        saveProgress(uid, updated);
        setProgress(updated);
      }
      return useHintReveal(prev);
    });
  }, [uid, progress, setProgress]);

  const exitGame = useCallback(() => {
    setGameState(null);
    setFeedback(null);
  }, []);

  return {
    gameState,
    feedback,
    startLevel,
    handleTileSelect,
    handleClear,
    handleSubmit,
    handleHint,
    exitGame,
    currentWord: gameState ? getCurrentWord(gameState) : "",
    stars: gameState ? calculateStars(gameState) : 0,
  };
}
