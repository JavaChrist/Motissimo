"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Lightbulb,
  Shuffle,
  Send,
  X,
  Star,
  Clock,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TileGrid } from "./TileGrid";
import { WordSlots } from "./WordSlots";
import type { GameState } from "@/lib/game-engine";
import type { FeedbackType } from "@/hooks/useGame";
import type { UserProgress } from "@/lib/firebase-db";
import { calculateStars } from "@/lib/game-engine";

interface GameScreenProps {
  gameState: GameState;
  progress: UserProgress | null;
  feedback: FeedbackType;
  currentWord: string;
  onTileSelect: (id: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onHint: (type: "reveal" | "shuffle") => void;
  onExit: () => void;
  onNextLevel: () => void;
}

export function GameScreen({
  gameState,
  progress,
  feedback,
  currentWord,
  onTileSelect,
  onClear,
  onSubmit,
  onHint,
  onExit,
  onNextLevel,
}: GameScreenProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (gameState.isComplete) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameState.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.startTime, gameState.isComplete]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const stars = calculateStars(gameState);
  const hintsLeft = progress?.hintsRemaining ?? 0;

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-indigo-100 via-sky-50 to-violet-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onExit}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-700">
            Niveau {gameState.levelId}
          </h2>
          <p className="text-xs text-slate-500">{gameState.category}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1.5 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sm font-mono text-slate-600">
            {formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Category hint */}
      <div className="text-center px-6 pb-2">
        <span className="inline-flex items-center gap-1.5 bg-white/70 rounded-full px-4 py-1.5 text-xs text-slate-600 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {gameState.hint}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-4 pb-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-slate-700">{gameState.score}</span>
        </div>
        <div className="text-xs text-slate-400">
          {gameState.foundWords.length}/{gameState.targetWords.length} mots
        </div>
        {gameState.bonusWords.length > 0 && (
          <div className="text-xs text-emerald-600 font-medium">
            +{gameState.bonusWords.length} bonus
          </div>
        )}
      </div>

      {/* Word Slots */}
      <div className="pb-4">
        <WordSlots
          targetWords={gameState.targetWords}
          foundWords={gameState.foundWords}
        />
      </div>

      {/* Current Word Display */}
      <div className="px-4 pb-4">
        <div className="relative mx-auto max-w-md h-14 bg-white/70 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className={`absolute inset-0 rounded-2xl flex items-center justify-center text-sm font-bold z-10 ${
                  feedback === "correct"
                    ? "bg-emerald-100 text-emerald-700"
                    : feedback === "bonus"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-600"
                }`}
              >
                {feedback === "correct" && "Bravo !"}
                {feedback === "bonus" && "Mot bonus !"}
                {feedback === "wrong" && "Essaie encore..."}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-1">
            {currentWord ? (
              currentWord.split("").map((letter, i) => (
                <motion.span
                  key={`${letter}-${i}`}
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="w-9 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-lg font-bold text-violet-700 border border-violet-200"
                >
                  {letter}
                </motion.span>
              ))
            ) : (
              <span className="text-sm text-slate-400">
                Sélectionne des lettres...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tile Grid */}
      <div className="flex-1 flex items-start justify-center pb-4">
        <TileGrid
          tiles={gameState.tiles}
          cols={gameState.cols}
          rows={gameState.rows}
          onTileSelect={onTileSelect}
        />
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-slate-200/60 px-4 py-3 pb-safe">
        <div className="flex items-center justify-between max-w-md mx-auto gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onHint("reveal")}
            disabled={hintsLeft <= 0}
            className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 rounded-xl"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="text-xs">{hintsLeft}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onHint("shuffle")}
            disabled={hintsLeft <= 0}
            className="gap-1.5 text-sky-600 border-sky-200 hover:bg-sky-50 rounded-xl"
          >
            <Shuffle className="w-4 h-4" />
          </Button>

          {currentWord.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-1 text-slate-500 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          <Button
            onClick={onSubmit}
            disabled={currentWord.length < 3}
            className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            Valider
          </Button>
        </div>
      </div>

      {/* Level Complete Overlay */}
      <AnimatePresence>
        {gameState.isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                Niveau terminé !
              </h2>
              <p className="text-slate-500 mb-4">
                {gameState.category}
              </p>

              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3].map((s) => (
                  <motion.div
                    key={s}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + s * 0.15, type: "spring" }}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        s <= stars
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center gap-6 mb-6 text-sm">
                <div>
                  <p className="text-slate-400">Score</p>
                  <p className="text-xl font-bold text-slate-700">
                    {gameState.score}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Temps</p>
                  <p className="text-xl font-bold text-slate-700">
                    {formatTime(elapsed)}
                  </p>
                </div>
                {gameState.bonusWords.length > 0 && (
                  <div>
                    <p className="text-slate-400">Bonus</p>
                    <p className="text-xl font-bold text-emerald-600">
                      +{gameState.bonusWords.length}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onExit}
                  className="flex-1 rounded-xl"
                >
                  Niveaux
                </Button>
                <Button
                  onClick={onNextLevel}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
                >
                  Suivant
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
