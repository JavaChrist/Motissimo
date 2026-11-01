import type { Level } from "./levels";
import { LETTER_SCORES } from "./themes";
import { FRENCH_WORDS } from "./french-words";

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
  foundBonus: string[];
  bonusWords: string[];
  targetWords: string[];
  score: number;
  hintsUsed: number;
  startTime: number;
  isComplete: boolean;
  title: string;
  theme: string;
  levelId: number;
  puzzleId: string;
  difficulty: 1 | 2 | 3;
  revealedSolutions: string[];
  mode: "level" | "daily";
}

export function createGameState(level: Level, puzzleId = "", mode: "level" | "daily" = "level"): GameState {
  const targetWords = [...level.words];
  return {
    grid: level.grid,
    rows: level.grid.length,
    cols: level.grid[0].length,
    selection: [],
    foundWords: [],
    foundBonus: [],
    bonusWords: bonusWordsFor(level.grid, targetWords),
    targetWords,
    score: 0,
    hintsUsed: 0,
    startTime: Date.now(),
    isComplete: false,
    title: level.title,
    theme: level.theme,
    levelId: level.id,
    puzzleId,
    difficulty: level.difficulty,
    revealedSolutions: [],
    mode,
  };
}

function areAdjacent(a: TilePos, b: TilePos): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

function isAlreadySelected(selection: TilePos[], pos: TilePos): boolean {
  return selection.some((s) => s.row === pos.row && s.col === pos.col);
}

export function beginSelection(state: GameState, row: number, col: number): GameState {
  if (state.isComplete) return state;
  if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) return state;
  return {
    ...state,
    selection: [{ row, col, letter: state.grid[row][col] }],
  };
}

export function addToSelection(state: GameState, row: number, col: number): GameState {
  if (state.isComplete) return state;
  const pos: TilePos = { row, col, letter: state.grid[row][col] };

  if (isAlreadySelected(state.selection, pos)) {
    const idx = state.selection.findIndex((s) => s.row === row && s.col === col);
    if (idx === state.selection.length - 1) return state;
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
  result: "correct" | "already" | "wrong" | "bonus";
} {
  const word = getCurrentWord(state);

  if (word.length < 2) {
    return { state: clearSelection(state), result: "wrong" };
  }

  if (state.foundWords.includes(word) || state.foundBonus.includes(word)) {
    return { state: clearSelection(state), result: "already" };
  }

  const wordScore = word.split("").reduce((sum, letter) => sum + (LETTER_SCORES[letter] ?? 1), 0) * 10;

  if (state.bonusWords.includes(word)) {
    return {
      state: {
        ...state,
        foundBonus: [...state.foundBonus, word],
        selection: [],
        score: state.score + wordScore,
      },
      result: "bonus",
    };
  }

  if (!state.targetWords.includes(word)) {
    return { state: clearSelection(state), result: "wrong" };
  }

  const newFoundWords = [...state.foundWords, word];
  const isComplete = state.targetWords.every((target) => newFoundWords.includes(target));

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

export function revealHint(state: GameState): GameState {
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

export function revealSolution(state: GameState): { state: GameState; word: string } {
  const remaining = state.targetWords.filter((word) => !state.foundWords.includes(word));
  if (remaining.length === 0) return { state, word: "" };

  const shortest = remaining.reduce((a, b) => (a.length <= b.length ? a : b));
  const path = findWordPath(state.grid, shortest);
  const alreadyRevealed = state.revealedSolutions.includes(shortest);

  return {
    word: shortest,
    state: {
      ...state,
      selection: path ?? [],
      hintsUsed: alreadyRevealed ? state.hintsUsed : state.hintsUsed + 1,
      revealedSolutions: alreadyRevealed
        ? state.revealedSolutions
        : [...state.revealedSolutions, shortest],
    },
  };
}

export function shuffleHint(state: GameState): GameState {
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

function bonusWordsFor(grid: string[][], targets: string[]): string[] {
  const skip = new Set(targets);
  return FRENCH_WORDS.filter((word) => !skip.has(word) && canFormWord(grid, word));
}

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

/** Nombre de mots restants qui passent par chaque case. */
export function letterUseCounts(grid: string[][], words: string[]): number[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const counts = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (const word of words) {
    for (const key of cellsUsedByWord(grid, word)) {
      const comma = key.indexOf(",");
      counts[Number(key.slice(0, comma))][Number(key.slice(comma + 1))] += 1;
    }
  }

  return counts;
}

function cellsUsedByWord(grid: string[][], word: string): Set<string> {
  const used = new Set<string>();
  if (word.length === 0 || grid.length === 0) return used;

  const rows = grid.length;
  const cols = grid[0].length;

  function dfs(row: number, col: number, index: number, visited: Set<string>): boolean {
    if (index === word.length) return true;
    let found = false;
    for (const [dr, dc] of NEIGHBORS) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key) || grid[nr][nc] !== word[index]) continue;
      visited.add(key);
      if (dfs(nr, nc, index + 1, visited)) {
        used.add(key);
        found = true;
      }
      visited.delete(key);
    }
    return found;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] !== word[0]) continue;
      const start = `${row},${col}`;
      const visited = new Set([start]);
      if (word.length === 1 || dfs(row, col, 1, visited)) used.add(start);
    }
  }

  return used;
}
