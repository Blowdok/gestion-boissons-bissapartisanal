import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data } = await admin
  .from("produits")
  .select("nom, gamme, format, prix_defaut_ht, seuil_alerte")
  .order("gamme")
  .order("prix_defaut_ht")
  .order("nom");
console.table(data);
