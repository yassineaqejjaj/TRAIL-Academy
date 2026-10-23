# Architecture

Une application Next.js 16 (App Router) sur Vercel, une base PostgreSQL, un stockage compatible S3 et une petite passerelle de streaming sur Railway. Pas de microservices au-delà de cette passerelle, qui existe pour une raison précise (voir plus bas).

```
src/app/         routes : public, compte, apprendre, admin, achat, api/*
src/components/  système de design, mise en page, cartes, Markdown sûr
src/lib/
  db/            pool pg, asAnon / asUser / asService (un rôle PostgreSQL par transaction)
  auth/          configuration Better Auth ; auth.ts = getUser / requireUser / requireAdmin
  catalog/       modèle public + chargeur base de données (repli sur les données du seed)
  advisor/       règles + moteur déterministe (aucune IA)
  learning/      requêtes, navigation, schémas
  stripe/        garde du mode live, normalisation d'événements, gestionnaire de webhook
  storage.ts     S3 : POST et GET pré-signés, vérification d'objet
  video/         jetons de lecture signés (jose)
  email.ts       SMTP (nodemailer)
src/proxy.ts     redirection optimiste des zones privées (jamais la frontière de sécurité)
db/              migrations SQL, seed généré, fixture de démonstration
services/stream-gateway/   service Railway : sert le HLS sur jeton signé
```

## Décisions

**1. Les règles métier vivent dans PostgreSQL.** Accès, correction des quiz, complétion, création de commande, traitement des paiements, publication, prix : des fonctions `SECURITY DEFINER` transactionnelles. Raisons : elles sont impossibles à contourner depuis un client, atomiques, et testables sans réseau sur une base embarquée. Le TypeScript valide et orchestre, il ne décide pas.

**2. Un rôle PostgreSQL par transaction.** L'application se connecte avec un seul compte, puis chaque requête s'exécute dans `BEGIN; SET LOCAL ROLE <anon|authenticated|service_role>; set_config('app.uid', …, true)`. La RLS s'applique donc à chaque lecture d'un utilisateur, comme avec une API gérée, sans service tiers. `SET LOCAL` s'arrête avec la transaction : une connexion du pool ne conserve jamais les privilèges d'un autre utilisateur (testé).

**3. Autorisation en trois couches.** `proxy.ts` (optimiste) → code serveur (`requireUser`/`requireAdmin`) → RLS et fonctions qui revérifient `is_admin()`. Une couche qui céderait ne suffit pas.

**4. Better Auth plutôt qu'une authentification maison.** Mots de passe Argon2id, sessions en base, vérification d'e-mail obligatoire, réinitialisation qui révoque les sessions, Google en option, limitation de débit stockée en base (donc valable sur plusieurs instances serverless). Ses tables sont dans le schéma `auth`, fermé à tout rôle applicatif ; un trigger crée le profil et le rôle « apprenant ».

**5. Les fichiers ne passent jamais par le serveur Next.js.** Les fonctions serverless limitent la taille des requêtes. Le serveur vérifie les droits, le type et la taille annoncés, puis émet un **POST pré-signé** dont la politique impose elle-même la taille maximale et le type ; le navigateur envoie directement au bucket ; le serveur confirme que l'objet existe avant de l'enregistrer. Les téléchargements sont des URL pré-signées de 60 secondes, émises après une lecture filtrée par la RLS.

**6. Vidéo : HLS auto-hébergé derrière une passerelle.** Les segments sont privés dans le bucket (`video/<id>/`). Une vidéo HLS est une playlist et des dizaines de segments : une URL pré-signée unique ne suffit pas. La passerelle (≈150 lignes, testée) vérifie un jeton HS256 de courte durée lié à un seul média, réécrit les playlists pour propager ce jeton, gère les requêtes par plage d'octets, et refuse toute traversée de chemin. Le jeton dissuade le partage ; il n'empêche pas absolument le téléchargement. L'encodage est un script `ffmpeg` (`scripts/encode-hls.sh`), pas un service.

**7. Stripe, seule dépendance non open source.** Aucun équivalent open source d'un processeur de paiement n'existe. Il est isolé dans `src/lib/stripe/` ; la logique d'état (commande, paiement, accès, remboursement, litige) est dans la base et ne dépend pas de lui. Le webhook est la seule source d'ouverture d'accès.

**8. Le catalogue est une donnée.** `src/lib/catalog/data.ts` est la source du seed (`npm run seed:generate`) et du repli sans base. Dès qu'une base est configurée, le site public lit la base (rôle `anon`, ISR 60 s, invalidation immédiate après chaque modification admin).

**9. Un mode « connexion unique » pour la base de développement embarquée.** PGlite n'a qu'un backend : deux connexions entrelaceraient leurs requêtes dans la transaction d'un utilisateur. `DATABASE_SINGLE_CONNECTION=true` partage un seul client sérialisé. Ce mode ne doit jamais être utilisé contre un vrai serveur.

## Schéma `public` et schéma `auth`

`auth.users` est référencée par les clés étrangères du schéma `public`. Les rôles `anon`, `authenticated`, `service_role` sont créés par `db/migrations/0000_platform.sql` ; les privilèges par défaut donnent les droits sur les tables de `public`, la RLS décide des lignes. Détails : [`DATABASE.md`](DATABASE.md).
