"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";
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

function subscribePreview() {
  return () => {};
}

function previewRequested() {
  return (
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(window.location.search).has("apercu-maj")
  );
}

function shouldPrompt(pageVersion: string, remoteVersion: string) {
  if (!newerVersion(pageVersion, remoteVersion)) return false;
  if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
  if (remoteVersion === localStorage.getItem(ACK_KEY)) return false;
  if (document.querySelector("[role='dialog']")) return false;
  const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0) || null;
  return snooze === null || Date.now() >= snooze;
}

export function UpdateManager({ pageVersion }: { pageVersion: string }) {
  const preview = useSyncExternalStore(subscribePreview, previewRequested, () => false);
  const [dismissed, setDismissed] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const open = !dismissed && (preview || updateOpen);
  const [remote, setRemote] = useState<string | null>(null);
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
        if (payload.version && shouldPrompt(pageVersion, payload.version)) setUpdateOpen(true);
        if (payload.version && payload.version !== pageVersion) {
          await registrationRef.current?.update();
        }
      } catch {
        if (!cancelled) setRemote(null);
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

  function later() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + LATER_MS));
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
    setUpdateOpen(false);
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
      <DialogContent
        className="gap-0 overflow-hidden border-0 p-0 text-center sm:max-w-xs"
        showCloseButton={false}
        style={{
          background: "linear-gradient(180deg, #FFF9F0 0%, #F4E4CC 100%)",
          borderRadius: 28,
          boxShadow: "0 24px 60px rgba(8, 92, 110, 0.45), 0 0 0 3px rgba(249, 115, 22, 0.35)",
        }}
      >
        <div
          aria-hidden
          className="h-2 w-full"
          style={{ background: "linear-gradient(90deg, #0891B2 0%, #67E8F9 42%, #F97316 100%)" }}
        />
        <div className="px-5 pt-5 pb-5">
          <div
            className="mx-auto mb-4 grid w-fit grid-cols-2 gap-1 rounded-2xl p-2"
            style={{
              background: "linear-gradient(145deg, #2a2d3a 0%, #1a1c28 100%)",
              boxShadow: "0 8px 20px rgba(14, 116, 144, 0.28)",
            }}
          >
            {["M", "O", "T", "S"].map((letter) => (
              <div
                key={letter}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black"
                style={{
                  background: "linear-gradient(145deg, #FFF9F0 0%, #F3E6D4 46%, #E4D3BE 100%)",
                  color: "#2D2A26",
                  boxShadow: "0 2px 0 #C4B49E, inset 0 1px 0 rgba(255,255,255,0.95)",
                }}
              >
                {letter}
              </div>
            ))}
          </div>
          <DialogHeader className="items-center">
            <DialogTitle className="flex items-center justify-center gap-1.5 text-lg font-black" style={{ color: "#3D3227" }}>
              <Sparkles className="size-4 text-orange-500" />
              Une nouvelle version
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: "#8B7D6B" }}>
              Tu peux l&apos;appliquer maintenant. La partie en cours reprendra au début.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl border-2 font-bold"
              style={{ borderColor: "rgba(139,125,107,0.35)", color: "#3D3227", background: "rgba(255,255,255,0.55)" }}
              onClick={later}
              disabled={busy}
            >
              Plus tard
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                boxShadow: "0 6px 16px rgba(249,115,22,0.35)",
              }}
              onClick={updateNow}
              disabled={busy}
            >
              Mettre à jour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
