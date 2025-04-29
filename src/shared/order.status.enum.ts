export enum OrderStatus {
    EN_ATTENTE = 'EN_ATTENTE', // En attente d'être pris en charge par un chauffeur.
    ENTRE_CENTRAL = 'ENTRE_CENTRAL', // Le colis est dans un entrepôt central.
    ASSIGNE = 'ASSIGNE', // Assigné à un chauffeur.
    EN_COURS_LIVRAISON = 'EN_COURS_LIVRAISON', // En cours de livraison.
    LIVRE = 'LIVRE', // Livré avec succès.
    ECHEC_LIVRAISON = 'ECHEC_LIVRAISON', // Tentative de livraison échouée (client introuvable, adresse incorrecte, etc.).
    RETOURNE = 'RETOURNE', // Retourné au partenaire (si non livrable).
    ANNULE = 'ANNULE', // Annulé par le client ou le partenaire.
    EN_ATTENTE_RESOLUTION = 'EN_ATTENTE_RESOLUTION', // En attente de résolution d'un problème (exemple : colis endommagé).
    RELANCE = 'RELANCE', // Relancé après une tentative échouée.
    RETARDE = 'RETARDE', // Livraison retardée (conditions météo, etc.).
    PARTIELLEMENT_LIVRE = 'PARTIELLEMENT_LIVRE', // Une partie du colis a été livrée.
    EN_ENTREPOT = 'EN_ENTREPOT', // Le colis est stocké temporairement dans un entrepôt.
    EN_ATTENTE_CONFIRMATION = 'EN_ATTENTE_CONFIRMATION', // En attente de confirmation du client après une tentative de livraison.
    VERIFICATION = 'VERIFICATION', // En cours de vérification (ex : identité, contenu, etc.).
  }