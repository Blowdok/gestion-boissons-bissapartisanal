import { z } from "zod";
import { ROLES, type Role } from "@/lib/auth/roles";

export type { Role };
export { ROLES };

export const utilisateurSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide.").max(120),
  nom: z.string().trim().min(2, "Nom requis (2 caractères min).").max(80),
  role: z.enum(ROLES as readonly Role[] as unknown as [Role, ...Role[]]),
  password: z
    .string()
    .min(8, "Mot de passe trop court (8 caractères min).")
    .max(72)
    .optional()
    .or(z.literal("")),
});

export type UtilisateurInput = z.infer<typeof utilisateurSchema>;

/** Genere un mot de passe temporaire raisonnable (lettres + chiffres). */
export function generateTempPassword(length = 12) {
  const alpha = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = alpha + digits;
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  // Garantit au moins une majuscule, une minuscule, un chiffre
  return (
    pwd.slice(0, length - 3) +
    "A" +
    "z" +
    digits[Math.floor(Math.random() * digits.length)]
  );
}
