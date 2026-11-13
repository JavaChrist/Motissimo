# Envoi en test interne Google Play

`scripts/play-release.mjs` vient de Géo Europe (commit `2306fe1`, `docs/play-release.md` de ce dépôt). Il envoie l'AAB signé de Motissimo sur la piste **test interne** de Google Play, avec l'API Google Play Developer v3. Il n'a aucune dépendance. Dans la copie, seuls changent l'emplacement de la configuration (`store/play-release.json`) et `--check-config`.

Garde-fous, repris tels quels :

- **Simulation par défaut** : contrôles locaux seulement, aucun appel réseau, rien n'est modifié dans la Play Console.
- **Envoi seulement avec `--send`**, et seulement sur la piste `internal`. `--track`, `--production`, `--promote` et une clé `track` dans la configuration sont refusés.
- **Aucun accès à la production**, ni aux tests fermés ou ouverts. Pendant un envoi, le script lit les autres pistes pour connaître le plus haut versionCode, sans rien y changer.
- La production reste une décision de Christian, prise dans la Play Console.

## Configuration : `store/play-release.json`

| Clé | Valeur pour Motissimo |
| --- | --- |
| `packageName` | `fr.javachrist.motissimo` |
| `bundle` | `android/app/build/outputs/bundle/release/app-release.aab` |
| `gradleFile` | `android/app/build.gradle` : son `versionCode` doit être celui de l'AAB |
| `uploadCertSha256` | Empreinte du certificat de la clé d'importation `motissimo-upload` (CN=Grohens Christian, OU=JavaChrist). Ce n'est pas un secret. |
| `lastUploadedVersionCode` | Plus haut versionCode déjà sur Play, toutes pistes confondues. `0` tant que rien n'est envoyé. À mettre à jour dans le commit de chaque version. |
| `credentials` | `~/.geo-play/motissimo-release.json` : clé du compte de service **dédié aux versions**, hors du dépôt. `PLAY_RELEASE_CREDENTIALS` la remplace. |
| `bundleJson` | Vide : Motissimo n'a pas de marqueur de build. |
| `releaseNotes` | `fr-FR` : `store/release-notes/fr-FR.txt`, 500 caractères au plus. |

`npm run check:play` contrôle la forme de cette configuration.

## Compte de service dédié aux versions (une seule fois, par Christian)

1. Google Cloud, projet `motissimo-456ba` : créer un compte de service, par exemple `motissimo-play-release`, puis une clé JSON.
2. Enregistrer la clé dans `C:\Users\<vous>\.geo-play\motissimo-release.json`. Elle ne va jamais dans Git, dans Vercel ni dans une conversation.
3. Play Console, Utilisateurs et autorisations : inviter l'adresse du compte, sur Motissimo seulement, avec « Publier des versions dans les canaux de test » et rien d'autre.

Le script affiche l'adresse du compte, jamais la clé ni le jeton.

L'API refuse le premier envoi d'une application qui n'a encore aucune version : le tout premier AAB se dépose à la main dans la Play Console (test interne). Le script sert ensuite aux versions suivantes.

## Utilisation

1. Augmenter `versionCode` dans `android/app/build.gradle`.
2. `npm run android:sync`, puis construire l'AAB signé depuis `android/`. Le dossier temporaire court évite l'erreur Gradle « Unable to establish loopback connection » :

   ```bash
   TMP='C:\tmp\motissimo' TEMP='C:\tmp\motissimo' JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:\tmp\motissimo -Djava.io.tmpdir=C:\tmp\motissimo' ./gradlew clean bundleRelease
   ```

   La signature lit `android/keystore.properties` (hors Git).
3. Simuler : `npm run play:release`. Chaque ligne est `OK`, `ATTENTION` ou `ERREUR` ; une seule `ERREUR` bloque l'envoi.
4. Envoyer en test interne, seulement si la simulation dit « prêt » : `npm run play:release -- --send`.
5. Passer `lastUploadedVersionCode` au versionCode envoyé, dans le commit de la version.

Contrôles locaux : bundle lisible, package du manifeste, versionCode (égal à Gradle, plus grand que `lastUploadedVersionCode` et que le dernier envoi du script), signature (`jarsigner -verify`, un seul signataire, empreinte égale à `uploadCertSha256`), notes de version, identifiants (hors du dépôt, compte de service, jamais un compte « billing »).

Rapport JSON hors du dépôt : `~/.geo-play/reports/fr.javachrist.motissimo/<date>-simulation.json` ou `-send.json`. Il ne contient ni clé ni jeton.

## Ce que le script remplit sur Google Play, et ce qui reste manuel

| Élément | Qui |
| --- | --- |
| AAB sur la piste test interne, avec le nom de version et les notes `fr-FR` | Script (`--send`) |
| Premier AAB de l'application | Play Console, à la main |
| Fiche Store : titre, descriptions, captures, icône, image de présentation (texte prêt dans `store/play-listing.fr.md`) | Play Console. L'API Edits le permettrait, mais le script ne le fait pas. |
| Sécurité des données | Play Console |
| Classification du contenu, public cible, accès à l'application, déclaration Annonces, identifiant publicitaire (« Non ») | Play Console, aucune API |
| URL de suppression de compte (`https://motissimo.vercel.app/supprimer-mon-compte`) et politique de confidentialité | Play Console |
| Tests fermés, ouverts, production | Play Console, décision de Christian |
