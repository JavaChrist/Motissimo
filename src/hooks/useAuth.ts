"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  reload,
  signInWithCredential,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseAuthReady, isFirebaseConfigured } from "@/lib/firebase";
import { isNativeApp } from "@/lib/platform";
import { beginAccountSwitch, cancelAccountSwitch, reconcileOwner } from "@/lib/progress-owner";

/** Erreurs par lesquelles Firebase signale un compte supprimé ou désactivé. */
const INVALIDATED = new Set(["auth/user-token-expired", "auth/user-disabled", "auth/user-not-found"]);

export function useAuth() {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  const signingIn = useRef(false);

  useEffect(() => {
    if (!configured) return;

    let unsub = () => {};
    let cancelled = false;
    getFirebaseAuthReady().then((auth) => {
      if (cancelled) return;
      unsub = onAuthStateChanged(auth, (u) => {
        // Avant toute lecture de la progression : une copie d'un autre compte ne doit jamais être envoyée.
        reconcileOwner(u?.uid ?? null);
        setUser(u);
        setLoading(false);
      });

      // On attend la session enregistrée : connexion anonyme seulement s'il n'y a personne,
      // sinon on écraserait le compte Google à chaque lancement.
      auth
        .authStateReady()
        .then(() => (auth.currentUser ? undefined : signInAnonymously(auth)))
        .catch(() => setLoading(false));
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [configured]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured() || signingIn.current) return;
    signingIn.current = true;
    const auth = getFirebaseAuth();
    try {
      // La progression de l'appareil ne suit vers le compte Google que si le compte actuel existe
      // encore. Supprimé : Firebase le déconnecte ici, et la copie locale est effacée.
      const from = auth.currentUser;
      if (from) {
        try {
          await reload(from);
          beginAccountSwitch(from.uid);
        } catch (error) {
          if (!INVALIDATED.has((error as { code?: string }).code ?? "")) throw error;
        }
      }
      if (isNativeApp()) {
        // La fenêtre popup de Firebase ne fonctionne pas dans une WebView : connexion Google native.
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) {
          cancelAccountSwitch();
          return;
        }
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        return;
      }
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      cancelAccountSwitch();
      console.warn("Connexion Google impossible", error);
    } finally {
      signingIn.current = false;
    }
  }, []);

  return { user, loading, signInWithGoogle, isConfigured: isFirebaseConfigured() };
}
