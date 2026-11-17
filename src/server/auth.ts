import "server-only";
import { config } from "./config";

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Authentification contournée : toutes les requêtes sont attribuées à l'utilisateur
 * de démonstration. Point d'entrée unique à remplacer lors de la mise en place de
 * l'authentification (session, JWT, fournisseur d'identité...).
 */
export async function getCurrentUser(_req?: Request): Promise<CurrentUser> {
  return { ...config.demoUser };
}
