"use client";

import { useState, useCallback, useRef } from "react";
import type { Level } from "@/lib/levels";
import {
  createGameState,
  beginSelection,
  addToSelection,
  clearSelection,
  submitWord,
  useHintReveal,
  revealSolution,
  getCurrentWord,
  calculateStars,
  type GameState,
} from "@/lib/game-engine";
import { saveProgress, type UserProgress } from "@/lib/firebase-db";
import { LEVELS } from "@/lib/levels";

export type FeedbackType = "correct" | "already" | "wrong" | null;

export function useGame(uid: string | null, progress: UserProgress | null, setProgress: (p: UserProgress) => void) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startLevel = useCallback((level: Level, puzzleId = "") => {
    setGameState(createGameState(level, puzzleId));
    setFeedback(null);
  }, []);

  const handleGestureStart = useCallback((row: number, col: number) => {
    setGameState((prev) => (prev ? beginSelection(prev, row, col) : prev));
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
      const { state: newState, result } = submitWord(prev);
      if (getCurrentWord(prev).length < 2) return newState;

      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      setFeedback(result);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 1200);

      if (newState.isComplete && progress) {
        const stars = calculateStars(newState);
        const elapsed = Math.floor((Date.now() - newState.startTime) / 1000);
        const key = String(newState.levelId);
        const previous = progress.completedLevels[key];
        const updated: UserProgress = {
          ...progress,
          currentLevel: Math.max(
            progress.currentLevel ?? 1,
            Math.min(LEVELS.length, newState.levelId + 1)
          ),
          completedLevels: {
            ...progress.completedLevels,
            [key]: {
              stars: Math.max(previous?.stars ?? 0, stars),
              score: Math.max(previous?.score ?? 0, newState.score),
              bestTime: previous ? Math.min(previous.bestTime, elapsed) : elapsed,
            },
          },
          totalScore: progress.totalScore + newState.score,
        };
        saveProgress(uid, updated);
        setProgress(updated);
      }

      return newState;
    });
  }, [uid, progress, setProgress]);

  const handleSolution = useCallback(() => {
    if (!gameState || gameState.isComplete) return "";
    const result = revealSolution(gameState);
    setGameState(result.state);
    return result.word;
  }, [gameState]);

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
    handleGestureStart,
    handleTileSelect,
    handleClear,
    handleSubmit,
    handleHint,
    handleSolution,
    exitGame,
    currentWord: gameState ? getCurrentWord(gameState) : "",
    stars: gameState ? calculateStars(gameState) : 0,
  };
}
