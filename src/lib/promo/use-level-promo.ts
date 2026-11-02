"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAdult } from "./age-gate";
import { canShowPromo, isEligible, markPromoShown, pickPromo } from "./promo-service";
import { RESULT_DELAY_MS, type Promo } from "./types";
import { prepareVideo, takeVideo } from "./warm-video";

/**
 * Passe `trigger` à true quand l'écran de résultat apparaît : une promotion est proposée
 * après un court délai, uniquement si toutes les conditions sont réunies. Pendant la partie,
 * la prochaine promotion est préparée (catalogue lu, vidéo préchargée) pour ne rien attendre ensuite.
 */
export function useLevelPromo(trigger: boolean, sourceAppId: string) {
  const [shown, setShown] = useState<{ promo: Promo; video: HTMLVideoElement | null } | null>(null);
  const prepared = useRef<Promo | null>(null);

  useEffect(() => {
    if (trigger || prepared.current || !isAdult() || !navigator.onLine) return;
    let cancelled = false;
    pickPromo(sourceAppId).then((next) => {
      if (!next || cancelled) return;
      prepared.current = next;
      prepareVideo(next.videoUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [trigger, sourceAppId]);

  useEffect(() => {
    if (!trigger || !canShowPromo()) return;
    let cancelled = false;
    const started = Date.now();
    (async () => {
      const next = prepared.current ?? (await pickPromo(sourceAppId));
      prepared.current = null;
      if (!next || cancelled || !isEligible(next)) return;
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, RESULT_DELAY_MS - (Date.now() - started))));
      if (cancelled) return;
      markPromoShown(next.id);
      setShown({ promo: next, video: takeVideo(next.videoUrl) });
    })();
    return () => {
      cancelled = true;
    };
  }, [trigger, sourceAppId]);

  const close = useCallback(() => setShown(null), []);
  return { promo: shown?.promo ?? null, video: shown?.video ?? null, close };
}
