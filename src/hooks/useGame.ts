"use client";

import { useState, useCallback, useRef } from "react";
import type { Level } from "@/lib/levels";
import {
  createGameState,
  beginSelection,
  addToSelection,
  clearSelection,
  submitWord,
  revealHint,
  revealSolution,
  getCurrentWord,
  calculateStars,
  type GameState,
} from "@/lib/game-engine";
import { saveProgress, soundIsOn, type UserProgress } from "@/lib/firebase-db";
import { LEVELS } from "@/lib/levels";
import { todayKey, shiftDate } from "@/lib/daily";
import { playBonus, playSuccess, playTap, playWrong, buzz } from "@/lib/sfx";
import { speakWord } from "@/lib/speech";

export type FeedbackType = "correct" | "already" | "wrong" | "bonus" | null;

export function useGame(uid: string | null, progress: UserProgress | null, setProgress: (p: UserProgress) => void) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heard = useRef("");

  const startLevel = useCallback((level: Level, puzzleId = "", mode: "level" | "daily" = "level") => {
    setGameState(createGameState(level, puzzleId, mode));
    setFeedback(null);
  }, []);

  const tap = useCallback(() => {
    if (!soundIsOn(progress)) return;
    playTap();
    buzz(8);
  }, [progress]);

  const handleGestureStart = useCallback((row: number, col: number) => {
    tap();
    setGameState((prev) => (prev ? beginSelection(prev, row, col) : prev));
  }, [tap]);

  const handleTileSelect = useCallback((row: number, col: number) => {
    tap();
    setGameState((prev) => (prev ? addToSelection(prev, row, col) : prev));
  }, [tap]);

  const handleClear = useCallback(() => {
    setGameState((prev) => (prev ? clearSelection(prev) : prev));
  }, []);

  const handleSubmit = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const word = getCurrentWord(prev);
      const { state: newState, result } = submitWord(prev);
      if (word.length < 2) return newState;

      const mark = `${word}:${result}:${prev.score}`;
      if (heard.current !== mark) {
        heard.current = mark;
        if (soundIsOn(progress)) {
          if (result === "correct") {
            playSuccess();
            buzz(15);
          } else if (result === "bonus") {
            playBonus();
            buzz([10, 30, 10]);
          } else {
            playWrong();
            buzz(35);
          }
        }
        if (progress?.childMode && (result === "correct" || result === "bonus")) speakWord(word);
      }

      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      setFeedback(result);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 1200);

      if (newState.isComplete && progress) {
        if (newState.mode === "daily") {
          const today = todayKey();
          if (progress.dailyLastDate !== today) {
            const streak = progress.dailyLastDate === shiftDate(today, -1) ? (progress.dailyStreak ?? 0) + 1 : 1;
            const updated: UserProgress = {
              ...progress,
              totalScore: progress.totalScore + newState.score,
              dailyStreak: streak,
              dailyLastDate: today,
            };
            saveProgress(uid, updated);
            setProgress(updated);
          }
        } else {
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
      return revealHint(prev);
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
