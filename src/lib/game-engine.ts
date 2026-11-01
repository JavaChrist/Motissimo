import type { Level } from "./levels";

export interface Tile {
  id: string;
  letter: string;
  col: number;
  row: number;
  selected: boolean;
  matched: boolean;
  selectionOrder: number;
}

export interface GameState {
  tiles: Tile[];
  cols: number;
  rows: number;
  foundWords: string[];
  currentSelection: string[];
  targetWords: string[];
  bonusWords: string[];
  score: number;
  hintsUsed: number;
  startTime: number;
  isComplete: boolean;
  category: string;
  hint: string;
  levelId: number;
}

const FILLER_LETTERS = "AEIOURSTNLCDPMFBGHJKVWXYZQ";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameState(level: Level): GameState {
  const allLetters = level.words.join("").split("");
  const totalCells = Math.ceil(allLetters.length / level.cols) * level.cols;
  const fillCount = totalCells - allLetters.length;

  const fillers: string[] = [];
  for (let i = 0; i < fillCount; i++) {
    fillers.push(FILLER_LETTERS[Math.floor(Math.random() * FILLER_LETTERS.length)]);
  }

  const allShuffled = shuffleArray([...allLetters, ...fillers]);
  const rows = Math.ceil(allShuffled.length / level.cols);

  const tiles: Tile[] = allShuffled.map((letter, idx) => ({
    id: `tile-${idx}`,
    letter,
    col: idx % level.cols,
    row: Math.floor(idx / level.cols),
    selected: false,
    matched: false,
    selectionOrder: -1,
  }));

  return {
    tiles,
    cols: level.cols,
    rows,
    foundWords: [],
    currentSelection: [],
    targetWords: [...level.words],
    bonusWords: [],
    score: 0,
    hintsUsed: 0,
    startTime: Date.now(),
    isComplete: false,
    category: level.category,
    hint: level.hint,
    levelId: level.id,
  };
}

export function selectTile(state: GameState, tileId: string): GameState {
  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile || tile.matched) return state;

  if (tile.selected) {
    const order = tile.selectionOrder;
    const newTiles = state.tiles.map((t) => {
      if (t.selectionOrder > order) {
        return { ...t, selected: false, selectionOrder: -1 };
      }
      if (t.id === tileId) {
        return { ...t, selected: false, selectionOrder: -1 };
      }
      return t;
    });
    const newSelection = newTiles
      .filter((t) => t.selected)
      .sort((a, b) => a.selectionOrder - b.selectionOrder)
      .map((t) => t.id);
    return { ...state, tiles: newTiles, currentSelection: newSelection };
  }

  const selectionOrder = state.currentSelection.length;
  const newTiles = state.tiles.map((t) =>
    t.id === tileId ? { ...t, selected: true, selectionOrder } : t
  );
  return {
    ...state,
    tiles: newTiles,
    currentSelection: [...state.currentSelection, tileId],
  };
}

export function clearSelection(state: GameState): GameState {
  const newTiles = state.tiles.map((t) => ({
    ...t,
    selected: false,
    selectionOrder: -1,
  }));
  return { ...state, tiles: newTiles, currentSelection: [] };
}

export function getCurrentWord(state: GameState): string {
  return state.currentSelection
    .map((id) => state.tiles.find((t) => t.id === id)!)
    .map((t) => t.letter)
    .join("");
}

export function submitWord(state: GameState): {
  state: GameState;
  result: "correct" | "bonus" | "wrong";
} {
  const word = getCurrentWord(state);

  if (state.foundWords.includes(word) || state.bonusWords.includes(word)) {
    return { state: clearSelection(state), result: "wrong" };
  }

  const isTarget = state.targetWords.includes(word);
  const isValidBonus = !isTarget && word.length >= 3 && isRealWord(word);

  if (!isTarget && !isValidBonus) {
    return { state: clearSelection(state), result: "wrong" };
  }

  const matchedIds = new Set(state.currentSelection);
  let newTiles = state.tiles.map((t) =>
    matchedIds.has(t.id)
      ? { ...t, matched: true, selected: false, selectionOrder: -1 }
      : { ...t, selected: false, selectionOrder: -1 }
  );

  newTiles = applyGravity(newTiles, state.cols);

  const newFoundWords = isTarget
    ? [...state.foundWords, word]
    : state.foundWords;
  const newBonusWords = isValidBonus
    ? [...state.bonusWords, word]
    : state.bonusWords;

  const wordScore = isTarget ? word.length * 100 : word.length * 50;
  const isComplete =
    isTarget &&
    state.targetWords.every((w) => newFoundWords.includes(w));

  return {
    state: {
      ...state,
      tiles: newTiles,
      foundWords: newFoundWords,
      bonusWords: newBonusWords,
      currentSelection: [],
      score: state.score + wordScore,
      isComplete,
    },
    result: isTarget ? "correct" : "bonus",
  };
}

function applyGravity(tiles: Tile[], cols: number): Tile[] {
  const columns: (Tile | null)[][] = [];

  for (let c = 0; c < cols; c++) {
    const colTiles = tiles
      .filter((t) => t.col === c)
      .sort((a, b) => a.row - b.row);
    columns.push(colTiles);
  }

  const result: Tile[] = [];

  for (let c = 0; c < cols; c++) {
    const active = columns[c].filter((t) => t && !t.matched) as Tile[];
    const maxRow = columns[c].length;

    active.forEach((tile, idx) => {
      const newRow = maxRow - active.length + idx;
      result.push({ ...tile, row: newRow });
    });

    const matched = columns[c].filter((t) => t && t.matched) as Tile[];
    matched.forEach((tile, idx) => {
      result.push({ ...tile, row: idx });
    });
  }

  return result;
}

export function useHint(
  state: GameState,
  type: "reveal" | "shuffle"
): GameState {
  if (type === "shuffle") {
    const activeTiles = state.tiles.filter((t) => !t.matched);
    const shuffledLetters = shuffleArray(activeTiles.map((t) => t.letter));
    let idx = 0;
    const newTiles = state.tiles.map((t) => {
      if (t.matched) return t;
      return { ...t, letter: shuffledLetters[idx++], selected: false, selectionOrder: -1 };
    });
    return {
      ...clearSelection(state),
      tiles: newTiles,
      hintsUsed: state.hintsUsed + 1,
    };
  }

  const remainingWords = state.targetWords.filter(
    (w) => !state.foundWords.includes(w)
  );
  if (remainingWords.length === 0) return state;

  const nextWord = remainingWords[0];
  const firstLetter = nextWord[0];
  const activeTiles = state.tiles.filter(
    (t) => !t.matched && !t.selected && t.letter === firstLetter
  );
  if (activeTiles.length === 0) return state;

  const hintTile = activeTiles[0];
  const newTiles = state.tiles.map((t) =>
    t.id === hintTile.id ? { ...t, selected: true, selectionOrder: 0 } : t
  );

  return {
    ...state,
    tiles: newTiles,
    currentSelection: [hintTile.id],
    hintsUsed: state.hintsUsed + 1,
  };
}

export function calculateStars(state: GameState): number {
  if (state.hintsUsed === 0) return 3;
  if (state.hintsUsed <= 2) return 2;
  return 1;
}

export function getElapsedTime(state: GameState): number {
  return Math.floor((Date.now() - state.startTime) / 1000);
}

const COMMON_FRENCH_WORDS = new Set([
  "AIR", "AMI", "ANE", "ARC", "ART", "BAL", "BAS", "BEC", "BIS", "BOL",
  "BON", "BUT", "CAP", "CAS", "CLE", "COL", "COU", "CRI", "DIS", "DOS",
  "DUR", "EAU", "ETE", "FER", "FEU", "FIL", "FIN", "FOI", "GAZ", "GEL",
  "ILE", "JEU", "JUS", "LAC", "LIT", "LOI", "MAL", "MER", "MIS", "MOI",
  "MOT", "MUR", "NEZ", "NID", "NOM", "NUL", "OEL", "OIE", "OUI", "PAS",
  "PIE", "PIN", "PLI", "POT", "PRE", "RAT", "RIZ", "ROI", "RUE", "SAC",
  "SEC", "SEL", "SOL", "SOU", "SUR", "TAS", "THE", "TIR", "TOI", "TON",
  "TRI", "VIE", "VIN", "VOL", "VUE", "AILE", "AISE", "BAIN", "BIEN",
  "BOIS", "CAGE", "CHAR", "CLEF", "COIN", "COTE", "DAME", "DENT", "DOUX",
  "DRAP", "ELLE", "FACE", "FAIT", "FIER", "FILM", "GARE", "GOUT", "IDEE",
  "LIEU", "LIEN", "LIRE", "LONG", "LUXE", "MAIN", "MISE", "MODE", "NEUF",
  "NOIX", "PAIX", "PART", "PEAU", "PILE", "PONT", "RANG", "RIEN", "RIRE",
  "ROBE", "SAIN", "SERA", "SOIR", "SORT", "TOIT", "TOUR", "TYPE", "VERS",
  "VOIE", "VOIX",
]);

function isRealWord(word: string): boolean {
  return COMMON_FRENCH_WORDS.has(word);
}
