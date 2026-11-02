import { useSyncExternalStore } from "react";

export type AgeStatus = "loading" | "unknown" | "adult" | "minor";

const KEY = "promo_birth_year";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** Majeur seulement si la personne a certainement 18 ans : l'année seule ne donne pas la date exacte. */
export function statusFromBirthYear(year: number, now = new Date().getFullYear()): AgeStatus {
  return now - year > 18 ? "adult" : "minor";
}

function readStatus(): AgeStatus {
  try {
    const raw = localStorage.getItem(KEY);
    const year = raw ? Number(raw) : NaN;
    return Number.isInteger(year) ? statusFromBirthYear(year) : "unknown";
  } catch {
    return "unknown";
  }
}

export function setBirthYear(year: number) {
  try {
    localStorage.setItem(KEY, String(year));
  } catch {}
  listeners.forEach((callback) => callback());
}

/** Lecture synchrone, hors React, pour décider d'afficher une promotion. */
export function isAdult(): boolean {
  return typeof window !== "undefined" && readStatus() === "adult";
}

export function useAgeStatus(): AgeStatus {
  return useSyncExternalStore(subscribe, readStatus, () => "loading");
}
