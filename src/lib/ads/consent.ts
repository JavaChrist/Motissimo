import { isNativeApp } from "@/lib/platform";

/**
 * « Choix publicitaires » de Google (UMP), pour l'application Android uniquement.
 * Google décide si le bouton doit être proposé (Espace économique européen, Royaume-Uni, Suisse) :
 * `privacyOptionsRequirementStatus === "REQUIRED"`. Sur le web, aucun module AdMob n'est chargé.
 */

/** Relit l'état du consentement, sans afficher de formulaire. */
export async function privacyOptionsRequired(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const { AdMob } = await import("@capacitor-community/admob");
  const info = await AdMob.requestConsentInfo();
  return info.privacyOptionsRequirementStatus === "REQUIRED";
}

/** Rouvre le formulaire de Google, puis relit l'état. */
export async function openPrivacyOptions(): Promise<boolean> {
  const { AdMob } = await import("@capacitor-community/admob");
  await AdMob.showPrivacyOptionsForm();
  return privacyOptionsRequired();
}
