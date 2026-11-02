import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.javachrist.motissimo",
  appName: "Motissimo",
  // Export statique de Next.js (npm run build:android) embarqué dans l'APK : le jeu fonctionne hors ligne.
  webDir: "out",
  android: {
    backgroundColor: "#0e7490",
  },
  plugins: {
    FirebaseAuthentication: {
      providers: ["google.com"],
      skipNativeAuth: true,
    },
  },
};

export default config;
