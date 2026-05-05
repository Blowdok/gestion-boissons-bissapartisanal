// Cree les 3 utilisateurs de test (un par role) via l'API admin Supabase.
// Le trigger handle_new_user() insere automatiquement la ligne dans public.profiles.
//
// Lance avec :  node --env-file=.env.local scripts/seed-users.mjs
//
// Idempotent : si un compte existe deja, il est mis a jour (mot de passe, metadata).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("✖ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env.local");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

const utilisateurs = [
  {
    email: "patron@bissapa.test",
    password: "Patron2026!",
    nom: "Patron Test",
    role: "patron",
  },
  {
    email: "fabrication@bissapa.test",
    password: "Fabrication2026!",
    nom: "Fabrication Test",
    role: "fabrication",
  },
  {
    email: "livreur@bissapa.test",
    password: "Livreur2026!",
    nom: "Livreur Test",
    role: "livreur",
  },
];

async function findUserByEmail(email) {
  // listUsers ne supporte pas le filtre par email — on parcourt jusqu'a 100 users.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

let ok = true;

for (const u of utilisateurs) {
  try {
    const existing = await findUserByEmail(u.email);

    if (existing) {
      // Met a jour mot de passe + metadata. Le trigger ne se redeclenche pas
      // sur update, on rafraichit directement public.profiles.
      const { error: upErr } = await admin.auth.admin.updateUserById(existing.id, {
        password: u.password,
        user_metadata: { nom: u.nom, role: u.role },
        email_confirm: true,
      });
      if (upErr) throw upErr;

      const { error: profErr } = await admin
        .from("profiles")
        .upsert({ id: existing.id, nom: u.nom, role: u.role, actif: true });
      if (profErr) throw profErr;

      console.log(`✓ ${u.role.padEnd(11)} ${u.email}  (mis a jour)`);
    } else {
      const { error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nom: u.nom, role: u.role },
      });
      if (error) throw error;
      console.log(`✓ ${u.role.padEnd(11)} ${u.email}  (cree)`);
    }
  } catch (e) {
    console.error(`✖ ${u.email} : ${e.message}`);
    ok = false;
  }
}

console.log("");
console.log(ok ? "✅ Utilisateurs de test prets — mots de passe ci-dessus." : "❌ Erreurs ci-dessus.");
process.exit(ok ? 0 : 1);
