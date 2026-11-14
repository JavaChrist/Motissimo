#!/usr/bin/env node
/**
 * Suppression d'un compte Motissimo sur demande (page /supprimer-mon-compte).
 *
 *   node scripts/delete-account.mjs <uid>                 simulation : affiche ce qui serait supprimé
 *   node scripts/delete-account.mjs --email <adresse>     retrouve le compte Google, en simulation
 *   node scripts/delete-account.mjs <uid> --confirm       supprime le compte (voir les étapes plus bas)
 *   node scripts/delete-account.mjs --purge               liste les marques de suppression expirées
 *   node scripts/delete-account.mjs --purge --confirm     efface les marques expirées
 *
 * Étapes de --confirm, dans cet ordre, chacune sans effet si elle est déjà faite :
 *   1. poser la marque deleted_accounts/{uid} : les règles Firestore refusent alors toute lecture et
 *      écriture de users/{uid}, même avec un jeton encore valide (une heure au plus) ;
 *   2. supprimer users/{uid} ;
 *   3. supprimer le compte Firebase Authentication : son jeton ne peut plus être renouvelé ;
 *   4. vérifier que le document et le compte n'existent plus ;
 *   5. dater la marque : terminée, à effacer 24 heures plus tard.
 * Après un échec, relancer la même commande : elle reprend là où elle s'est arrêtée. Tant que la
 * suppression n'est pas terminée, la marque reste et bloque l'accès.
 *
 * Identifiants : la session du CLI Firebase (`firebase login`) dans ~/.config/configstore/firebase-tools.json.
 * Aucune clé de compte de service. Le jeton n'est jamais affiché. Aucune dépendance.
 * Tests : avec FIRESTORE_EMULATOR_HOST et FIREBASE_AUTH_EMULATOR_HOST, le script vise les émulateurs.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT = "motissimo-456ba";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (Boolean(FIRESTORE_HOST) !== Boolean(AUTH_HOST)) {
  console.error("ERREUR FIRESTORE_EMULATOR_HOST et FIREBASE_AUTH_EMULATOR_HOST vont ensemble");
  process.exit(1);
}
const EMULATOR = Boolean(FIRESTORE_HOST);
const DATABASE = `projects/${PROJECT}/databases/(default)`;
const FIRESTORE = `${EMULATOR ? `http://${FIRESTORE_HOST}` : "https://firestore.googleapis.com"}/v1/${DATABASE}/documents`;
const IDENTITY = `${EMULATOR ? `http://${AUTH_HOST}/identitytoolkit.googleapis.com` : "https://identitytoolkit.googleapis.com"}/v1/projects/${PROJECT}`;
const MARKERS = "deleted_accounts";
// Un jeton d'identification Firebase vaut une heure au plus et ne se renouvelle plus une fois le compte
// supprimé : une heure suffirait. La marge couvre l'écart d'horloge et laisse vérifier le lendemain.
const MARKER_KEEP_MS = 24 * 60 * 60 * 1000;
// Client OAuth public du CLI Firebase (publié dans firebase-tools), utilisé pour rafraîchir sa session.
const CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
// Tests seulement : simule une panne après l'étape nommée (marker, progress, auth).
const FAIL_AFTER = EMULATOR ? process.env.DELETE_ACCOUNT_FAIL_AFTER : undefined;

function fail(message) {
  console.error(`ERREUR ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { uid: null, email: null, confirm: false, purge: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--purge") args.purge = true;
    else if (arg === "--email") args.email = argv[++i] ?? fail("--email attend une adresse");
    else if (arg.startsWith("--")) fail(`option inconnue : ${arg}`);
    else if (!args.uid) args.uid = arg;
    else fail(`argument en trop : ${arg}`);
  }
  if (args.purge && (args.uid || args.email)) fail("--purge se lance seul");
  if (!args.purge && !args.uid && !args.email) fail("indiquez un identifiant de compte (uid), --email <adresse> ou --purge");
  if (args.uid && args.email) fail("indiquez un uid ou une adresse, pas les deux");
  if (args.uid && !/^[A-Za-z0-9]{1,128}$/.test(args.uid)) fail("identifiant de compte invalide");
  if (args.email && args.confirm) fail("--confirm se lance avec l'uid affiché par la simulation, pas avec --email");
  return args;
}

async function accessToken() {
  if (EMULATOR) return "owner";
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
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: response.status, ok: response.ok, body };
}

function maskEmail(email) {
  if (!email) return "aucune";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}…@${domain}`;
}

function checkpoint(step) {
  if (FAIL_AFTER === step) fail(`panne simulée après l'étape « ${step} »`);
}

async function lookup(token, query) {
  const result = await call(token, `${IDENTITY}/accounts:lookup`, { method: "POST", body: JSON.stringify(query) });
  if (!result.ok) fail(`lecture du compte refusée (${result.status})`);
  return result.body?.users ?? [];
}

async function readDoc(token, path) {
  const result = await call(token, `${FIRESTORE}/${path}`);
  if (result.status === 404) return null;
  if (!result.ok) fail(`lecture de ${path} refusée (${result.status})`);
  return result.body;
}

const timestamp = (date) => ({ timestampValue: date.toISOString() });
const fieldTime = (doc, name) => (doc?.fields?.[name]?.timestampValue ? new Date(doc.fields[name].timestampValue) : null);

function describeMarker(marker) {
  if (!marker) return "absente";
  const requested = fieldTime(marker, "requestedAt");
  const expire = fieldTime(marker, "expireAt");
  if (!expire) return `posée le ${requested?.toISOString() ?? "?"}, suppression INCOMPLÈTE : relancez --confirm`;
  return `suppression terminée le ${fieldTime(marker, "completedAt")?.toISOString() ?? "?"}, marque à effacer après le ${expire.toISOString()}`;
}

/** Étape 1 : pose la marque si elle manque. Déjà posée : rien ne change. */
async function ensureMarker(token, uid) {
  const existing = await readDoc(token, `${MARKERS}/${uid}`);
  if (existing) return existing;
  const created = await call(token, `${FIRESTORE}/${MARKERS}/${uid}?currentDocument.exists=false`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { requestedAt: timestamp(new Date()) } }),
  });
  if (created.ok) return created.body;
  // Posée entre-temps par un autre lancement : on la relit.
  const again = await readDoc(token, `${MARKERS}/${uid}`);
  if (again) return again;
  fail(`pose de la marque ${MARKERS}/${uid} refusée (${created.status}) : rien n'a été supprimé`);
}

/** Étape 3 : supprime le compte Auth. Déjà supprimé : rien ne change. */
async function deleteAuthUser(token, uid) {
  const deleted = await call(token, `${IDENTITY}/accounts:delete`, { method: "POST", body: JSON.stringify({ localId: uid }) });
  if (deleted.ok) return "supprimé";
  if (deleted.body?.error?.message === "USER_NOT_FOUND") return "déjà absent";
  fail(`suppression du compte Auth refusée (${deleted.status}) : relancez la même commande`);
}

async function deleteAccount(token, uid) {
  await ensureMarker(token, uid);
  console.log(`OK 1/5 marque ${MARKERS}/${uid} posée : users/${uid} n'est plus lisible ni modifiable`);
  checkpoint("marker");

  // DELETE sans précondition : sans effet si le document n'existe plus, et la marque empêche toute écriture.
  const progress = await call(token, `${FIRESTORE}/users/${uid}`, { method: "DELETE" });
  if (!progress.ok) fail(`suppression de users/${uid} refusée (${progress.status}) : relancez la même commande`);
  console.log(`OK 2/5 users/${uid} supprimé (ou déjà absent)`);
  checkpoint("progress");

  console.log(`OK 3/5 compte Auth ${uid} ${await deleteAuthUser(token, uid)}`);
  checkpoint("auth");

  const leftUser = await lookup(token, { localId: [uid] });
  const leftDoc = await readDoc(token, `users/${uid}`);
  if (leftUser.length || leftDoc) fail("vérification : il reste des données, relancez la même commande");
  console.log("OK 4/5 vérification : ni compte Auth ni progression en ligne");

  const now = new Date();
  const expire = new Date(now.getTime() + MARKER_KEEP_MS);
  const dated = await call(
    token,
    `${FIRESTORE}/${MARKERS}/${uid}?updateMask.fieldPaths=completedAt&updateMask.fieldPaths=expireAt&currentDocument.exists=true`,
    { method: "PATCH", body: JSON.stringify({ fields: { completedAt: timestamp(now), expireAt: timestamp(expire) } }) },
  );
  if (!dated.ok) fail(`datation de la marque refusée (${dated.status}) : relancez la même commande`);
  console.log(`OK 5/5 suppression terminée. Marque à effacer après le ${expire.toISOString()} (--purge --confirm)`);
}

async function listMarkers(token) {
  const markers = [];
  let pageToken = "";
  do {
    const result = await call(token, `${FIRESTORE}/${MARKERS}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`);
    if (!result.ok) fail(`lecture des marques refusée (${result.status})`);
    markers.push(...(result.body?.documents ?? []));
    pageToken = result.body?.nextPageToken ?? "";
  } while (pageToken);
  return markers;
}

/** Efface les marques terminées dont le délai est passé. Les marques incomplètes restent : elles bloquent encore. */
async function purge(token, confirm) {
  const now = Date.now();
  let expired = 0;
  for (const marker of await listMarkers(token)) {
    const uid = marker.name.split("/").pop();
    const expire = fieldTime(marker, "expireAt");
    if (!expire) {
      console.log(`ATTENTION ${uid} : suppression incomplète, relancez node scripts/delete-account.mjs ${uid} --confirm`);
      continue;
    }
    if (expire.getTime() > now) continue;
    expired++;
    if (!confirm) {
      console.log(`À effacer : marque ${uid} (expirée le ${expire.toISOString()})`);
      continue;
    }
    // Relecture juste avant : une suppression relancée entre-temps pour ce compte garde sa marque.
    const current = await readDoc(token, `${MARKERS}/${uid}`);
    const currentExpire = fieldTime(current, "expireAt");
    if (!current || !currentExpire || currentExpire.getTime() > Date.now()) continue;
    const deleted = await call(token, `${FIRESTORE}/${MARKERS}/${uid}`, { method: "DELETE" });
    if (!deleted.ok) fail(`effacement de la marque ${uid} refusé (${deleted.status})`);
    console.log(`OK marque ${uid} effacée`);
  }
  if (!expired) console.log("Aucune marque expirée.");
  else if (!confirm) console.log("Simulation : rien n'a été effacé. Pour effacer : node scripts/delete-account.mjs --purge --confirm");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = await accessToken();
  if (EMULATOR) console.log("(émulateurs)");

  if (args.purge) return purge(token, args.confirm);

  const users = args.email ? await lookup(token, { email: [args.email] }) : await lookup(token, { localId: [args.uid] });
  if (users.length > 1) fail("plusieurs comptes correspondent : relancez avec l'uid");
  const user = users[0] ?? null;
  const uid = user?.localId ?? args.uid;

  if (!uid) {
    console.log("Aucun compte Auth pour cette adresse.");
    return;
  }

  const progress = await readDoc(token, `users/${uid}`);
  const marker = await readDoc(token, `${MARKERS}/${uid}`);

  console.log(`Compte : ${uid}`);
  if (user) {
    const providers = (user.providerUserInfo ?? []).map((p) => p.providerId);
    console.log(`  Auth : ${providers.length ? providers.join(", ") : "anonyme"}, e-mail ${maskEmail(user.email)}`);
    console.log(`  Créé le ${new Date(Number(user.createdAt)).toISOString()}, dernière connexion ${user.lastLoginAt ? new Date(Number(user.lastLoginAt)).toISOString() : "inconnue"}`);
  } else {
    console.log("  Auth : aucun compte");
  }
  console.log(`  Firestore users/${uid} : ${progress ? `présent, mis à jour le ${progress.updateTime}` : "absent"}`);
  console.log(`  Marque de suppression : ${describeMarker(marker)}`);

  const complete = marker && fieldTime(marker, "expireAt");
  if (!user && !progress && (!marker || complete)) {
    console.log(marker ? "Suppression déjà terminée." : "Rien à supprimer.");
    return;
  }
  if (!args.confirm) {
    console.log(`\nSimulation : rien n'a été supprimé. Pour supprimer : node scripts/delete-account.mjs ${uid} --confirm`);
    return;
  }

  await deleteAccount(token, uid);
  await purge(token, true);
  console.log("Répondre à la demande : suppression faite. Les données locales de l'appareil restent à effacer par le joueur.");
}

main().catch((error) => fail(error.message));
