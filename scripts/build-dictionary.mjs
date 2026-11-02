// Génère src/lib/lexique-words.json (mots bonus) à partir de Lexique 3.83 (http://www.lexique.org, CC BY-SA 4.0).
// Usage : node scripts/build-dictionary.mjs <chemin vers Lexique383.tsv>
// Garde les formes de 3 à 10 lettres, sans tiret ni apostrophe, dont la fréquence (films + livres) est >= 0.5 par million.
import { readFileSync, writeFileSync } from "node:fs";

const source = process.argv[2];
if (!source) {
  console.error("Usage : node scripts/build-dictionary.mjs <Lexique383.tsv>");
  process.exit(1);
}

const MIN_FREQ = 0.5;
const rows = readFileSync(source, "utf8").split("\n").slice(1).filter(Boolean);
const words = new Set();
for (const line of rows) {
  const cols = line.split("\t");
  const word = cols[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (!/^[A-Z]{3,10}$/.test(word)) continue;
  if (Number(cols[8]) + Number(cols[9]) < MIN_FREQ) continue;
  words.add(word);
}

const sorted = [...words].sort();
writeFileSync(
  new URL("../src/lib/lexique-words.json", import.meta.url),
  JSON.stringify({ source: "Lexique 3.83 (lexique.org, CC BY-SA 4.0)", words: sorted.join(" ") }) + "\n"
);
console.log(`${sorted.length} mots écrits`);
