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
 * Une erreur (réseau, droits, session) n'est jamais prise pour un nettoyage terminé : seul un compte
 * anonyme réellement supprimé (AnonymousAccountGone) termine le transfert sans l'avoir fait soi-même.
 *
 * Aucune importation à l'exécution : ce module est testé tel quel par Node (tests/account-transfer.test.mjs).
 */
import type { UserProgress } from "./firebase-db";

// ---------------------------------------------------------------------------
// Fusion de deux progressions
// ---------------------------------------------------------------------------

type LevelResult = UserProgress["completedLevels"][string];

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Réussite valide : 1 à 3 étoiles, score et temps finis et positifs (le jeu n'enregistre un niveau qu'une fois réussi). */
export function isValidResult(result: unknown): result is LevelResult {
  const r = result as Partial<LevelResult> | null;
  return (
    !!r &&
    finite(r.stars) && r.stars >= 1 && r.stars <= 3 &&
    finite(r.score) && r.score >= 0 &&
    finite(r.bestTime) && r.bestTime >= 0
  );
}

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

const total = (p: UserProgress | null) => (finite(p?.totalScore) && (p?.totalScore ?? 0) >= 0 ? (p?.totalScore as number) : 0);
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

function combine(a: UserProgress | null, b: UserProgress | null, totalScore: number): UserProgress {
  return {
    completedLevels: mergeLevels(a?.completedLevels, b?.completedLevels),
    totalScore,
    currentLevel: Math.max(level(a), level(b)),
    seenPuzzleIds: mergeSeen(a?.seenPuzzleIds, b?.seenPuzzleIds),
    ...mergeDaily(a, b),
    ...settings(a, b),
  };
}

/**
 * Deux copies du même compte (la copie de l'appareil et son document en ligne) : le score total est
 * un cumul, la copie la plus avancée le contient déjà.
 */
export function mergeSameAccount(local: UserProgress | null, remote: UserProgress | null): UserProgress | null {
  if (!local && !remote) return null;
  return combine(local, remote, Math.max(total(local), total(remote)));
}

/**
 * Progression d'un compte anonyme versée dans un compte Google existant : les cumuls s'additionnent.
 * Les réglages de l'appareil (compte anonyme) l'emportent, ce sont ceux que le joueur utilise.
 */
export function mergeAccounts(anonymous: UserProgress | null, google: UserProgress | null): UserProgress {
  return combine(anonymous, google, total(anonymous) + total(google));
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
}

/** Le compte anonyme n'existe plus : Firebase répond que le compte est introuvable ou sa session invalidée. */
export class AnonymousAccountGone extends Error {
  constructor(cause?: unknown) {
    super("Compte anonyme supprimé");
    this.cause = cause;
  }
}

/** Codes Firebase Auth qui signifient « compte supprimé » (USER_NOT_FOUND est renvoyé en user-token-expired au renouvellement). */
const GONE_CODES = new Set(["auth/user-not-found", "auth/user-token-expired"]);

export function isAccountGoneError(error: unknown): boolean {
  return GONE_CODES.has((error as { code?: string } | null)?.code ?? "");
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
        if (!(error instanceof AnonymousAccountGone)) throw error;
        // Déjà supprimé (par nous avant une coupure, ou par le support) : plus rien à nettoyer.
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

export function newTransferRecord(anonUid: string, anonLocal: UserProgress | null, id: string): TransferRecord {
  return { v: 1, id, anonUid, targetUid: null, step: "switching", anonLocal };
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
