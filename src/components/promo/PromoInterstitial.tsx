"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { CLOSE_AFTER_MS, type Promo } from "@/lib/promo/types";

/** Sans événement de lecture au bout de ce délai, la vidéo est considérée bloquée. */
const STALL_MS = 6_000;
/** Dernier recours : la croix apparaît quoi qu'il arrive. */
const HARD_LIMIT_MS = CLOSE_AFTER_MS + 7_000;

interface PromoInterstitialProps {
  promo: Promo;
  onClose: () => void;
}

export function PromoInterstitial({ promo, onClose }: PromoInterstitialProps) {
  const [canClose, setCanClose] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    let playing = false;
    const onPlaying = () => {
      playing = true;
    };
    // Mise en arrière-plan : on met en pause et on laisse fermer au retour.
    const onVisibility = () => {
      if (!document.hidden) return;
      video?.pause();
      setCanClose(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    video?.addEventListener("playing", onPlaying);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);

    // Android : le bouton Retour ferme la promo (même règle qu'Échap), il ne quitte pas le jeu.
    let removeBack: (() => void) | undefined;
    let disposed = false;
    if (isNativeApp()) {
      void import("@capacitor/app").then(({ App }) =>
        App.addListener("backButton", onClose).then((handle) => {
          if (disposed) void handle.remove();
          else removeBack = () => void handle.remove();
        })
      );
    }

    // Son activé si le navigateur l'accepte, sinon lecture muette plutôt qu'écran figé.
    video?.play().catch(() => {
      if (!video) return;
      video.muted = true;
      video.play().catch(() => setCanClose(true));
    });

    const timers = [
      setTimeout(() => setCanClose(true), Math.min(CLOSE_AFTER_MS, promo.durationMs + 500)),
      setTimeout(() => {
        if (!playing) setCanClose(true);
      }, STALL_MS),
      setTimeout(() => setCanClose(true), HARD_LIMIT_MS),
    ];
    return () => {
      disposed = true;
      removeBack?.();
      video?.removeEventListener("playing", onPlaying);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      timers.forEach(clearTimeout);
    };
  }, [promo.durationMs, onClose]);

  return (
    <div
      role="dialog"
      aria-label={`Publicité JavaChrist : ${promo.name}`}
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center bg-black"
      // La bannière AdMob recouvre le bas de l'écran : la promo s'arrête au-dessus pour garder le bouton visible.
      style={{ bottom: "var(--ad-banner-height, 0px)" }}
    >
      <video
        ref={videoRef}
        src={promo.videoUrl}
        playsInline
        preload="auto"
        className="max-h-full max-w-full"
        onEnded={() => setCanClose(true)}
        onError={() => setCanClose(true)}
      />
      <p className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
        Publicité JavaChrist · {promo.name}
      </p>
      {canClose && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => window.open(promo.destinationUrl, "_blank", "noopener")}
            className="absolute bottom-8 rounded-full bg-white px-5 py-3 text-sm font-bold text-black"
          >
            Voir sur Google Play
          </button>
        </>
      )}
    </div>
  );
}
