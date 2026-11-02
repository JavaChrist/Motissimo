// Statique : le SHA Vercel est fixé au build, donc identique pour toute la durée d'un déploiement.
// Requis pour l'export Capacitor, où cette route n'est de toute façon jamais appelée.
export const dynamic = "force-static";

/** Commit du déploiement en cours. Vercel fournit le SHA ; en local la valeur reste « dev ». */
export function GET() {
  return Response.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
