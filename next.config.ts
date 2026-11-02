import type { NextConfig } from "next";

// `npm run build:android` : export statique embarqué dans l'APK (pas de serveur, pas d'en-têtes HTTP).
const nativeBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(nativeBuild && { output: "export" as const, images: { unoptimized: true } }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    if (nativeBuild) return [];
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/api/version",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
