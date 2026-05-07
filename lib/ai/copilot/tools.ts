import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tools exposes au Patron Copilot. Chaque tool est une fonction de
 * lecture seule sur les vues SQL existantes (RLS Supabase s'applique).
 *
 * Aucun tool n'a la capacite de muter des donnees : c'est volontaire
 * pour eviter qu'un prompt malicieux ou une erreur du modele cree des
 * effets de bord.
 */

const moisSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format YYYY-MM attendu")
  .describe("Mois au format YYYY-MM (ex: 2026-04)");

export function buildCopilotTools(supabase: SupabaseClient) {
  return {
    /** CA mensuel encaisse + a encaisser */
    getCAMois: tool({
      description:
        "Renvoie le chiffre d'affaires d'un mois donne (encaisse, programme, total) avec le nombre de paiements.",
      inputSchema: z.object({ mois: moisSchema }),
      execute: async ({ mois }) => {
        const { data, error } = await supabase
          .from("ca_mensuel")
          .select("ca_encaisse, ca_a_encaisser, ca_total, nb_paiements")
          .eq("mois", mois)
          .maybeSingle();
        if (error) return { erreur: error.message };
        return data ?? {
          ca_encaisse: 0,
          ca_a_encaisser: 0,
          ca_total: 0,
          nb_paiements: 0,
        };
      },
    }),

    /** Depenses du mois : engagements + decaissements effectifs */
    getDepensesMois: tool({
      description:
        "Renvoie pour un mois donne : les engagements (depenses creees ce mois) et les decaissements effectifs (paiements de depenses qui ont quitte le compte ce mois). Les deux peuvent differer car une depense peut etre engagee un mois et payee plus tard.",
      inputSchema: z.object({ mois: moisSchema }),
      execute: async ({ mois }) => {
        const [{ data: engage }, { data: decaisse }] = await Promise.all([
          supabase
            .from("depenses_engagees_mensuelles")
            .select("engagement_total, nb_depenses")
            .eq("mois", mois)
            .maybeSingle(),
          supabase
            .from("decaissements_mensuels")
            .select("decaisse, decaisse_programme, decaisse_total, nb_paiements")
            .eq("mois", mois)
            .maybeSingle(),
        ]);
        return {
          engagement_total: Number(engage?.engagement_total ?? 0),
          nb_depenses_engagees: engage?.nb_depenses ?? 0,
          decaissements_effectifs: Number(decaisse?.decaisse ?? 0),
          decaissements_programmes: Number(decaisse?.decaisse_programme ?? 0),
          nb_paiements_effectifs: decaisse?.nb_paiements ?? 0,
        };
      },
    }),

    /** Resultat = CA encaisse - Decaissements (cash flow reel) */
    getResultatMois: tool({
      description:
        "Renvoie le resultat cash-flow d'un mois (CA encaisse moins decaissements effectifs des depenses) et l'etat des 3 enveloppes 50/30/20 (alloue / consomme / solde) : reinvestissement, charges, personnel.",
      inputSchema: z.object({ mois: moisSchema }),
      execute: async ({ mois }) => {
        const [{ data: ca }, { data: dec }, { data: enveloppes }] =
          await Promise.all([
            supabase
              .from("ca_mensuel")
              .select("ca_encaisse")
              .eq("mois", mois)
              .maybeSingle(),
            supabase
              .from("decaissements_mensuels")
              .select("decaisse")
              .eq("mois", mois)
              .maybeSingle(),
            supabase
              .from("enveloppes_mensuelles")
              .select("source_fonds, alloue, consomme, solde")
              .eq("mois", mois),
          ]);
        const caEncaisse = Number(ca?.ca_encaisse ?? 0);
        const decaissements = Number(dec?.decaisse ?? 0);
        const resultat = caEncaisse - decaissements;
        return {
          ca_encaisse: caEncaisse,
          decaissements,
          resultat,
          enveloppes: (enveloppes ?? []).map((e) => ({
            enveloppe: e.source_fonds,
            alloue: Number(e.alloue),
            consomme: Number(e.consomme),
            solde: Number(e.solde),
          })),
        };
      },
    }),

    /** Echeances de paiements depense a venir */
    getEcheancesAVenir: tool({
      description:
        "Liste les echeances de paiements de depenses planifiees dans les N prochains jours (paiements prevus mais pas encore effectues). Utile pour anticiper le cash-flow et eviter les retards.",
      inputSchema: z.object({
        dans_jours: z.number().int().min(1).max(180).default(30),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ dans_jours, limit }) => {
        const limite = new Date();
        limite.setDate(limite.getDate() + dans_jours);
        const limiteStr = limite.toISOString().slice(0, 10);

        const { data, error } = await supabase
          .from("echeances_a_venir")
          .select(
            "id, depense_id, montant, date_prevue, mode, categorie, source_fonds, depense_description, urgence",
          )
          .lte("date_prevue", limiteStr)
          .order("date_prevue", { ascending: true })
          .limit(limit);
        if (error) return { erreur: error.message };
        return {
          echeances: (data ?? []).map((e) => ({
            date_prevue: e.date_prevue,
            montant: Number(e.montant),
            categorie: e.categorie,
            enveloppe: e.source_fonds,
            description: e.depense_description ?? "—",
            mode: e.mode,
            urgence: e.urgence, // 'en_retard' | 'imminente' | 'planifiee'
          })),
        };
      },
    }),

    /** Depenses non soldees */
    getDepensesNonSoldees: tool({
      description:
        "Liste les depenses qui ne sont pas entierement payees (statuts : a_payer, prevu, partiel) avec leur reste a payer. Utile pour voir les dettes fournisseurs ouvertes.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async ({ limit }) => {
        const { data, error } = await supabase
          .from("depenses_avec_solde")
          .select(
            "id, date, montant_total, deja_paye, reste_a_payer, statut_paiement, categorie, source_fonds, description, prochaine_echeance",
          )
          .neq("statut_paiement", "paye")
          .order("date", { ascending: false })
          .limit(limit);
        if (error) return { erreur: error.message };
        return {
          depenses: (data ?? []).map((d) => ({
            date_engagement: d.date,
            categorie: d.categorie,
            enveloppe: d.source_fonds,
            description: d.description ?? "—",
            montant_total: Number(d.montant_total),
            deja_paye: Number(d.deja_paye),
            reste_a_payer: Number(d.reste_a_payer),
            statut: d.statut_paiement,
            prochaine_echeance: d.prochaine_echeance,
          })),
        };
      },
    }),

    /** Top N clients du mois */
    getTopClientsMois: tool({
      description:
        "Renvoie les meilleurs clients d'un mois donne par CA encaisse (jusqu'a 10).",
      inputSchema: z.object({
        mois: moisSchema,
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ mois, limit }) => {
        const { data, error } = await supabase
          .from("top_clients_mensuel")
          .select("raison_sociale, ca, nb_livraisons")
          .eq("mois", mois)
          .order("ca", { ascending: false })
          .limit(limit);
        if (error) return { erreur: error.message };
        return { clients: data ?? [] };
      },
    }),

    /** Top N produits du mois */
    getTopProduitsMois: tool({
      description:
        "Renvoie les produits les plus vendus d'un mois donne (jusqu'a 10).",
      inputSchema: z.object({
        mois: moisSchema,
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ mois, limit }) => {
        const { data, error } = await supabase
          .from("top_produits_mensuel")
          .select("produit_nom, gamme, qte_vendue, ca_ht")
          .eq("mois", mois)
          .order("ca_ht", { ascending: false })
          .limit(limit);
        if (error) return { erreur: error.message };
        return { produits: data ?? [] };
      },
    }),

    /** Factures impayees */
    getFacturesImpayees: tool({
      description:
        "Liste les factures non totalement reglees, optionnellement filtrees par anciennete (en jours depuis emission).",
      inputSchema: z.object({
        anciennete_min_jours: z
          .number()
          .int()
          .min(0)
          .max(365)
          .default(0)
          .describe("Filtre : seulement les factures emises depuis au moins N jours"),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ anciennete_min_jours, limit }) => {
        const { data, error } = await supabase
          .from("factures_avec_solde")
          .select(
            "numero, date_emission, montant_ht, montant_encaisse, solde, statut_paiement, anciennete_jours, client_id",
          )
          .neq("statut_paiement", "paye")
          .gte("anciennete_jours", anciennete_min_jours)
          .order("anciennete_jours", { ascending: false })
          .limit(limit);
        if (error) return { erreur: error.message };

        // Enrichir avec les noms clients (jointure separee pour rester simple)
        const clientIds = Array.from(
          new Set((data ?? []).map((f) => f.client_id)),
        );
        const { data: clients } = await supabase
          .from("clients")
          .select("id, raison_sociale")
          .in("id", clientIds);
        const nomParId = new Map(
          (clients ?? []).map((c) => [c.id, c.raison_sociale]),
        );

        return {
          factures: (data ?? []).map((f) => ({
            numero: f.numero,
            date_emission: f.date_emission,
            client: nomParId.get(f.client_id) ?? "Inconnu",
            montant_ht: Number(f.montant_ht),
            deja_encaisse: Number(f.montant_encaisse ?? 0),
            reste_a_payer: Number(f.solde ?? 0),
            statut: f.statut_paiement,
            anciennete_jours: f.anciennete_jours,
          })),
        };
      },
    }),

    /** Stock sous le seuil d'alerte */
    getStockSousSeuil: tool({
      description:
        "Liste les produits dont le stock disponible est inferieur ou egal au seuil d'alerte. Utile pour anticiper les ruptures.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabase
          .from("stock_par_produit")
          .select("nom, gamme, format, qte_disponible, seuil_alerte")
          .eq("actif", true);
        if (error) return { erreur: error.message };
        const sousSeuil = (data ?? [])
          .filter((p) => (p.qte_disponible ?? 0) <= (p.seuil_alerte ?? 0))
          .sort((a, b) => (a.qte_disponible ?? 0) - (b.qte_disponible ?? 0));
        return { produits: sousSeuil };
      },
    }),

    /** Lots bientot perimes */
    getLotsBientotPerimes: tool({
      description:
        "Liste les lots dont la DLUO arrive a echeance dans les N prochains jours. Utile pour planifier les ventes prioritaires.",
      inputSchema: z.object({
        dans_jours: z.number().int().min(1).max(180).default(30),
      }),
      execute: async ({ dans_jours }) => {
        const today = new Date();
        const limite = new Date();
        limite.setDate(limite.getDate() + dans_jours);
        const todayStr = today.toISOString().slice(0, 10);
        const limiteStr = limite.toISOString().slice(0, 10);

        const { data, error } = await supabase
          .from("stock_par_lot")
          .select("numero_lot, dluo, qte_disponible, produit_id")
          .gte("dluo", todayStr)
          .lte("dluo", limiteStr)
          .gt("qte_disponible", 0)
          .order("dluo", { ascending: true });
        if (error) return { erreur: error.message };

        // Jointure manuelle avec produits
        const produitIds = Array.from(
          new Set((data ?? []).map((l) => l.produit_id)),
        );
        const { data: produits } = await supabase
          .from("produits")
          .select("id, nom")
          .in("id", produitIds);
        const nomParId = new Map(
          (produits ?? []).map((p) => [p.id, p.nom]),
        );

        return {
          lots: (data ?? []).map((l) => ({
            produit: nomParId.get(l.produit_id) ?? "Inconnu",
            numero_lot: l.numero_lot,
            dluo: l.dluo,
            qte_disponible: l.qte_disponible,
          })),
        };
      },
    }),

    /** Recherche d'un client par nom partiel */
    getCAClient: tool({
      description:
        "Cherche un client par son nom (recherche partielle, insensible a la casse) et renvoie son CA total + le nombre de livraisons. Optionnel : filtrer sur un mois.",
      inputSchema: z.object({
        client_nom: z
          .string()
          .min(2)
          .describe("Nom partiel du client (ex: 'ti boucan' matche 'Restaurant Ti Boucan')"),
        mois: moisSchema.optional(),
      }),
      execute: async ({ client_nom, mois }) => {
        const { data: clients, error: errC } = await supabase
          .from("clients")
          .select("id, raison_sociale")
          .ilike("raison_sociale", `%${client_nom}%`)
          .limit(5);
        if (errC) return { erreur: errC.message };
        if (!clients || clients.length === 0) {
          return { resultats: [], message: "Aucun client trouve avec ce nom." };
        }

        const ids = clients.map((c) => c.id);
        let query = supabase
          .from("top_clients_mensuel")
          .select("client_id, raison_sociale, mois, ca, nb_livraisons")
          .in("client_id", ids);
        if (mois) query = query.eq("mois", mois);
        const { data: ventes, error: errV } = await query;
        if (errV) return { erreur: errV.message };

        // Agrege par client
        const parClient = new Map<
          string,
          { raison_sociale: string; ca_total: number; nb_livraisons: number }
        >();
        for (const v of ventes ?? []) {
          const existing = parClient.get(v.client_id) ?? {
            raison_sociale: v.raison_sociale,
            ca_total: 0,
            nb_livraisons: 0,
          };
          existing.ca_total += Number(v.ca);
          existing.nb_livraisons += v.nb_livraisons;
          parClient.set(v.client_id, existing);
        }
        return {
          mois_filtre: mois ?? "tous",
          resultats: Array.from(parClient.values()).sort(
            (a, b) => b.ca_total - a.ca_total,
          ),
        };
      },
    }),

    /** Mois courant (utilitaire pour permettre au modele de savoir "ce mois") */
    getMoisCourant: tool({
      description:
        "Renvoie le mois courant au format YYYY-MM. A appeler quand l'utilisateur dit 'ce mois', 'le mois en cours', 'aujourd'hui'.",
      inputSchema: z.object({}),
      execute: async () => {
        const today = new Date();
        return {
          mois: today.toISOString().slice(0, 7),
          date: today.toISOString().slice(0, 10),
        };
      },
    }),
  };
}
