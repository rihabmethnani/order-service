export enum OrderStatus {
  EN_ATTENTE = 'EN_ATTENTE', // En attente d’être pris en charge par un livreur.
  ATTRIBUE = 'ATTRIBUÉ', // Attribué à un livreur.
  EN_LIVRAISON = 'EN_LIVRAISON', // En cours de livraison.
  LIVRE = 'LIVRÉ', // Livré avec succès.
  ECHEC_LIVRAISON = 'ÉCHEC_LIVRAISON', // Échec de la tentative de livraison (ex : client introuvable, mauvaise adresse, etc.).
  RETOURNE = 'RETOURNÉ', // Retourné au partenaire (si non livrable).
  ANNULE = 'ANNULÉ', // Annulé par le client ou le partenaire.
  EN_ATTENTE_RESOLUTION = 'EN_ATTENTE_RÉSOLUTION', // En attente de la résolution d’un problème (ex : colis endommagé).
  RETARDE = 'RETARDÉ', // Livraison retardée (ex : conditions météorologiques).
  PARTIELLEMENT_LIVRE = 'PARTIELLEMENT_LIVRÉ', // Une partie du colis a été livrée.
  EN_ENTREPOT = 'EN_ENTREPÔT', // Stocké temporairement dans un entrepôt.
  EN_ATTENTE_CONFIRMATION = 'EN_ATTENTE_CONFIRMATION', // En attente de confirmation du client après une tentative de livraison.
  EN_VERIFICATION = 'EN_VÉRIFICATION', // En cours de vérification (ex : identité, contenu, etc.).
  RELANCE = 'RELANCE', // Relance effectuée auprès du client ou du livreur.
  VERIFICATION_COMPLETE = 'VÉRIFICATION_COMPLÈTE',// Vérification terminée avec succès.

}
