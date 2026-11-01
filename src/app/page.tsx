"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameScreen } from "@/components/game/GameScreen";
import { LevelSelect } from "@/components/game/LevelSelect";
import { StartScreen } from "@/components/game/StartScreen";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useGame";
import { loadProgress, saveProgress, countsAreVisible, soundIsOn, type UserProgress } from "@/lib/firebase-db";
import { getLevelById, LEVELS } from "@/lib/levels";
import {
  applyPuzzle,
  levelSize,
  LOCAL_PUZZLES,
  loadPuzzleBank,
  pickPuzzle,
  puzzlesForLevel,
  type Puzzle,
} from "@/lib/puzzle-bank";
import { puzzleForDay, todayKey } from "@/lib/daily";

type Screen = "start" | "levels" | "game";

export default function Home() {
  const { user, signInWithGoogle, isConfigured } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [screen, setScreen] = useState<Screen>("start");
  const [bank, setBank] = useState<Puzzle[]>(LOCAL_PUZZLES);

  const uid = user?.uid ?? "";

  useEffect(() => {
    loadProgress(uid || null).then(setProgress);
  }, [uid]);

  useEffect(() => {
    if (isConfigured && !uid) return;
    let cancelled = false;
    loadPuzzleBank().then((puzzles) => {
      if (!cancelled) setBank(puzzles);
    });
    return () => {
      cancelled = true;
    };
  }, [isConfigured, uid]);

  const {
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
    currentWord,
  } = useGame(user?.uid ?? null, progress, setProgress);

  const launchLevel = useCallback(
    (levelId: number, avoidId?: string) => {
      const level = getLevelById(levelId) ?? LEVELS[0];
      const puzzle = pickPuzzle(
        puzzlesForLevel(bank, level, progress?.childMode === true),
        progress?.seenPuzzleIds ?? [],
        avoidId
      );
      const seen = progress?.seenPuzzleIds ?? [];
      const nextSeen = seen.includes(puzzle.id) ? seen : [...seen, puzzle.id];
      const base: UserProgress = progress ?? {
        completedLevels: {},
        totalScore: 0,
        hintsRemaining: 5,
        currentLevel: 1,
        seenPuzzleIds: [],
      };
      const updated: UserProgress = { ...base, seenPuzzleIds: nextSeen };
      setProgress(updated);
      saveProgress(user?.uid ?? null, updated);
      startLevel(applyPuzzle(level, puzzle), puzzle.id, "level");
      setScreen("game");
    },
    [bank, progress, startLevel, user?.uid]
  );

  const handlePlay = useCallback(() => {
    launchLevel(progress?.currentLevel ?? 1);
  }, [launchLevel, progress?.currentLevel]);

  const handleNextLevel = useCallback(() => {
    const levelId = gameState?.levelId ?? 1;
    const next = levelId < LEVELS.length ? levelId + 1 : levelId;
    launchLevel(next, next === levelId ? gameState?.puzzleId : undefined);
  }, [gameState?.levelId, gameState?.puzzleId, launchLevel]);

  const handleDaily = useCallback(() => {
    const puzzle = puzzleForDay(bank, todayKey(), progress?.childMode === true);
    if (!puzzle) return;
    const level = LEVELS.find((item) => levelSize(item) === puzzle.size) ?? LEVELS[0];
    startLevel(applyPuzzle(level, puzzle), puzzle.id, "daily");
    setScreen("game");
  }, [bank, progress?.childMode, startLevel]);

  const savePatch = useCallback(
    (partial: Partial<UserProgress>) => {
      const base: UserProgress = progress ?? {
        completedLevels: {},
        totalScore: 0,
        hintsRemaining: 5,
        currentLevel: 1,
        seenPuzzleIds: [],
      };
      const updated: UserProgress = { ...base, ...partial };
      setProgress(updated);
      saveProgress(user?.uid ?? null, updated);
    },
    [progress, user?.uid]
  );

  const handleExit = useCallback(() => {
    exitGame();
    setScreen("start");
  }, [exitGame]);

  return (
    <AnimatePresence mode="wait">
      {screen === "start" && !gameState && (
        <motion.div
          key="start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StartScreen
            onPlay={handlePlay}
            onLevels={() => setScreen("levels")}
            onDaily={handleDaily}
            onToggleChild={() => {
              const next = progress?.childMode !== true;
              savePatch({ childMode: next, showCounts: next });
            }}
            onToggleCounts={() => savePatch({ showCounts: !countsAreVisible(progress) })}
            onToggleSound={() => savePatch({ soundEnabled: !soundIsOn(progress) })}
            childMode={progress?.childMode === true}
            showCounts={countsAreVisible(progress)}
            soundOn={soundIsOn(progress)}
            dailyDone={progress?.dailyLastDate === todayKey()}
            dailyStreak={progress?.dailyStreak ?? 0}
            userName={user?.displayName}
            onSignIn={signInWithGoogle}
            isConfigured={isConfigured}
          />
        </motion.div>
      )}

      {screen === "levels" && !gameState && (
        <motion.div
          key="levels"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LevelSelect
            progress={progress}
            onSelect={launchLevel}
            onBack={() => setScreen("start")}
            onResetScores={() => {
              const base: UserProgress = progress ?? {
                completedLevels: {},
                totalScore: 0,
                hintsRemaining: 5,
                currentLevel: 1,
                seenPuzzleIds: [],
              };
              const updated: UserProgress = {
                ...base,
                completedLevels: {},
                totalScore: 0,
              };
              setProgress(updated);
              saveProgress(user?.uid ?? null, updated);
            }}
          />
        </motion.div>
      )}

      {gameState && (
        <motion.div
          key="game"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <GameScreen
            gameState={gameState}
            progress={progress}
            feedback={feedback}
            currentWord={currentWord}
            onGestureStart={handleGestureStart}
            onTileSelect={handleTileSelect}
            onClear={handleClear}
            onSubmit={handleSubmit}
            onHint={handleHint}
            onSolution={handleSolution}
            onExit={handleExit}
            onNextLevel={handleNextLevel}
            showCounts={countsAreVisible(progress)}
            soundOn={soundIsOn(progress)}
            onToggleSound={() => savePatch({ soundEnabled: !soundIsOn(progress) })}
            dailyStreak={progress?.dailyStreak ?? 0}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
