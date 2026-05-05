// Supprime les doublons sur public.clients en gardant la ligne la plus ancienne
// (created_at min) par raison_sociale.
import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: rows, error } = await admin
  .from("clients")
  .select("id, raison_sociale, created_at")
  .order("raison_sociale")
  .order("created_at");

if (error) { console.error(error.message); process.exit(1); }

const seen = new Set();
const toDelete = [];
for (const r of rows) {
  if (seen.has(r.raison_sociale)) toDelete.push(r.id);
  else seen.add(r.raison_sociale);
}

console.log(`${rows.length} lignes -> ${seen.size} uniques, ${toDelete.length} a supprimer.`);

if (toDelete.length > 0) {
  const { error: delErr } = await admin.from("clients").delete().in("id", toDelete);
  if (delErr) { console.error(delErr.message); process.exit(1); }
  console.log("✓ Doublons supprimes.");
}

const { count } = await admin.from("clients").select("*", { count: "exact", head: true });
console.log(`Total final : ${count} client(s).`);
