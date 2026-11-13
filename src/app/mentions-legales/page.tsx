import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales · Motissimo",
  description: "L'éditeur et l'hébergeur de Motissimo.",
};

export default function LegalNoticePage() {
  return (
    <LegalPage>
      <LegalDocument name="mentions-legales" />
    </LegalPage>
  );
}
