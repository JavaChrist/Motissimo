// Copie les documents juridiques générés par JavaChrist-Legal-Kit dans content/legal/.
// Usage : node scripts/sync-legal.mjs <version générée> [--kit <dossier du kit>]
// Exemple : npm run legal:sync -- 0.1.2-draft
// Seuls les cinq documents publics sont copiés : rapport.json et snapshot.json restent dans le kit.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LEGAL_DOCUMENTS } from "../src/lib/legal/legal-markdown.ts";

const APP_ID = "motissimo";
const args = process.argv.slice(2);
const kitFlag = args.indexOf("--kit");
const kit = resolve(kitFlag >= 0 ? args.splice(kitFlag, 2)[1] : "../JavaChrist-Legal-Kit");
const [version] = args;

function stop(message) {
  console.error(message);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+-(draft|reviewed)$/.test(version ?? "")) stop("Version attendue sous la forme 0.1.0-draft ou 0.1.0-reviewed");

const source = join(kit, "dist", APP_ID, version);
if (!existsSync(source)) stop(`Version introuvable dans le kit : ${source}. Lancer d'abord « npm run generate -- --app ${APP_ID} » dans le kit.`);

const report = JSON.parse(readFileSync(join(source, "rapport.json"), "utf8"));
if (report.app !== APP_ID || `${report.version}-${report.mode}` !== version) stop("rapport.json ne correspond pas à la version demandée");

const target = join("content", "legal");
const metaPath = join(target, "legal.json");
const documents = Object.fromEntries(LEGAL_DOCUMENTS.map((name) => [name, readFileSync(join(source, `${name}.md`), "utf8")]));

// Un texte validé n'est jamais remplacé automatiquement : on montre ce qui changerait, et on s'arrête.
if (existsSync(metaPath)) {
  const current = JSON.parse(readFileSync(metaPath, "utf8"));
  if (current.mode === "reviewed" && current.version !== report.version) {
    const changed = LEGAL_DOCUMENTS.filter((name) => readFileSync(join(target, `${name}.md`), "utf8") !== documents[name]);
    stop(
      `La version validée ${current.version} est en place. Rien n'a été remplacé.\n` +
        `Documents qui changeraient : ${changed.join(", ") || "aucun"}.\n` +
        `Comparer avec : git diff --no-index ${target} ${source}`,
    );
  }
}

let kitCommit = "inconnu";
try {
  const git = (command) => execSync(command, { cwd: kit, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  // Un kit modifié localement est signalé : la version copiée ne correspond alors à aucun commit publié.
  kitCommit = git("git rev-parse --short HEAD") + (git("git status --porcelain") ? "+modifications" : "");
} catch {
  // Kit hors Git : le commit reste « inconnu ».
}

mkdirSync(target, { recursive: true });
for (const [name, text] of Object.entries(documents)) writeFileSync(join(target, `${name}.md`), text);
writeFileSync(
  metaPath,
  `${JSON.stringify(
    {
      appId: APP_ID,
      version: report.version,
      mode: report.mode,
      generatedAt: report.generatedAt,
      configurationSha256: report.configurationSha256,
      kitCommit,
      pendingPoints: report.errors.length,
    },
    null,
    2,
  )}\n`,
);

console.log(`${LEGAL_DOCUMENTS.length} documents copiés dans ${target} (${version}, kit ${kitCommit}).`);
if (report.errors.length) console.log(`${report.errors.length} points restent à compléter dans le kit avant publication.`);
