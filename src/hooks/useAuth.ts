"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reload,
  signInWithCredential,
  signInWithPopup,
  updateCurrentUser,
  updateProfile,
  type Auth,
  type AuthCredential,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseAuthReady, getTransferSession, isFirebaseConfigured } from "@/lib/firebase";
import { isNativeApp } from "@/lib/platform";
import { beginAccountSwitch, cancelAccountSwitch, PROGRESS_KEY, reconcileOwner } from "@/lib/progress-owner";
import { localTransferStore, newTransferRecord, recordTarget } from "@/lib/account-transfer";
import { continueTransfer, hasPendingTransfer } from "@/lib/account-transfer-firebase";
import type { UserProgress } from "@/lib/firebase-db";

/** Erreurs par lesquelles Firebase signale un compte supprimé ou désactivé. */
const INVALIDATED = new Set(["auth/user-token-expired", "auth/user-disabled", "auth/user-not-found"]);

/** Le compte Google est déjà lié à un autre compte Firebase : la liaison est impossible. */
const ALREADY_LINKED = new Set(["auth/credential-already-in-use", "auth/email-already-in-use"]);

function codeOf(error: unknown): string {
  return (error as { code?: string } | null)?.code ?? "";
}

function readLocalCopy(): UserProgress | null {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null") as UserProgress | null;
  } catch {
    return null;
  }
}

function transferId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Connexion Google native (la popup Firebase ne fonctionne pas dans une WebView). Null si annulée. */
async function nativeGoogleCredential(): Promise<AuthCredential | null> {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  return idToken ? GoogleAuthProvider.credential(idToken) : null;
}

export function useAuth() {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  // Après une liaison, l'objet User est le même : ce compteur fait relire son nom et son type.
  const [, setRevision] = useState(0);

  const signingIn = useRef(false);
  // Pendant un transfert, le compte n'est pas publié : la progression n'est lue qu'une fois la fusion faite.
  const holding = useRef(false);
  // Connexion au compte Google destinataire en cours : son uid est enregistré dès qu'il est connu.
  const switching = useRef(false);

  const publish = useCallback((auth: Auth) => {
    const u = auth.currentUser;
    // Avant toute lecture de la progression : une copie d'un autre compte ne doit jamais être envoyée.
    reconcileOwner(u?.uid ?? null);
    setUser(u);
    setLoading(false);
    setRevision((r) => r + 1);
  }, []);

  useEffect(() => {
    if (!configured) return;

    let unsub = () => {};
    let cancelled = false;
    getFirebaseAuthReady().then((auth) => {
      if (cancelled) return;
      holding.current = hasPendingTransfer();
      unsub = onAuthStateChanged(auth, (u) => {
        if (switching.current) recordTarget(localTransferStore, u?.uid ?? null);
        if (holding.current) return;
        reconcileOwner(u?.uid ?? null);
        setUser(u);
        setLoading(false);
      });

      // On attend la session enregistrée : connexion anonyme seulement s'il n'y a personne,
      // sinon on écraserait le compte Google à chaque lancement.
      auth
        .authStateReady()
        .then(async () => {
          if (holding.current) {
            // Transfert interrompu (coupure, fermeture de l'application) : on le termine avant de lire la progression.
            await continueTransfer().catch(() => undefined);
            holding.current = false;
            if (cancelled) return;
            publish(auth);
          }
          if (!auth.currentUser) await signInAnonymously(auth);
        })
        .catch(() => setLoading(false));
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [configured, publish]);

  /**
   * Le compte Google a déjà son propre compte Firebase : la progression du compte anonyme y est fusionnée,
   * confirmée par le serveur, puis le compte anonyme et ses données sont supprimés. Chaque étape est
   * enregistrée sur l'appareil et reprise au lancement suivant en cas d'échec ou de coupure.
   */
  const transferTo = useCallback(
    async (auth: Auth, anonymous: User, credential: AuthCredential) => {
      if (hasPendingTransfer()) {
        await continueTransfer();
        if (hasPendingTransfer()) throw new Error("Un transfert de compte précédent n'est pas terminé");
      }
      localTransferStore.save(newTransferRecord(anonymous.uid, readLocalCopy(), transferId(), anonymous.refreshToken));
      holding.current = true;
      try {
        // La seconde session garde le compte anonyme, pour le supprimer une fois la fusion confirmée.
        const { auth: transferAuth } = await getTransferSession();
        await updateCurrentUser(transferAuth, anonymous);
        switching.current = true;
        try {
          await signInWithCredential(auth, credential);
        } finally {
          switching.current = false;
        }
        recordTarget(localTransferStore, auth.currentUser?.uid ?? null);
      } finally {
        // Connexion échouée : toujours sur le compte anonyme, le transfert est abandonné et rien n'est supprimé.
        await continueTransfer().catch(() => undefined);
        holding.current = false;
        publish(auth);
      }
    },
    [publish]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured() || signingIn.current) return;
    signingIn.current = true;
    const auth = getFirebaseAuth();
    try {
      // Le compte actuel doit encore exister. Supprimé : Firebase le déconnecte ici, et la copie locale est effacée.
      let from = auth.currentUser;
      if (from) {
        try {
          await reload(from);
        } catch (error) {
          if (!INVALIDATED.has(codeOf(error))) throw error;
          from = null;
        }
      }

      if (from?.isAnonymous) {
        // Compte anonyme : on lui lie Google. Il garde son uid et sa progression, rien n'est transféré.
        const anonymous = from;
        let credential: AuthCredential | null = null;
        try {
          if (isNativeApp()) {
            credential = await nativeGoogleCredential();
            if (!credential) return;
            await linkWithCredential(anonymous, credential);
          } else {
            await linkWithPopup(anonymous, new GoogleAuthProvider());
          }
          // Une liaison ne reprend pas le nom du compte Google, contrairement à une connexion : on le recopie.
          const google = anonymous.providerData.find((p) => p.providerId === GoogleAuthProvider.PROVIDER_ID);
          if (!anonymous.displayName && google?.displayName) {
            const photoURL = anonymous.photoURL ?? google.photoURL;
            await updateProfile(anonymous, photoURL ? { displayName: google.displayName, photoURL } : { displayName: google.displayName }).catch(
              () => undefined
            );
          }
          publish(auth);
          return;
        } catch (error) {
          if (!ALREADY_LINKED.has(codeOf(error))) throw error;
          credential ??= GoogleAuthProvider.credentialFromError(error as never);
          if (!credential) throw error;
        }
        await transferTo(auth, anonymous, credential);
        return;
      }

      // Compte Google (changement de compte) ou aucun compte : la copie locale suit le compte vérifié.
      if (from) beginAccountSwitch(from.uid);
      if (isNativeApp()) {
        const credential = await nativeGoogleCredential();
        if (!credential) {
          cancelAccountSwitch();
          return;
        }
        await signInWithCredential(auth, credential);
        return;
      }
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      cancelAccountSwitch();
      console.warn("Connexion Google impossible", error);
    } finally {
      signingIn.current = false;
    }
  }, [publish, transferTo]);

  return { user, loading, signInWithGoogle, isConfigured: isFirebaseConfigured() };
}
