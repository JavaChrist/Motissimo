// Captures Play Store de Motissimo (1080×1920) via Chrome headless + CDP, sans dépendance.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , OUT, REPO, BASE = "http://localhost:4319"] = process.argv;
mkdirSync(OUT, { recursive: true });
const PUZZLES = [
  ...JSON.parse(readFileSync(join(REPO, "src/lib/puzzles-levels.json"), "utf8")),
];
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), "motissimo-cap-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch {}
    await sleep(200);
  }
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
async function shot(name) {
  await sleep(900);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, name), Buffer.from(r.result.data, "base64"));
  console.log("saved", name);
}
const click = (label) => evalJs(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(label)}); if(!b) return 'missing'; b.click(); return 'ok'})()`);
const SWIPE = `window.__swipe=async(word)=>{const tiles=[...document.querySelectorAll('button,div')].filter(e=>/^[A-Z]$/.test((e.innerText||'').trim().split('\\n')[0]) && e.getBoundingClientRect().top>window.innerHeight*0.55 && e.getBoundingClientRect().width>30);
const used=new Set(); const pick=l=>{const c=tiles.filter(t=>t.innerText.trim().split('\\n')[0]===l && !used.has(t)); const e=c.at(-1); used.add(e); return e};
const pts=[...word].map(pick).map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
const fire=(type,[x,y])=>{const t=document.elementFromPoint(x,y); t.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,buttons:type==='pointerup'?0:1}))};
fire('pointerdown',pts[0]); for(let i=1;i<pts.length;i++){const [a,b]=[pts[i-1],pts[i]]; for(let k=1;k<=6;k++){fire('pointermove',[a[0]+(b[0]-a[0])*k/6,a[1]+(b[1]-a[1])*k/6]); await new Promise(r=>setTimeout(r,15));}} fire('pointerup',pts.at(-1)); await new Promise(r=>setTimeout(r,1300)); return 'ok'}`;
const currentPuzzle = async () => {
  const seen = await evalJs(`JSON.parse(localStorage.getItem('wordtiles_progress')||'{}').seenPuzzleIds||[]`);
  return PUZZLES.find((p) => p.id === seen.at(-1));
};
const swipe = (w) => evalJs(`(${SWIPE}, window.__swipe(${JSON.stringify(w)}))`);

try {
  await connect();
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  // Joueur mineur : aucune annonce, pas de fenêtre d'âge à l'écran.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "try{if(!localStorage.getItem('promo_birth_year'))localStorage.setItem('promo_birth_year','2011')}catch{}" });
  await send("Page.navigate", { url: BASE + "/" });
  await sleep(3000);
  await shot("01-accueil.png");

  await click("Jouer"); await sleep(1500);
  let p = await currentPuzzle();
  console.log("puzzle", p?.id, p?.words);
  await swipe(p.words[0]); await sleep(800);
  await shot("02-partie.png");
  for (const w of p.words.slice(1)) await swipe(w);
  await sleep(2500);
  await shot("03-niveau-termine.png");

  await click("Accueil"); await sleep(1200);
  await click("Niveaux"); await sleep(1500);
  await shot("04-niveaux.png");
  await evalJs(`history.back()`); await sleep(500);
  await send("Page.navigate", { url: BASE + "/" }); await sleep(2500);

  await click("Défi du jour"); await sleep(1800);
  await shot("05-defi-du-jour.png");
  await send("Page.navigate", { url: BASE + "/" }); await sleep(2500);

  await evalJs(`(()=>{const e=[...document.querySelectorAll('button,[role=switch],label')].find(b=>b.innerText.trim()==='Découverte'); e?.click(); return !!e})()`);
  await sleep(600);
  await click("Jouer"); await sleep(1800);
  p = await currentPuzzle();
  console.log("decouverte puzzle", p?.id, p?.words);
  if (p) { await swipe(p.words[0]); await sleep(600); }
  await shot("06-mode-decouverte.png");
} catch (e) {
  console.error(e);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
}
