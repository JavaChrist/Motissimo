import { collection, doc, getDocs, setDoc, type DocumentData } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import { LEVELS, type Level } from "./levels";
import extraPuzzles from "./puzzles-extra.json";
import smallPuzzles from "./puzzles-3x2.json";

export interface Puzzle {
  id: string;
  size: string;
  title: string;
  theme: string;
  grid: string[][];
  words: string[];
  child: boolean;
}

export function levelSize(level: Level): string {
  return `${level.grid[0].length}x${level.grid.length}`;
}

export function levelPuzzle(level: Level): Puzzle {
  return {
    id: `level-${level.id}`,
    size: levelSize(level),
    title: level.title,
    theme: level.theme,
    grid: level.grid,
    words: level.words,
    child: false,
  };
}

function withSize(puzzles: Omit<Puzzle, "size" | "child">[], size: string): Puzzle[] {
  return puzzles.map((puzzle) => ({ ...puzzle, size, child: true }));
}

export const LOCAL_PUZZLES: Puzzle[] = [
  ...LEVELS.map(levelPuzzle),
  ...withSize(smallPuzzles as Omit<Puzzle, "size" | "child">[], "3x2"),
  ...(extraPuzzles as Omit<Puzzle, "child">[]).map((puzzle) => ({ ...puzzle, child: true })),
];

export function gridsForSize(size: string, childOnly = false): number {
  return LOCAL_PUZZLES.filter((puzzle) => puzzle.size === size && (!childOnly || puzzle.child)).length;
}

export function puzzlesForLevel(list: Puzzle[], level: Level, childOnly = false): Puzzle[] {
  const size = levelSize(level);
  const pool = list.filter((puzzle) => puzzle.size === size && (!childOnly || puzzle.child));
  if (pool.length > 0) return pool;
  if (childOnly) {
    const anyChild = list.filter((puzzle) => puzzle.child);
    if (anyChild.length > 0) return anyChild;
  }
  return [levelPuzzle(level)];
}

export function applyPuzzle(level: Level, puzzle: Puzzle): Level {
  return {
    ...level,
    title: puzzle.title,
    theme: puzzle.theme,
    grid: puzzle.grid,
    words: puzzle.words,
  };
}

export function pickPuzzle(list: Puzzle[], seen: string[], avoidId?: string): Puzzle {
  const notCurrent = list.filter((puzzle) => puzzle.id !== avoidId);
  const base = notCurrent.length > 0 ? notCurrent : list;
  const unused = base.filter((puzzle) => !seen.includes(puzzle.id));
  const choices = unused.length > 0 ? unused : base;
  return choices[Math.floor(Math.random() * choices.length)];
}

function normalizeGrid(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.every((row) => typeof row === "string")) {
    const grid = value.map((row: string) => [...row]);
    return grid.every((row) => row.length > 0) ? grid : null;
  }
  if (
    value.every(
      (row) => Array.isArray(row) && row.every((letter) => typeof letter === "string")
    )
  ) {
    return value as string[][];
  }
  return null;
}

function asPuzzle(id: string, data: DocumentData): Puzzle | null {
  const grid = normalizeGrid(data.grid);
  if (!grid || !Array.isArray(data.words)) return null;
  const words = data.words.filter((word: unknown): word is string => typeof word === "string");
  if (words.length === 0) return null;
  const size =
    typeof data.size === "string" ? data.size : `${grid[0].length}x${grid.length}`;
  return {
    id,
    size,
    title: typeof data.title === "string" ? data.title : "Grille",
    theme: typeof data.theme === "string" ? data.theme : "orange",
    grid,
    words,
    child: data.child === true,
  };
}

async function seedMissing(remoteIds: Set<string>) {
  const db = getFirebaseDb();
  const missing = LOCAL_PUZZLES.filter((puzzle) => !remoteIds.has(puzzle.id));
  await Promise.all(
    missing.map((puzzle) =>
      setDoc(doc(db, "puzzles", puzzle.id), {
        id: puzzle.id,
        title: puzzle.title,
        theme: puzzle.theme,
        words: puzzle.words,
        grid: puzzle.grid.map((row) => row.join("")),
        size: puzzle.size,
        child: puzzle.child,
        rows: puzzle.grid.length,
        cols: puzzle.grid[0]?.length ?? 3,
      })
    )
  );
}

export async function loadPuzzleBank(): Promise<Puzzle[]> {
  if (!isFirebaseConfigured()) return LOCAL_PUZZLES;

  try {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "puzzles"));
    const remoteIds = new Set(snap.docs.map((item) => item.id));
    await seedMissing(remoteIds).catch((error) => {
      console.error("Enregistrement des grilles impossible", error);
    });

    const byId = new Map(LOCAL_PUZZLES.map((puzzle) => [puzzle.id, puzzle]));
    for (const item of snap.docs) {
      const puzzle = asPuzzle(item.id, item.data());
      if (!puzzle) continue;
      const previous = byId.get(item.id);
      byId.set(item.id, { ...puzzle, child: puzzle.child || previous?.child === true });
    }
    return [...byId.values()];
  } catch {
    return LOCAL_PUZZLES;
  }
}
