/**
 * Score total d'un joueur, toujours recalculé à partir de ce qui est enregistré :
 *
 * - niveaux : le meilleur score de chaque niveau réussi (un rejeu ne compte que s'il bat ce score) ;
 * - défi du jour : le score de chaque date jouée (dailyScores), une seule fois par date.
 *
 * Un joueur ne joue qu'un défi par date, donc la date sert de clé : deux copies ou deux comptes qui
 * ont joué le même jour ne le comptent qu'une fois, avec le meilleur score. La grille du défi d'une
 * date n'est pas forcément la même pour tous : en mode Découverte, elle est tirée parmi les grilles
 * enfant (puzzleForDay). Deux comptes fusionnés qui ont joué la même date, l'un en Découverte et
 * l'autre en mode normal, ne gardent donc que le meilleur des deux scores.
 *
 * Aucune importation à l'exécution : ce module est testé tel quel par Node (tests/account-transfer.test.mjs).
 */
import type { UserProgress } from "./firebase-db";

type LevelResult = UserProgress["completedLevels"][string];

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Réussite valide : 1 à 3 étoiles, score et temps finis et positifs (le jeu n'enregistre un niveau qu'une fois réussi). */
export function isValidResult(result: unknown): result is LevelResult {
  const r = result as Partial<LevelResult> | null;
  return (
    !!r &&
    finite(r.stars) && r.stars >= 1 && r.stars <= 3 &&
    finite(r.score) && r.score >= 0 &&
    finite(r.bestTime) && r.bestTime >= 0
  );
}

/** Points du défi du jour par date (AAAA-MM-JJ) ; à date égale entre plusieurs sources, le meilleur score. */
export function mergeDailyScores(...sources: (Record<string, number> | undefined)[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const scores of sources) {
    if (!scores || typeof scores !== "object") continue;
    for (const [date, score] of Object.entries(scores)) {
      if (!DATE.test(date) || !finite(score) || score < 0) continue;
      merged[date] = Math.max(merged[date] ?? 0, score);
    }
  }
  return merged;
}

/** Score total : meilleurs scores des niveaux réussis + points du défi du jour, une fois par date. */
export function computeTotal(progress: Pick<UserProgress, "completedLevels" | "dailyScores"> | null): number {
  let sum = 0;
  for (const result of Object.values(progress?.completedLevels ?? {})) if (isValidResult(result)) sum += result.score;
  for (const score of Object.values(mergeDailyScores(progress?.dailyScores))) sum += score;
  return sum;
}

/** La même progression, avec son score total recalculé. */
export function withTotal<T extends UserProgress>(progress: T): T {
  return { ...progress, totalScore: computeTotal(progress) };
}
