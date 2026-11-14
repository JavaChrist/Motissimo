/**
 * Propriétaire de la progression gardée sur l'appareil.
 *
 * Après la suppression d'un compte, Firebase efface sans prévenir la session de l'appareil, et
 * l'application crée un nouveau compte anonyme. Sans propriétaire, la copie locale de l'ancien compte
 * serait envoyée sous le nouveau : la progression supprimée reviendrait. On garde donc l'identifiant
 * du compte auquel la copie appartient, et une copie d'un autre compte est effacée, sauf lors d'une
 * connexion Google demandée depuis le compte propriétaire, encore valide.
 *
 * Aucune importation : ce module est testé tel quel par Node (tests/progress-owner.test.mjs).
 */

export const PROGRESS_KEY = "wordtiles_progress";
export const OWNER_KEY = "wordtiles_progress_owner";

export type OwnerDecision = "none" | "adopt" | "discard";

/**
 * - adopt : la copie (ou son absence) appartient désormais à `uid` ;
 * - discard : la copie appartient à un compte qui n'est plus connecté, elle est effacée ;
 * - none : rien à changer.
 */
export function decideOwnership(input: {
  owner: string | null;
  hasLocal: boolean;
  uid: string | null;
  switchFrom: string | null;
}): OwnerDecision {
  const { owner, hasLocal, uid, switchFrom } = input;
  if (!hasLocal) return uid && uid !== owner ? "adopt" : "none";
  // Plus personne de connecté alors que la copie avait un propriétaire : Firebase a invalidé ce compte
  // (supprimé ou désactivé). L'application ne déconnecte jamais d'elle-même.
  if (uid === null) return owner ? "discard" : "none";
  if (owner === uid) return "none";
  // Copie sans propriétaire : jouée sans compte (hors ligne au premier lancement).
  if (owner === null) return "adopt";
  // Connexion Google lancée depuis le compte propriétaire, vérifié juste avant : la copie suit.
  if (switchFrom === owner) return "adopt";
  return "discard";
}

let switchFrom: string | null = null;

/** Connexion Google demandée depuis ce compte (vérifié auprès de Firebase juste avant). */
export function beginAccountSwitch(fromUid: string | null) {
  switchFrom = fromUid;
}

export function cancelAccountSwitch() {
  switchFrom = null;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

/** Applique la décision pour le compte connecté (`null` : plus personne). À appeler avant de charger la progression. */
export function reconcileOwner(uid: string | null): OwnerDecision {
  if (typeof window === "undefined") return "none";
  const owner = read(OWNER_KEY);
  const decision = decideOwnership({ owner, hasLocal: read(PROGRESS_KEY) !== null, uid, switchFrom });
  if (decision === "discard") write(PROGRESS_KEY, null);
  if (decision !== "none") write(OWNER_KEY, uid);
  if (uid !== null) switchFrom = null;
  return decision;
}

/** Efface la copie locale : le compte est en cours de suppression (accès refusé par Firestore). */
export function discardLocalProgress() {
  write(PROGRESS_KEY, null);
}

/** Copie locale remplacée par `progress`, rattachée au compte `uid` (fusion d'un transfert de compte). */
export function storeLocalCopy(uid: string, progress: unknown) {
  write(PROGRESS_KEY, JSON.stringify(progress));
  write(OWNER_KEY, uid);
}

/** Uid de la session Firebase enregistrée, lu avant l'initialisation (qui l'efface si le compte n'existe plus). */
export async function persistedUid(apiKey: string, appName = "[DEFAULT]"): Promise<string | null> {
  const key = `firebase:authUser:${apiKey}:${appName}`;
  const fromIndexedDb = await new Promise<string | null>((resolve) => {
    try {
      const request = indexedDB.open("firebaseLocalStorageDb", 1);
      // Base absente : on la crée comme Firebase, pour ne pas la laisser sans magasin.
      request.onupgradeneeded = () => request.result.createObjectStore("firebaseLocalStorage", { keyPath: "fbase_key" });
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const get = db.transaction("firebaseLocalStorage", "readonly").objectStore("firebaseLocalStorage").get(key);
          get.onsuccess = () => {
            db.close();
            resolve(typeof get.result?.value?.uid === "string" ? get.result.value.uid : null);
          };
          get.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
  if (fromIndexedDb) return fromIndexedDb;
  try {
    const stored = JSON.parse(read(key) ?? "null") as { uid?: unknown } | null;
    return typeof stored?.uid === "string" ? stored.uid : null;
  } catch {
    return null;
  }
}

let legacyClaim: Promise<void> | null = null;

/**
 * Copies des versions 1.0.1 et antérieures, sans propriétaire : on leur donne celui de la session
 * enregistrée, lu avant que Firebase ne la vérifie. Une seule fois par lancement.
 */
export function claimLegacyCopy(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  legacyClaim ??= (async () => {
    if (read(PROGRESS_KEY) === null || read(OWNER_KEY) !== null) return;
    const uid = await persistedUid(apiKey);
    if (uid) write(OWNER_KEY, uid);
  })();
  return legacyClaim;
}
