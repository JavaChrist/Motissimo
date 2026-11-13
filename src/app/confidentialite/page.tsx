import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPage } from "@/components/legal/LegalPage";

// Adresse utilisée dans le message RGPD d'AdMob et sur Google Play : ne pas la changer.
export const metadata: Metadata = {
  title: "Politique de confidentialité · Motissimo",
  description: "Les données utilisées par Motissimo, la publicité et vos droits.",
};

export default function PrivacyPage() {
  return (
    <LegalPage>
      <LegalDocument name="confidentialite" />
    </LegalPage>
  );
}
