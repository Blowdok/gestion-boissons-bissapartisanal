import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const today = new Date().toISOString().slice(0, 10);

const { data: livreur } = await admin
  .from("profiles")
  .select("id, nom")
  .eq("role", "livreur")
  .eq("actif", true)
  .single();

console.log(`\nDate jour : ${today}`);
console.log(`Livreur actif : ${livreur?.nom} (${livreur?.id})\n`);

const { data: livraisons } = await admin
  .from("livraisons")
  .select("id, date_prevue, statut, livreur_id, clients(raison_sociale)")
  .order("created_at", { ascending: false })
  .limit(10);

console.log("10 dernieres livraisons :");
console.table(
  livraisons?.map((l) => ({
    client: (Array.isArray(l.clients) ? l.clients[0] : l.clients)?.raison_sociale,
    date_prevue: l.date_prevue,
    today: l.date_prevue === today ? "✓" : "—",
    statut: l.statut,
    livreur_assigne: l.livreur_id ?? "—",
    correspond: l.livreur_id === livreur?.id ? "✓ ce livreur" : "",
  })) ?? [],
);

console.log("\nTournée du jour pour ce livreur :");
const { data: tournee } = await admin
  .from("livraisons")
  .select("id, statut, clients(raison_sociale)")
  .eq("date_prevue", today)
  .eq("livreur_id", livreur?.id)
  .in("statut", ["programmee", "en_cours"]);

if (tournee?.length) {
  console.table(tournee);
} else {
  console.log("  (vide)");
}
