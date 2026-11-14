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
          <li>
            Indiquez de quoi retrouver le compte :
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
              <li>
                <strong>Compte Google</strong> : l&apos;adresse e-mail du compte Google utilisé pour vous connecter.
              </li>
              <li>
                <strong>Compte anonyme</strong> (sans connexion Google) : l&apos;identifiant du compte affiché dans la page
                Mes données du jeu. Le bouton « Demander la suppression du compte » de cette page l&apos;ajoute
                automatiquement à l&apos;e-mail.
              </li>
            </ul>
          </li>
          <li>Ne transmettez jamais votre mot de passe.</li>
        </ol>
        <p className="text-muted-foreground">
          Un compte anonyme n&apos;est relié à aucun nom ni aucune adresse e-mail : sans son identifiant, il ne peut pas être
          retrouvé. Si l&apos;application est déjà désinstallée et que l&apos;identifiant n&apos;a pas été noté, la
          progression en ligne de ce compte ne peut donc pas être supprimée sur demande.
        </p>
        <p className="text-muted-foreground">La suppression est réalisée dans un délai d&apos;un mois.</p>
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
            Les journaux techniques de l&apos;hébergeur Vercel, conservés selon les règles de conservation de Vercel.
          </li>
        </ul>
      </section>
    </LegalPage>
  );
}
