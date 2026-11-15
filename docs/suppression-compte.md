# Traiter une demande de suppression de compte

Les demandes arrivent à support@javachrist.fr, depuis la page `/supprimer-mon-compte` ou le bouton « Demander la suppression du compte » de Mes données, qui ajoute l'identifiant du compte. Délai annoncé : **un mois**.

Le script `scripts/delete-account.mjs` utilise la session du CLI Firebase (`firebase login`), sans clé de compte de service. Il n'a aucune dépendance.

**Prérequis :** les règles `firestore.rules`, avec le blocage par `deleted_accounts/{uid}`, sont déployées en production. Sans elles, la marque ne bloque rien.

## Étapes

1. **Retrouver le compte.**
   - Compte anonyme : l'identifiant est dans l'e-mail.
   - Compte Google : `node scripts/delete-account.mjs --email <adresse>` affiche l'uid.
2. **Simuler** : `node scripts/delete-account.mjs <uid>`. Rien n'est supprimé. Le script affiche :
   - le type de compte et l'e-mail masqué ;
   - la présence de `users/{uid}` ;
   - l'état d'une éventuelle marque de suppression ;
   - les **comptes anonymes liés** : ceux dont la progression a été fusionnée dans ce compte Google (voir « Passage d'un compte anonyme vers Google »).
3. **Supprimer** : `node scripts/delete-account.mjs <uid> --confirm`. Les comptes anonymes liés sont supprimés d'abord, avec les mêmes étapes (et leur propre marque). Chaque étape peut être rejouée :
   1. Le script pose la marque `deleted_accounts/{uid}` (uid et date de la demande). Les règles refusent alors toute lecture et toute écriture de `users/{uid}`, même avec un jeton encore valide (une heure au plus).
   2. Il supprime `users/{uid}`.
   3. Il supprime le compte Firebase Authentication. Un compte déjà absent compte comme supprimé.
   4. Il vérifie que le compte et la progression n'existent plus.
   5. Il note la fin dans la marque (`completedAt`) et fixe son effacement à `expireAt`, soit 24 heures plus tard.

   **En cas d'échec** (réseau, droits), relancer la même commande. La marque reste en place et continue de bloquer l'accès jusqu'à la fin.
4. **Une fois les 24 heures écoulées, effacer la marque** : `node scripts/delete-account.mjs --purge --confirm`.
   - Attendre l'heure affichée à l'étape 5/5 (« Marque à effacer après le … »). « Le lendemain » peut être trop tôt selon l'heure : une marque pas encore expirée est gardée, et la purge n'efface rien.
   - Chaque `--confirm` purge aussi les marques expirées.
   - Une marque sans `completedAt` signale une suppression inachevée : le script la garde et l'indique. Relancer alors la suppression de cet uid.
5. **Répondre à la demande.** Rappeler :
   - sur un appareil encore utilisé, la copie locale de la progression est effacée au lancement suivant ;
   - les autres données de l'appareil s'effacent depuis Mes données, en vidant les données de l'application ou en la désinstallant ;
   - les données publicitaires relèvent de Google ;
   - les requêtes visibles dans les Runtime Logs de Vercel y restent 30 jours (offre Pro avec Observability Plus, aucun drain). Si motissimo est exclu d'Observability Plus (1 jour) ou si un drain est ajouté, mettre à jour les textes légaux.

Sans identifiant ni adresse Google, un compte anonyme ne peut pas être retrouvé : le dire dans la réponse.

## Passage d'un compte anonyme vers Google

Lors de la connexion Google depuis un compte anonyme U :

- **Google n'a pas encore de compte Motissimo** : Google est lié à U. L'uid ne change pas, rien n'est copié.
- **Google a déjà un compte G** : la progression de U est fusionnée dans `users/G`. U et `users/U` sont supprimés une fois la fusion confirmée par le serveur. L'application :
  1. enregistre le transfert sur l'appareil (`wordtiles_account_transfer`), avec l'uid de G dès qu'il est connu ;
  2. marque `users/U` avec `transferredTo: G`, puis écrit la fusion dans `users/G` avec `transferredFrom: [U, …]` ;
  3. supprime `users/U`, puis le compte Auth U, depuis une seconde session Firebase qui garde U sur l'appareil.

  En cas d'échec ou de coupure, tout est gardé et le transfert reprend au lancement suivant, seulement vers G.

  **Score après fusion** : jamais la somme des deux totaux. Le total est recalculé (`src/lib/score.ts`) : meilleur score de chaque niveau réussi, plus les points du défi du jour par date (`dailyScores`) ; une date jouée sur les deux comptes ne compte qu'une fois, avec le meilleur score. C'est vrai même si les deux grilles diffèrent : en mode Découverte, le défi d'une date est tiré parmi les grilles enfant (`puzzleForDay`), donc un compte en Découverte et un compte en mode normal n'ont pas joué la même grille ce jour-là, et seul le meilleur des deux scores est gardé. La même règle vaut partout dans le jeu (un rejeu ne compte que s'il bat le meilleur score du niveau). Les anciens totaux, qui cumulaient les rejeux, sont recalculés au chargement ; les points de défi joués avant cette version ne sont pas connus par date et ne sont plus comptés.

  **Preuve de suppression de U** : `auth/user-token-expired` ne la donne pas (le SDK renvoie ce code pour un compte supprimé comme pour une session expirée ou révoquée). L'application renouvelle la session de U avec son jeton enregistré (`anonRefreshToken`, endpoint securetoken) : seul `USER_NOT_FOUND` vaut suppression confirmée. `TOKEN_EXPIRED`, `USER_DISABLED`, `INVALID_REFRESH_TOKEN`, réseau : le nettoyage reste en attente (étape `cleanup` gardée) et est retenté à chaque lancement. Une suppression faite par l'application elle-même (`deleteUser` réussi) termine normalement.

**Pour le support**, supprimer G supprime aussi les comptes anonymes liés, trouvés par `users/G.transferredFrom` ou par `users/U.transferredTo == G`, même si seul le compte Auth U reste. La simulation les affiche.

## Pourquoi 24 heures

La marque contient l'uid, une donnée personnelle : elle ne vit que le temps utile.

- Un jeton d'identification Firebase est valable une heure au plus. Il ne peut plus être renouvelé une fois le compte Auth supprimé.
- Les 24 heures couvrent cette heure et un décalage d'horloge. La purge de l'étape 4 se lance une fois ces 24 heures écoulées.

## Limites connues

- **Versions 1.0.1 et antérieures** (test interne uniquement) : relancées après une suppression, elles ont pu renvoyer leur copie locale sous un nouveau compte anonyme. Les versions suivantes rattachent la copie à son compte et l'effacent.
- **Transfert interrompu, puis données de l'application effacées** : la seconde session est perdue, l'appareil ne peut plus supprimer U. U reste lié à G par `transferredTo` ou `transferredFrom`, et il est supprimé avec G sur demande.
- **Session de U révoquée, compte U existant** : l'appareil ne peut pas supprimer U, le nettoyage reste en attente (et un nouveau passage vers Google attend sa fin). Sur demande, le support supprime U seul : `node scripts/delete-account.mjs <U> --confirm` ; au lancement suivant, le renouvellement répond `USER_NOT_FOUND` et le transfert se termine.
- **Émulateur Auth** : pour un compte supprimé, il répond `INVALID_REFRESH_TOKEN` (pas `USER_NOT_FOUND`, réponse documentée par Firebase en production, non vérifiée ici) et n'applique pas la révocation des sessions. En local, une suppression faite hors de l'application laisse donc le nettoyage en attente.
- **Pas d'effacement automatique** : sans politique TTL Firestore sur `expireAt` (à activer seulement avec un accord explicite), l'effacement dépend de l'étape 4.

## Tests

- `npm run test:rules` : règles, dont le blocage par la marque.
- `npm run test:delete` : reprise après un échec à chaque étape, et purge.
- `npm run test:owner` : copie locale et changement de compte.
- `npm run test:transfer` : score total recalculé (défi compté une fois par date), fusion (meilleur temps d'une réussite valide, grilles vues sans doublon), reprise du transfert après une panne à chaque étape, session révoquée laissée en attente, preuve de suppression (`USER_NOT_FOUND` seulement).

Les deux premiers lancent les émulateurs. Sous Windows, il faut un dossier temporaire court :

```bash
TMP='C:\tmp\motissimo' TEMP='C:\tmp\motissimo' JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:\tmp\motissimo -Djava.io.tmpdir=C:\tmp\motissimo' npm run test:delete
```
