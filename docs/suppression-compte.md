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
   - l'état d'une éventuelle marque de suppression.
3. **Supprimer** : `node scripts/delete-account.mjs <uid> --confirm`. Chaque étape peut être rejouée :
   1. Le script pose la marque `deleted_accounts/{uid}` (uid et date de la demande). Les règles refusent alors toute lecture et toute écriture de `users/{uid}`, même avec un jeton encore valide (une heure au plus).
   2. Il supprime `users/{uid}`.
   3. Il supprime le compte Firebase Authentication. Un compte déjà absent compte comme supprimé.
   4. Il vérifie que le compte et la progression n'existent plus.
   5. Il note la fin dans la marque (`completedAt`) et fixe son effacement à `expireAt`, soit 24 heures plus tard.

   **En cas d'échec** (réseau, droits), relancer la même commande. La marque reste en place et continue de bloquer l'accès jusqu'à la fin.
4. **Le lendemain, effacer les marques expirées** : `node scripts/delete-account.mjs --purge --confirm`.
   - Chaque `--confirm` purge aussi les marques expirées.
   - Une marque sans `completedAt` signale une suppression inachevée : le script la garde et l'indique. Relancer alors la suppression de cet uid.
5. **Répondre à la demande.** Rappeler :
   - sur un appareil encore utilisé, la copie locale de la progression est effacée au lancement suivant ;
   - les autres données de l'appareil s'effacent depuis Mes données, en vidant les données de l'application ou en la désinstallant ;
   - les données publicitaires relèvent de Google ;
   - les requêtes visibles dans les Runtime Logs de Vercel y restent 1 jour (offre Pro, sans Observability Plus ni drain). Si cette configuration change, mettre à jour les textes légaux.

Sans identifiant ni adresse Google, un compte anonyme ne peut pas être retrouvé : le dire dans la réponse.

## Pourquoi 24 heures

La marque contient l'uid, une donnée personnelle : elle ne vit que le temps utile.

- Un jeton d'identification Firebase est valable une heure au plus. Il ne peut plus être renouvelé une fois le compte Auth supprimé.
- Les 24 heures couvrent cette heure, un décalage d'horloge et le passage du lendemain (étape 4).

## Limites connues

- **Versions 1.0.1 et antérieures** (test interne uniquement) : relancées après une suppression, elles ont pu renvoyer leur copie locale sous un nouveau compte anonyme. Les versions suivantes rattachent la copie à son compte et l'effacent.
- **Pas d'effacement automatique** : sans politique TTL Firestore sur `expireAt` (à activer seulement avec un accord explicite), l'effacement dépend de l'étape 4.

## Tests

- `npm run test:rules` : règles, dont le blocage par la marque.
- `npm run test:delete` : reprise après un échec à chaque étape, et purge.
- `npm run test:owner` : copie locale et changement de compte.

Les deux premiers lancent les émulateurs. Sous Windows, il faut un dossier temporaire court :

```bash
TMP='C:\tmp\motissimo' TEMP='C:\tmp\motissimo' JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:\tmp\motissimo -Djava.io.tmpdir=C:\tmp\motissimo' npm run test:delete
```
