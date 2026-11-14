// Passage anonyme → Google (src/lib/account-transfer.ts) et score total (src/lib/score.ts) : node --test tests/account-transfer.test.mjs
// Un faux serveur en mémoire tient les comptes et les documents ; chaque opération peut échouer sur demande.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AnonymousAccountGone,
  isValidResult,
  mergeAccounts,
  mergeSameAccount,
  newTransferRecord,
  recordTarget,
  refreshProvesDeletion,
  runTransfer,
} from "../src/lib/account-transfer.ts";
import { computeTotal, mergeDailyScores, withTotal } from "../src/lib/score.ts";

const U = "anon-U";
const G = "google-G";

function progress(totalScore, levels = {}, seen = [], extra = {}) {
  return { completedLevels: levels, totalScore, currentLevel: 1, seenPuzzleIds: seen, ...extra };
}

/** Faux Firebase : comptes Auth, documents users/{uid}, session principale, copie locale et pannes. */
function world({ anonDoc = progress(50, { 1: { stars: 2, score: 50, bestTime: 30 } }, ["a", "b"]), googleDoc = progress(200, { 1: { stars: 3, score: 40, bestTime: 12 }, 2: { stars: 1, score: 160, bestTime: 80 } }, ["b", "c"]) } = {}) {
  const w = {
    auth: new Set([U, G]),
    revoked: new Set(), // sessions révoquées : le compte existe, mais sa session ne fonctionne plus
    docs: new Map([[U, anonDoc], [G, googleDoc]]),
    current: G,
    local: null,
    record: null,
    failures: new Map(), // nom d'opération -> erreur à lever (une fois)
    calls: [],
  };
  const maybeFail = (name) => {
    w.calls.push(name);
    const error = w.failures.get(name);
    if (error) {
      w.failures.delete(name);
      throw error;
    }
  };
  // Comme account-transfer-firebase.ts : « supprimé » seulement s'il est confirmé (USER_NOT_FOUND) ;
  // une session révoquée donne l'erreur du SDK, auth/user-token-expired, qui ne prouve rien.
  const sessionExpired = () => Object.assign(new Error("session expirée"), { code: "auth/user-token-expired" });
  const anonymousSession = () => {
    if (!w.auth.has(U)) throw new AnonymousAccountGone();
    if (w.revoked.has(U)) throw sessionExpired();
  };
  w.ops = {
    currentUid: () => w.current,
    async readAnonymous(uid) {
      maybeFail("readAnonymous");
      anonymousSession();
      return w.docs.get(uid) ?? null;
    },
    async markAnonymous(uid, target) {
      maybeFail("markAnonymous");
      anonymousSession();
      w.docs.set(uid, { ...(w.docs.get(uid) ?? {}), transferredTo: target });
    },
    async readTarget(uid) {
      maybeFail("readTarget");
      return w.docs.get(uid) ? structuredClone(w.docs.get(uid)) : null;
    },
    async writeTarget(uid, p, id) {
      maybeFail("writeTarget");
      w.docs.set(uid, { ...p, lastTransferId: id });
      maybeFail("afterWriteTarget"); // écrit côté serveur, mais la réponse est perdue
    },
    saveLocal(uid, p) {
      w.local = { owner: uid, progress: p };
    },
    async deleteAnonymousDoc(uid) {
      maybeFail("deleteAnonymousDoc");
      anonymousSession();
      w.docs.delete(uid);
    },
    async deleteAnonymousAuth(uid) {
      maybeFail("deleteAnonymousAuth");
      anonymousSession();
      w.auth.delete(uid);
    },
    async releaseAnonymous() {
      w.calls.push("releaseAnonymous");
    },
  };
  w.store = {
    load: () => (w.record ? structuredClone(w.record) : null),
    save: (r) => {
      w.record = r ? structuredClone(r) : null;
    },
  };
  /** Transfert démarré depuis U, avec sa copie locale, puis connexion à G. */
  w.start = (anonLocal = progress(60, { 1: { stars: 2, score: 55, bestTime: 25 } }, ["a", "d"])) => {
    w.record = newTransferRecord(U, anonLocal, "t-1");
    recordTarget(w.store, G);
  };
  return w;
}

const networkError = () => Object.assign(new Error("offline"), { code: "unavailable" });

describe("score total", () => {
  it("meilleur score de chaque niveau réussi, plus le défi du jour une fois par date", () => {
    const p = progress(9999, { 1: { stars: 3, score: 40, bestTime: 9 }, 2: { stars: 1, score: 15, bestTime: 30 }, 3: { stars: 0, score: 99, bestTime: 1 } }, [], {
      dailyScores: { "2026-11-12": 30, "2026-11-13": 25, "pas-une-date": 500, "2026-11-14": -3 },
    });
    assert.equal(computeTotal(p), 40 + 15 + 30 + 25, "ancien total cumulé (rejeux) ignoré, entrées invalides ignorées");
    assert.equal(withTotal(p).totalScore, 110);
    assert.equal(withTotal(p).completedLevels, p.completedLevels);
    assert.equal(computeTotal(null), 0);
  });

  it("même défi (même date) sur deux sources : compté une fois, avec le meilleur score", () => {
    assert.deepEqual(mergeDailyScores({ "2026-11-12": 30, "2026-11-13": 10 }, { "2026-11-13": 25, "2026-11-14": 5 }, undefined), {
      "2026-11-12": 30,
      "2026-11-13": 25,
      "2026-11-14": 5,
    });
  });
});

describe("fusion", () => {
  it("réussites valides seulement, meilleur temps d'une réussite valide", () => {
    assert.equal(isValidResult({ stars: 3, score: 10, bestTime: 4 }), true);
    for (const bad of [null, {}, { stars: 0, score: 1, bestTime: 1 }, { stars: 4, score: 1, bestTime: 1 }, { stars: 2, score: 1, bestTime: -1 }, { stars: 2, score: 1, bestTime: Number.NaN }, { stars: 2, score: 1 }, { stars: 2, score: "9", bestTime: 3 }]) {
      assert.equal(isValidResult(bad), false, JSON.stringify(bad));
    }
    const merged = mergeAccounts(
      progress(10, { 1: { stars: 1, score: 5, bestTime: 0.5 * Number.NaN }, 2: { stars: 1, score: 30, bestTime: 50 } }),
      progress(20, { 1: { stars: 2, score: 8, bestTime: 40 }, 2: { stars: 3, score: 20, bestTime: 70 }, 3: { stars: 0, score: 99, bestTime: 1 } })
    );
    assert.deepEqual(merged.completedLevels, {
      1: { stars: 2, score: 8, bestTime: 40 }, // le temps invalide n'est pas retenu
      2: { stars: 3, score: 30, bestTime: 50 },
    });
    assert.equal(merged.completedLevels[3], undefined, "réussite invalide ignorée");
  });

  it("grilles vues réunies sans doublon, série du dernier jour joué, réglages de l'appareil", () => {
    const a = progress(50, {}, ["x", "y", "x"], { dailyLastDate: "2026-11-10", dailyStreak: 4, soundEnabled: false });
    const b = progress(70, {}, ["y", "z"], { dailyLastDate: "2026-11-12", dailyStreak: 1, soundEnabled: true, childMode: true });
    const merged = mergeAccounts(a, b);
    assert.deepEqual(merged.seenPuzzleIds, ["x", "y", "z"]);
    assert.equal(merged.dailyLastDate, "2026-11-12");
    assert.equal(merged.dailyStreak, 1);
    assert.equal(merged.soundEnabled, false, "réglages de l'appareil");
    assert.equal(merged.childMode, true);
    assert.equal(mergeSameAccount(null, null), null);
    assert.equal(mergeAccounts(null, null).totalScore, 0);
  });

  it("total recalculé, jamais la somme des deux totaux : un niveau et un défi joués sur les deux comptent une fois", () => {
    const anon = progress(500, { 1: { stars: 2, score: 50, bestTime: 30 }, 2: { stars: 1, score: 20, bestTime: 60 } }, [], {
      dailyScores: { "2026-11-12": 30, "2026-11-13": 10 },
    });
    const google = progress(800, { 1: { stars: 3, score: 45, bestTime: 12 }, 3: { stars: 2, score: 70, bestTime: 40 } }, [], {
      dailyScores: { "2026-11-13": 25 },
    });
    const merged = mergeAccounts(anon, google);
    // Niveaux : 1 → 50 (meilleur des deux), 2 → 20, 3 → 70. Défis : 12/11 → 30, 13/11 → 25 (même défi, meilleur score).
    assert.equal(merged.totalScore, 50 + 20 + 70 + 30 + 25);
    assert.notEqual(merged.totalScore, 500 + 800);
    assert.deepEqual(merged.dailyScores, { "2026-11-12": 30, "2026-11-13": 25 });
    assert.equal(mergeSameAccount(anon, google).totalScore, merged.totalScore, "même règle pour deux copies d'un compte");
    // Fusionner deux fois le même compte ne change rien.
    assert.equal(mergeAccounts(merged, google).totalScore, merged.totalScore);
  });
});

describe("preuve de suppression", () => {
  it("seule la réponse USER_NOT_FOUND du renouvellement de session prouve la suppression", () => {
    assert.equal(refreshProvesDeletion("USER_NOT_FOUND"), true);
    assert.equal(refreshProvesDeletion("USER_NOT_FOUND : no user record"), true);
    // Session expirée ou révoquée (le compte existe), compte désactivé, jeton refusé, code du SDK : pas une preuve.
    for (const message of ["TOKEN_EXPIRED", "USER_DISABLED", "INVALID_REFRESH_TOKEN", "auth/user-token-expired", "USER_NOT_FOUNDX", "", null, undefined, 404]) {
      assert.equal(refreshProvesDeletion(message), false, String(message));
    }
  });

  it("le jeton de renouvellement de U est enregistré avec le transfert", () => {
    assert.equal(newTransferRecord(U, null, "t", "refresh-U").anonRefreshToken, "refresh-U");
    assert.equal(newTransferRecord(U, null, "t").anonRefreshToken, null);
  });
});

describe("transfert", () => {
  it("parcours complet : fusion confirmée, puis users/U et compte U supprimés", async () => {
    const w = world();
    w.start();
    assert.equal(await runTransfer(w.ops, w.store), "done");
    const g = w.docs.get(G);
    assert.equal(g.totalScore, 215, "recalculé : niveau 1 → 55 (meilleur de U et G), niveau 2 → 160 ; pas 60 + 200");
    assert.deepEqual(g.completedLevels[1], { stars: 3, score: 55, bestTime: 12 });
    assert.deepEqual(g.seenPuzzleIds, ["a", "d", "b", "c"]);
    assert.equal(g.lastTransferId, "t-1");
    assert.deepEqual(g.transferredFrom, [U], "U retrouvable depuis G par le support");
    assert.equal(w.docs.has(U), false);
    assert.equal(w.auth.has(U), false);
    assert.equal(w.record, null);
    assert.equal(w.local.owner, G);
    assert.equal(w.local.progress.totalScore, 215);
    assert.equal(w.local.progress.lastTransferId, undefined);
    assert.equal(w.local.progress.transferredFrom, undefined);
    // Rien n'est supprimé avant la confirmation de la fusion.
    assert.ok(w.calls.lastIndexOf("readTarget") < w.calls.indexOf("deleteAnonymousDoc"));
  });

  for (const step of ["readTarget", "markAnonymous", "readAnonymous", "writeTarget", "afterWriteTarget", "deleteAnonymousDoc", "deleteAnonymousAuth"]) {
    it(`échec à ${step} : rien n'est perdu, la reprise termine sans compter deux fois`, async () => {
      const w = world();
      w.start();
      w.failures.set(step, networkError());
      assert.equal(await runTransfer(w.ops, w.store), "failed");
      assert.notEqual(w.record, null, "enregistrement gardé");
      assert.equal(w.auth.has(U), true, "compte U gardé");
      if (["readTarget", "markAnonymous", "readAnonymous", "writeTarget", "afterWriteTarget"].includes(step)) {
        assert.equal(w.record.step, "merging");
        assert.notEqual(w.record.anonLocal, null, "copie de U gardée tant que la fusion n'est pas confirmée");
        assert.equal(w.docs.has(U), true, "users/U gardé");
      }
      // Redémarrage complet : même enregistrement, même serveur.
      assert.equal(await runTransfer(w.ops, w.store), "done");
      assert.equal(w.docs.get(G).totalScore, 215);
      assert.equal(w.docs.has(U), false);
      assert.equal(w.auth.has(U), false);
      assert.equal(w.record, null);
    });
  }

  it("coupure après la suppression de users/U, avant celle du compte Auth U : la reprise supprime U", async () => {
    const w = world();
    w.start();
    w.failures.set("deleteAnonymousAuth", networkError());
    assert.equal(await runTransfer(w.ops, w.store), "failed");
    assert.equal(w.docs.has(U), false);
    assert.equal(w.auth.has(U), true);
    assert.equal(w.record.step, "cleanup");
    w.current = G; // relance : la session principale est toujours G
    assert.equal(await runTransfer(w.ops, w.store), "done");
    assert.equal(w.auth.has(U), false);
  });

  it("reprise avec un autre compte connecté : aucune fusion vers lui", async () => {
    const w = world();
    w.start();
    w.current = "other";
    const before = structuredClone([...w.docs]);
    assert.equal(await runTransfer(w.ops, w.store), "waiting");
    assert.deepEqual([...w.docs], before);
    assert.equal(w.record.targetUid, G);
    w.current = G;
    assert.equal(await runTransfer(w.ops, w.store), "done");
  });

  it("destinataire jamais enregistré : ni fusion ni suppression", async () => {
    const w = world();
    w.record = newTransferRecord(U, progress(60), "t-1");
    w.current = "someone";
    assert.equal(await runTransfer(w.ops, w.store), "waiting");
    assert.equal(w.docs.has(U), true);
    assert.equal(w.docs.get(G).lastTransferId, undefined);
  });

  it("connexion à G jamais faite (toujours U) : transfert abandonné, U intact", async () => {
    const w = world();
    w.record = newTransferRecord(U, progress(60), "t-1");
    w.current = U;
    recordTarget(w.store, U);
    assert.equal(w.record.targetUid, null, "U n'est pas un destinataire");
    assert.equal(await runTransfer(w.ops, w.store), "abandoned");
    assert.equal(w.record, null);
    assert.ok(w.calls.includes("releaseAnonymous"));
    assert.equal(w.docs.has(U), true);
    assert.equal(w.auth.has(U), true);
  });

  it("U supprimé par le support avant la fusion : sa progression ne va pas dans G", async () => {
    const w = world();
    w.start();
    w.auth.delete(U);
    w.docs.delete(U);
    assert.equal(await runTransfer(w.ops, w.store), "anonymous-gone");
    assert.equal(w.docs.get(G).totalScore, 200);
    assert.equal(w.docs.get(G).lastTransferId, undefined);
    assert.equal(w.record, null);
  });

  it("refus d'accès à users/U (marque de suppression) : erreur, pas un nettoyage terminé", async () => {
    const w = world();
    w.start();
    w.failures.set("markAnonymous", Object.assign(new Error("denied"), { code: "permission-denied" }));
    assert.equal(await runTransfer(w.ops, w.store), "failed");
    assert.notEqual(w.record, null);
  });

  it("session de U révoquée pendant le nettoyage (compte existant) : nettoyage en attente, pas terminé", async () => {
    const w = world();
    w.start();
    w.failures.set("deleteAnonymousAuth", networkError());
    assert.equal(await runTransfer(w.ops, w.store), "failed");
    w.revoked.add(U); // auth/user-token-expired, mais le compte U existe encore
    for (let launch = 0; launch < 3; launch++) {
      assert.equal(await runTransfer(w.ops, w.store), "failed");
      assert.equal(w.record?.step, "cleanup", "nettoyage gardé en attente");
      assert.equal(w.auth.has(U), true, "compte U toujours présent");
    }
    // Le support supprime U : la suppression est alors confirmée, et le transfert se termine.
    w.auth.delete(U);
    assert.equal(await runTransfer(w.ops, w.store), "done");
    assert.equal(w.record, null);
  });

  it("session de U révoquée avant la fusion : ni fusion ni « compte supprimé », tout est gardé", async () => {
    const w = world();
    w.start();
    w.revoked.add(U);
    assert.equal(await runTransfer(w.ops, w.store), "failed");
    assert.equal(w.record.step, "merging");
    assert.notEqual(w.record.anonLocal, null);
    assert.equal(w.docs.get(G).lastTransferId, undefined);
    assert.equal(w.docs.has(U), true);
  });

  it("compte U déjà supprimé pendant le nettoyage : terminé", async () => {
    const w = world();
    w.start();
    w.failures.set("deleteAnonymousAuth", networkError());
    await runTransfer(w.ops, w.store);
    w.auth.delete(U); // supprimé entre-temps (support, ou notre suppression dont la réponse est perdue)
    assert.equal(await runTransfer(w.ops, w.store), "done");
    assert.equal(w.record, null);
  });

  it("sans transfert : rien à faire", async () => {
    const w = world();
    assert.equal(await runTransfer(w.ops, w.store), "none");
    assert.deepEqual(w.calls, []);
  });
});
