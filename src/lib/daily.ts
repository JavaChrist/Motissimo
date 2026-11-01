import type { Puzzle } from "./puzzle-bank";

export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function puzzleForDay(list: Puzzle[], date: string, childOnly: boolean): Puzzle | null {
  const pool = childOnly ? list.filter((puzzle) => puzzle.child) : list;
  const source = pool.length > 0 ? pool : list;
  if (source.length === 0) return null;
  let hash = 0;
  for (const char of date) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const sorted = [...source].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[hash % sorted.length];
}
