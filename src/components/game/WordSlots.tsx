"use client";

import { motion } from "framer-motion";

interface WordSlotsProps {
  targetWords: string[];
  foundWords: string[];
}

export function WordSlots({ targetWords, foundWords }: WordSlotsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center px-4">
      {targetWords.map((word) => {
        const isFound = foundWords.includes(word);
        return (
          <motion.div
            key={word}
            className={`
              flex gap-1 p-1.5 rounded-lg
              ${isFound ? "bg-emerald-100" : "bg-white/60"}
            `}
            animate={isFound ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {word.split("").map((letter, i) => (
              <div
                key={i}
                className={`
                  w-7 h-8 sm:w-8 sm:h-9 rounded-md flex items-center justify-center
                  text-xs sm:text-sm font-bold border-2
                  ${
                    isFound
                      ? "bg-emerald-500 text-white border-emerald-600"
                      : "bg-white/80 text-transparent border-slate-300"
                  }
                `}
              >
                {isFound ? letter : "?"}
              </div>
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}
