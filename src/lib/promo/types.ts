/** Campagne publiée dans `public_catalogs/{sourceAppId}` (projection filtrée, sans brouillon). */
export interface Promo {
  id: string;
  /** Nom de l'application promue. */
  name: string;
  audience: string;
  locale: string;
  videoUrl: string;
  durationMs: number;
  /** Fiche Google Play de l'application promue. */
  destinationUrl: string;
  weight: number;
  /** Dates ISO 8601, facultatives. */
  startsAt?: string | null;
  endsAt?: string | null;
}

/** La croix de fermeture apparaît à ce délai, ou à la fin de la vidéo si elle est plus courte. */
export const CLOSE_AFTER_MS = 15_000;
/** Durée maximale acceptée pour une vidéo (limite Google Play des interstitiels non fermables). */
export const MAX_DURATION_MS = 15_000;
/** Délai minimum entre deux promotions. */
export const COOLDOWN_MS = 3 * 60_000;
/** Délai laissé à l'écran de résultat avant de lancer la vidéo. */
export const RESULT_DELAY_MS = 1_500;
/** Temps maximum pour récupérer le catalogue. */
export const FETCH_TIMEOUT_MS = 3_000;
/** Le catalogue est relu au plus toutes les 15 minutes. */
export const CATALOG_TTL_MS = 15 * 60_000;
/** Un catalogue plus ancien n'est plus utilisé, même si le réseau échoue. */
export const CATALOG_STALE_MAX_MS = 60 * 60_000;
export const PROMO_LOCALE = "fr";
export const PLAY_STORE_HOST = "play.google.com";
