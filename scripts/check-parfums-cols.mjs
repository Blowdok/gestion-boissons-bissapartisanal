import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Tente une requete avec gamme/format pour voir si les colonnes existent
const { data, error } = await admin.from("parfums").select("nom, gamme, format").limit(1);

if (error) {
  console.log("✖ Erreur :", error.message);
  console.log("");
  console.log("→ Les colonnes gamme/format n'existent PAS encore.");
  console.log("→ La migration 0002 doit etre appliquee.");
} else {
  console.log("✓ Colonnes gamme/format presentes.");
  console.log("Echantillon :", data);
}
