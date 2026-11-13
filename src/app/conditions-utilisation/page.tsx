import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d'utilisation · Motissimo",
  description: "Les règles d'utilisation du jeu Motissimo.",
};

export default function TermsPage() {
  return (
    <LegalPage>
      <LegalDocument name="conditions-utilisation" />
    </LegalPage>
  );
}
