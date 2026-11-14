import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { claimLegacyCopy } from "./progress-owner";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "word-tiles-demo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function getFirebaseApp() {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

/**
 * Auth, une fois la copie locale d'une ancienne version rattachée à son compte : à l'initialisation,
 * Firebase efface la session d'un compte supprimé, et son uid ne serait plus lisible.
 */
export async function getFirebaseAuthReady(): Promise<Auth> {
  await claimLegacyCopy(firebaseConfig.apiKey);
  return getFirebaseAuth();
}

export function getFirebaseDb() {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey !== "demo-key";
}
