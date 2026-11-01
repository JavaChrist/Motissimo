"use client";

import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { LETTER_SCORES, type Theme } from "@/lib/themes";
import type { TilePos } from "@/lib/game-engine";

interface TileGridProps {
  grid: string[][];
  selection: TilePos[];
  theme: Theme;
  onTileSelect: (row: number, col: number) => void;
  onSwipeEnd: () => void;
}

export function TileGrid({ grid, selection, theme, onTileSelect, onSwipeEnd }: TileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const rows = grid.length;
  const cols = grid[0].length;

  const isSelected = (r: number, c: number) =>
    selection.some((s) => s.row === r && s.col === c);

  const selectionIndex = (r: number, c: number) =>
    selection.findIndex((s) => s.row === r && s.col === c);

  const getTileFromPoint = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const container = containerRef.current;
      if (!container) return null;
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;
      const tileEl = el.closest("[data-tile]");
      if (!tileEl || !container.contains(tileEl)) return null;
      const row = parseInt(tileEl.getAttribute("data-row") ?? "-1");
      const col = parseInt(tileEl.getAttribute("data-col") ?? "-1");
      if (row < 0 || col < 0) return null;
      return { row, col };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const tile = getTileFromPoint(e.clientX, e.clientY);
      if (tile) onTileSelect(tile.row, tile.col);
    },
    [getTileFromPoint, onTileSelect]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isDragging.current) return;
      const tile = getTileFromPoint(e.clientX, e.clientY);
      if (tile) onTileSelect(tile.row, tile.col);
    },
    [getTileFromPoint, onTileSelect]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      onSwipeEnd();
    }
  }, [onSwipeEnd]);

  return (
    <div className="flex flex-col items-center gap-3 w-full px-4">
      {/* Tile container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative rounded-2xl p-3 sm:p-4 select-none touch-none"
        style={{
          background: "linear-gradient(145deg, #2a2d3a 0%, #1a1c28 50%, #15171f 100%)",
          boxShadow: `
            0 0 30px rgba(${theme.accentRgb}, 0.15),
            0 8px 32px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.08)
          `,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* SVG lines connecting selected tiles */}
        {selection.length > 1 && (
          <svg
            className="absolute inset-0 pointer-events-none z-10"
            style={{ width: "100%", height: "100%" }}
          >
            {selection.slice(0, -1).map((from, i) => {
              const to = selection[i + 1];
              const tileSize = cols <= 3 ? 64 : cols <= 4 ? 56 : 48;
              const gap = 8;
              const pad = cols <= 3 ? 16 : 12;
              const fromX = pad + from.col * (tileSize + gap) + tileSize / 2;
              const fromY = pad + from.row * (tileSize + gap) + tileSize / 2;
              const toX = pad + to.col * (tileSize + gap) + tileSize / 2;
              const toY = pad + to.row * (tileSize + gap) + tileSize / 2;
              return (
                <line
                  key={i}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={theme.accent}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              );
            })}
          </svg>
        )}

        <div
          className="grid relative z-20"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "8px",
          }}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const selected = isSelected(r, c);
              const idx = selectionIndex(r, c);
              const score = LETTER_SCORES[letter] ?? 1;

              return (
                <motion.div
                  key={`${r}-${c}`}
                  data-tile="true"
                  data-row={r}
                  data-col={c}
                  animate={selected ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative flex items-center justify-center cursor-pointer"
                  style={{
                    width: cols <= 3 ? 64 : cols <= 4 ? 56 : 48,
                    height: cols <= 3 ? 64 : cols <= 4 ? 56 : 48,
                    borderRadius: 10,
                    background: selected
                      ? theme.accent
                      : "linear-gradient(145deg, #F5F0E8 0%, #E8E0D4 100%)",
                    boxShadow: selected
                      ? `0 0 16px rgba(${theme.accentRgb}, 0.6), 0 4px 8px rgba(0,0,0,0.3)`
                      : "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)",
                    border: selected
                      ? `2px solid ${theme.accentLight}`
                      : "1px solid rgba(200,190,175,0.6)",
                  }}
                >
                  <span
                    className="text-xl sm:text-2xl font-black"
                    style={{
                      color: selected ? "#FFFFFF" : "#2D2A26",
                      textShadow: selected ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                    }}
                  >
                    {letter}
                  </span>
                  <span
                    className="absolute bottom-1 right-1.5 text-[9px] font-bold"
                    style={{
                      color: selected ? "rgba(255,255,255,0.7)" : "rgba(80,70,60,0.5)",
                    }}
                  >
                    {score}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
