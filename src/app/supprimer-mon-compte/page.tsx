import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

// Page publique demandée par Google Play (suppression du compte sans installer l'application).
// Le texte suit la clause « deletion » de la configuration du kit juridique.
export const metadata: Metadata = {
  title: "Supprimer mon compte · Motissimo",
  description: "Comment demander la suppression de votre compte Motissimo et de votre progression.",
};

const SUPPORT = "support@javachrist.fr";
const MAILTO = `mailto:${SUPPORT}?subject=${encodeURIComponent("Motissimo : suppression de mon compte")}`;

export default function DeleteAccountPage() {
  return (
    <LegalPage>
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-black">Supprimer mon compte Motissimo</h1>
        <p className="text-muted-foreground">
          Motissimo est un jeu de JavaChrist. Cette page explique comment supprimer votre compte et votre progression,
          même si l&apos;application n&apos;est plus installée.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Faire la demande</h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-muted-foreground">
          <li>
            Écrivez à{" "}
            <a href={MAILTO} className="break-words text-cyan-700 underline underline-offset-2 hover:text-cyan-900">
              {SUPPORT}
            </a>{" "}
            avec l&apos;objet « Motissimo : suppression de mon compte ».
          </li>
          <li>Indiquez si possible l&apos;adresse e-mail du compte Google utilisé pour vous connecter.</li>
          <li>Ne transmettez jamais votre mot de passe.</li>
        </ol>
        <p className="text-muted-foreground">La suppression est réalisée sous 30 jours.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Ce qui est supprimé</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>Le compte (anonyme ou Google) enregistré dans Firebase Authentication.</li>
          <li>La progression et les réglages enregistrés en ligne : niveaux, scores, défi du jour, son, mode Découverte.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Ce qui reste</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>
            Les données stockées sur votre appareil (progression, année de naissance) : effacez-les en vidant les données
            du site ou de l&apos;application, ou en désinstallant l&apos;application.
          </li>
          <li>
            Les données déjà transmises à Google pour la publicité, gérées par Google selon ses propres règles de
            conservation.
          </li>
          <li>
            Les journaux techniques de l&apos;hébergeur Vercel, conservés 1 jour, ou 30 jours au plus avec l&apos;option
            d&apos;observabilité avancée.
          </li>
        </ul>
      </section>
    </LegalPage>
  );
}
