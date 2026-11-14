/**
 * Opérations Firebase du passage d'un compte anonyme vers un compte Google existant
 * (logique et règles dans account-transfer.ts, testées par tests/account-transfer.test.mjs).
 *
 * - Session principale : le compte Google G (lecture et écriture de users/G).
 * - Seconde session (getTransferSession) : le compte anonyme U, gardé jusqu'à sa suppression.
 *
 * « Compte supprimé » n'est retenu que sur une réponse de Firebase qui le dit (compte introuvable,
 * session invalidée). Une erreur réseau, un refus d'accès ou une session absente est une erreur :
 * le transfert est gardé et repris au lancement suivant.
 */
import { deleteUser, signOut, type User } from "firebase/auth";
import { deleteDoc, doc, getDocFromServer, serverTimestamp, setDoc } from "firebase/firestore";
import type { UserProgress } from "./firebase-db";
import { getFirebaseAuth, getFirebaseDb, getTransferSession } from "./firebase";
import { storeLocalCopy } from "./progress-owner";
import {
  AnonymousAccountGone,
  isAccountGoneError,
  localTransferStore,
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

/** Erreur d'un appel Auth : « supprimé » seulement si Firebase le dit. */
function mapAuthError(error: unknown): never {
  throw isAccountGoneError(error) ? new AnonymousAccountGone(error) : error;
}

/** Session anonyme U de la seconde app, avec un jeton renouvelé (qui échoue si U n'existe plus). */
async function anonymousUser(anonUid: string): Promise<User> {
  const session = await getTransferSession();
  const user = session.auth.currentUser;
  if (user?.uid === anonUid) {
    await withTimeout(user.getIdToken(true), "Session anonyme").catch(mapAuthError);
    return user;
  }
  // La session était enregistrée, et Firebase l'a effacée à l'initialisation : il ne le fait que si le
  // compte n'existe plus ou est désactivé (une erreur réseau la garde). L'application ne désactive aucun compte.
  if (!user && session.persistedBefore === anonUid) throw new AnonymousAccountGone();
  // Session absente (données effacées) ou autre compte : on ne sait rien de U, ce n'est pas un nettoyage terminé.
  throw Object.assign(new Error("Session anonyme introuvable sur l'appareil"), { code: "transfer/session-missing" });
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
