import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const tables = ["lots", "mouvements_stock"];
const views = ["stock_par_lot", "stock_par_produit"];

console.log("");
console.log("Tables :");
for (const t of tables) {
  const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
  console.log(error ? `  ✖ ${t}: ${error.message}` : `  ✓ ${t}: ${count} ligne(s)`);
}

console.log("");
console.log("Vues :");
for (const v of views) {
  const { count, error } = await admin.from(v).select("*", { count: "exact", head: true });
  console.log(error ? `  ✖ ${v}: ${error.message}` : `  ✓ ${v}: ${count} ligne(s)`);
}

console.log("");
const { data: stock } = await admin.from("stock_par_produit").select("*").order("nom");
if (stock?.length) {
  console.log("Stock par produit :");
  console.table(stock);
}
