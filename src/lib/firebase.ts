import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
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

/** Émulateurs locaux (tests uniquement) : NEXT_PUBLIC_FIREBASE_EMULATORS=1 au moment du build ou de `next dev`. */
const USE_EMULATORS = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";

function connectEmulators(auth: Auth | null, db: Firestore | null) {
  if (!USE_EMULATORS) return;
  if (auth) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  if (db) connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function getFirebaseApp() {
  if (!app) {
    app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    connectEmulators(auth, null);
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
    connectEmulators(null, db);
  }
  return db;
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey !== "demo-key";
}

/**
 * Seconde session Firebase, enregistrée sur l'appareil : elle garde le compte anonyme pendant un
 * passage vers un compte Google qui existe déjà, jusqu'à la suppression de ce compte anonyme.
 */
export const TRANSFER_APP = "account-transfer";

export interface TransferSession {
  auth: Auth;
  db: Firestore;
}

/** Point de renouvellement des sessions Firebase (securetoken), émulateur compris. */
export function secureTokenEndpoint(): string {
  const base = USE_EMULATORS ? "http://127.0.0.1:9099/securetoken.googleapis.com" : "https://securetoken.googleapis.com";
  return `${base}/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
}

let transfer: Promise<TransferSession> | null = null;

export function getTransferSession(): Promise<TransferSession> {
  transfer ??= (async () => {
    const app2 = getApps().find((a) => a.name === TRANSFER_APP) ?? initializeApp(firebaseConfig, TRANSFER_APP);
    let auth2: Auth;
    try {
      auth2 = initializeAuth(app2, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
    } catch {
      auth2 = getAuth(app2);
    }
    const db2 = getFirestore(app2);
    connectEmulators(auth2, db2);
    await auth2.authStateReady();
    return { auth: auth2, db: db2 };
  })();
  return transfer;
}
