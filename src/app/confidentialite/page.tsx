import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Motissimo",
  description: "Les données utilisées par Motissimo, les publicités et vos droits.",
};

const UPDATED = "2 novembre 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 text-[15px] leading-relaxed">
      <h1 className="text-2xl font-black">Politique de confidentialité</h1>
      <p className="mt-1 text-sm opacity-70">Motissimo · dernière mise à jour : {UPDATED}</p>

      <p className="mt-6">
        Motissimo est un jeu de mots édité par JavaChrist. Cette page explique quelles données le jeu utilise et
        pourquoi.
      </p>

      <h2 className="mt-8 text-lg font-bold">Données enregistrées</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          <strong>Compte anonyme.</strong> Au premier lancement, le jeu crée un compte anonyme (Firebase Authentication)
          pour retrouver votre progression. Aucun nom ni e-mail n&apos;est demandé.
        </li>
        <li>
          <strong>Connexion Google (facultative).</strong> Si vous vous connectez avec Google, nous recevons
          l&apos;identifiant de votre compte et votre adresse e-mail, uniquement pour associer votre progression à ce
          compte.
        </li>
        <li>
          <strong>Progression et réglages.</strong> Niveaux terminés, scores, son, mode enfant : stockés sur Firebase
          (Google Cloud) et sur votre appareil.
        </li>
        <li>
          <strong>Année de naissance.</strong> Elle sert uniquement à savoir si vous êtes majeur et reste enregistrée sur
          votre appareil. Elle n&apos;est pas envoyée à nos serveurs.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-bold">Publicité</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          <strong>Mineurs ou âge inconnu : aucune publicité.</strong> Ni bannière, ni vidéo, y compris en mode enfant.
        </li>
        <li>
          <strong>Utilisateurs majeurs.</strong> L&apos;application Android affiche une bannière Google AdMob. Google peut
          utiliser l&apos;identifiant publicitaire de l&apos;appareil. Un formulaire de consentement vous est présenté
          lorsque la loi l&apos;exige, et vous pouvez modifier votre choix ensuite.
        </li>
        <li>
          <strong>Vidéos JavaChrist.</strong> À la fin d&apos;un niveau, une courte vidéo présente une autre application
          JavaChrist. Cette vidéo est chargée depuis nos serveurs ; nous ne conservons pas d&apos;historique de ce que vous
          avez vu.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-bold">Prestataires</h2>
      <p className="mt-2">
        Firebase (Google) pour l&apos;authentification, la base de données et les vidéos ; Google AdMob pour la bannière
        publicitaire ; Vercel pour l&apos;hébergement du site.
      </p>

      <h2 className="mt-8 text-lg font-bold">Vos droits</h2>
      <p className="mt-2">
        Vous pouvez demander l&apos;accès à vos données ou leur suppression, ainsi que la suppression de votre compte, en
        écrivant à{" "}
        <a className="underline" href="mailto:contact@javachrist.fr">
          contact@javachrist.fr
        </a>
        . Désinstaller l&apos;application supprime les données stockées sur l&apos;appareil.
      </p>

      <h2 className="mt-8 text-lg font-bold">Crédits</h2>
      <p className="mt-2">
        Les mots bonus s&apos;appuient sur la base lexicale{" "}
        <a className="underline" href="http://www.lexique.org" target="_blank" rel="noreferrer">
          Lexique 3
        </a>{" "}
        (New, Pallier et al.), diffusée sous licence CC BY-SA 4.0. La liste dérivée utilisée dans Motissimo est partagée
        sous la même licence.
      </p>

      <h2 className="mt-8 text-lg font-bold">Contact</h2>
      <p className="mt-2">JavaChrist · contact@javachrist.fr</p>
    </main>
  );
}
