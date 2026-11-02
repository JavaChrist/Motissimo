// Génère les icônes et l'écran de démarrage Android depuis « Icône 3D ivoire MOTS.png ».
// Usage : node scripts/make-android-icons.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SOURCE = "public/icons/Icône 3D ivoire MOTS.png";
const RES = "android/app/src/main/res";
const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

// Bleu nuit du fond de l'icône, mesuré en haut du carré arrondi.
const [r, g, b] = [...(await sharp(SOURCE).extract({ left: 627, top: 90, width: 1, height: 1 }).raw().toBuffer())];
const navy = { r, g, b, alpha: 1 };
const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

const icon = (size) => sharp(SOURCE).resize(size, size).png().toBuffer();

for (const [density, launcher] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${density}`);
  const layer = Math.round((launcher * 108) / 48);

  // Anciens lanceurs : icône carrée, et version ronde.
  const square = await icon(launcher);
  await sharp(square).toFile(join(dir, "ic_launcher.png"));
  const mask = Buffer.from(`<svg width="${launcher}" height="${launcher}"><circle cx="${launcher / 2}" cy="${launcher / 2}" r="${launcher / 2}"/></svg>`);
  await sharp({ create: { width: launcher, height: launcher, channels: 4, background: navy } })
    .composite([{ input: await icon(Math.round(launcher * 0.86)), gravity: "center" }, { input: mask, blend: "dest-in" }])
    .toFile(join(dir, "ic_launcher_round.png"));

  // Icône adaptative : l'icône occupe la zone sûre (66 %) du calque 108 dp.
  await sharp({ create: { width: layer, height: layer, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await icon(Math.round(layer * 0.66)), gravity: "center" }])
    .toFile(join(dir, "ic_launcher_foreground.png"));
}

writeFileSync(
  join(RES, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${hex}</color>\n</resources>\n`
);

// Écran de démarrage : fond bleu nuit, icône au centre, aux tailles déjà présentes.
for (const folder of readdirSync(RES).filter((name) => name.startsWith("drawable"))) {
  const file = join(RES, folder, "splash.png");
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    continue;
  }
  const side = Math.round(Math.min(meta.width, meta.height) * 0.3);
  const splash = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: navy } })
    .composite([{ input: await icon(side), gravity: "center" }])
    .png()
    .toBuffer();
  writeFileSync(file, splash);
}

console.log(`Icônes générées, fond ${hex}`);
