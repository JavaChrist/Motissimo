import { Capacitor } from "@capacitor/core";

/** Vrai dans l'application Android (Capacitor), faux dans le navigateur et la PWA. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
