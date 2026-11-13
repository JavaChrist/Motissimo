// Tests du lecteur des documents juridiques, puis lecture des vrais documents de content/legal/.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGAL_DOCUMENTS, parseLegalInline, parseLegalMarkdown } from "../src/lib/legal/legal-markdown.ts";

const text = (line) => line.map((part) => part.text).join("");

// Liens nus : la ponctuation finale reste du texte, seules https, http et les adresses e-mail deviennent des liens.
assert.deepEqual(parseLegalInline("Site : https://motissimo.vercel.app. Support : support@javachrist.fr."), [
  { kind: "text", text: "Site : " },
  { kind: "link", text: "https://motissimo.vercel.app", href: "https://motissimo.vercel.app" },
  { kind: "text", text: ". Support : " },
  { kind: "link", text: "support@javachrist.fr", href: "mailto:support@javachrist.fr" },
  { kind: "text", text: "." },
]);
assert.deepEqual(parseLegalInline("javascript:alert(1)"), [{ kind: "text", text: "javascript:alert(1)" }]);

// Le HTML reste du texte : rien n'est interprété.
const html = parseLegalMarkdown("<script>alert(1)</script>\n<b>gras</b>");
assert.equal(html.length, 1);
assert.equal(html[0].kind, "paragraph");
assert.equal(text(html[0].lines[0]), "<script>alert(1)</script>");

const sample = parseLegalMarkdown(
  [" > BROUILLON — à valider.", "", "# Titre", "", "## Rubrique", "", "Ligne.", "- Point A", "", "| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\r\n"),
);
assert.deepEqual(
  sample.map((block) => block.kind),
  ["notice", "heading", "heading", "paragraph", "list", "table"],
);
assert.deepEqual(sample[5].rows.map((row) => row.map(text)), [["1", "2"]]);

// Vrais documents : un seul titre, des tableaux complets, aucun point laissé à compléter.
const dir = join("content", "legal");
const meta = JSON.parse(readFileSync(join(dir, "legal.json"), "utf8"));
assert.equal(meta.appId, "motissimo");
assert.equal(meta.pendingPoints, 0, "des points restent à compléter dans le kit");
for (const name of LEGAL_DOCUMENTS) {
  const source = readFileSync(join(dir, `${name}.md`), "utf8");
  const blocks = parseLegalMarkdown(source);
  const where = `legal/${name}.md`;
  assert.equal(blocks.filter((block) => block.kind === "heading" && block.level === 1).length, 1, `${where} : un titre attendu`);
  assert.ok(!source.includes("À COMPLÉTER"), `${where} : point à compléter`);
  for (const table of blocks.filter((block) => block.kind === "table")) {
    for (const row of table.rows) assert.equal(row.length, table.head.length, `${where} : ligne de tableau incomplète`);
  }
}

console.log(`Documents juridiques : lecteur vérifié, ${LEGAL_DOCUMENTS.length} documents lus (${meta.version}-${meta.mode}).`);
