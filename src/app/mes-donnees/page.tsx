import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { MyData } from "@/components/privacy/MyData";

export const metadata: Metadata = {
  title: "Mes données · Motissimo",
  description: "Voir et effacer les données de Motissimo, et modifier vos choix publicitaires.",
};

export default function MyDataPage() {
  return (
    <LegalPage>
      <MyData />
    </LegalPage>
  );
}
