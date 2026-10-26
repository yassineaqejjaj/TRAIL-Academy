/** Illustrative deliverables. Every organisation, figure and name is invented; they show the expected shape, not real results. */
export interface DeliverableExample { code: string; title: string; context: string; excerpt: { label: string; value: string }[]; criteria: string[] }

export const deliverableExamples: DeliverableExample[] = [
  { code: "M4", title: "Bibliothèque de prompts évalués", context: "Une équipe support veut un prompt fiable pour classer les demandes entrantes.",
    excerpt: [
      { label: "Prompt", value: "Tu es un agent de tri. À partir du message client ci-dessous, renvoie la catégorie (facturation, technique, autre) et une phrase de justification. Si le message est ambigu, réponds « à vérifier »." },
      { label: "Jeu de test", value: "20 messages inventés, dont 4 ambigus et 2 pièges (message sans demande, message dans une autre langue)." },
      { label: "Critères", value: "Catégorie juste dans 80 % des cas ou plus ; aucune catégorie inventée ; « à vérifier » utilisé sur tous les cas ambigus." },
      { label: "Résultat v2", value: "17 cas sur 20 corrects, 1 catégorie inventée corrigée en ajoutant l'instruction « ne propose aucune autre catégorie »." },
    ], criteria: ["Les critères sont écrits avant le test.", "Le jeu de test contient des cas difficiles.", "Chaque version du prompt est comparée à la précédente.", "Les échecs sont analysés, pas seulement comptés."] },
  { code: "M10", title: "Analyse de risques d'un cas d'usage IA", context: "Un service RH envisage un assistant pour répondre aux questions des salariés sur les congés.",
    excerpt: [
      { label: "Cas d'usage", value: "Assistant de questions-réponses sur la politique de congés, réservé aux salariés, sans accès aux dossiers individuels." },
      { label: "Risque 1", value: "Réponse erronée sur un droit à congé. Gravité : moyenne. Mesure : réponses limitées aux documents officiels cités, renvoi vers un conseiller RH en cas de doute." },
      { label: "Risque 2", value: "Fuite de données personnelles. Gravité : élevée. Mesure : aucun accès aux données individuelles ; consignes de ne pas saisir de données de santé." },
      { label: "Transparence", value: "Mention « Réponse générée par une IA, à vérifier » sur chaque réponse." },
      { label: "Décision", value: "Déploiement pilote sur 20 salariés, revue après 8 semaines. À valider par le juridique et le DPO." },
    ], criteria: ["Le cas d'usage est borné.", "Chaque risque a une gravité et une mesure.", "La supervision humaine est décrite.", "Le texte ne prétend pas être un avis juridique."] },
  { code: "M15", title: "Modèle de coûts et business case", context: "Une équipe produit chiffre un assistant de rédaction de réponses clients.",
    excerpt: [
      { label: "Hypothèse volume", value: "3 000 réponses par mois (hypothèse à confirmer avec les données réelles)." },
      { label: "Coût par réponse", value: "0,04 € de modèle + 0,01 € d'infrastructure, soit 0,05 € (valeurs illustratives)." },
      { label: "Coût mensuel", value: "3 000 × 0,05 € = 150 € par mois, hors temps de relecture." },
      { label: "Gain estimé", value: "2 minutes gagnées par réponse sur 3 000 réponses = 100 heures par mois." },
      { label: "Scénarios", value: "Prudent : 50 % du gain. Attendu : 75 %. Optimiste : 100 %. Seuil de rentabilité atteint dès le scénario prudent." },
    ], criteria: ["Les hypothèses sont explicites et séparées des faits.", "Le calcul est reproductible dans un tableur.", "Trois scénarios sont comparés.", "Le temps humain de contrôle est compté."] },
  { code: "M16", title: "Plan d'adoption IA pour une équipe", context: "Une équipe de 12 personnes doit adopter un assistant IA dans son travail quotidien.",
    excerpt: [
      { label: "Freins repérés", value: "Peur de l'erreur, manque de temps pour apprendre, doutes sur la confidentialité." },
      { label: "Leviers", value: "Deux relais volontaires, une heure de pratique par semaine sur le temps de travail, une règle claire sur les données autorisées." },
      { label: "Mini-pilote", value: "4 semaines, 5 personnes, 3 tâches ciblées (compte rendu, brouillon d'e-mail, recherche documentaire)." },
      { label: "Indicateurs", value: "Usage hebdomadaire déclaré, temps gagné estimé par tâche, satisfaction (1 à 5), incidents signalés." },
      { label: "Décision", value: "Étendre si au moins 4 personnes sur 5 l'utilisent chaque semaine et qu'aucun incident de données n'est signalé." },
    ], criteria: ["Les indicateurs sont mesurables.", "Le pilote est borné dans le temps.", "Le critère de décision est écrit avant le pilote.", "Les freins des personnes sont traités, pas seulement les outils."] },
  { code: "M26", title: "Playbook de revue de contrat assistée par IA", context: "Un service juridique veut accélérer la première lecture des contrats de prestation.",
    excerpt: [
      { label: "Clause : responsabilité", value: "Position standard : plafond égal au montant annuel du contrat. Repli acceptable : deux fois ce montant. Inacceptable : responsabilité illimitée." },
      { label: "Consigne à l'IA", value: "Repère la clause de responsabilité, cite le passage exact, classe-la (standard, repli, inacceptable) et ne propose aucune reformulation." },
      { label: "Escalade", value: "Toute clause classée « inacceptable » ou absente est transmise à un juriste." },
      { label: "Mesure de fiabilité", value: "Sur 10 contrats fictifs : 1 clause manquée, 2 faux positifs. Contrôle humain maintenu sur 100 % des contrats." },
    ], criteria: ["Chaque clause a trois niveaux de position.", "L'IA cite le passage, elle ne paraphrase pas.", "Les cas d'escalade sont listés.", "La fiabilité est mesurée avant de réduire le contrôle."] },
  { code: "M28", title: "Pack de reporting mensuel avec explication d'écarts", context: "Un contrôleur de gestion prépare le reporting de clôture d'une entreprise fictive.",
    excerpt: [
      { label: "Écart", value: "Résultat inférieur au budget de 22 000 € (chiffres fictifs)." },
      { label: "Décomposition", value: "Effet volume : +16 000 €. Effet prix : −16 800 €. Autres charges : −21 200 €. Calculé dans le tableur, vérifié par recoupement." },
      { label: "Commentaire de gestion", value: "Brouillon rédigé avec l'IA à partir des chiffres calculés, chaque affirmation reliée à une ligne du tableur." },
      { label: "Contrôles", value: "Total des écarts = écart global ; relecture à quatre yeux avant diffusion." },
    ], criteria: ["Les chiffres viennent du tableur, pas du modèle.", "Chaque phrase du commentaire est traçable.", "Les écarts se recoupent avec le total.", "Une seconde personne relit avant diffusion."] },
];
