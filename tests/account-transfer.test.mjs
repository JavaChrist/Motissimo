// Passage anonyme → Google (src/lib/account-transfer.ts) : node --test tests/account-transfer.test.mjs
// Un faux serveur en mémoire tient les comptes et les documents ; chaque opération peut échouer sur demande.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AnonymousAccountGone,
  isAccountGoneError,
  isValidResult,
  mergeAccounts,
  mergeSameAccount,
  newTransferRecord,
  recordTarget,
  runTransfer,
} from "../src/lib/account-transfer.ts";

const U = "anon-U";
const G = "google-G";

function progress(totalScore, levels = {}, seen = [], extra = {}) {
  return { completedLevels: levels, totalScore, currentLevel: 1, seenPuzzleIds: seen, ...extra };
}

/** Faux Firebase : comptes Auth, documents users/{uid}, session principale, copie locale et pannes. */
function world({ anonDoc = progress(50, { 1: { stars: 2, score: 50, bestTime: 30 } }, ["a", "b"]), googleDoc = progress(200, { 1: { stars: 3, score: 40, bestTime: 12 }, 2: { stars: 1, score: 160, bestTime: 80 } }, ["b", "c"]) } = {}) {
  const w = {
    auth: new Set([U, G]),
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
  const anonymousSession = () => {
    if (!w.auth.has(U)) throw new AnonymousAccountGone();
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
      if (!w.auth.has(uid)) throw new AnonymousAccountGone();
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

  it("grilles vues réunies sans doublon, cumuls additionnés entre comptes, maximum pour un même compte", () => {
    const a = progress(50, {}, ["x", "y", "x"], { dailyLastDate: "2026-11-10", dailyStreak: 4, soundEnabled: false });
    const b = progress(70, {}, ["y", "z"], { dailyLastDate: "2026-11-12", dailyStreak: 1, soundEnabled: true, childMode: true });
    const merged = mergeAccounts(a, b);
    assert.deepEqual(merged.seenPuzzleIds, ["x", "y", "z"]);
    assert.equal(merged.totalScore, 120);
    assert.equal(merged.dailyLastDate, "2026-11-12");
    assert.equal(merged.dailyStreak, 1);
    assert.equal(merged.soundEnabled, false, "réglages de l'appareil");
    assert.equal(merged.childMode, true);
    assert.equal(mergeSameAccount(a, b).totalScore, 70);
    assert.equal(mergeSameAccount(null, null), null);
    assert.equal(mergeAccounts(null, null).totalScore, 0);
  });
});

describe("erreurs de compte", () => {
  it("seuls « introuvable » et « session invalidée » signifient un compte supprimé", () => {
    assert.equal(isAccountGoneError({ code: "auth/user-not-found" }), true);
    assert.equal(isAccountGoneError({ code: "auth/user-token-expired" }), true);
    for (const code of ["auth/network-request-failed", "auth/user-disabled", "auth/internal-error", "auth/too-many-requests", "permission-denied", "unavailable", undefined]) {
      assert.equal(isAccountGoneError({ code }), false, String(code));
    }
  });
});

describe("transfert", () => {
  it("parcours complet : fusion confirmée, puis users/U et compte U supprimés", async () => {
    const w = world();
    w.start();
    assert.equal(await runTransfer(w.ops, w.store), "done");
    const g = w.docs.get(G);
    assert.equal(g.totalScore, 260, "cumul local de U (60) + G (200)");
    assert.deepEqual(g.completedLevels[1], { stars: 3, score: 55, bestTime: 12 });
    assert.deepEqual(g.seenPuzzleIds, ["a", "d", "b", "c"]);
    assert.equal(g.lastTransferId, "t-1");
    assert.deepEqual(g.transferredFrom, [U], "U retrouvable depuis G par le support");
    assert.equal(w.docs.has(U), false);
    assert.equal(w.auth.has(U), false);
    assert.equal(w.record, null);
    assert.equal(w.local.owner, G);
    assert.equal(w.local.progress.totalScore, 260);
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
      assert.equal(w.docs.get(G).totalScore, 260);
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
