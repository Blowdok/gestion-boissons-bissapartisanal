// Verification rapide de la configuration Supabase
// Lance avec: node --env-file=.env.local scripts/check-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

const mask = (s) => (s ? `${s.slice(0, 12)}…${s.slice(-4)} (${s.length} car.)` : "absente");

console.log("");
console.log("URL              :", url ?? "ABSENTE");
console.log("Cle publishable  :", mask(anon));
console.log("Cle secret       :", mask(service));
console.log("");

if (!url || !anon || !service) {
  console.error("✖ Une variable est manquante dans .env.local");
  process.exit(1);
}

let ok = true;

// 1) Health endpoints HTTP de base
try {
  const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
  console.log(r.ok ? `✓ /auth/v1/health   → ${r.status}` : `✖ /auth/v1/health   → ${r.status}`);
  if (!r.ok) ok = false;
} catch (e) {
  console.log(`✖ /auth/v1/health   → erreur reseau : ${e.message}`);
  ok = false;
}

// 2) Cle anon : requete REST sur le schema publique
try {
  const supa = createClient(url, anon);
  const { error } = await supa.from("_supabase_check_does_not_exist").select("*").limit(1);
  // On attend une erreur "relation ... does not exist" — preuve que la cle est acceptee
  if (error && /does not exist|relation|Could not find the table|schema cache/i.test(error.message)) {
    console.log("✓ Cle publishable   → acceptee par PostgREST (table inexistante attendue)");
  } else if (!error) {
    console.log("✓ Cle publishable   → connectee");
  } else {
    console.log(`✖ Cle publishable   → ${error.message}`);
    ok = false;
  }
} catch (e) {
  console.log(`✖ Cle publishable   → ${e.message}`);
  ok = false;
}

// 3) Cle service_role : doit pouvoir lister les utilisateurs auth
try {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.log(`✖ Cle secret        → ${error.message}`);
    ok = false;
  } else {
    console.log(`✓ Cle secret        → admin API OK (${data.users.length} utilisateur(s) visibles)`);
  }
} catch (e) {
  console.log(`✖ Cle secret        → ${e.message}`);
  ok = false;
}

console.log("");
console.log(ok ? "✅ Tout est bon, on peut attaquer la Phase 1." : "❌ Il y a un probleme — voir au-dessus.");
process.exit(ok ? 0 : 1);
