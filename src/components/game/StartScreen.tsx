"use client";

import { motion } from "framer-motion";
import { Play, Grid3X3, Settings, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartScreenProps {
  onPlay: () => void;
  onLevels: () => void;
  userName?: string | null;
  onSignIn?: () => void;
  isConfigured: boolean;
}

export function StartScreen({
  onPlay,
  onLevels,
  userName,
  onSignIn,
  isConfigured,
}: StartScreenProps) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-indigo-100 via-sky-50 to-violet-100 p-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <motion.div
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30 mb-6"
        >
          <span className="text-4xl font-black text-white tracking-tighter">
            W
          </span>
        </motion.div>

        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
          Word Tiles
        </h1>
        <p className="text-slate-500 text-lg">
          Trouve les mots cachés dans les tuiles
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          onClick={onPlay}
          size="lg"
          className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl shadow-lg shadow-violet-500/25 gap-3"
        >
          <Play className="w-5 h-5" />
          Jouer
        </Button>

        <Button
          onClick={onLevels}
          variant="outline"
          size="lg"
          className="w-full h-14 text-lg bg-white/70 hover:bg-white border-2 border-slate-200 rounded-2xl gap-3"
        >
          <Grid3X3 className="w-5 h-5" />
          Niveaux
        </Button>

        {isConfigured && !userName && onSignIn && (
          <Button
            onClick={onSignIn}
            variant="ghost"
            size="lg"
            className="w-full h-12 text-slate-500 hover:text-slate-700 rounded-2xl gap-2"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </Button>
        )}

        {userName && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-400">
            <User className="w-4 h-4" />
            <span>{userName}</span>
          </div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-auto pt-8 text-xs text-slate-400"
      >
        20 niveaux · Mots en français
      </motion.p>
    </div>
  );
}
