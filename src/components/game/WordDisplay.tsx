"use client";

import { motion } from "framer-motion";
import type { Theme } from "@/lib/themes";

interface WordDisplayProps {
  targetWords: string[];
  foundWords: string[];
  theme: Theme;
}

export function WordDisplay({ targetWords, foundWords, theme }: WordDisplayProps) {
  const sorted = [...targetWords].sort((a, b) => a.length - b.length);

  const useTwoColumns = sorted.length >= 5 || sorted.some((w) => w.length > 6);
  const midpoint = Math.ceil(sorted.length / 2);
  const leftCol = useTwoColumns ? sorted.slice(0, midpoint) : sorted;
  const rightCol = useTwoColumns ? sorted.slice(midpoint) : [];

  return (
    <div className={`flex items-center justify-center px-4 ${useTwoColumns ? "gap-4 sm:gap-6" : "flex-col gap-1.5"}`}>
      <WordColumn words={leftCol} foundWords={foundWords} theme={theme} />
      {useTwoColumns && <WordColumn words={rightCol} foundWords={foundWords} theme={theme} />}
    </div>
  );
}

function WordColumn({
  words,
  foundWords,
  theme,
}: {
  words: string[];
  foundWords: string[];
  theme: Theme;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {words.map((word) => {
        const isFound = foundWords.includes(word);
        return (
          <motion.div
            key={word}
            className="flex gap-[3px]"
            animate={isFound ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {word.split("").map((letter, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-md text-xs sm:text-sm font-extrabold"
                style={{
                  width: 28,
                  height: 32,
                  background: isFound ? theme.accent : "rgba(245, 235, 220, 0.85)",
                  color: isFound ? "#FFFFFF" : "transparent",
                  boxShadow: isFound
                    ? `0 2px 4px rgba(0,0,0,0.2)`
                    : "inset 0 1px 2px rgba(0,0,0,0.06)",
                  border: isFound
                    ? `1px solid ${theme.accentDark}`
                    : "1px solid rgba(210, 195, 175, 0.5)",
                  textShadow: isFound ? "0 1px 1px rgba(0,0,0,0.2)" : "none",
                }}
              >
                {isFound ? letter : ""}
              </div>
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}
