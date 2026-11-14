/**
 * Opérations Firebase du passage d'un compte anonyme vers un compte Google existant
 * (logique et règles dans account-transfer.ts, testées par tests/account-transfer.test.mjs).
 *
 * - Session principale : le compte Google G (lecture et écriture de users/G).
 * - Seconde session (getTransferSession) : le compte anonyme U, gardé jusqu'à sa suppression.
 *
 * « Compte supprimé » n'est retenu que sur une réponse de Firebase qui le prouve : le renouvellement de la
 * session de U, avec son jeton enregistré, répond USER_NOT_FOUND (refreshProvesDeletion). Le code du SDK
 * `auth/user-token-expired` ne suffit pas : une session expirée ou révoquée le donne aussi, compte existant.
 * Une erreur réseau, un refus d'accès, une session révoquée ou absente est une erreur : le transfert est
 * gardé (nettoyage en attente) et repris au lancement suivant.
 */
import { deleteUser, signOut, type User } from "firebase/auth";
import { deleteDoc, doc, getDocFromServer, serverTimestamp, setDoc } from "firebase/firestore";
import type { UserProgress } from "./firebase-db";
import { getFirebaseAuth, getFirebaseDb, getTransferSession, secureTokenEndpoint } from "./firebase";
import { storeLocalCopy } from "./progress-owner";
import {
  AnonymousAccountGone,
  localTransferStore,
  refreshProvesDeletion,
  runTransfer,
  type TargetProgress,
  type TransferOps,
  type TransferOutcome,
} from "./account-transfer";

/** Délai d'une opération réseau : hors ligne, une écriture Firestore peut attendre indéfiniment. */
const TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error(`${what} : délai dépassé`), { code: "deadline-exceeded" })), TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Erreurs du SDK où la session de U ne fonctionne plus : compte supprimé, ou session expirée, révoquée, désactivée. */
const SESSION_ERRORS = new Set(["auth/user-token-expired", "auth/user-not-found", "auth/user-disabled", "auth/invalid-user-token"]);

const codeOf = (error: unknown) => (error as { code?: string } | null)?.code ?? "";

/**
 * Renouvelle la session de U avec son jeton enregistré : vrai seulement si Firebase répond que le compte
 * n'existe pas. Pas de jeton, réseau, session révoquée (TOKEN_EXPIRED), compte désactivé : faux.
 */
async function anonymousDeletionConfirmed(): Promise<boolean> {
  const token = localTransferStore.load()?.anonRefreshToken;
  if (!token) return false;
  try {
    const response = await withTimeout(
      fetch(secureTokenEndpoint(), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token }).toString(),
      }),
      "Vérification du compte anonyme"
    );
    if (response.ok) return false;
    const body = (await response.json().catch(() => null)) as { error?: { message?: unknown } } | null;
    return refreshProvesDeletion(body?.error?.message);
  } catch {
    return false;
  }
}

/** Erreur d'un appel Auth sur U : « supprimé » seulement si Firebase le confirme, sinon l'erreur telle quelle. */
async function mapAuthError(error: unknown): Promise<never> {
  if (SESSION_ERRORS.has(codeOf(error)) && (await anonymousDeletionConfirmed())) throw new AnonymousAccountGone(error);
  throw error;
}

/** Session anonyme U de la seconde app, avec un jeton renouvelé. */
async function anonymousUser(anonUid: string): Promise<User> {
  const session = await getTransferSession();
  const user = session.auth.currentUser;
  if (user?.uid === anonUid) {
    await withTimeout(user.getIdToken(true), "Session anonyme").catch(mapAuthError);
    return user;
  }
  // Session absente : Firebase l'efface quand elle ne fonctionne plus (compte supprimé, session révoquée…),
  // ou les données de l'application ont été effacées. Seule la vérification par le jeton enregistré tranche.
  if (!user && (await anonymousDeletionConfirmed())) throw new AnonymousAccountGone();
  throw Object.assign(new Error("Session anonyme indisponible : nettoyage en attente"), { code: "transfer/session-missing" });
}

export function firebaseTransferOps(): TransferOps {
  const auth = getFirebaseAuth();
  return {
    currentUid: () => auth.currentUser?.uid ?? null,

    async readAnonymous(anonUid) {
      await anonymousUser(anonUid);
      const { db } = await getTransferSession();
      const snap = await withTimeout(getDocFromServer(doc(db, "users", anonUid)), "Lecture de users/U");
      return snap.exists() ? (snap.data() as UserProgress) : null;
    },

    async markAnonymous(anonUid, targetUid) {
      await anonymousUser(anonUid);
      const { db } = await getTransferSession();
      await withTimeout(setDoc(doc(db, "users", anonUid), { transferredTo: targetUid }, { merge: true }), "Marque de users/U");
    },

    async readTarget(targetUid) {
      const snap = await withTimeout(getDocFromServer(doc(getFirebaseDb(), "users", targetUid)), "Lecture de users/G");
      return snap.exists() ? (snap.data() as TargetProgress) : null;
    },

    async writeTarget(targetUid, progress, transferId) {
      await withTimeout(
        setDoc(doc(getFirebaseDb(), "users", targetUid), { ...progress, lastTransferId: transferId, updatedAt: serverTimestamp() }),
        "Écriture de users/G"
      );
    },

    saveLocal(targetUid, progress) {
      storeLocalCopy(targetUid, progress);
    },

    async deleteAnonymousDoc(anonUid) {
      await anonymousUser(anonUid);
      const { db } = await getTransferSession();
      await withTimeout(deleteDoc(doc(db, "users", anonUid)), "Suppression de users/U");
      // Confirmé par une lecture serveur : une écriture en attente ne compte pas.
      const snap = await withTimeout(getDocFromServer(doc(db, "users", anonUid)), "Vérification de users/U");
      if (snap.exists()) throw new Error("users/U toujours présent");
    },

    async deleteAnonymousAuth(anonUid) {
      const user = await anonymousUser(anonUid);
      await withTimeout(deleteUser(user), "Suppression du compte anonyme").catch(mapAuthError);
    },

    async releaseAnonymous() {
      const { auth: auth2 } = await getTransferSession();
      if (auth2.currentUser) await signOut(auth2);
    },
  };
}

/** Transfert enregistré sur l'appareil, à reprendre. */
export function hasPendingTransfer(): boolean {
  return localTransferStore.load() !== null;
}

/** Fait avancer le transfert en cours. Une fois terminé ou abandonné, la seconde session est oubliée. */
export async function continueTransfer(): Promise<TransferOutcome> {
  const outcome = await runTransfer(firebaseTransferOps(), localTransferStore);
  if (!localTransferStore.load()) {
    try {
      const { auth: auth2 } = await getTransferSession();
      if (auth2.currentUser) await signOut(auth2);
    } catch {}
  }
  return outcome;
}
