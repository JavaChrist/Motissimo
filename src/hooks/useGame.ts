"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Level } from "@/lib/levels";
import {
  createGameState,
  selectTile,
  clearSelection,
  submitWord,
  useHint,
  getCurrentWord,
  calculateStars,
  getElapsedTime,
  type GameState,
} from "@/lib/game-engine";
import { loadProgress, saveProgress, type UserProgress } from "@/lib/firebase-db";

export type FeedbackType = "correct" | "bonus" | "wrong" | null;

export function useGame(uid: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadProgress(uid).then(setProgress);
  }, [uid]);

  const startLevel = useCallback((level: Level) => {
    setGameState(createGameState(level));
    setFeedback(null);
  }, []);

  const handleTileSelect = useCallback((tileId: string) => {
    setGameState((prev) => (prev ? selectTile(prev, tileId) : prev));
  }, []);

  const handleClear = useCallback(() => {
    setGameState((prev) => (prev ? clearSelection(prev) : prev));
  }, []);

  const handleSubmit = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const word = getCurrentWord(prev);
      if (word.length < 3) return prev;

      const { state: newState, result } = submitWord(prev);

      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      setFeedback(result);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 1200);

      if (newState.isComplete) {
        const stars = calculateStars(newState);
        const elapsed = getElapsedTime(newState);
        setProgress((p) => {
          if (!p) return p;
          const updated: UserProgress = {
            ...p,
            completedLevels: {
              ...p.completedLevels,
              [newState.levelId]: {
                stars,
                score: newState.score,
                bestTime: elapsed,
              },
            },
            totalScore: p.totalScore + newState.score,
            currentLevel: Math.max(p.currentLevel, newState.levelId + 1),
          };
          saveProgress(uid, updated);
          return updated;
        });
      }

      return newState;
    });
  }, [uid]);

  const handleHint = useCallback((type: "reveal" | "shuffle") => {
    setGameState((prev) => {
      if (!prev) return prev;
      setProgress((p) => {
        if (!p) return p;
        if (p.hintsRemaining <= 0) return p;
        const updated = { ...p, hintsRemaining: p.hintsRemaining - 1 };
        saveProgress(uid, updated);
        return updated;
      });
      return useHint(prev, type);
    });
  }, [uid]);

  const exitGame = useCallback(() => {
    setGameState(null);
    setFeedback(null);
  }, []);

  return {
    gameState,
    progress,
    feedback,
    startLevel,
    handleTileSelect,
    handleClear,
    handleSubmit,
    handleHint,
    exitGame,
    getCurrentWord: gameState ? getCurrentWord(gameState) : "",
    stars: gameState ? calculateStars(gameState) : 0,
    elapsed: gameState ? getElapsedTime(gameState) : 0,
  };
}
