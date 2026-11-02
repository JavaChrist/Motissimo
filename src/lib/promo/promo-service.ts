import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { isAdult } from "./age-gate";
import {
  CATALOG_STALE_MAX_MS,
  CATALOG_TTL_MS,
  COOLDOWN_MS,
  FETCH_TIMEOUT_MS,
  MAX_DURATION_MS,
  PLAY_STORE_HOST,
  PROMO_LOCALE,
  type Promo,
} from "./types";

const SHOWN_KEY = "promo_last_shown";
const CATALOG_KEY = "promo_catalog_";

interface LastShown {
  id: string;
  at: number;
}

interface CachedCatalog {
  fetchedAt: number;
  campaigns: Promo[];
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function markPromoShown(id: string) {
  writeJson(SHOWN_KEY, { id, at: Date.now() } satisfies LastShown);
}

/** Adulte confirmé, connexion disponible et délai minimum écoulé. */
export function canShowPromo(): boolean {
  if (!isAdult() || !navigator.onLine || !isFirebaseConfigured()) return false;
  const last = readJson<LastShown>(SHOWN_KEY);
  return !last || Date.now() - last.at >= COOLDOWN_MS;
}

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.hostname : null;
  } catch {
    return null;
  }
}

/** Revalidée juste avant l'affichage : le serveur filtre déjà, le client revérifie l'essentiel. */
export function isEligible(promo: Promo, now = Date.now()): boolean {
  if (promo.audience !== "adult" || promo.locale !== PROMO_LOCALE) return false;
  if (!hostOf(promo.videoUrl)) return false;
  if (hostOf(promo.destinationUrl) !== PLAY_STORE_HOST) return false;
  if (!(promo.durationMs > 0 && promo.durationMs <= MAX_DURATION_MS)) return false;
  if (promo.startsAt && Date.parse(promo.startsAt) > now) return false;
  if (promo.endsAt && Date.parse(promo.endsAt) <= now) return false;
  return true;
}

function isPromo(value: Partial<Promo>): value is Promo {
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.audience === "string" &&
    typeof value.locale === "string" &&
    typeof value.videoUrl === "string" &&
    typeof value.durationMs === "number" &&
    typeof value.destinationUrl === "string"
  );
}

async function fetchCatalog(sourceAppId: string): Promise<Promo[]> {
  const snap = await getDoc(doc(getFirebaseDb(), "public_catalogs", sourceAppId));
  const list = snap.data()?.campaigns;
  if (!Array.isArray(list)) return [];
  return list.filter(isPromo).map((item) => ({ ...item, weight: Math.max(1, Number(item.weight) || 1) }));
}

async function loadCampaigns(sourceAppId: string): Promise<Promo[]> {
  const key = CATALOG_KEY + sourceAppId;
  const cached = readJson<CachedCatalog>(key);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (cached && age < CATALOG_TTL_MS) return cached.campaigns;

  try {
    const fresh = await Promise.race([
      fetchCatalog(sourceAppId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FETCH_TIMEOUT_MS)),
    ]);
    if (fresh) {
      writeJson(key, { fetchedAt: Date.now(), campaigns: fresh } satisfies CachedCatalog);
      return fresh;
    }
  } catch {}
  return cached && age < CATALOG_STALE_MAX_MS ? cached.campaigns : [];
}

/** Tirage pondéré, sans rejouer la campagne précédente quand il y en a une autre. */
export async function pickPromo(sourceAppId: string): Promise<Promo | null> {
  const eligible = (await loadCampaigns(sourceAppId)).filter((promo) => isEligible(promo));
  if (eligible.length === 0) return null;
  const lastId = readJson<LastShown>(SHOWN_KEY)?.id;
  const pool = eligible.length > 1 ? eligible.filter((promo) => promo.id !== lastId) : eligible;
  let ticket = Math.random() * pool.reduce((sum, promo) => sum + promo.weight, 0);
  for (const promo of pool) {
    ticket -= promo.weight;
    if (ticket < 0) return promo;
  }
  return pool[pool.length - 1];
}
