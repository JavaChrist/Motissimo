import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Vos droits RGPD · Motissimo",
  description: "Comment exercer vos droits sur vos données dans Motissimo.",
};

export default function GdprRightsPage() {
  return (
    <LegalPage>
      <LegalDocument name="droits-rgpd" />
    </LegalPage>
  );
}
