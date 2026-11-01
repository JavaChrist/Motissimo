"use client";

import { useEffect, useState, useCallback } from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

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
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch {}
  }, []);

  return { user, loading, signInWithGoogle, isConfigured: isFirebaseConfigured() };
}
