import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import { discardLocalProgress, PROGRESS_KEY } from "./progress-owner";
import { computeTotal, withTotal } from "./score";

export interface UserProgress {
  completedLevels: Record<string, { stars: number; score: number; bestTime: number }>;
  /** Toujours recalculé (score.ts) : meilleurs scores des niveaux + points du défi du jour, une fois par date. */
  totalScore: number;
  /** Ancien compteur global d'Idées, plus utilisé : les Idées sont comptées par partie (GameState). */
  hintsRemaining?: number;
  currentLevel: number;
  seenPuzzleIds?: string[];
  childMode?: boolean;
  showCounts?: boolean;
  soundEnabled?: boolean;
  dailyStreak?: number;
  dailyLastDate?: string;
  /** Points du défi du jour par date (AAAA-MM-JJ, heure de Paris) : un seul score par date. */
  dailyScores?: Record<string, number>;
}

const DEFAULT_PROGRESS: UserProgress = {
  completedLevels: {},
  totalScore: 0,
  currentLevel: 1,
};

export function countsAreVisible(progress: UserProgress | null): boolean {
  if (!progress) return false;
  if (typeof progress.showCounts === "boolean") return progress.showCounts;
  return progress.childMode === true;
}

export function soundIsOn(progress: UserProgress | null): boolean {
  return progress?.soundEnabled !== false;
}

const LOCAL_KEY = PROGRESS_KEY;

/**
 * Accès refusé à son propre document : la suppression du compte est en cours (marque
 * deleted_accounts/{uid}, voir firestore.rules). La copie locale de ce compte est alors effacée.
 */
function isAccountBeingDeleted(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "permission-denied";
}

function getLocalProgress(): UserProgress {
  if (typeof window === "undefined") return { ...DEFAULT_PROGRESS };
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return withTotal(JSON.parse(raw) as UserProgress);
  } catch {}
  return { ...DEFAULT_PROGRESS };
}

function saveLocalProgress(progress: UserProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
}

export async function loadProgress(uid: string | null): Promise<UserProgress> {
  const local = getLocalProgress();

  if (!uid || !isFirebaseConfigured()) return local;

  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const stored = snap.data() as UserProgress;
      const remote = withTotal(stored);
      if (remote.totalScore >= local.totalScore) {
        saveLocalProgress(remote);
        // Ancien total cumulé (rejeux compris) : remplacé en ligne par le total recalculé.
        if (stored.totalScore !== remote.totalScore) {
          await setDoc(ref, { totalScore: remote.totalScore, updatedAt: serverTimestamp() }, { merge: true }).catch((error) => {
            if (isAccountBeingDeleted(error)) throw error;
          });
        }
        return remote;
      }
    }
    await setDoc(ref, { ...local, updatedAt: serverTimestamp() }, { merge: true });
    return local;
  } catch (error) {
    if (isAccountBeingDeleted(error)) {
      discardLocalProgress();
      return { ...DEFAULT_PROGRESS };
    }
    return local;
  }
}

export async function saveProgress(uid: string | null, next: UserProgress) {
  const progress = { ...next, totalScore: computeTotal(next) };
  saveLocalProgress(progress);

  if (!uid || !isFirebaseConfigured()) return;

  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...progress, updatedAt: serverTimestamp() }).catch((error) => {
      if (isAccountBeingDeleted(error)) throw error;
      return setDoc(ref, { ...progress, updatedAt: serverTimestamp() });
    });
  } catch (error) {
    if (isAccountBeingDeleted(error)) discardLocalProgress();
  }
}
