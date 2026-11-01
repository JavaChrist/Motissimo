"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Tile } from "@/lib/game-engine";

interface TileGridProps {
  tiles: Tile[];
  cols: number;
  rows: number;
  onTileSelect: (id: string) => void;
}

export function TileGrid({ tiles, cols, rows, onTileSelect }: TileGridProps) {
  const activeTiles = tiles.filter((t) => !t.matched);

  return (
    <div
      className="grid gap-2 mx-auto w-full max-w-md px-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      <AnimatePresence mode="popLayout">
        {tiles.map((tile) => {
          if (tile.matched) {
            return (
              <motion.div
                key={tile.id}
                initial={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="aspect-square"
                style={{
                  gridColumn: tile.col + 1,
                  gridRow: tile.row + 1,
                }}
              />
            );
          }

          return (
            <motion.button
              key={tile.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                layout: { type: "spring", stiffness: 300, damping: 30 },
              }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTileSelect(tile.id)}
              style={{
                gridColumn: tile.col + 1,
                gridRow: tile.row + 1,
              }}
              className={`
                aspect-square rounded-xl text-lg sm:text-2xl font-bold
                flex items-center justify-center
                cursor-pointer select-none
                transition-colors duration-150
                shadow-md border-2 border-b-4
                ${
                  tile.selected
                    ? "bg-violet-500 text-white border-violet-600 shadow-violet-300/50 shadow-lg"
                    : "bg-white text-slate-800 border-slate-200 hover:border-violet-300 hover:bg-violet-50 active:border-violet-400"
                }
              `}
            >
              <span className="drop-shadow-sm">{tile.letter}</span>
              {tile.selected && tile.selectionOrder >= 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-700 text-white text-[10px] font-bold flex items-center justify-center">
                  {tile.selectionOrder + 1}
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
