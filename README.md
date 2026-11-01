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

## Stores mobile (PWA)

L'app est une PWA complète, prête pour :

- **Google Play Store** : via [PWABuilder](https://www.pwabuilder.com/) ou [Trusted Web Activity (TWA)](https://developer.chrome.com/docs/android/trusted-web-activity)
- **Apple App Store** : via [PWABuilder](https://www.pwabuilder.com/) (wrapper natif)

### Prérequis pour les stores

1. Générer des icônes PNG (192x192, 512x512) à partir des SVG dans `/public/icons/`
2. Ajouter des screenshots au `manifest.json`
3. Configurer un domaine HTTPS (fourni par Vercel)

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
