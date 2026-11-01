"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SNOOZE_KEY = "motissimo.pwa.snoozeUntil";
const ACK_KEY = "motissimo.pwa.lastAcknowledgedAppVersion";
const SESSION_KEY = "motissimo.pwa.dismissedSession";
const ACCEPT_KEY = "motissimo.pwa.updateAccepted";
const RELOAD_KEY = "motissimo.pwa.reloaded";
const CHECK_MS = 60_000;
const LATER_MS = 6 * 60 * 60 * 1000;

function newerVersion(pageVersion: string, remoteVersion: string | null): boolean {
  if (!remoteVersion || remoteVersion === "dev" || pageVersion === "dev") return false;
  return remoteVersion !== pageVersion;
}

export function UpdateManager({ pageVersion }: { pageVersion: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (new URLSearchParams(window.location.search).has("apercu-maj")) setOpen(true);
  }, []);
  const [remote, setRemote] = useState<string | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [busy, setBusy] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (pageVersion === "dev" || typeof window === "undefined") return;
    let timer = 0;
    let lastCheck = 0;
    let inFlight = false;
    let cancelled = false;

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      if (inFlight) return;
      if (lastCheck !== 0 && Date.now() - lastCheck < CHECK_MS) return;
      inFlight = true;
      lastCheck = Date.now();
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) throw new Error("version");
        const payload = (await response.json()) as { version?: string };
        if (cancelled) return;
        setRemote(payload.version ?? null);
        setCheckFailed(false);
        if (payload.version && payload.version !== pageVersion) {
          await registrationRef.current?.update();
        }
      } catch {
        if (!cancelled) {
          setRemote(null);
          setCheckFailed(true);
        }
      } finally {
        inFlight = false;
      }
    };

    const onReturn = () => {
      lastCheck = 0;
      void check();
    };
    timer = window.setInterval(() => void check(), CHECK_MS);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    void check();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [pageVersion]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
      return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (!hadController) return;
      if (sessionStorage.getItem(ACCEPT_KEY) !== "1") return;
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const track = () => {
      const worker = registrationRef.current?.waiting;
      if (worker) setWaiting(worker);
    };

    navigator.serviceWorker.register("/sw.js").then((next) => {
      registrationRef.current = next;
      track();
      next.addEventListener("updatefound", () => {
        const installing = next.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) track();
          if (installing.state === "installed" && !navigator.serviceWorker.controller) {
            installing.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch((error) => {
      console.error("Service worker registration failed", error);
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  useEffect(() => {
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0) || null;
    const offer =
      !checkFailed &&
      !document.querySelector("[role='dialog']") &&
      newerVersion(pageVersion, remote) &&
      remote !== localStorage.getItem(ACK_KEY) &&
      (snooze === null || Date.now() >= snooze);
    if (offer && sessionStorage.getItem(SESSION_KEY) !== "1") setOpen(true);
  }, [pageVersion, remote, checkFailed]);

  function later() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + LATER_MS));
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }

  function updateNow() {
    if (!remote || remote === pageVersion) return;
    setBusy(true);
    localStorage.setItem(ACK_KEY, remote);
    sessionStorage.setItem(ACCEPT_KEY, "1");
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => window.location.reload(), 1500);
      return;
    }
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && later()}>
      <DialogContent className="text-center sm:max-w-xs" showCloseButton={false}>
        <DialogHeader className="items-center">
          <DialogTitle>Une nouvelle version est disponible</DialogTitle>
          <DialogDescription>
            Tu peux l&apos;appliquer maintenant. La partie en cours reprendra au début.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={later} disabled={busy}>
            Plus tard
          </Button>
          <Button type="button" className="flex-1" onClick={updateNow} disabled={busy}>
            Mettre à jour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
