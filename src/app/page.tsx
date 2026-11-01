"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StartScreen } from "@/components/game/StartScreen";
import { LevelSelect } from "@/components/game/LevelSelect";
import { GameScreen } from "@/components/game/GameScreen";
import { useAuth } from "@/hooks/useAuth";
import { useGame } from "@/hooks/useGame";
import { getLevelById, LEVELS } from "@/lib/levels";

type Screen = "start" | "levels" | "game";

export default function Home() {
  const { user, signInWithGoogle, isConfigured } = useAuth();
  const {
    gameState,
    progress,
    feedback,
    startLevel,
    handleTileSelect,
    handleClear,
    handleSubmit,
    handleHint,
    exitGame,
    getCurrentWord: currentWord,
  } = useGame(user?.uid ?? null);

  const [screen, setScreen] = useState<Screen>("start");

  const handlePlay = useCallback(() => {
    const currentLevel = progress?.currentLevel ?? 1;
    const level = getLevelById(currentLevel) ?? LEVELS[0];
    startLevel(level);
    setScreen("game");
  }, [progress, startLevel]);

  const handleSelectLevel = useCallback(
    (levelId: number) => {
      const level = getLevelById(levelId);
      if (level) {
        startLevel(level);
        setScreen("game");
      }
    },
    [startLevel]
  );

  const handleNextLevel = useCallback(() => {
    if (!gameState) return;
    const nextId = gameState.levelId + 1;
    const next = getLevelById(nextId);
    if (next) {
      startLevel(next);
    } else {
      setScreen("levels");
      exitGame();
    }
  }, [gameState, startLevel, exitGame]);

  const handleExit = useCallback(() => {
    exitGame();
    setScreen("levels");
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
            userName={user?.displayName}
            onSignIn={signInWithGoogle}
            isConfigured={isConfigured}
          />
        </motion.div>
      )}

      {screen === "levels" && !gameState && (
        <motion.div
          key="levels"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <LevelSelect
            progress={progress}
            onSelect={handleSelectLevel}
            onBack={() => setScreen("start")}
          />
        </motion.div>
      )}

      {gameState && (
        <motion.div
          key="game"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <GameScreen
            gameState={gameState}
            progress={progress}
            feedback={feedback}
            currentWord={currentWord}
            onTileSelect={handleTileSelect}
            onClear={handleClear}
            onSubmit={handleSubmit}
            onHint={handleHint}
            onExit={handleExit}
            onNextLevel={handleNextLevel}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
