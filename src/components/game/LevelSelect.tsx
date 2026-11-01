"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Star, Lock, Check } from "lucide-react";
import { LEVELS } from "@/lib/levels";
import type { UserProgress } from "@/lib/firebase-db";

interface LevelSelectProps {
  progress: UserProgress | null;
  onSelect: (levelId: number) => void;
  onBack: () => void;
}

const DIFFICULTY_COLORS = {
  1: "from-emerald-400 to-teal-500",
  2: "from-amber-400 to-orange-500",
  3: "from-rose-400 to-red-500",
} as const;

const DIFFICULTY_LABELS = {
  1: "Facile",
  2: "Moyen",
  3: "Difficile",
} as const;

export function LevelSelect({ progress, onSelect, onBack }: LevelSelectProps) {
  const currentLevel = progress?.currentLevel ?? 1;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-100 via-sky-50 to-violet-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Niveaux</h1>
      </div>

      {/* Levels Grid */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          {LEVELS.map((level, i) => {
            const isUnlocked = level.id <= currentLevel;
            const completed = progress?.completedLevels?.[level.id];
            const stars = completed?.stars ?? 0;

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
                      ? "bg-white/80 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      : "bg-white/40 opacity-60 cursor-not-allowed"
                  }
                `}
              >
                {completed && (
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white
                      bg-gradient-to-br ${DIFFICULTY_COLORS[level.difficulty]}
                    `}
                  >
                    {isUnlocked ? level.id : <Lock className="w-4 h-4" />}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {DIFFICULTY_LABELS[level.difficulty]}
                  </span>
                </div>

                <h3 className="font-bold text-slate-700 text-sm mb-0.5">
                  {level.category}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {level.words.length} mots
                </p>

                {completed && (
                  <div className="flex gap-0.5 mt-2">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= stars
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
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
