"use client";

import { useEffect } from "react";
import { useAgeStatus } from "@/lib/promo/age-gate";
import { isNativeApp } from "@/lib/platform";

/** Identifiant de test fourni par Google : aucune vraie pub tant que NEXT_PUBLIC_ADMOB_BANNER_ID n'est pas défini. */
const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
const BANNER_ID = process.env.NEXT_PUBLIC_ADMOB_BANNER_ID || TEST_BANNER_ID;
/** Écart (px) entre le bas du jeu et la bannière. */
const BANNER_GAP = 8;

function setBannerSpace(px: number) {
  document.documentElement.style.setProperty("--ad-banner-height", `${px}px`);
}

/**
 * Bannière AdMob fixée en bas de l'écran, hors de la zone de jeu (le plugin réserve sa place sous la WebView).
 * Uniquement dans l'app Android, pour un utilisateur adulte, après le formulaire de consentement (UMP).
 */
export function AdBanner() {
  const status = useAgeStatus();
  const adult = status === "adult";

  useEffect(() => {
    if (!adult || !isNativeApp()) return;
    let cancelled = false;
    let removeSizeListener = () => {};

    (async () => {
      const { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, MaxAdContentRating } =
        await import("@capacitor-community/admob");
      try {
        // La bannière se superpose à la WebView : on réduit la hauteur du jeu de sa taille, plus un écart.
        const sizeListener = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
          setBannerSpace(height > 0 ? height + BANNER_GAP : 0);
        });
        removeSizeListener = () => void sizeListener.remove();

        let info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          info = await AdMob.showConsentForm();
        }
        if (cancelled || !info.canRequestAds) return;

        await AdMob.initialize({ maxAdContentRating: MaxAdContentRating.General });
        if (cancelled) return;
        await AdMob.showBanner({
          adId: BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: BANNER_ID === TEST_BANNER_ID,
        });
      } catch {
        // Pas de pub plutôt qu'un jeu cassé.
      }
    })();

    return () => {
      cancelled = true;
      removeSizeListener();
      setBannerSpace(0);
      void import("@capacitor-community/admob").then(({ AdMob }) => AdMob.removeBanner().catch(() => undefined));
    };
  }, [adult]);

  return null;
}
