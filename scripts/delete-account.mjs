#!/usr/bin/env node
/**
 * Suppression d'un compte Motissimo sur demande (page /supprimer-mon-compte).
 *
 *   node scripts/delete-account.mjs <uid>                 simulation : affiche ce qui serait supprimé
 *   node scripts/delete-account.mjs --email <adresse>     retrouve le compte Google, en simulation
 *   node scripts/delete-account.mjs <uid> --confirm       supprime users/{uid} dans Firestore, puis le compte Auth
 *
 * Identifiants : la session du CLI Firebase (`firebase login`) dans ~/.config/configstore/firebase-tools.json.
 * Aucune clé de compte de service. Le jeton n'est jamais affiché. Aucune dépendance.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT = "motissimo-456ba";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const IDENTITY = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
// Client OAuth public du CLI Firebase (publié dans firebase-tools), utilisé pour rafraîchir sa session.
const CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

function fail(message) {
  console.error(`ERREUR ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { uid: null, email: null, confirm: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--email") args.email = argv[++i] ?? fail("--email attend une adresse");
    else if (arg.startsWith("--")) fail(`option inconnue : ${arg}`);
    else if (!args.uid) args.uid = arg;
    else fail(`argument en trop : ${arg}`);
  }
  if (!args.uid && !args.email) fail("indiquez un identifiant de compte (uid) ou --email <adresse>");
  if (args.uid && args.email) fail("indiquez un uid ou une adresse, pas les deux");
  if (args.uid && !/^[A-Za-z0-9]{1,128}$/.test(args.uid)) fail("identifiant de compte invalide");
  if (args.email && args.confirm) fail("--confirm se lance avec l'uid affiché par la simulation, pas avec --email");
  return args;
}

async function accessToken() {
  let config;
  try {
    config = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  } catch {
    fail("session du CLI Firebase introuvable : lancez `firebase login`");
  }
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) fail("session du CLI Firebase sans jeton : lancez `firebase login`");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: CLI_CLIENT_ID, client_secret: CLI_CLIENT_SECRET }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) fail(`jeton refusé (${response.status}) : relancez \`firebase login\``);
  return body.access_token;
}

async function call(token, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
  const text = await response.text();
  return { status: response.status, ok: response.ok, body: text ? JSON.parse(text) : null };
}

function maskEmail(email) {
  if (!email) return "aucune";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}…@${domain}`;
}

async function lookup(token, query) {
  const result = await call(token, `${IDENTITY}/accounts:lookup`, { method: "POST", body: JSON.stringify(query) });
  if (!result.ok) fail(`lecture du compte refusée (${result.status})`);
  return result.body?.users ?? [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = await accessToken();

  const users = args.email ? await lookup(token, { email: [args.email] }) : await lookup(token, { localId: [args.uid] });
  if (users.length > 1) fail("plusieurs comptes correspondent : relancez avec l'uid");
  const user = users[0] ?? null;
  const uid = user?.localId ?? args.uid;

  if (!uid) {
    console.log("Aucun compte Auth pour cette adresse.");
    return;
  }

  const doc = await call(token, `${FIRESTORE}/users/${uid}`);
  if (!doc.ok && doc.status !== 404) fail(`lecture de users/${uid} refusée (${doc.status})`);
  const progress = doc.ok ? doc.body : null;

  console.log(`Compte : ${uid}`);
  if (user) {
    const providers = (user.providerUserInfo ?? []).map((p) => p.providerId);
    console.log(`  Auth : ${providers.length ? providers.join(", ") : "anonyme"}, e-mail ${maskEmail(user.email)}`);
    console.log(`  Créé le ${new Date(Number(user.createdAt)).toISOString()}, dernière connexion ${user.lastLoginAt ? new Date(Number(user.lastLoginAt)).toISOString() : "inconnue"}`);
  } else {
    console.log("  Auth : aucun compte (déjà supprimé ?)");
  }
  console.log(`  Firestore users/${uid} : ${progress ? `présent, mis à jour le ${progress.updateTime}` : "absent"}`);

  if (!user && !progress) {
    console.log("Rien à supprimer.");
    return;
  }
  if (!args.confirm) {
    console.log(`\nSimulation : rien n'a été supprimé. Pour supprimer : node scripts/delete-account.mjs ${uid} --confirm`);
    return;
  }

  if (progress) {
    const deleted = await call(token, `${FIRESTORE}/users/${uid}?currentDocument.updateTime=${encodeURIComponent(progress.updateTime)}`, { method: "DELETE" });
    if (!deleted.ok) fail(`suppression de users/${uid} refusée (${deleted.status}) : le compte Auth n'a pas été touché`);
    console.log(`OK users/${uid} supprimé`);
  }
  if (user) {
    const deleted = await call(token, `${IDENTITY}/accounts:delete`, { method: "POST", body: JSON.stringify({ localId: uid }) });
    if (!deleted.ok) fail(`suppression du compte Auth refusée (${deleted.status})`);
    console.log(`OK compte Auth ${uid} supprimé`);
  }
  console.log("Répondre à la demande : suppression faite. Les données locales de l'appareil restent à effacer par le joueur.");
}

main().catch((error) => fail(error.message));
