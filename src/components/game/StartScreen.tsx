"use client";

import { motion } from "framer-motion";
import { Baby, CalendarDays, Hash, LayoutGrid, LogIn, Play, User, Volume2, VolumeX } from "lucide-react";

interface StartScreenProps {
  onPlay: () => void;
  onLevels: () => void;
  onDaily: () => void;
  onToggleChild: () => void;
  onToggleCounts: () => void;
  onToggleSound: () => void;
  childMode: boolean;
  showCounts: boolean;
  soundOn: boolean;
  dailyDone: boolean;
  dailyStreak: number;
  userName?: string | null;
  onSignIn?: () => void;
  isConfigured: boolean;
}

export function StartScreen({
  onPlay,
  onLevels,
  onDaily,
  onToggleChild,
  onToggleCounts,
  onToggleSound,
  childMode,
  showCounts,
  soundOn,
  dailyDone,
  dailyStreak,
  userName,
  onSignIn,
  isConfigured,
}: StartScreenProps) {
  return (
    <div
      className="min-h-app flex flex-col items-center px-6 py-4 relative overflow-x-hidden overflow-y-auto"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
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
        className="text-center mb-8 z-10 mt-auto"
      >
        {/* App icon */}
        <motion.div
          animate={{ x: [0, 22, 0, -22, 0], rotate: [0, 8, 0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          className="mx-auto flex items-center justify-center w-28 h-28 rounded-3xl shadow-2xl mb-6 relative"
          style={{
            transformOrigin: "center center",
            background: "linear-gradient(145deg, #2a2d3a 0%, #1a1c28 50%, #15171f 100%)",
            boxShadow: "0 0 40px rgba(249,115,22,0.2), 0 8px 32px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Mini tiles inside icon */}
          <div className="grid grid-cols-2 gap-1.5">
            {["M", "O", "T", "S"].map((l) => (
              <div
                key={l}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-black"
                style={{
                  background: "linear-gradient(145deg, #FFF9F0 0%, #F3E6D4 46%, #E4D3BE 100%)",
                  color: "#2D2A26",
                  boxShadow:
                    "0 3px 0 #C4B49E, 0 4px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -2px 0 rgba(120,90,50,0.16)",
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </motion.div>

        <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
          Motissimo
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
          type="button"
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
          type="button"
          onClick={onLevels}
          className="w-full h-12 text-base font-bold text-white rounded-2xl flex items-center justify-center gap-3 border border-white/25 bg-white/10 transition-transform active:scale-95"
        >
          <LayoutGrid className="w-5 h-5" />
          Niveaux
        </button>

        <button
          type="button"
          onClick={onDaily}
          className="w-full h-12 text-base font-bold text-white rounded-2xl flex items-center justify-center gap-3 border border-white/25 bg-white/10 transition-transform active:scale-95"
        >
          <CalendarDays className="w-5 h-5" />
          {dailyDone ? "Rejouer le défi" : "Défi du jour"}
        </button>
        {dailyStreak > 0 && (
          <p className="text-center text-xs text-white/60">
            Série de {dailyStreak} jour{dailyStreak > 1 ? "s" : ""}
            {dailyDone ? " · fait aujourd'hui" : ""}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Toggle icon={Baby} label="Enfant" pressed={childMode} onClick={onToggleChild} />
          <Toggle icon={Hash} label="Chiffres" pressed={showCounts} onClick={onToggleCounts} />
          <Toggle icon={soundOn ? Volume2 : VolumeX} label="Sons" pressed={soundOn} onClick={onToggleSound} />
        </div>
        {childMode && (
          <p className="text-center text-xs text-white/60">Mots simples, lus à voix haute</p>
        )}

        {isConfigured && !userName && onSignIn && (
          <button
            type="button"
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
        15 niveaux · un défi chaque jour
      </motion.p>
    </div>
  );
}

function Toggle({
  icon: Icon,
  label,
  pressed,
  onClick,
}: {
  icon: typeof Baby;
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-transform active:scale-95 ${
        pressed ? "bg-white text-cyan-900" : "bg-white/10 text-white/75 border border-white/15"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
