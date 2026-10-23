# Sessions en visio

Ateliers pratiques et séances de questions-réponses en direct. Page publique : **/sessions** (calendrier mensuel + prochaines sessions + flux ICS public). Administration : **Administration → Sessions en visio**.

## Fonctionnement
- Vous créez une session : titre, description, date et heure **à l'heure de Paris** (l'heure d'été est gérée), durée, nombre de places, module concerné (facultatif), public (**apprenants** : accès actif au module, ou à n'importe quel module si aucun n'est choisi ; **tous les comptes**), lien de visio, statut (brouillon / publiée).
- Sans lien fourni, une **salle privée au nom imprévisible** est créée sur le service libre **Jitsi Meet** (`meet.jit.si`). Vous pouvez la remplacer par n'importe quel lien `https://` (Jitsi auto-hébergé, autre outil de visio). Le lien n'est **jamais exposé** par le calendrier public ni dans le flux ICS public : seules les personnes **inscrites** le voient (règle appliquée en SQL, testée).
- Réservation : place confirmée tant qu'il en reste, sinon **liste d'attente** ; l'annulation d'une personne inscrite place automatiquement la première personne en attente ; augmenter le nombre de places fait entrer les personnes en attente. Les règles sont décidées en base sous verrou (pas de survente en cas de réservations simultanées).
- Chaque inscrit(e) peut **ajouter la session à son agenda** (fichier .ics avec rappel 15 minutes avant) et la retrouve dans **Mon espace → Mes sessions**.
- Annuler une session prévient (par e-mail) les inscrits et la liste d'attente.

## À savoir
- **E-mails** (confirmation, place libérée, annulation) : envoyés seulement si le SMTP est configuré. Aucun rappel automatique n'est programmé.
- Sessions **gratuites** pour l'instant. Des sessions payantes (ou du coaching individuel) demanderaient un produit Stripe dédié : non développé.
- Le service public Jitsi est gratuit mais sans garantie : pour des sessions importantes ou confidentielles, hébergez votre propre instance ou utilisez un autre lien.
- Données personnelles : les réservations figurent dans l'export de données de la personne et sont supprimées avec son compte.
- Enregistrer une session impose d'en informer les participants (droit à l'image, RGPD) : à traiter avec votre juriste avant de le faire.
