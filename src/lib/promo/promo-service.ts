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

// Anciennes clés (versions 1.0.1 et antérieures) : l'état des promotions restait sur l'appareil.
const LEGACY_SHOWN_KEY = "promo_last_shown";
const LEGACY_CATALOG_PREFIX = "promo_catalog_";

interface LastShown {
  id: string;
  at: number;
}

interface CachedCatalog {
  fetchedAt: number;
  campaigns: Promo[];
}

// En mémoire seulement : rien n'est écrit sur l'appareil, tout repart de zéro à chaque lancement.
let lastShown: LastShown | null = null;
const catalogs = new Map<string, CachedCatalog>();

/** Efface les clés des anciennes versions. Appelé au chargement du module. */
export function removeLegacyPromoKeys() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const key of keys) {
      if (key && (key === LEGACY_SHOWN_KEY || key.startsWith(LEGACY_CATALOG_PREFIX))) localStorage.removeItem(key);
    }
  } catch {}
}

if (typeof window !== "undefined") removeLegacyPromoKeys();

export function markPromoShown(id: string) {
  lastShown = { id, at: Date.now() };
}

/** Adulte confirmé, connexion disponible et délai minimum écoulé. */
export function canShowPromo(): boolean {
  if (!isAdult() || !navigator.onLine || !isFirebaseConfigured()) return false;
  return !lastShown || Date.now() - lastShown.at >= COOLDOWN_MS;
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
  const cached = catalogs.get(sourceAppId) ?? null;
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (cached && age < CATALOG_TTL_MS) return cached.campaigns;

  try {
    const fresh = await Promise.race([
      fetchCatalog(sourceAppId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FETCH_TIMEOUT_MS)),
    ]);
    if (fresh) {
      catalogs.set(sourceAppId, { fetchedAt: Date.now(), campaigns: fresh });
      return fresh;
    }
  } catch {}
  return cached && age < CATALOG_STALE_MAX_MS ? cached.campaigns : [];
}

/** Tirage pondéré, sans rejouer la campagne précédente quand il y en a une autre. */
export async function pickPromo(sourceAppId: string): Promise<Promo | null> {
  const eligible = (await loadCampaigns(sourceAppId)).filter((promo) => isEligible(promo));
  if (eligible.length === 0) return null;
  const lastId = lastShown?.id;
  const pool = eligible.length > 1 ? eligible.filter((promo) => promo.id !== lastId) : eligible;
  let ticket = Math.random() * pool.reduce((sum, promo) => sum + promo.weight, 0);
  for (const promo of pool) {
    ticket -= promo.weight;
    if (ticket < 0) return promo;
  }
  return pool[pool.length - 1];
}
