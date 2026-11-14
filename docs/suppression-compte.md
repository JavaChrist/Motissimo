# Traiter une demande de suppression de compte

Les demandes arrivent à support@javachrist.fr (page `/supprimer-mon-compte`, ou bouton « Demander la suppression du compte » de Mes données, qui ajoute l'identifiant du compte). Délai annoncé : **un mois**.

Le script `scripts/delete-account.mjs` utilise la session du CLI Firebase (`firebase login`), sans clé de compte de service. Il n'a aucune dépendance.

1. Retrouver le compte :
   - compte anonyme : l'identifiant est dans l'e-mail ;
   - compte Google : `node scripts/delete-account.mjs --email <adresse>` affiche l'uid.
2. Simuler : `node scripts/delete-account.mjs <uid>`. Le script affiche le type de compte, l'e-mail masqué et la présence de `users/{uid}`. Rien n'est supprimé.
3. Supprimer : `node scripts/delete-account.mjs <uid> --confirm`. Le script supprime d'abord `users/{uid}` dans Firestore (seulement si le document n'a pas changé depuis la lecture), puis le compte Firebase Authentication. La suppression est définitive.
4. Répondre à la demande. Rappeler que les données de l'appareil s'effacent depuis Mes données, en vidant les données de l'application ou en la désinstallant, et que les données publicitaires relèvent de Google.

Sans identifiant ni adresse Google, un compte anonyme ne peut pas être retrouvé : le dire dans la réponse.
