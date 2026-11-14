// Sert le dossier out/ en local pour les captures Play, et coupe tout accès réseau sortant :
// le jeu tourne en mode local, sans écrire dans Firebase.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = process.argv[2];
const PORT = Number(process.argv[3] ?? 4319);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".txt": "text/plain", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".webmanifest": "application/manifest+json" };

const BLOCK = `<script>(()=>{const local=u=>{try{return new URL(u,location.href).origin===location.origin}catch{return false}};
window.__blocked=[];
Object.defineProperty(navigator,'onLine',{get:()=>false});
const f=window.fetch;window.fetch=(i,o)=>{const u=typeof i==='string'?i:i.url;if(local(u))return f(i,o);window.__blocked.push('fetch '+u);return Promise.reject(new TypeError('Failed to fetch (offline simulation)'))};
const op=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){this.__off=!local(u);this.__u=u;return op.call(this,m,u,...r)};
const sd=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(...a){if(this.__off){window.__blocked.push('xhr '+this.__u);setTimeout(()=>{this.dispatchEvent(new Event('error'));this.dispatchEvent(new Event('loadend'))},0);return}return sd.apply(this,a)};
window.WebSocket=function(u){window.__blocked.push('ws '+u);throw new Error('offline')};
})();</script>`;

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(normalize(ROOT))) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    try { await stat(file + ".html"); file += ".html"; } catch { return res.writeHead(404).end("404"); }
  }
  try {
    let body = await readFile(file);
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    if (type.startsWith("text/html")) body = Buffer.from(body.toString().replace("<head>", "<head>" + BLOCK));
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch { res.writeHead(404).end("404"); }
}).listen(PORT, () => console.log("offline sim on http://localhost:" + PORT));
