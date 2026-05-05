import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const today = new Date().toISOString().slice(0, 10);

const { data: livraisons } = await admin
  .from("livraisons")
  .select("id, date_prevue, statut, livreur_id, clients(raison_sociale)")
  .order("date_prevue", { ascending: false })
  .limit(10);

console.log(`\nDate du jour : ${today}\n`);
console.log("10 dernieres livraisons :");
console.table(
  livraisons?.map((l) => ({
    client: (Array.isArray(l.clients) ? l.clients[0] : l.clients)?.raison_sociale,
    date_prevue: l.date_prevue,
    today: l.date_prevue === today ? "✓" : "—",
    statut: l.statut,
    livreur_assigne: l.livreur_id ? "oui" : "NON",
  })) ?? [],
);

const { data: livreur } = await admin
  .from("profiles")
  .select("id, nom")
  .eq("role", "livreur")
  .eq("actif", true)
  .single();

console.log(`\nLivreur de test (id) : ${livreur?.id} — ${livreur?.nom}`);
