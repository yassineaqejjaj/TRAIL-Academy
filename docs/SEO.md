# SEO et GEO (visibilité dans les moteurs et les assistants IA)

## Ce que le site fait déjà

| Levier | Où |
|---|---|
| Titres, descriptions, URL canoniques par page ; pages privées en `noindex` | `generateMetadata` / `metadata` de chaque page |
| Données structurées schema.org (JSON-LD) : organisation, site, formateur (Person, `sameAs` LinkedIn), Course + CourseInstance + Offer (seulement si le module est réellement achetable), FAQPage, BreadcrumbList, ItemList, BlogPosting, Blog, ProfilePage | `src/lib/seo.ts`, composant `JsonLd` |
| Aucun avis ni note dans les données structurées (pas d'`aggregateRating` : les avis réels arrivent par le flux d'invitation) | `tests/seo.test.ts` le vérifie |
| `sitemap.xml` (priorités, fréquences, dates des articles) ; `robots.txt` qui autorise explicitement les robots de recherche et d'assistants IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended…) sur les pages publiques et exclut `/admin`, `/compte`, `/apprendre`, `/achat`, `/api/` | `src/app/sitemap.ts`, `robots.ts` |
| `/llms.txt` et `/llms-full.txt` : résumé du site, modules, prix, FAQ en texte brut pour les assistants | `src/lib/llms.ts` |
| Page `/faq` (14 questions, réponses courtes et factuelles) + FAQ sur l'accueil, les tarifs et chaque module | `src/lib/faq-data.ts` |
| Flux RSS `/ressources/feed.xml` | `src/lib/rss.ts` |
| Images de partage (Open Graph) générées par module et par article | `opengraph-image.tsx` |
| Articles : auteur nommé et lié, date, encadré « En bref » (réponse d'abord) | `ressources/[slug]/page.tsx` |
| Performance et accessibilité : pages statiques/ISR, images optimisées, contrôle axe à chaque livraison | CI |

## À faire par vous (le code ne peut pas le faire)

1. **Nom de domaine définitif** puis `NEXT_PUBLIC_SITE_URL=https://votre-domaine` sur Vercel et nouveau déploiement : toutes les URL canoniques, le sitemap et les données structurées en dépendent.
2. **Google Search Console** : ajouter le domaine, renseigner `GOOGLE_SITE_VERIFICATION` (balise de vérification) sur Vercel, soumettre `https://votre-domaine/sitemap.xml`. Même chose avec **Bing Webmaster Tools** (`BING_SITE_VERIFICATION`), qui alimente aussi plusieurs assistants IA.
3. **Tester les données structurées** : https://search.google.com/test/rich-results sur une page module et sur `/faq`.
4. **Publier les contenus** : un module « Bientôt disponible » n'a ni offre ni vidéo ; plus il y a d'articles et de modules publiés, plus il y a de pages à référencer. Publiez les 12 articles du blog (ils sont en brouillon tant que vous ne les publiez pas).
5. **Avis réels** : au-delà de 3 avis publiés, un affichage d'étoiles est possible ; ne jamais en créer.
6. **Profils et citations** : LinkedIn à jour, articles repris ou cités ailleurs, mentions du site dans des annuaires de formation : c'est ce qui fait citer un site par les assistants.
7. **Politique envers les robots d'entraînement** : par défaut tous les robots listés sont autorisés (visibilité maximale). Pour refuser l'entraînement des modèles tout en restant cité, retirez `Google-Extended`, `Applebot-Extended`, `CCBot` de la liste dans `src/app/robots.ts`.

## Ce qui n'est pas vérifié

Aucun classement, trafic ou citation par un assistant ne peut être garanti ni mesuré depuis le code. Les données structurées sont validées par des tests locaux, pas encore par l'outil de Google sur le site en ligne.
