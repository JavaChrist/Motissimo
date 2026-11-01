"use client";

import { useRef, useMemo, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import type { Theme } from "@/lib/themes";
import { letterUseCounts, type TilePos } from "@/lib/game-engine";

interface TileGridProps {
  grid: string[][];
  selection: TilePos[];
  foundWords: string[];
  targetWords: string[];
  theme: Theme;
  onGestureStart: (row: number, col: number) => void;
  onTileSelect: (row: number, col: number) => void;
  onSwipeEnd: () => void;
}

export function TileGrid({
  grid,
  selection,
  foundWords,
  targetWords,
  theme,
  onGestureStart,
  onTileSelect,
  onSwipeEnd,
}: TileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastTile = useRef<{ row: number; col: number } | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const cols = grid[0].length;
  const useCounts = useMemo(
    () => letterUseCounts(grid, targetWords.filter((word) => !foundWords.includes(word))),
    [grid, foundWords, targetWords]
  );

  const isSelected = (r: number, c: number) =>
    selection.some((s) => s.row === r && s.col === c);

  const readTiles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    return [...container.querySelectorAll<HTMLElement>("[data-tile]")].map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        row: Number(el.dataset.row),
        col: Number(el.dataset.col),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        hit: Math.min(rect.width, rect.height) * 0.4,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    });
  }, []);

  const visit = useCallback(
    (row: number, col: number) => {
      const active = (r: number, c: number) => (useCounts[r]?.[c] ?? 0) > 0;
      const last = lastTile.current;
      if (!last) {
        if (!active(row, col)) return;
        lastTile.current = { row, col };
        onTileSelect(row, col);
        return;
      }
      if (last.row === row && last.col === col) return;
      if (!active(row, col)) return;

      const rowDiff = row - last.row;
      const colDiff = col - last.col;
      const straight = rowDiff === 0 || colDiff === 0;
      if (straight) {
        const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
        const dr = Math.sign(rowDiff);
        const dc = Math.sign(colDiff);
        for (let step = 1; step <= steps; step++) {
          const nr = last.row + dr * step;
          const nc = last.col + dc * step;
          const current = lastTile.current;
          if (!current || !active(nr, nc)) continue;
          const beside =
            Math.abs(nr - current.row) <= 1 &&
            Math.abs(nc - current.col) <= 1 &&
            (nr !== current.row || nc !== current.col);
          if (!beside) continue;
          onTileSelect(nr, nc);
          lastTile.current = { row: nr, col: nc };
        }
        return;
      }

      if (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1) {
        onTileSelect(row, col);
        lastTile.current = { row, col };
      }
    },
    [onTileSelect, useCounts]
  );

  const trace = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const tiles = readTiles();
      const dist = Math.hypot(toX - fromX, toY - fromY);
      const steps = Math.max(1, Math.ceil(dist / 8));
      for (let step = 1; step <= steps; step++) {
        const x = fromX + ((toX - fromX) * step) / steps;
        const y = fromY + ((toY - fromY) * step) / steps;
        let nearest: { row: number; col: number; dist: number } | null = null;
        for (const tile of tiles) {
          const d = Math.hypot(x - tile.x, y - tile.y);
          if (d <= tile.hit && (!nearest || d < nearest.dist)) {
            nearest = { row: tile.row, col: tile.col, dist: d };
          }
        }
        if (nearest) visit(nearest.row, nearest.col);
      }
    },
    [readTiles, visit]
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const tiles = readTiles();
      const tile = tiles.find(
        (item) =>
          e.clientX >= item.left &&
          e.clientX <= item.right &&
          e.clientY >= item.top &&
          e.clientY <= item.bottom
      );
      if (!tile) return;
      e.preventDefault();
      isDragging.current = true;
      lastTile.current = { row: tile.row, col: tile.col };
      lastPoint.current = { x: e.clientX, y: e.clientY };
      onGestureStart(tile.row, tile.col);
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Un pointeur synthétique ou déjà relâché ne peut pas être capturé.
      }
    },
    [onGestureStart, readTiles]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isDragging.current || !lastPoint.current) return;
      trace(lastPoint.current.x, lastPoint.current.y, e.clientX, e.clientY);
      lastPoint.current = { x: e.clientX, y: e.clientY };
    },
    [trace]
  );

  const endGesture = useCallback(
    (e: ReactPointerEvent) => {
      if (!isDragging.current) return;
      if (lastPoint.current) {
        trace(lastPoint.current.x, lastPoint.current.y, e.clientX, e.clientY);
      }
      isDragging.current = false;
      lastTile.current = null;
      lastPoint.current = null;
      onSwipeEnd();
    },
    [onSwipeEnd, trace]
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full px-4">
      {/* Tile container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={() => {
          isDragging.current = false;
          lastTile.current = null;
          lastPoint.current = null;
        }}
        className="relative rounded-2xl p-3 sm:p-4 select-none touch-none"
        aria-label="Grille de lettres"
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
              const uses = useCounts[r][c];
              const gone = uses === 0;

              return (
                <div
                  key={`${r}-${c}`}
                  data-tile={gone ? undefined : "true"}
                  data-row={r}
                  data-col={c}
                  aria-label={gone ? undefined : `${letter}, utilisée ${uses} fois`}
                  className={`relative${gone ? "" : " cursor-pointer"}`}
                  style={{
                    width: cols <= 3 ? 64 : cols <= 4 ? 56 : 48,
                    height: cols <= 3 ? 64 : cols <= 4 ? 56 : 48,
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    initial={gone ? { opacity: 0, scale: 0.4 } : false}
                    animate={
                      gone
                        ? { opacity: 0, scale: 0.35, y: 10, rotate: 10 }
                        : { opacity: 1, scale: 1, y: 0, rotate: 0 }
                    }
                    transition={
                      gone
                        ? { duration: 0.42, ease: [0.4, 0, 0.2, 1] }
                        : { type: "spring", stiffness: 480, damping: 28 }
                    }
                  >
                    <motion.div
                      aria-hidden
                      animate={selected && !gone ? { y: -3, scale: 1.04 } : { y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 520, damping: 28 }}
                      className="absolute inset-0"
                      style={{
                        borderRadius: 14,
                        background: selected
                          ? `linear-gradient(145deg, ${theme.accentLight} 0%, ${theme.accent} 46%, ${theme.accentDark} 100%)`
                          : "linear-gradient(160deg, #FFF9F0 0%, #F6E7D2 42%, #E7D3B8 100%)",
                        boxShadow: selected
                          ? `0 5px 0 ${theme.accentDark}, 0 8px 10px rgba(0,0,0,0.32), inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(0,0,0,0.14)`
                          : "0 5px 0 #C4B49E, 0 8px 10px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.95), inset 0 -3px 0 rgba(120,90,50,0.18)",
                      }}
                    />
                    <span
                      className="absolute inset-0 z-10 flex items-center justify-center text-xl sm:text-2xl font-black pointer-events-none"
                      style={{
                        color: selected ? "#FFFFFF" : "#2D2A26",
                        textShadow: selected ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                      }}
                    >
                      {letter}
                    </span>
                    {uses > 0 && (
                      <motion.span
                        key={uses}
                        initial={{ scale: 1.45 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className="absolute bottom-1 right-1.5 z-10 text-[10px] font-bold pointer-events-none leading-none"
                        style={{
                          color: selected ? "rgba(255,255,255,0.85)" : "rgba(80,70,60,0.55)",
                        }}
                      >
                        {uses}
                      </motion.span>
                    )}
                  </motion.div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
