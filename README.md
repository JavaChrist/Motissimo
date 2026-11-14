# Word Tiles — Jeu de mots en français

Un jeu de puzzle de mots relaxant où vous devez trouver les mots cachés en sélectionnant des tuiles de lettres. Construit comme une PWA (Progressive Web App) prête pour le déploiement sur Vercel et les stores mobile.

## Fonctionnalités

- **20 niveaux** progressifs organisés par catégories (Fruits, Animaux, Couleurs, etc.)
- **3 niveaux de difficulté** : Facile, Moyen, Difficile
- **Système de score** avec points bonus pour les mots supplémentaires
- **Étoiles** (1-3) par niveau selon la performance
- **Indices** : révéler une lettre ou mélanger les tuiles
- **PWA complète** : installable sur l'écran d'accueil, fonctionne hors-ligne
- **Firebase** : authentification (anonyme + Google), sauvegarde de la progression
- **Mode local** : fonctionne sans Firebase configuré (sauvegarde localStorage)

## Stack technique

- **Next.js 16** + TypeScript + Tailwind CSS v4
- **shadcn/ui** pour les composants UI
- **Framer Motion** pour les animations
- **Firebase** (Auth, Firestore)
- **PWA** avec service worker et manifest

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'app est accessible sur [http://localhost:3000](http://localhost:3000).

## Configuration Firebase (optionnel)

L'app fonctionne sans Firebase. Pour activer la synchronisation cloud :

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activez **Authentication** (Anonyme + Google)
3. Créez une base de données **Firestore**
4. Copiez `.env.example` en `.env.local` et remplissez les valeurs

```bash
cp .env.example .env.local
```

## Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

Ajoutez vos variables d'environnement Firebase dans les paramètres du projet Vercel.

## Règles Firestore

`firestore.rules` : chaque joueur lit et écrit seulement `users/{son uid}`. Les grilles en ligne (`puzzles`) sont lisibles par tous et modifiables par l'administration seule. Les grilles du jeu sont dans l'application : le client ne les écrit plus.

Tests des règles, sur l'émulateur (le dossier temporaire court évite l'erreur Java « UnixDomainSockets.connect Invalid argument » sous Windows) :

```bash
TMP='C:\tmp\motissimo' TEMP='C:\tmp\motissimo' JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:\tmp\motissimo -Djava.io.tmpdir=C:\tmp\motissimo' npm run test:rules
```

Déploiement en production, seulement après accord : `firebase deploy --only firestore:rules`.

## Application Android (Google Play)

L'application Android est construite avec Capacitor (`android/`). Construction de l'AAB, envoi en test interne et remplissage de la Play Console : voir [`docs/play-release.md`](docs/play-release.md). Texte de la fiche : [`store/play-listing.fr.md`](store/play-listing.fr.md).

`public/app-ads.txt` déclare l'éditeur AdMob. Il est servi à la racine du site (`https://motissimo.vercel.app/app-ads.txt`), le site déclaré dans la Play Console.

## Comment jouer

1. **Sélectionnez** des tuiles de lettres pour former un mot
2. **Validez** en appuyant sur le bouton
3. Si le mot correspond à un mot cible, les tuiles disparaissent
4. **Trouvez** tous les mots pour compléter le niveau
5. Trouvez des mots bonus pour des points supplémentaires !

## Structure du projet

```
src/
├── app/                  # Pages Next.js (App Router)
├── components/
│   ├── game/             # Composants du jeu
│   │   ├── GameScreen    # Écran de jeu principal
│   │   ├── TileGrid      # Grille de tuiles interactives
│   │   ├── WordSlots     # Affichage des mots à trouver
│   │   ├── StartScreen   # Écran d'accueil
│   │   └── LevelSelect   # Sélection des niveaux
│   └── ui/               # Composants shadcn/ui
├── hooks/                # Hooks React (useGame, useAuth)
├── lib/                  # Logique métier
│   ├── game-engine.ts    # Moteur de jeu
│   ├── levels.ts         # Données des niveaux
│   ├── firebase.ts       # Config Firebase
│   └── firebase-db.ts    # Opérations Firestore
public/
├── manifest.json         # Manifest PWA
├── sw.js                 # Service Worker
└── icons/                # Icônes de l'app
```
