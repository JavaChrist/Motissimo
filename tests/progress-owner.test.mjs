// Propriétaire de la copie locale (src/lib/progress-owner.ts) : node --test tests/progress-owner.test.mjs
// Simule le stockage de l'appareil et la session enregistrée par Firebase.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const API_KEY = "test-key";
const SESSION_KEY = `firebase:authUser:${API_KEY}:[DEFAULT]`;

class MemoryStorage {
  map = new Map();
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

/** IndexedDB réduit à ce que lit claimLegacyCopy : une session Firebase enregistrée, ou rien. */
function fakeIndexedDb(session) {
  return {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close() {},
          transaction: () => ({
            objectStore: () => ({
              get(key) {
                const get = {};
                queueMicrotask(() => {
                  get.result = session && key === SESSION_KEY ? { fbase_key: key, value: session } : undefined;
                  get.onsuccess();
                });
                return get;
              },
            }),
          }),
        };
        request.onsuccess();
      });
      return request;
    },
  };
}

globalThis.window = globalThis;
let mod;
let launch = 0;

/** Nouveau lancement de l'application : module rechargé, stockage gardé. */
async function relaunch(session = null) {
  globalThis.indexedDB = fakeIndexedDb(session);
  mod = await import(`../src/lib/progress-owner.ts?launch=${launch++}`);
  return mod;
}

const local = () => globalThis.localStorage.getItem("wordtiles_progress");
const owner = () => globalThis.localStorage.getItem("wordtiles_progress_owner");
const PROGRESS = JSON.stringify({ totalScore: 120, completedLevels: { 1: { stars: 3, score: 120, bestTime: 9 } } });

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe("decideOwnership", () => {
  it("couvre tous les cas", async () => {
    const { decideOwnership: d } = await relaunch();
    const c = (owner, hasLocal, uid, switchFrom = null) => d({ owner, hasLocal, uid, switchFrom });
    assert.equal(c(null, false, "U"), "adopt");
    assert.equal(c("U", false, "U"), "none");
    assert.equal(c(null, false, null), "none");
    assert.equal(c("U", true, "U"), "none");
    assert.equal(c(null, true, "U"), "adopt");
    assert.equal(c("X", true, null), "discard");
    assert.equal(c(null, true, null), "none");
    assert.equal(c("X", true, "U"), "discard");
    assert.equal(c("X", true, "G", "X"), "adopt");
    assert.equal(c("X", true, "G", "Y"), "discard");
  });
});

describe("scénarios", () => {
  it("compte supprimé : Firebase efface la session, la copie locale est effacée avant le nouveau compte anonyme", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem("wordtiles_progress_owner", "X");
    const m = await relaunch({ uid: "X" });
    await m.claimLegacyCopy(API_KEY);
    assert.equal(m.reconcileOwner(null), "discard"); // session invalidée à l'initialisation
    assert.equal(local(), null);
    assert.equal(m.reconcileOwner("U"), "adopt"); // signInAnonymously
    assert.equal(local(), null, "rien à envoyer sous U");
    assert.equal(owner(), "U");
  });

  it("copie d'une version 1.0.1 sans propriétaire, compte supprimé : rattachée à l'ancienne session puis effacée", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    const m = await relaunch({ uid: "X" });
    await m.claimLegacyCopy(API_KEY);
    assert.equal(owner(), "X", "propriétaire lu avant l'initialisation de Firebase");
    assert.equal(m.reconcileOwner(null), "discard");
    assert.equal(m.reconcileOwner("U"), "adopt");
    assert.equal(local(), null);
  });

  it("copie sans propriétaire, session enregistrée dans localStorage (sans IndexedDB)", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: "X" }));
    const m = await relaunch(null);
    await m.claimLegacyCopy(API_KEY);
    assert.equal(owner(), "X");
  });

  it("copie sans propriétaire, compte toujours valide : gardée", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    const m = await relaunch({ uid: "X" });
    await m.claimLegacyCopy(API_KEY);
    assert.equal(m.reconcileOwner("X"), "none");
    assert.equal(local(), PROGRESS);
  });

  it("copie jouée sans compte (hors ligne au premier lancement) : rattachée au premier compte", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    const m = await relaunch(null);
    await m.claimLegacyCopy(API_KEY);
    assert.equal(owner(), null);
    assert.equal(m.reconcileOwner(null), "none");
    assert.equal(m.reconcileOwner("U"), "adopt");
    assert.equal(local(), PROGRESS);
  });

  it("lancement hors ligne : Firebase garde la session, la copie aussi", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem("wordtiles_progress_owner", "X");
    const m = await relaunch({ uid: "X" });
    await m.claimLegacyCopy(API_KEY);
    assert.equal(m.reconcileOwner("X"), "none");
    assert.equal(local(), PROGRESS);
  });

  it("connexion Google depuis un compte anonyme valide : la copie suit vers le compte Google", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem("wordtiles_progress_owner", "X");
    const m = await relaunch({ uid: "X" });
    m.reconcileOwner("X");
    m.beginAccountSwitch("X"); // reload(X) a réussi
    assert.equal(m.reconcileOwner("G"), "adopt");
    assert.equal(local(), PROGRESS);
    assert.equal(owner(), "G");
    // L'autorisation ne sert qu'une fois.
    localStorage.setItem("wordtiles_progress_owner", "X");
    assert.equal(m.reconcileOwner("G2"), "discard");
  });

  it("reconnexion Google après suppression : rien n'est réimporté", async () => {
    // Compte Google G supprimé pendant que l'appareil était hors ligne : la session est restée.
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem("wordtiles_progress_owner", "G");
    const m = await relaunch({ uid: "G" });
    assert.equal(m.reconcileOwner("G"), "none");
    // Bouton Google : reload(G) échoue (compte supprimé), Firebase déconnecte, pas d'autorisation.
    assert.equal(m.reconcileOwner(null), "discard");
    assert.equal(m.reconcileOwner("G2"), "adopt"); // nouveau compte Google
    assert.equal(local(), null, "la progression supprimée n'est pas fusionnée");
  });

  it("nouveau compte sans passer par la déconnexion ni par une connexion autorisée : copie effacée", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem("wordtiles_progress_owner", "G");
    const m = await relaunch(null);
    assert.equal(m.reconcileOwner("G2"), "discard");
    assert.equal(local(), null);
  });

  it("connexion Google annulée : l'autorisation est retirée", async () => {
    localStorage.setItem("wordtiles_progress", PROGRESS);
    localStorage.setItem("wordtiles_progress_owner", "X");
    const m = await relaunch({ uid: "X" });
    m.beginAccountSwitch("X");
    m.cancelAccountSwitch();
    assert.equal(m.reconcileOwner("G"), "discard");
  });
});
