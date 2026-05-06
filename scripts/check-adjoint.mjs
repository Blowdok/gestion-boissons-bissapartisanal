import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

console.log("");
// On essaie de mettre a jour un user temporairement vers 'adjoint' (puis on
// le remet) pour confirmer que la valeur est bien acceptee par l'enum.
// On utilise le user 'fabrication' comme cobaye.
const { data: fab } = await admin
  .from("profiles")
  .select("id, nom, role")
  .eq("role", "fabrication")
  .limit(1)
  .single();

if (!fab) {
  console.log("✖ Pas de user fabrication trouve.");
  process.exit(1);
}

console.log(`Cobaye : ${fab.nom} (role actuel: ${fab.role})`);
console.log("");

const { error: testErr } = await admin
  .from("profiles")
  .update({ role: "adjoint" })
  .eq("id", fab.id);

if (testErr) {
  console.log(`✖ La valeur 'adjoint' n'est PAS encore reconnue : ${testErr.message}`);
  console.log("");
  console.log("→ L'ALTER TYPE n'a pas pris. Re-applique l'etape 1 dans le SQL Editor.");
  process.exit(1);
}

console.log("✓ La valeur 'adjoint' est reconnue par l'enum.");

// On remet l'utilisateur en fabrication
const { error: revertErr } = await admin
  .from("profiles")
  .update({ role: "fabrication" })
  .eq("id", fab.id);

if (revertErr) {
  console.log(`⚠ Impossible de remettre le user en fabrication : ${revertErr.message}`);
} else {
  console.log("✓ Cobaye remis en fabrication (rien n'a change).");
}

// Verifier qu'au moins une policy adjoint existe
const { data: policies, error: polErr } = await admin
  .rpc("pg_policies_for_adjoint")
  .select();

if (polErr) {
  // La fonction n'existe pas, on fait autrement : check via INFORMATION_SCHEMA
  // pas accessible via PostgREST, donc on tente juste un SELECT en se faisant
  // passer pour un adjoint (impossible cote service_role qui bypasse RLS).
  // On affiche juste le message :
  console.log("");
  console.log("ℹ Pour verifier les policies adjoint, va dans Supabase Dashboard");
  console.log("  → Authentication → Policies, et cherche les policies dont le nom");
  console.log("  contient 'adjoint'. Tu devrais en voir 19.");
}
