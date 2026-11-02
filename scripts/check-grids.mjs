// Vérifie les grilles thématiques de src/lib/puzzles-levels.json.
// Usage : node scripts/check-grids.mjs   (code de sortie 1 si une règle est violée)
import { readFileSync } from "node:fs";
import { LEVELS } from "../src/lib/levels.ts";
import { LEXICON } from "./lexicon.mjs";

const puzzles = JSON.parse(readFileSync(new URL("../src/lib/puzzles-levels.json", import.meta.url), "utf8"));
const MIN_PER_LEVEL = 8;
const NEIGH = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const errors = [];
const fail = (message) => errors.push(message);

function canForm(grid, word) {
  const rows = grid.length;
  const cols = grid[0].length;
  const used = new Set();
  const dfs = (r, c, i) => {
    if (i === word.length) return true;
    for (const [dr, dc] of NEIGH) {
      const nr = r + dr;
      const nc = c + dc;
      const key = nr * cols + nc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || used.has(key) || grid[nr][nc] !== word[i]) continue;
      used.add(key);
      if (dfs(nr, nc, i + 1)) return true;
      used.delete(key);
    }
    return false;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== word[0]) continue;
      used.clear();
      used.add(r * cols + c);
      if (dfs(r, c, 1)) return true;
    }
  }
  return false;
}

const ids = new Set();
for (const puzzle of puzzles) {
  const tag = puzzle.id;
  if (ids.has(tag)) fail(`${tag} : identifiant en double`);
  ids.add(tag);

  const level = LEVELS.find((item) => item.id === puzzle.level);
  if (!level) {
    fail(`${tag} : niveau ${puzzle.level} inconnu`);
    continue;
  }
  if (puzzle.title !== level.title) fail(`${tag} : titre « ${puzzle.title} » ≠ « ${level.title} »`);
  if (puzzle.theme !== level.theme) fail(`${tag} : thème ${puzzle.theme} ≠ ${level.theme}`);

  const rows = puzzle.grid.length;
  const cols = puzzle.grid[0].length;
  if (rows !== level.grid.length || cols !== level.grid[0].length) {
    fail(`${tag} : taille ${cols}x${rows} ≠ ${level.grid[0].length}x${level.grid.length}`);
  }
  if (puzzle.grid.some((row) => row.length !== cols || !/^[A-Z]+$/.test(row))) fail(`${tag} : lettres invalides`);

  if (new Set(puzzle.words).size !== puzzle.words.length) fail(`${tag} : mots en double`);
  const lexicon = new Set(LEXICON[puzzle.level] ?? []);
  for (const word of puzzle.words) {
    if (!canForm(puzzle.grid, word)) fail(`${tag} : « ${word} » impossible à former`);
    if (!lexicon.has(word)) fail(`${tag} : « ${word} » hors du lexique du niveau`);
  }
  if (!puzzle.words.some((word) => word.length >= 4)) fail(`${tag} : aucun mot de 4 lettres ou plus`);
}

for (const id of Object.keys(LEXICON).map(Number)) {
  const own = puzzles.filter((puzzle) => puzzle.level === id);
  if (own.length < MIN_PER_LEVEL) fail(`niveau ${id} : ${own.length} grilles (minimum ${MIN_PER_LEVEL})`);
  if (!own.some((puzzle) => puzzle.child)) fail(`niveau ${id} : aucune grille Enfant`);
}

const levelsDone = new Set(puzzles.map((puzzle) => puzzle.level));
console.log(`${puzzles.length} grilles, ${levelsDone.size} niveaux couverts : ${[...levelsDone].join(", ")}`);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Toutes les grilles sont valides.");
