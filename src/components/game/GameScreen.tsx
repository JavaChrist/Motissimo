"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Lightbulb, Trophy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TileGrid } from "./TileGrid";
import { WordDisplay } from "./WordDisplay";
import { getTheme } from "@/lib/themes";
import { calculateStars, type GameState } from "@/lib/game-engine";
import type { FeedbackType } from "@/hooks/useGame";
import type { UserProgress } from "@/lib/firebase-db";

interface GameScreenProps {
  gameState: GameState;
  progress: UserProgress | null;
  feedback: FeedbackType;
  currentWord: string;
  onGestureStart: (row: number, col: number) => void;
  onTileSelect: (row: number, col: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  onHint: () => void;
  onSolution: () => string;
  onExit: () => void;
  onNextLevel: () => void;
}

export function GameScreen({
  gameState,
  progress,
  feedback,
  currentWord,
  onGestureStart,
  onTileSelect,
  onClear,
  onSubmit,
  onHint,
  onSolution,
  onExit,
  onNextLevel,
}: GameScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [shownSolution, setShownSolution] = useState<{ puzzleId: string; word: string } | null>(null);
  const solution = shownSolution?.puzzleId === gameState.puzzleId ? shownSolution.word : null;
  const theme = getTheme(gameState.theme);
  const stars = calculateStars(gameState);
  const hintsLeft = progress?.hintsRemaining ?? 0;

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

  const handleSwipeEnd = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  const handleSolution = useCallback(() => {
    const word = onSolution();
    if (word) setShownSolution({ puzzleId: gameState.puzzleId, word });
  }, [gameState.puzzleId, onSolution]);

  const wordsLeft = gameState.targetWords.length - gameState.foundWords.length;

  return (
    <div
      className="h-dvh flex flex-col relative overflow-hidden"
      style={{ background: theme.background }}
    >
      {/* Close button */}
      <div
        className="absolute top-0 right-3 z-30"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label="Quitter"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Top banner */}
      <div
        className="flex justify-center px-14 pb-2 z-10 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div
          className="relative px-8 py-3 rounded-2xl max-w-xs w-full text-center"
          style={{
            background: "linear-gradient(145deg, #FFF8ED 0%, #F5ECD8 100%)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
            border: "2px solid rgba(210, 180, 140, 0.4)",
          }}
        >
          <h2
            className="text-lg sm:text-xl font-black tracking-tight"
            style={{ color: "#3D3227" }}
          >
            {gameState.title}
          </h2>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-6 pb-1 z-10 shrink-0">
        <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium">
          <Trophy className="w-3.5 h-3.5" />
          <span>{gameState.score}</span>
        </div>
        <div className="text-white/60 text-xs">
          {gameState.foundWords.length}/{gameState.targetWords.length}
        </div>
        <div className="text-white/60 text-xs font-mono">
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Word Display */}
      <div className="flex-1 min-h-0 flex items-center justify-center z-10 py-2">
        <WordDisplay
          targetWords={gameState.targetWords}
          foundWords={gameState.foundWords}
          theme={theme}
        />
      </div>

      {/* Current word badge */}
      <div className="flex justify-center z-10 shrink-0" style={{ minHeight: 36 }}>
        <AnimatePresence mode="wait">
          {currentWord.length > 0 && (
            <motion.div
              key={currentWord}
              initial={{ scale: 0.8, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -8 }}
              className="px-5 py-1.5 rounded-full font-black text-sm tracking-wider text-white"
              style={{
                background: theme.accent,
                boxShadow: `0 0 20px rgba(${theme.accentRgb}, 0.4), 0 4px 12px rgba(0,0,0,0.2)`,
              }}
            >
              {currentWord}
            </motion.div>
          )}
          {feedback && !currentWord && (
            <motion.div
              key="feedback"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`px-5 py-1.5 rounded-full font-bold text-sm ${
                feedback === "correct"
                  ? "bg-emerald-500 text-white"
                  : feedback === "already"
                    ? "bg-amber-500 text-white"
                    : "bg-red-500/80 text-white"
              }`}
            >
              {feedback === "correct" && "Bravo !"}
              {feedback === "already" && "Déjà trouvé"}
              {feedback === "wrong" && "Essaie encore"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tile Grid */}
      <div className="z-10 shrink-0 pb-2">
        <TileGrid
          grid={gameState.grid}
          selection={gameState.selection}
          foundWords={gameState.foundWords}
          targetWords={gameState.targetWords}
          theme={theme}
          onGestureStart={onGestureStart}
          onTileSelect={onTileSelect}
          onSwipeEnd={handleSwipeEnd}
        />
      </div>

      {/* Bottom actions */}
      <div
        className="flex items-center justify-center gap-4 z-10 shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onHint}
          disabled={hintsLeft <= 0}
          aria-label="Indice"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white/80 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors disabled:opacity-30"
        >
          <Lightbulb className="w-4 h-4" />
          <span>{hintsLeft}</span>
        </button>
        <button
          type="button"
          onClick={handleSolution}
          disabled={wordsLeft === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors disabled:opacity-30"
        >
          <KeyRound className="w-4 h-4" />
          Solution
        </button>
        {currentWord.length >= 2 && (
          <button
            type="button"
            onClick={onSubmit}
            className="px-6 py-2 rounded-full text-sm font-bold text-white transition-colors"
            style={{
              background: theme.accent,
              boxShadow: `0 0 16px rgba(${theme.accentRgb}, 0.4)`,
            }}
          >
            Valider
          </button>
        )}
        {currentWord.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 rounded-full text-xs font-bold text-white/60 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            Effacer
          </button>
        )}
      </div>

      <Dialog open={solution !== null} onOpenChange={(open) => !open && setShownSolution(null)}>
        <DialogContent className="text-center sm:max-w-xs" showCloseButton={false}>
          <DialogHeader className="items-center">
            <DialogTitle>Solution</DialogTitle>
            <DialogDescription>
              Les tuiles éclairées montrent le chemin, dans l&apos;ordre.
            </DialogDescription>
          </DialogHeader>
          <p className="text-3xl font-black tracking-[0.25em]">{solution}</p>
          <Button type="button" className="w-full" onClick={() => setShownSolution(null)}>
            Compris
          </Button>
        </DialogContent>
      </Dialog>

      {/* Level Complete Overlay */}
      <AnimatePresence>
        {gameState.isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="rounded-3xl p-8 max-w-sm w-full text-center"
              style={{
                background: "linear-gradient(145deg, #FFF8ED 0%, #F5ECD8 100%)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
                }}
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-black mb-1" style={{ color: "#3D3227" }}>
                Niveau terminé !
              </h2>
              <p className="text-sm mb-4" style={{ color: "#8B7D6B" }}>
                {gameState.title}
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
                          : "text-gray-300"
                      }`}
                    />
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center gap-8 mb-6 text-sm">
                <div>
                  <p style={{ color: "#8B7D6B" }}>Score</p>
                  <p className="text-xl font-black" style={{ color: "#3D3227" }}>
                    {gameState.score}
                  </p>
                </div>
                <div>
                  <p style={{ color: "#8B7D6B" }}>Temps</p>
                  <p className="text-xl font-black" style={{ color: "#3D3227" }}>
                    {formatTime(elapsed)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onExit}
                  className="flex-1 rounded-xl border-2 font-bold"
                  style={{ borderColor: "rgba(139,125,107,0.3)", color: "#3D3227" }}
                >
                  Accueil
                </Button>
                <Button
                  onClick={onNextLevel}
                  className="flex-1 rounded-xl font-bold text-white"
                  style={{ background: theme.accent }}
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
