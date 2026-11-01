import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";

export interface UserProgress {
  completedLevels: Record<string, { stars: number; score: number; bestTime: number }>;
  totalScore: number;
  hintsRemaining: number;
  currentLevel: number;
  seenPuzzleIds?: string[];
  childMode?: boolean;
  showCounts?: boolean;
  soundEnabled?: boolean;
  dailyStreak?: number;
  dailyLastDate?: string;
}

const DEFAULT_PROGRESS: UserProgress = {
  completedLevels: {},
  totalScore: 0,
  hintsRemaining: 5,
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

const LOCAL_KEY = "wordtiles_progress";

function getLocalProgress(): UserProgress {
  if (typeof window === "undefined") return { ...DEFAULT_PROGRESS };
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
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
      const remote = snap.data() as UserProgress;
      if (remote.totalScore >= local.totalScore) {
        saveLocalProgress(remote);
        return remote;
      }
    }
    await setDoc(ref, { ...local, updatedAt: serverTimestamp() }, { merge: true });
    return local;
  } catch {
    return local;
  }
}

export async function saveProgress(uid: string | null, progress: UserProgress) {
  saveLocalProgress(progress);

  if (!uid || !isFirebaseConfigured()) return;

  try {
    const db = getFirebaseDb();
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...progress, updatedAt: serverTimestamp() }).catch(() =>
      setDoc(ref, { ...progress, updatedAt: serverTimestamp() })
    );
  } catch {}
}
