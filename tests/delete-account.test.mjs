// Script de suppression de compte, sur les émulateurs Firestore et Auth (npm run test:delete).
// Vérifie : reprise après une panne à chaque étape, ancien jeton bloqué, marque datée puis effacée.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const PROJECT = "motissimo-456ba";
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const DOCS = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;
const owner = { authorization: "Bearer owner", "content-type": "application/json" };

function run(args, failAfter) {
  const env = { ...process.env, FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST, FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST };
  if (failAfter) env.DELETE_ACCOUNT_FAIL_AFTER = failAfter;
  else delete env.DELETE_ACCOUNT_FAIL_AFTER;
  const result = spawnSync(process.execPath, ["scripts/delete-account.mjs", ...args], { env, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

/** Joueur anonyme créé comme le ferait l'application : uid et jeton d'identification. */
async function newPlayer() {
  const response = await fetch(`${AUTH}/accounts:signUp?key=fake-api-key`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const body = await response.json();
  assert.ok(body.localId, "compte anonyme créé");
  return { uid: body.localId, idToken: body.idToken };
}

// Accès du joueur avec son jeton : les règles Firestore s'appliquent.
const asPlayer = (player, path, init = {}) =>
  fetch(`${DOCS}/${path}`, { ...init, headers: { authorization: `Bearer ${player.idToken}`, "content-type": "application/json" } });
const writeProgress = (player, score) =>
  asPlayer(player, `users/${player.uid}`, { method: "PATCH", body: JSON.stringify({ fields: { totalScore: { integerValue: String(score) } } }) });

// Accès administrateur (contourne les règles).
const adminGet = (path) => fetch(`${DOCS}/${path}`, { headers: owner });
const exists = async (path) => (await adminGet(path)).status === 200;
async function authExists(uid) {
  const response = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
    method: "POST",
    headers: owner,
    body: JSON.stringify({ localId: [uid] }),
  });
  return Boolean((await response.json()).users?.length);
}

describe("scripts/delete-account.mjs", () => {
  it("simule sans rien supprimer", async () => {
    const player = await newPlayer();
    assert.equal((await writeProgress(player, 10)).status, 200);
    const { code, out } = run([player.uid]);
    assert.equal(code, 0, out);
    assert.match(out, /Simulation : rien n'a été supprimé/);
    assert.ok(await exists(`users/${player.uid}`));
    assert.ok(!(await exists(`deleted_accounts/${player.uid}`)));
    assert.ok(await authExists(player.uid));
  });

  it("reprend après une panne à chaque étape, et l'ancien jeton reste bloqué", async () => {
    const player = await newPlayer();
    assert.equal((await writeProgress(player, 50)).status, 200);

    // Panne juste après la marque : la progression existe encore, mais le joueur ne peut ni la lire ni l'écrire.
    let result = run([player.uid, "--confirm"], "marker");
    assert.notEqual(result.code, 0);
    assert.ok(await exists(`users/${player.uid}`));
    assert.equal((await asPlayer(player, `users/${player.uid}`)).status, 403, "lecture bloquée");
    assert.equal((await writeProgress(player, 60)).status, 403, "écriture bloquée");
    assert.match(run([player.uid]).out, /INCOMPLÈTE/);

    // Panne après la suppression du document : l'ancien jeton ne peut pas le recréer.
    result = run([player.uid, "--confirm"], "progress");
    assert.notEqual(result.code, 0);
    assert.ok(!(await exists(`users/${player.uid}`)));
    assert.ok(await authExists(player.uid));
    assert.equal((await writeProgress(player, 50)).status, 403, "recréation bloquée");

    // Panne après la suppression du compte Auth : la marque n'est pas encore datée.
    result = run([player.uid, "--confirm"], "auth");
    assert.notEqual(result.code, 0);
    assert.ok(!(await authExists(player.uid)));
    assert.match(run([player.uid]).out, /INCOMPLÈTE/);

    // Relance sans panne : vérification puis marque datée.
    result = run([player.uid, "--confirm"]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /déjà absent/);
    assert.match(result.out, /OK 5\/5 suppression terminée/);
    const marker = await (await adminGet(`deleted_accounts/${player.uid}`)).json();
    const expire = new Date(marker.fields.expireAt.timestampValue).getTime();
    const completed = new Date(marker.fields.completedAt.timestampValue).getTime();
    assert.equal(expire - completed, 24 * 60 * 60 * 1000);
    assert.equal((await writeProgress(player, 50)).status, 403, "toujours bloqué après la fin");

    // Troisième lancement : rien à faire.
    result = run([player.uid, "--confirm"]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /Suppression déjà terminée/);
  });

  it("n'efface que les marques terminées et expirées", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const put = (uid, fields) => fetch(`${DOCS}/deleted_accounts/${uid}`, { method: "PATCH", headers: owner, body: JSON.stringify({ fields }) });
    await put("expiredMarker", { requestedAt: { timestampValue: past }, completedAt: { timestampValue: past }, expireAt: { timestampValue: past } });
    await put("incompleteMarker", { requestedAt: { timestampValue: past } });

    let result = run(["--purge"]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /À effacer : marque expiredMarker/);
    assert.match(result.out, /ATTENTION incompleteMarker : suppression incomplète/);
    assert.ok(await exists("deleted_accounts/expiredMarker"), "simulation : rien d'effacé");

    result = run(["--purge", "--confirm"]);
    assert.equal(result.code, 0, result.out);
    assert.ok(!(await exists("deleted_accounts/expiredMarker")));
    assert.ok(await exists("deleted_accounts/incompleteMarker"), "une suppression incomplète garde sa marque");
  });
});
