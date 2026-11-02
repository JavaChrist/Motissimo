"use client";

import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    if (!configured) return;

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    signInAnonymously(auth).catch(() => setLoading(false));

    return unsub;
  }, [configured]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
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
    } catch {}
  }, []);

  return { user, loading, signInWithGoogle, isConfigured: isFirebaseConfigured() };
}
