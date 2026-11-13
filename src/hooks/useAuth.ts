"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { isNativeApp } from "@/lib/platform";

export function useAuth() {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  const signingIn = useRef(false);

  useEffect(() => {
    if (!configured) return;

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // On attend la session enregistrée : connexion anonyme seulement s'il n'y a personne,
    // sinon on écraserait le compte Google à chaque lancement.
    auth
      .authStateReady()
      .then(() => (auth.currentUser ? undefined : signInAnonymously(auth)))
      .catch(() => setLoading(false));

    return unsub;
  }, [configured]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured() || signingIn.current) return;
    signingIn.current = true;
    const auth = getFirebaseAuth();
    try {
      if (isNativeApp()) {
        // La fenêtre popup de Firebase ne fonctionne pas dans une WebView : connexion Google native.
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) return;
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        return;
      }
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.warn("Connexion Google impossible", error);
    } finally {
      signingIn.current = false;
    }
  }, []);

  return { user, loading, signInWithGoogle, isConfigured: isFirebaseConfigured() };
}
