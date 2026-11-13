import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Cadre commun des pages juridiques : contenu lisible sur téléphone et lien de retour. */
export function LegalPage({ children, back = { href: "/informations-legales", label: "Informations légales" } }: {
  children: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 text-[15px] leading-relaxed"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
      }}
    >
      <Link href={back.href} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-cyan-700 hover:text-cyan-900">
        <ArrowLeft aria-hidden className="size-4" />
        {back.label}
      </Link>
      {children}
    </main>
  );
}
