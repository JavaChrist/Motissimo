// Génère les grilles thématiques de chaque niveau dans src/lib/puzzles-levels.json.
// Usage : node scripts/build-grids.mjs [niveau ...]   (sans argument : tous les niveaux du lexique)
// Les mots à trouver viennent uniquement du lexique du niveau ; les autres mots français que la grille
// permet de former restent des mots bonus (dictionnaire du jeu).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { LEVELS } from "../src/lib/levels.ts";
import { LEXICON } from "./lexicon.mjs";

const OUT = new URL("../src/lib/puzzles-levels.json", import.meta.url);
const PER_LEVEL = 8;
const CHILD_FROM = 5; // les grilles d'indice >= 5 sont aussi proposées en mode Enfant
const RARE = new Set("KWXYZ");

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEIGH = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function canForm(grid, word) {
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = new Set();
  const dfs = (r, c, i) => {
    if (i === word.length) return true;
    for (const [dr, dc] of NEIGH) {
      const nr = r + dr;
      const nc = c + dc;
      const key = nr * cols + nc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen.has(key) || grid[nr][nc] !== word[i]) continue;
      seen.add(key);
      if (dfs(nr, nc, i + 1)) return true;
      seen.delete(key);
    }
    return false;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== word[0]) continue;
      seen.clear();
      seen.add(r * cols + c);
      if (dfs(r, c, 1)) return true;
    }
  }
  return false;
}

function limits(tiles, child) {
  const cap = tiles <= 6 ? 6 : tiles <= 9 ? 7 : tiles <= 12 ? 8 : 9;
  const min = tiles <= 6 ? 3 : tiles <= 8 ? 5 : 6;
  const long = tiles <= 6 ? 2 : tiles <= 8 ? 3 : 4;
  return child ? { cap: Math.min(cap, 6), min: Math.min(min, 4), long: Math.min(long, tiles <= 6 ? 1 : 2) } : { cap, min, long };
}

function pickTargets(grid, lexicon, tiles, child) {
  const { cap } = limits(tiles, child);
  const formable = lexicon.filter((word) => canForm(grid, word));
  const long = formable.filter((word) => word.length >= 4).sort((a, b) => b.length - a.length || a.localeCompare(b));
  const short = formable.filter((word) => word.length === 3);
  const take = [...long.slice(0, cap - Math.min(2, short.length))];
  for (const word of short) if (take.length < cap) take.push(word);
  for (const word of long.slice(take.filter((w) => w.length >= 4).length)) if (take.length < cap) take.push(word);
  return { words: take, longCount: long.length };
}

function score(grid, lexicon, tiles, child) {
  const { words, longCount } = pickTargets(grid, lexicon, tiles, child);
  const lengthBonus = words.reduce((sum, word) => sum + Math.min(word.length, 6), 0);
  const rare = grid.flat().filter((letter) => RARE.has(letter)).length;
  return Math.min(longCount, limits(tiles, child).cap) * 6 + lengthBonus - rare * 4;
}

function randomPath(rows, cols, length, random) {
  for (let attempt = 0; attempt < 200; attempt++) {
    let r = Math.floor(random() * rows);
    let c = Math.floor(random() * cols);
    const path = [[r, c]];
    const used = new Set([r * cols + c]);
    while (path.length < length) {
      const options = NEIGH.map(([dr, dc]) => [r + dr, c + dc]).filter(
        ([nr, nc]) => nr >= 0 && nc >= 0 && nr < rows && nc < cols && !used.has(nr * cols + nc)
      );
      if (options.length === 0) break;
      [r, c] = options[Math.floor(random() * options.length)];
      path.push([r, c]);
      used.add(r * cols + c);
    }
    if (path.length === length) return path;
  }
  return null;
}

function buildGrid({ rows, cols, lexicon, mainWord, random, child }) {
  const tiles = rows * cols;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(""));
  const path = randomPath(rows, cols, mainWord.length, random);
  if (!path) return null;
  path.forEach(([r, c], i) => (grid[r][c] = mainWord[i]));

  const letters = lexicon.join("").split("").filter((letter) => !RARE.has(letter));
  const fillers = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!grid[r][c]) fillers.push([r, c]);
  const pickLetter = () => letters[Math.floor(random() * letters.length)];
  for (const [r, c] of fillers) grid[r][c] = pickLetter();

  let best = score(grid, lexicon, tiles, child);
  for (let step = 0; step < 1500 && fillers.length > 0; step++) {
    const [r, c] = fillers[Math.floor(random() * fillers.length)];
    const previous = grid[r][c];
    grid[r][c] = pickLetter();
    const next = score(grid, lexicon, tiles, child);
    if (next >= best) best = next;
    else grid[r][c] = previous;
  }
  return grid;
}

function signature(grid) {
  return grid.flat().sort().join("");
}

function build(level, existingIds) {
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  const tiles = rows * cols;
  const full = LEXICON[level.id];
  const out = [];
  const usedMain = new Set();
  const usedSignatures = new Set();
  const usedSets = [];
  const random = rng(level.id * 7919);

  for (let k = 0; k < PER_LEVEL; k++) {
    const child = k >= CHILD_FROM;
    const lexicon = child ? full.filter((word) => word.length <= 5) : full;
    const lim = limits(tiles, child);
    const mains = lexicon.filter((word) => word.length >= Math.min(4, tiles - 1) && word.length <= tiles && !usedMain.has(word));
    let chosen = null;

    for (let attempt = 0; attempt < 1500 && !chosen; attempt++) {
      const mainWord = mains[Math.floor(random() * mains.length)];
      if (!mainWord) break;
      const grid = buildGrid({ rows, cols, lexicon, mainWord, random, child });
      if (!grid) continue;
      const { words, longCount } = pickTargets(grid, lexicon, tiles, child);
      const longTargets = words.filter((word) => word.length >= 4).length;
      if (words.length < lim.min || longTargets < lim.long || longCount < lim.long) continue;
      if (usedSignatures.has(signature(grid))) continue;
      const set = new Set(words);
      const similar = usedSets.some((other) => [...set].filter((w) => other.has(w)).length / set.size > 0.7);
      if (similar) continue;
      chosen = { grid, words, mainWord };
    }

    if (!chosen) {
      console.warn(`Niveau ${level.id} : grille ${k + 1} introuvable (lexique trop court ou grille trop petite)`);
      continue;
    }
    usedMain.add(chosen.mainWord);
    usedSignatures.add(signature(chosen.grid));
    usedSets.push(new Set(chosen.words));
    out.push({
      id: `n${level.id}-${k + 1}`,
      level: level.id,
      title: level.title,
      theme: level.theme,
      grid: chosen.grid.map((row) => row.join("")),
      words: chosen.words,
      child,
    });
  }
  return out;
}

const wanted = process.argv.slice(2).map(Number);
const ids = (wanted.length > 0 ? wanted : Object.keys(LEXICON).map(Number)).filter((id) => LEXICON[id]);
const current = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
let result = current.filter((puzzle) => !ids.includes(puzzle.level));
for (const id of ids) {
  const level = LEVELS.find((item) => item.id === id);
  const puzzles = build(level);
  result = result.concat(puzzles);
  console.log(`Niveau ${id} « ${level.title} » (${level.grid[0].length}x${level.grid.length}) : ${puzzles.length} grilles`);
}
result.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id, "fr", { numeric: true }));
writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
