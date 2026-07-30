import { z } from "zod";

export const inscriptionSchema = z.object({
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  telephone: z.string().trim().min(9).max(20),
  ville: z.string().trim().max(100).optional(),
  mot_de_passe: z.string().min(10).max(200),
});

export type InscriptionInput = z.infer<typeof inscriptionSchema>;

export const connexionSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  mot_de_passe: z.string().min(1).max(200),
});

export type ConnexionInput = z.infer<typeof connexionSchema>;
