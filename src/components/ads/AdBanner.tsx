"use client";

import { useEffect } from "react";
import { useAgeStatus } from "@/lib/promo/age-gate";
import { isNativeApp } from "@/lib/platform";

/** Bloc bannière de test fourni par Google. */
const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
/** Bloc bannière AdMob de Motissimo. */
const MOTISSIMO_BANNER_ID = "ca-app-pub-8288172940135426/2561074879";
/** NEXT_PUBLIC_ADMOB_TEST=1 force les annonces de test pendant le développement. */
const FORCE_TEST = process.env.NEXT_PUBLIC_ADMOB_TEST === "1";
const BANNER_ID = FORCE_TEST
  ? TEST_BANNER_ID
  : process.env.NEXT_PUBLIC_ADMOB_BANNER_ID || MOTISSIMO_BANNER_ID || TEST_BANNER_ID;
/** Écart (px) entre le bas du jeu et la bannière. */
const BANNER_GAP = 8;
/** Délais avant de recréer la bannière après un échec (ms), puis le dernier en boucle. */
const RETRY_DELAYS = [30_000, 60_000, 120_000, 300_000];

function setBannerSpace(px: number) {
  document.documentElement.style.setProperty("--ad-banner-height", `${px}px`);
}

/**
 * Bannière AdMob fixée en bas de l'écran, hors de la zone de jeu (le plugin réserve sa place sous la WebView).
 * Uniquement dans l'app Android, pour un utilisateur adulte, après le formulaire de consentement (UMP).
 *
 * Au premier échec de chargement, y compris un rafraîchissement automatique d'une bannière déjà affichée,
 * le plugin détruit la bannière. Elle est alors recréée après un délai croissant (RETRY_DELAYS), ou dès
 * le retour de l'app au premier plan.
 */
export function AdBanner() {
  const status = useAgeStatus();
  const adult = status === "adult";

  useEffect(() => {
    if (!adult || !isNativeApp()) return;
    let cancelled = false;
    const listeners: { remove: () => Promise<void> }[] = [];
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    /** La bannière a été détruite par un échec et attend d'être recréée. */
    let gone = false;
    let onVisible = () => {};

    (async () => {
      const {
        AdMob,
        AdmobConsentStatus,
        BannerAdPluginEvents,
        BannerAdPosition,
        BannerAdSize,
        MaxAdContentRating,
      } = await import("@capacitor-community/admob");

      const show = () =>
        AdMob.showBanner({
          adId: BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: BANNER_ID === TEST_BANNER_ID,
        });

      const retry = () => {
        clearTimeout(retryTimer);
        retryTimer = undefined;
        if (cancelled || !gone) return;
        gone = false;
        show().catch(() => {
          gone = true;
          scheduleRetry();
        });
      };

      const scheduleRetry = () => {
        if (cancelled || retryTimer) return;
        const delay = RETRY_DELAYS[Math.min(failures, RETRY_DELAYS.length - 1)];
        failures += 1;
        retryTimer = setTimeout(retry, delay);
      };

      try {
        if (cancelled) return;
        // La bannière se superpose à la WebView : on réduit la hauteur du jeu de sa taille, plus un écart.
        listeners.push(
          await AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
            setBannerSpace(height > 0 ? height + BANNER_GAP : 0);
          }),
          await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            failures = 0;
          }),
          await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
            gone = true;
            scheduleRetry();
          }),
        );
        if (cancelled) {
          // Démonté pendant l'ajout des écouteurs : le nettoyage ne les a pas vus.
          for (const listener of listeners) void listener.remove();
          return;
        }

        let info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          info = await AdMob.showConsentForm();
        }
        if (cancelled || !info.canRequestAds) return;

        await AdMob.initialize({ maxAdContentRating: MaxAdContentRating.General });
        if (cancelled) return;

        // Retour au premier plan : une bannière détruite est recréée sans attendre le délai.
        onVisible = () => {
          if (document.visibilityState === "visible" && gone) retry();
        };
        document.addEventListener("visibilitychange", onVisible);

        await show();
      } catch {
        // Pas de pub plutôt qu'un jeu cassé.
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const listener of listeners) void listener.remove();
      setBannerSpace(0);
      void import("@capacitor-community/admob").then(({ AdMob }) => AdMob.removeBanner().catch(() => undefined));
    };
  }, [adult]);

  return null;
}
