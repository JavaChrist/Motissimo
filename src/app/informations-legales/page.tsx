import { ChevronRight, Database, FileText, Landmark, type LucideIcon, Scale, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import legal from "../../../content/legal/legal.json";

export const metadata: Metadata = {
  title: "Informations légales · Motissimo",
  description: "Confidentialité, conditions d'utilisation, mentions légales et droits RGPD de Motissimo.",
};

// Pas de lien vers les CGV : Motissimo ne vend rien.
const ENTRIES: { href: string; icon: LucideIcon; title: string; summary: string }[] = [
  { href: "/mes-donnees", icon: Database, title: "Mes données", summary: "Voir, effacer, choix publicitaires" },
  { href: "/confidentialite", icon: ShieldCheck, title: "Confidentialité", summary: "Les données utilisées, la publicité et les prestataires" },
  { href: "/droits-rgpd", icon: Scale, title: "Vos droits RGPD", summary: "Accès, copie, suppression, réclamation" },
  { href: "/supprimer-mon-compte", icon: Trash2, title: "Supprimer mon compte", summary: "Effacer votre compte et votre progression en ligne" },
  { href: "/conditions-utilisation", icon: FileText, title: "Conditions d'utilisation", summary: "Les règles du jeu et du service" },
  { href: "/mentions-legales", icon: Landmark, title: "Mentions légales", summary: "L'éditeur et l'hébergeur" },
];

export default function LegalHubPage() {
  return (
    <LegalPage back={{ href: "/", label: "Retour au jeu" }}>
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">Informations légales</h1>
        <p className="text-muted-foreground">
          Documents de Motissimo, version {legal.version}
          {legal.mode === "draft" ? " (brouillon en cours de validation)" : ""}.
        </p>
      </section>

      <ul className="flex flex-col gap-3">
        {ENTRIES.map(({ href, icon: Icon, title, summary }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-16 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
            >
              <Icon aria-hidden className="size-6 shrink-0 text-cyan-700" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted-foreground">{summary}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
