/**
 * Passage d'un compte anonyme vers un compte Google qui existe déjà.
 *
 * Quand Google peut être lié au compte anonyme, l'identifiant ne change pas et ce module ne sert pas.
 * Sinon, la progression du compte anonyme U est versée dans le compte Google G, puis U et ses
 * données sont supprimés. Chaque étape est enregistrée sur l'appareil et reprise au lancement
 * suivant en cas d'échec ou de coupure :
 *
 * 1. switching : U est gardé dans une seconde session Firebase, sa progression locale est copiée ici,
 *    puis la session principale se connecte à G.
 * 2. merging : G est connu ; U est marqué comme transféré vers G, puis la fusion est écrite dans
 *    users/G et relue depuis le serveur. Rien n'est supprimé avant cette confirmation.
 * 3. cleanup : suppression de users/U, puis du compte Auth U, par la seconde session.
 *
 * Une erreur (réseau, droits, session expirée ou révoquée) n'est jamais prise pour un nettoyage terminé :
 * seule une suppression confirmée (la nôtre, ou AnonymousAccountGone, levée quand Firebase répond que le
 * compte n'existe pas) termine le transfert. Sinon le nettoyage reste en attente et est repris.
 *
 * Seule importation à l'exécution : score.ts, sans dépendance (testé tel quel par Node, tests/account-transfer.test.mjs).
 */
import type { UserProgress } from "./firebase-db";
import { computeTotal, isValidResult, mergeDailyScores } from "./score.ts";

export { isValidResult };

// ---------------------------------------------------------------------------
// Fusion de deux progressions
// ---------------------------------------------------------------------------

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Par niveau : meilleures étoiles, meilleur score et meilleur temps, pris parmi les seules réussites valides. */
function mergeLevels(...sources: (UserProgress["completedLevels"] | undefined)[]): UserProgress["completedLevels"] {
  const merged: UserProgress["completedLevels"] = {};
  for (const levels of sources) {
    for (const [key, result] of Object.entries(levels ?? {})) {
      if (!isValidResult(result)) continue;
      const previous = merged[key];
      merged[key] = previous
        ? {
            stars: Math.max(previous.stars, result.stars),
            score: Math.max(previous.score, result.score),
            bestTime: Math.min(previous.bestTime, result.bestTime),
          }
        : { stars: result.stars, score: result.score, bestTime: result.bestTime };
    }
  }
  return merged;
}

/** Grilles déjà vues : réunies sans doublon, dans l'ordre de première apparition. */
function mergeSeen(...sources: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const list of sources) for (const id of list ?? []) if (typeof id === "string") seen.add(id);
  return [...seen];
}

/** Défi du jour : la série du dernier jour joué ; à date égale, la plus longue. */
function mergeDaily(a: UserProgress | null, b: UserProgress | null): Pick<UserProgress, "dailyStreak" | "dailyLastDate"> {
  const candidates = [a, b].filter((p): p is UserProgress => typeof p?.dailyLastDate === "string");
  if (candidates.length === 0) return {};
  candidates.sort((x, y) =>
    x.dailyLastDate === y.dailyLastDate
      ? (y.dailyStreak ?? 0) - (x.dailyStreak ?? 0)
      : (y.dailyLastDate as string).localeCompare(x.dailyLastDate as string)
  );
  return { dailyLastDate: candidates[0].dailyLastDate, dailyStreak: candidates[0].dailyStreak ?? 0 };
}

const level = (p: UserProgress | null) => (finite(p?.currentLevel) && (p?.currentLevel ?? 0) >= 1 ? (p?.currentLevel as number) : 1);

/** Réglages : ceux de `preferred` quand ils existent, sinon ceux de l'autre. */
function settings(preferred: UserProgress | null, other: UserProgress | null) {
  const out: Pick<UserProgress, "childMode" | "showCounts" | "soundEnabled"> = {};
  for (const key of ["childMode", "showCounts", "soundEnabled"] as const) {
    const value = typeof preferred?.[key] === "boolean" ? preferred[key] : other?.[key];
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

/**
 * Fusion de deux progressions. Le score total n'est jamais la somme des deux totaux : il est recalculé
 * (score.ts) à partir des niveaux fusionnés (meilleur score de chaque niveau) et des points du défi du
 * jour par date (une date jouée sur les deux ne compte qu'une fois, avec le meilleur score).
 * Les réglages de `a` l'emportent quand ils existent.
 */
function combine(a: UserProgress | null, b: UserProgress | null): UserProgress {
  const completedLevels = mergeLevels(a?.completedLevels, b?.completedLevels);
  const dailyScores = mergeDailyScores(a?.dailyScores, b?.dailyScores);
  return {
    completedLevels,
    totalScore: computeTotal({ completedLevels, dailyScores }),
    currentLevel: Math.max(level(a), level(b)),
    seenPuzzleIds: mergeSeen(a?.seenPuzzleIds, b?.seenPuzzleIds),
    ...(Object.keys(dailyScores).length > 0 ? { dailyScores } : {}),
    ...mergeDaily(a, b),
    ...settings(a, b),
  };
}

/** Deux copies du même compte (la copie de l'appareil et son document en ligne). */
export function mergeSameAccount(local: UserProgress | null, remote: UserProgress | null): UserProgress | null {
  if (!local && !remote) return null;
  return combine(local, remote);
}

/**
 * Progression d'un compte anonyme versée dans un compte Google existant.
 * Les réglages de l'appareil (compte anonyme) l'emportent, ce sont ceux que le joueur utilise.
 */
export function mergeAccounts(anonymous: UserProgress | null, google: UserProgress | null): UserProgress {
  return combine(anonymous, google);
}

// ---------------------------------------------------------------------------
// Transfert
// ---------------------------------------------------------------------------

export const TRANSFER_KEY = "wordtiles_account_transfer";

export type TransferStep = "switching" | "merging" | "cleanup";

export interface TransferRecord {
  v: 1;
  /** Identifiant aléatoire du transfert, écrit dans users/G avec la fusion : une reprise ne fusionne jamais deux fois. */
  id: string;
  anonUid: string;
  /** Compte Google destinataire, enregistré dès qu'il est connu. Une reprise n'écrit que vers ce compte. */
  targetUid: string | null;
  step: TransferStep;
  /** Copie locale de U au départ ; effacée une fois la fusion confirmée. */
  anonLocal: UserProgress | null;
  /** Jeton de renouvellement de U : seul moyen de vérifier que U est supprimé quand sa session ne fonctionne plus. */
  anonRefreshToken?: string | null;
}

/** Le compte anonyme n'existe plus, confirmé par Firebase (refreshProvesDeletion). */
export class AnonymousAccountGone extends Error {
  constructor(cause?: unknown) {
    super("Compte anonyme supprimé");
    this.cause = cause;
  }
}

/**
 * Réponse d'erreur du renouvellement de session (securetoken, `error.message`) qui prouve la suppression
 * du compte : USER_NOT_FOUND seulement. Le SDK, lui, rapporte aussi bien un compte supprimé qu'une session
 * expirée ou révoquée en `auth/user-token-expired` : ce code ne prouve rien. TOKEN_EXPIRED (session
 * révoquée), USER_DISABLED, INVALID_REFRESH_TOKEN ou une erreur réseau laissent le nettoyage en attente.
 */
export function refreshProvesDeletion(message: unknown): boolean {
  return typeof message === "string" && /^USER_NOT_FOUND(?![A-Z_])/.test(message);
}

/**
 * users/G après une fusion : identifiant du dernier transfert, et comptes anonymes fusionnés
 * (retrouvés par scripts/delete-account.mjs quand G est supprimé, même si seul leur compte Auth reste).
 */
export type TargetProgress = UserProgress & { lastTransferId?: string; transferredFrom?: string[] };

export interface TransferOps {
  /** Uid de la session principale. */
  currentUid(): string | null;
  /** Seconde session : document users/U (null s'il n'existe pas). Lève AnonymousAccountGone si U est supprimé. */
  readAnonymous(anonUid: string): Promise<UserProgress | null>;
  /** Seconde session : marque users/U comme transféré vers G (pour la suppression de G par le support). */
  markAnonymous(anonUid: string, targetUid: string): Promise<void>;
  /** Session principale : users/G lu depuis le serveur. */
  readTarget(targetUid: string): Promise<TargetProgress | null>;
  /** Session principale : écrit la fusion, l'identifiant du transfert et transferredFrom dans users/G. */
  writeTarget(targetUid: string, progress: TargetProgress, transferId: string): Promise<void>;
  /** Copie locale de la fusion, rattachée à G. */
  saveLocal(targetUid: string, progress: UserProgress): void;
  /** Seconde session : supprime users/U. */
  deleteAnonymousDoc(anonUid: string): Promise<void>;
  /** Seconde session : supprime le compte Auth U. */
  deleteAnonymousAuth(anonUid: string): Promise<void>;
  /** Seconde session : oublie U sans le supprimer (transfert abandonné avant la connexion à G). */
  releaseAnonymous(): Promise<void>;
}

export interface TransferStore {
  load(): TransferRecord | null;
  save(record: TransferRecord | null): void;
}

export type TransferOutcome =
  | "none" // aucun transfert en cours
  | "done" // fusion confirmée et compte anonyme supprimé
  | "abandoned" // la connexion à G n'a pas eu lieu : U reste le compte de l'appareil
  | "anonymous-gone" // U a été supprimé (par le support) : sa progression n'est pas versée dans G
  | "waiting" // le compte destinataire n'est pas connecté : rien n'est fait
  | "failed"; // erreur : tout est gardé, reprise au prochain lancement

function stripTransferFields(progress: TargetProgress | null): UserProgress | null {
  if (!progress) return null;
  const copy: Record<string, unknown> = { ...progress };
  delete copy.lastTransferId;
  delete copy.transferredTo;
  delete copy.transferredFrom;
  delete copy.updatedAt;
  return copy as unknown as UserProgress;
}

/**
 * Fait avancer le transfert enregistré aussi loin que possible. Sans danger à rappeler :
 * chaque étape est idempotente, et l'enregistrement n'avance qu'après la réussite de l'étape.
 */
export async function runTransfer(ops: TransferOps, store: TransferStore): Promise<TransferOutcome> {
  let record = store.load();
  if (!record) return "none";
  const update = (patch: Partial<TransferRecord>) => {
    record = { ...(record as TransferRecord), ...patch };
    store.save(record);
  };

  try {
    if (record.step === "switching") {
      const uid = ops.currentUid();
      // Toujours connecté à U : la connexion à G n'a pas eu lieu.
      if (uid === record.anonUid) {
        await ops.releaseAnonymous();
        store.save(null);
        return "abandoned";
      }
      // Destinataire inconnu : on ne fusionne vers personne. U et sa copie restent intacts.
      if (!record.targetUid || uid !== record.targetUid) return "waiting";
      update({ step: "merging" });
    }

    if (record.step === "merging") {
      const targetUid = record.targetUid as string;
      if (ops.currentUid() !== targetUid) return "waiting";

      let target = await ops.readTarget(targetUid);
      if (target?.lastTransferId !== record.id) {
        let anonRemote: UserProgress | null;
        try {
          await ops.markAnonymous(record.anonUid, targetUid);
          anonRemote = stripTransferFields(await ops.readAnonymous(record.anonUid));
        } catch (error) {
          if (!(error instanceof AnonymousAccountGone)) throw error;
          // U supprimé entre-temps : sa progression ne doit pas revenir sous G.
          store.save(null);
          return "anonymous-gone";
        }
        const merged = mergeAccounts(mergeSameAccount(record.anonLocal, anonRemote), stripTransferFields(target));
        const from = Array.isArray(target?.transferredFrom) ? target.transferredFrom.filter((uid) => typeof uid === "string") : [];
        const transferredFrom = [...new Set([...from, record.anonUid])];
        await ops.writeTarget(targetUid, { ...merged, transferredFrom }, record.id);
        target = await ops.readTarget(targetUid);
        if (target?.lastTransferId !== record.id) throw new Error("Fusion non confirmée par le serveur");
      }
      if (!target?.transferredFrom?.includes(record.anonUid)) throw new Error("Fusion non confirmée par le serveur");
      ops.saveLocal(targetUid, stripTransferFields(target) as UserProgress);
      update({ step: "cleanup", anonLocal: null });
    }

    if (record.step === "cleanup") {
      try {
        await ops.deleteAnonymousDoc(record.anonUid);
        await ops.deleteAnonymousAuth(record.anonUid);
      } catch (error) {
        // Session expirée ou révoquée, réseau, droits : le nettoyage reste en attente (enregistrement gardé).
        if (!(error instanceof AnonymousAccountGone)) throw error;
        // Suppression confirmée par Firebase (par nous avant une coupure, ou par le support) : plus rien à nettoyer.
      }
      store.save(null);
      return "done";
    }
    return "failed";
  } catch (error) {
    console.warn("Transfert de compte : reprise au prochain lancement", error);
    return "failed";
  }
}

/** Uid du compte destinataire, enregistré dès que la session principale y est connectée. */
export function recordTarget(store: TransferStore, uid: string | null) {
  const record = store.load();
  if (record && record.step === "switching" && !record.targetUid && uid && uid !== record.anonUid) {
    store.save({ ...record, targetUid: uid });
  }
}

export function newTransferRecord(anonUid: string, anonLocal: UserProgress | null, id: string, anonRefreshToken: string | null = null): TransferRecord {
  return { v: 1, id, anonUid, targetUid: null, step: "switching", anonLocal, anonRefreshToken };
}

/** Enregistrement sur l'appareil (localStorage). */
export const localTransferStore: TransferStore = {
  load() {
    try {
      const raw = localStorage.getItem(TRANSFER_KEY);
      const record = raw ? (JSON.parse(raw) as TransferRecord) : null;
      return record?.v === 1 && typeof record.anonUid === "string" ? record : null;
    } catch {
      return null;
    }
  },
  save(record) {
    try {
      if (record) localStorage.setItem(TRANSFER_KEY, JSON.stringify(record));
      else localStorage.removeItem(TRANSFER_KEY);
    } catch {}
  },
};
