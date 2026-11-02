import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "motissimo-456ba",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "campaigns/c1"), { status: "draft" });
    await setDoc(doc(db, "apps/motissimo"), { name: "Motissimo" });
    await setDoc(doc(db, "public_catalogs/motissimo"), { catalogVersion: 1, campaigns: [] });
  });
});

after(() => env.cleanup());

const anonymous = () => env.authenticatedContext("anon-user", { firebase: { sign_in_provider: "anonymous" } });
const admin = () => env.authenticatedContext("admin-user", { admin: true });

describe("Firestore", () => {
  it("laisse tout le monde lire le catalogue public", async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "public_catalogs/motissimo")));
  });

  it("interdit d'écrire le catalogue public, même à l'admin (SDK Admin seulement)", async () => {
    await assertFails(setDoc(doc(admin().firestore(), "public_catalogs/motissimo"), { catalogVersion: 2 }));
    await assertFails(setDoc(doc(anonymous().firestore(), "public_catalogs/motissimo"), { catalogVersion: 2 }));
  });

  it("cache les campagnes et les apps aux non-admins", async () => {
    for (const ctx of [env.unauthenticatedContext(), anonymous()]) {
      await assertFails(getDoc(doc(ctx.firestore(), "campaigns/c1")));
      await assertFails(getDoc(doc(ctx.firestore(), "apps/motissimo")));
      await assertFails(setDoc(doc(ctx.firestore(), "campaigns/c2"), { status: "active" }));
    }
  });

  it("laisse l'admin lire et écrire campagnes et apps", async () => {
    const db = admin().firestore();
    await assertSucceeds(getDoc(doc(db, "campaigns/c1")));
    await assertSucceeds(setDoc(doc(db, "campaigns/c2"), { status: "draft" }));
    await assertSucceeds(setDoc(doc(db, "apps/souspli"), { name: "SousPli" }));
  });

  it("ne donne pas les droits admin à un simple e-mail", async () => {
    const ctx = env.authenticatedContext("u", { email: "contact@javachrist.fr", email_verified: true });
    await assertFails(setDoc(doc(ctx.firestore(), "campaigns/c3"), { status: "active" }));
  });
});

describe("Storage", () => {
  const video = new Uint8Array([0, 1, 2]);
  const mp4 = { contentType: "video/mp4" };

  it("laisse l'admin téléverser un MP4", async () => {
    await assertSucceeds(uploadBytes(ref(admin().storage(), "campaigns/c1/promo.mp4"), video, mp4));
  });

  it("refuse un autre type de fichier, même pour l'admin", async () => {
    await assertFails(
      uploadBytes(ref(admin().storage(), "campaigns/c1/script.js"), video, { contentType: "text/javascript" })
    );
  });

  it("refuse l'écriture aux non-admins", async () => {
    await assertFails(uploadBytes(ref(anonymous().storage(), "campaigns/c1/promo.mp4"), video, mp4));
    await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), "campaigns/c1/promo.mp4"), video, mp4));
  });

  it("refuse l'écriture hors du dossier campaigns", async () => {
    await assertFails(uploadBytes(ref(admin().storage(), "autre/promo.mp4"), video, mp4));
  });
});
