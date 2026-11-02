"use client";

import { useEffect, useRef, useState } from "react";
import { VolumeX, X } from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { CLOSE_AFTER_MS, type Promo } from "@/lib/promo/types";

/** Sans événement de lecture au bout de ce délai, la vidéo est considérée bloquée. */
const STALL_MS = 6_000;
/** Dernier recours : la croix apparaît quoi qu'il arrive. */
const HARD_LIMIT_MS = CLOSE_AFTER_MS + 7_000;

/** Sur iPhone, l'encoche / Dynamic Island recouvre le haut : la croix descend sous la zone sûre. */
const PROMO_TOP = "calc(env(safe-area-inset-top, 0px) + 1rem)";

/** Place la vidéo dans l'écran de promo (celle préparée pendant la partie, sinon une nouvelle). */
function mountVideo(
  holder: HTMLDivElement | null,
  prepared: HTMLVideoElement | null,
  url: string,
  onDone: () => void
): HTMLVideoElement {
  const video = prepared ?? document.createElement("video");
  if (!prepared) {
    video.preload = "auto";
    video.src = url;
  }
  video.playsInline = true;
  video.className = "max-h-full max-w-full";
  video.onended = onDone;
  video.onerror = onDone;
  holder?.appendChild(video);
  return video;
}

function unmountVideo(video: HTMLVideoElement) {
  video.pause();
  video.onended = null;
  video.onerror = null;
  video.remove();
}

/** Toujours avec le son ; si le navigateur refuse, lecture muette plutôt qu'écran figé. */
function startWithSound(video: HTMLVideoElement, onMuted: () => void, onFailed: () => void) {
  video.muted = false;
  video.currentTime = 0;
  video.play().catch(() => {
    video.muted = true;
    onMuted();
    video.play().catch(onFailed);
  });
}

interface PromoInterstitialProps {
  promo: Promo;
  /** Vidéo préparée pendant la partie (autorisée à jouer avec le son sur iPhone) ; sinon on en crée une. */
  video: HTMLVideoElement | null;
  onClose: () => void;
}

export function PromoInterstitial({ promo, video: preparedVideo, onClose }: PromoInterstitialProps) {
  const [canClose, setCanClose] = useState(false);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const holderRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    const video = mountVideo(holder, preparedVideo, promo.videoUrl, () => setCanClose(true));
    videoRef.current = video;
    let playing = false;
    const onPlaying = () => {
      playing = true;
    };
    // Mise en arrière-plan : on met en pause et on laisse fermer au retour.
    const onVisibility = () => {
      if (!document.hidden) return;
      video.pause();
      setCanClose(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    video.addEventListener("playing", onPlaying);
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

    // La publicité joue toujours avec le son, même si le son du jeu est coupé. Si le navigateur le refuse
    // quand même, lecture muette plutôt qu'écran figé, avec un bouton pour rétablir le son.
    startWithSound(video, () => setNeedsSoundTap(true), () => setCanClose(true));

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
      video.removeEventListener("playing", onPlaying);
      unmountVideo(video);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      timers.forEach(clearTimeout);
    };
  }, [promo.durationMs, promo.videoUrl, preparedVideo, onClose]);

  return (
    <div
      role="dialog"
      aria-label={`Publicité JavaChrist : ${promo.name}`}
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center bg-black"
      // La bannière AdMob recouvre le bas de l'écran : la promo s'arrête au-dessus pour garder le bouton visible.
      style={{ bottom: "var(--ad-banner-height, 0px)" }}
    >
      <div ref={holderRef} className="flex max-h-full max-w-full items-center justify-center" />
      <p
        className="absolute left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white"
        style={{ top: PROMO_TOP }}
      >
        Publicité JavaChrist · {promo.name}
      </p>
      {needsSoundTap && (
        <button
          type="button"
          onClick={() => {
            if (videoRef.current) videoRef.current.muted = false;
            setNeedsSoundTap(false);
          }}
          className="absolute left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-black"
          style={{ top: `calc(${PROMO_TOP} + 2.5rem)` }}
        >
          <VolumeX className="h-4 w-4" />
          Activer le son
        </button>
      )}
      {canClose && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black"
            style={{ top: PROMO_TOP }}
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
