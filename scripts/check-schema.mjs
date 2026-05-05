// Verifie l'etat du schema apres migration
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false } });

const tables = ["profiles", "parfums", "clients", "tarifs_clients"];
let ok = true;

console.log("");
for (const t of tables) {
  const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
  if (error) {
    console.log(`✖ ${t.padEnd(16)} ${error.message}`);
    ok = false;
  } else {
    console.log(`✓ ${t.padEnd(16)} ${count} ligne(s)`);
  }
}

const { data: parfums } = await admin
  .from("parfums")
  .select("nom")
  .order("nom");

if (parfums?.length) {
  console.log("");
  console.log("Parfums dans la BDD :");
  for (const p of parfums) console.log("  •", p.nom);
}

const { data: clients } = await admin
  .from("clients")
  .select("raison_sociale, ville")
  .order("raison_sociale");

if (clients?.length) {
  console.log("");
  console.log("Clients dans la BDD :");
  for (const c of clients) console.log("  •", c.raison_sociale, c.ville ? `(${c.ville})` : "");
}

console.log("");
process.exit(ok ? 0 : 1);
