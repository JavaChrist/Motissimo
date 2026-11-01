"use client";

import { motion } from "framer-motion";
import { Play, Grid3X3, LogIn, User } from "lucide-react";

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
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 120% 40% at 50% 55%, rgba(255,255,255,0.12) 0%, transparent 100%),
          linear-gradient(180deg,
            #7EC8E3 0%,
            #58B4D1 12%,
            #3AA7C9 22%,
            #1E9BBF 32%,
            #0891B2 42%,
            #0E7490 52%,
            #0C6980 60%,
            #0A5E73 70%,
            #085C6E 80%,
            #065A68 100%
          )
        `,
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, white 0%, transparent 70%)",
          top: "-200px",
          left: "-100px",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-5"
        style={{
          background: "radial-gradient(circle, white 0%, transparent 70%)",
          bottom: "-150px",
          right: "-80px",
        }}
      />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 z-10"
      >
        {/* App icon */}
        <motion.div
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-28 h-28 rounded-3xl shadow-2xl mb-6 relative"
          style={{
            background: "linear-gradient(145deg, #2a2d3a 0%, #1a1c28 50%, #15171f 100%)",
            boxShadow: "0 0 40px rgba(249,115,22,0.2), 0 8px 32px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Mini tiles inside icon */}
          <div className="grid grid-cols-2 gap-1.5">
            {["W", "O", "R", "D"].map((l, i) => (
              <div
                key={l}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-black"
                style={{
                  background: "linear-gradient(145deg, #F5F0E8 0%, #E8E0D4 100%)",
                  color: "#2D2A26",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </motion.div>

        <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
          Word Tiles
        </h1>
        <p className="text-white/60 text-base">
          Trouve les mots cachés dans les tuiles
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-xs space-y-3 z-10"
      >
        <button
          onClick={onPlay}
          className="w-full h-14 text-lg font-bold text-white rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            boxShadow: "0 0 24px rgba(249,115,22,0.3), 0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          <Play className="w-5 h-5" />
          Jouer
        </button>

        <button
          onClick={onLevels}
          className="w-full h-14 text-lg font-bold text-white/90 rounded-2xl flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-all active:scale-95"
        >
          <Grid3X3 className="w-5 h-5" />
          Niveaux
        </button>

        {isConfigured && !userName && onSignIn && (
          <button
            onClick={onSignIn}
            className="w-full h-12 text-sm font-medium text-white/50 rounded-2xl flex items-center justify-center gap-2 hover:text-white/70 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
        )}

        {userName && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-white/40">
            <User className="w-4 h-4" />
            <span>{userName}</span>
          </div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-auto pt-8 text-xs text-white/30 z-10"
      >
        15 niveaux · Mots en français
      </motion.p>
    </div>
  );
}
