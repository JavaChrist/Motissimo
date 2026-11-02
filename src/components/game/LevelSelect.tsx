"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock, RotateCcw, Star } from "lucide-react";
import { useConfirm } from "@/components/ConfirmProvider";
import { LEVELS } from "@/lib/levels";
import { gridsForSize, levelSize } from "@/lib/puzzle-bank";
import { getTheme } from "@/lib/themes";
import type { UserProgress } from "@/lib/firebase-db";

interface LevelSelectProps {
  progress: UserProgress | null;
  onSelect: (levelId: number) => void;
  onBack: () => void;
  onResetScores: () => void;
}

const DIFFICULTY_LABELS = {
  1: "Facile",
  2: "Moyen",
  3: "Difficile",
} as const;

export function LevelSelect({ progress, onSelect, onBack, onResetScores }: LevelSelectProps) {
  const confirm = useConfirm();
  const currentLevel = progress?.currentLevel ?? 1;
  const hasScores =
    (progress?.totalScore ?? 0) > 0 ||
    Object.values(progress?.completedLevels ?? {}).some((level) => level.stars > 0 || level.score > 0);

  return (
    <div
      className="h-app flex flex-col relative overflow-hidden"
      style={{
        background: `
          linear-gradient(180deg,
            #1a1c28 0%,
            #252836 30%,
            #1a1c28 100%
          )
        `,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pb-3 relative z-10 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </button>
        <h1 className="text-xl font-black text-white flex-1">Niveaux</h1>
        <button
          type="button"
          disabled={!hasScores}
          onClick={async () => {
            const accepted = await confirm({
              title: "Remettre les étoiles à zéro ?",
              description:
                "Les étoiles et les scores de tous les niveaux seront effacés. Les niveaux déjà ouverts restent accessibles.",
              confirmLabel: "Reset",
              cancelLabel: "Annuler",
              variant: "destructive",
            });
            if (accepted) onResetScores();
          }}
          className="h-10 px-3 flex items-center gap-1.5 rounded-full bg-white/10 text-white/80 text-sm font-bold hover:bg-white/15 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Levels Grid */}
      <div
        className="px-4 relative z-10 flex-1 min-h-0 overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          {LEVELS.map((level, i) => {
            const isUnlocked = level.id <= currentLevel;
            const completed = progress?.completedLevels?.[level.id];
            const starCount = completed?.stars ?? 0;
            const theme = getTheme(level.theme);

            return (
              <motion.button
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelect(level.id)}
                className={`
                  relative rounded-2xl p-4 text-left transition-all
                  ${
                    isUnlocked
                      ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      : "opacity-40 cursor-not-allowed"
                  }
                `}
                style={{
                  background: isUnlocked
                    ? "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))"
                    : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isUnlocked ? "0 4px 16px rgba(0,0,0,0.2)" : "none",
                }}
              >
                {completed && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow"
                    style={{ background: theme.accent }}
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: isUnlocked ? theme.accent : "rgba(255,255,255,0.1)" }}
                  >
                    {isUnlocked ? level.id : <Lock className="w-4 h-4" />}
                  </span>
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                    {DIFFICULTY_LABELS[level.difficulty]}
                  </span>
                </div>

                <h3 className="font-bold text-white/90 text-sm mb-0.5">
                  {level.title}
                </h3>
                <p className="text-[11px] text-white/30">
                  {level.grid[0].length}×{level.grid.length} · {gridsForSize(levelSize(level), progress?.childMode === true)} grilles
                </p>

                {completed && (
                  <div className="flex gap-0.5 mt-2">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= starCount
                            ? "text-amber-400 fill-amber-400"
                            : "text-white/15"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
