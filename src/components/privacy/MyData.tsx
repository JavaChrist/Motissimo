"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { Mail, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { openPrivacyOptions, privacyOptionsRequired } from "@/lib/ads/consent";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { isNativeApp } from "@/lib/platform";
import { clearBirthYear, useAgeStatus } from "@/lib/promo/age-gate";

const SUPPORT = "support@javachrist.fr";
const PROGRESS_KEY = "wordtiles_progress";
const BIRTH_YEAR_KEY = "promo_birth_year";
const PROMO_SHOWN_KEY = "promo_last_shown";
const PROMO_CATALOG_PREFIX = "promo_catalog_";
const UPDATE_PREFIX = "motissimo.pwa.";

const card = "flex flex-col gap-3 rounded-3xl border border-border bg-card p-5";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl border border-cyan-700 px-5 font-semibold text-cyan-800 transition-colors hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:opacity-50";

interface DeviceData {
  completedLevels: number;
  totalScore: number;
  dailyStreak: number;
  settings: boolean;
  birthYear: string | null;
  promoShown: boolean;
  promoCatalogs: number;
  updateKeys: number;
}

function storageKeys(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((key): key is string => key !== null);
  } catch {
    return [];
  }
}

function readDeviceData(): DeviceData | null {
  try {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null") as Record<string, unknown> | null;
    const keys = storageKeys();
    return {
      completedLevels: progress?.completedLevels ? Object.keys(progress.completedLevels).length : 0,
      totalScore: typeof progress?.totalScore === "number" ? progress.totalScore : 0,
      dailyStreak: typeof progress?.dailyStreak === "number" ? progress.dailyStreak : 0,
      settings: progress !== null && ["childMode", "showCounts", "soundEnabled"].some((field) => field in progress),
      birthYear: localStorage.getItem(BIRTH_YEAR_KEY),
      promoShown: localStorage.getItem(PROMO_SHOWN_KEY) !== null,
      promoCatalogs: keys.filter((key) => key.startsWith(PROMO_CATALOG_PREFIX)).length,
      updateKeys: keys.filter((key) => key.startsWith(UPDATE_PREFIX)).length,
    };
  } catch {
    return null;
  }
}

// Instantané sérialisé : useSyncExternalStore exige une valeur stable entre deux lectures.
const readSnapshot = () => JSON.stringify(readDeviceData());
const noSubscription = () => () => {};

function isEmpty(data: DeviceData | null): boolean {
  if (!data) return true;
  return !data.completedLevels && !data.totalScore && !data.settings && !data.birthYear && !data.promoShown && !data.promoCatalogs && !data.updateKeys;
}

/** Compte Firebase actuel, sans en créer : cette page ne connecte personne. */
function useCurrentUser(): { user: User | null; ready: boolean } {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: !isFirebaseConfigured() });
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return onAuthStateChanged(getFirebaseAuth(), (user) => setState({ user, ready: true }));
  }, []);
  return state;
}

/** Bouton « Choix publicitaires » : application Android, adulte, et seulement quand Google l'exige. */
function AdChoices() {
  const native = useSyncExternalStore(noSubscription, isNativeApp, () => false);
  const adult = useAgeStatus() === "adult";
  const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!native || !adult) return;
    let cancelled = false;
    privacyOptionsRequired()
      .then((value) => !cancelled && setRequired(value))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [native, adult]);

  if (!native) return null;

  const open = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setRequired(await openPrivacyOptions());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Choix publicitaires</h2>
      <p className="text-muted-foreground">
        {adult
          ? "L'application affiche une bannière de Google AdMob. Vous pouvez revoir à tout moment vos choix sur la publicité personnalisée."
          : "Aucune annonce n'est affichée tant que l'âge n'est pas connu, ni pour un mineur."}
      </p>
      {adult && required && (
        <button type="button" onClick={() => void open()} disabled={busy} className={secondaryButton}>
          <SlidersHorizontal aria-hidden className="size-5" />
          Modifier mes choix publicitaires
        </button>
      )}
      {adult && !required && (
        <p className="text-sm text-muted-foreground">Google ne demande pas de formulaire de choix dans votre pays.</p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-red-700">
          Le formulaire de Google n&apos;a pas pu s&apos;ouvrir. Vérifiez la connexion, puis réessayez.
        </p>
      )}
    </section>
  );
}

function DeviceSummary({ data }: { data: DeviceData | null }) {
  if (isEmpty(data) || !data) {
    return <p role="status" className="text-muted-foreground">Aucune donnée de Motissimo n&apos;est enregistrée sur cet appareil.</p>;
  }
  const items = [
    data.completedLevels > 0 && `${data.completedLevels} niveau${data.completedLevels > 1 ? "x" : ""} terminé${data.completedLevels > 1 ? "s" : ""}, score total ${data.totalScore}`,
    data.dailyStreak > 0 && `Série du défi du jour : ${data.dailyStreak} jour${data.dailyStreak > 1 ? "s" : ""}`,
    data.settings && "Vos réglages : mode Découverte, chiffres, sons",
    data.birthYear && `Année de naissance : ${data.birthYear}`,
    data.promoShown && "La dernière vidéo de JavaChrist Promotions affichée",
    data.promoCatalogs > 0 && "La liste des vidéos de JavaChrist Promotions, gardée en cache",
    data.updateKeys > 0 && "L'état des mises à jour de l'application",
  ].filter((item): item is string => Boolean(item));
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Page « Mes données » : ce qui est enregistré, les choix publicitaires et les suppressions. */
export function MyData() {
  const confirm = useConfirm();
  const snapshot = useSyncExternalStore(noSubscription, readSnapshot, () => "null");
  const data = JSON.parse(snapshot) as DeviceData | null;
  const { user, ready } = useCurrentUser();

  const eraseDevice = async () => {
    const confirmed = await confirm({
      title: "Effacer les données de cet appareil ?",
      description: user
        ? "La progression, les réglages et l'année de naissance enregistrés sur cet appareil seront effacés. La progression enregistrée en ligne avec votre compte reste disponible : pour la supprimer aussi, demandez la suppression du compte."
        : "La progression, les réglages et l'année de naissance enregistrés sur cet appareil seront effacés. Cette action est définitive.",
      confirmLabel: "Effacer",
      variant: "destructive",
    });
    if (!confirmed) return;
    // L'année d'abord : sans réponse d'âge, aucune annonce n'est demandée.
    clearBirthYear();
    for (const key of storageKeys()) {
      if (key === PROGRESS_KEY || key === PROMO_SHOWN_KEY || key.startsWith(PROMO_CATALOG_PREFIX) || key.startsWith(UPDATE_PREFIX)) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }
    // Rechargement complet voulu (pas router.push) : l'état du jeu gardé en mémoire repart de zéro.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  };

  const mailto = `mailto:${SUPPORT}?subject=${encodeURIComponent("Motissimo : suppression de mon compte")}&body=${encodeURIComponent(
    `Bonjour,\n\nJe demande la suppression de mon compte Motissimo et de ma progression en ligne.\n\nIdentifiant du compte : ${user?.uid ?? "(inconnu)"}\n`,
  )}`;

  return (
    <>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">Mes données</h1>
        <p className="text-muted-foreground">Ce que Motissimo enregistre, et comment l&apos;effacer.</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Sur cet appareil</h2>
        <DeviceSummary data={data} />
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">En ligne</h2>
        {!ready ? (
          <p className="text-muted-foreground">Lecture du compte…</p>
        ) : user ? (
          <>
            <p className="text-muted-foreground">
              {user.isAnonymous
                ? "Un compte anonyme, créé automatiquement, sauvegarde votre progression et vos réglages."
                : `Votre compte Google${user.email ? ` (${user.email})` : ""} sauvegarde votre progression et vos réglages.`}
            </p>
            <p className="text-sm text-muted-foreground">
              Identifiant du compte : <span className="break-all font-mono select-all">{user.uid}</span>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Aucun compte n&apos;est connecté sur cet appareil.</p>
        )}
      </section>

      <AdChoices />

      <section className={card}>
        <h2 className="text-lg font-bold">Effacer les données de cet appareil</h2>
        <p className="text-muted-foreground">
          Efface la progression, les réglages et l&apos;année de naissance enregistrés sur cet appareil, et vous redemande
          votre année de naissance. Votre compte et la progression enregistrée en ligne ne sont pas supprimés : elle revient
          au prochain lancement.
        </p>
        <button
          type="button"
          disabled={isEmpty(data)}
          onClick={() => void eraseDevice()}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-red-700 px-5 font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          <Trash2 aria-hidden className="size-5" />
          Effacer ces données
        </button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Supprimer le compte et la progression en ligne</h2>
        <p className="text-muted-foreground">
          La demande part par e-mail à {SUPPORT}, avec l&apos;identifiant du compte. La suppression est réalisée dans un délai d&apos;un mois.
        </p>
        <a href={mailto} className={secondaryButton}>
          <Mail aria-hidden className="size-5" />
          Demander la suppression du compte
        </a>
      </section>
    </>
  );
}
