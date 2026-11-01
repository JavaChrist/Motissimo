import type { Level } from "./levels";
import { LETTER_SCORES } from "./themes";

export interface TilePos {
  row: number;
  col: number;
  letter: string;
}

export interface GameState {
  grid: string[][];
  rows: number;
  cols: number;
  selection: TilePos[];
  foundWords: string[];
  targetWords: string[];
  score: number;
  hintsUsed: number;
  startTime: number;
  isComplete: boolean;
  title: string;
  theme: string;
  levelId: number;
  difficulty: 1 | 2 | 3;
}

export function createGameState(level: Level): GameState {
  return {
    grid: level.grid,
    rows: level.grid.length,
    cols: level.grid[0].length,
    selection: [],
    foundWords: [],
    targetWords: [...level.words],
    score: 0,
    hintsUsed: 0,
    startTime: Date.now(),
    isComplete: false,
    title: level.title,
    theme: level.theme,
    levelId: level.id,
    difficulty: level.difficulty,
  };
}

function areAdjacent(a: TilePos, b: TilePos): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

function isAlreadySelected(selection: TilePos[], pos: TilePos): boolean {
  return selection.some((s) => s.row === pos.row && s.col === pos.col);
}

export function addToSelection(state: GameState, row: number, col: number): GameState {
  const pos: TilePos = { row, col, letter: state.grid[row][col] };

  if (isAlreadySelected(state.selection, pos)) {
    const idx = state.selection.findIndex((s) => s.row === row && s.col === col);
    if (idx === state.selection.length - 1) {
      return { ...state, selection: state.selection.slice(0, -1) };
    }
    return { ...state, selection: state.selection.slice(0, idx + 1) };
  }

  if (state.selection.length > 0) {
    const last = state.selection[state.selection.length - 1];
    if (!areAdjacent(last, pos)) return state;
  }

  return { ...state, selection: [...state.selection, pos] };
}

export function clearSelection(state: GameState): GameState {
  return { ...state, selection: [] };
}

export function getCurrentWord(state: GameState): string {
  return state.selection.map((s) => s.letter).join("");
}

export function submitWord(state: GameState): {
  state: GameState;
  result: "correct" | "already" | "wrong";
} {
  const word = getCurrentWord(state);

  if (state.foundWords.includes(word)) {
    return { state: clearSelection(state), result: "already" };
  }

  const isTarget = state.targetWords.includes(word);

  if (!isTarget) {
    return { state: clearSelection(state), result: "wrong" };
  }

  const wordScore = word.split("").reduce((sum, l) => sum + (LETTER_SCORES[l] ?? 1), 0) * 10;
  const newFoundWords = [...state.foundWords, word];
  const isComplete = state.targetWords.every((w) => newFoundWords.includes(w));

  return {
    state: {
      ...state,
      foundWords: newFoundWords,
      selection: [],
      score: state.score + wordScore,
      isComplete,
    },
    result: "correct",
  };
}

export function useHintReveal(state: GameState): GameState {
  const remaining = state.targetWords.filter((w) => !state.foundWords.includes(w));
  if (remaining.length === 0) return state;

  const shortest = remaining.reduce((a, b) => (a.length <= b.length ? a : b));
  const path = findWordPath(state.grid, shortest);
  if (!path || path.length === 0) return state;

  return {
    ...state,
    selection: [path[0]],
    hintsUsed: state.hintsUsed + 1,
  };
}

export function useHintShuffle(state: GameState): GameState {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

export function calculateStars(state: GameState): number {
  if (state.hintsUsed === 0) return 3;
  if (state.hintsUsed <= 2) return 2;
  return 1;
}

function findWordPath(grid: string[][], word: string): TilePos[] | null {
  const rows = grid.length;
  const cols = grid[0].length;

  function dfs(r: number, c: number, idx: number, visited: Set<string>, path: TilePos[]): TilePos[] | null {
    if (idx === word.length) return path;

    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      if (grid[nr][nc] !== word[idx]) continue;

      visited.add(key);
      const result = dfs(nr, nc, idx + 1, visited, [...path, { row: nr, col: nc, letter: grid[nr][nc] }]);
      if (result) return result;
      visited.delete(key);
    }
    return null;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== word[0]) continue;
      const visited = new Set([`${r},${c}`]);
      const result = dfs(r, c, 1, visited, [{ row: r, col: c, letter: grid[r][c] }]);
      if (result) return result;
    }
  }
  return null;
}

export function canFormWord(grid: string[][], word: string): boolean {
  return findWordPath(grid, word) !== null;
}
