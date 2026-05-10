# Formation utilisateurs — Le Bissap Artisanal

> Guide pratique pour prendre en main l'application
> `https://gestion-bissap-artisanal.blowdok.fr` (URL provisoire — le
> domaine définitif sera communiqué au moment du basculement en prod).
>
> Ce document est conçu pour qu'**Emmanuel** puisse le lire seul puis
> former lui-même ses employés. Il suit l'ordre d'une journée type :
> matin (production), midi (livraisons), fin de journée (encaissement,
> dépenses).

---

## Sommaire

1. [Premiers pas : connexion et navigation](#1-premiers-pas--connexion-et-navigation)
2. [Qui fait quoi : les 4 rôles](#2-qui-fait-quoi--les-4-rôles)
3. [Module Production (équipe Fabrication)](#3-module-production-équipe-fabrication)
4. [Module Stock](#4-module-stock)
5. [Module Clients](#5-module-clients)
6. [Module Livraisons (équipe Livreur + Patron)](#6-module-livraisons-équipe-livreur--patron)
7. [Module Factures et encaissement](#7-module-factures-et-encaissement)
8. [Module Finance (Patron + Adjoint)](#8-module-finance-patron--adjoint)
9. [Tableau de bord (Patron + Adjoint)](#9-tableau-de-bord-patron--adjoint)
10. [Administration (Patron + Adjoint)](#10-administration-patron--adjoint)
11. [Cas particuliers et erreurs courantes](#11-cas-particuliers-et-erreurs-courantes)
12. [Mémo express par rôle](#12-mémo-express-par-rôle)

---

## 1. Premiers pas : connexion et navigation

### Se connecter

1. Ouvrir le navigateur (Chrome, Firefox, Safari ou Edge — tous fonctionnent)
2. Aller sur l'adresse de l'application
3. Saisir l'**email** et le **mot de passe** fournis par Emmanuel
4. Cliquer sur **Connexion**

Si tu as oublié ton mot de passe : clique sur **« Mot de passe oublié »**,
saisis ton email, et un lien de réinitialisation sera envoyé par mail.

### Première connexion

À la première connexion, l'écran qui s'ouvre dépend de ton rôle :
- **Patron / Adjoint** → Tableau de bord
- **Production** → Stock
- **Livreur** → Ma tournée du jour

### La barre latérale (sidebar)

À gauche de l'écran, tu vois les modules auxquels tu as accès. Les
modules visibles dépendent de ton rôle. Les principaux :

| Icône | Module | À quoi ça sert |
|---|---|---|
| 🏠 | **Tableau de bord** | Vue financière et commerciale (Patron / Adjoint) |
| 📦 | **Produits** | Catalogue Bissapa et Zandjabila (Patron / Adjoint) |
| 🗄️ | **Stock** | État du stock par produit |
| 🏭 | **Production** | Saisie des nouveaux lots fabriqués |
| 👥 | **Clients** | Annuaire des clients B2B |
| 🚚 | **Ma tournée** | Livraisons du jour à effectuer |
| 📋 | **Livraisons** | Toutes les livraisons (historique) |
| 🧾 | **Factures** | Suivi des paiements clients |
| 💶 | **Finance** | Dépenses et budget (Patron / Adjoint) |
| ⚙️ | **Admin** | Réglages (Patron / Adjoint) |

### Mode clair / sombre

En haut à droite, le bouton avec l'icône lune/soleil bascule entre les
deux modes d'affichage. Choisis ce qui te confortable.

### Se déconnecter

En haut à droite, clique sur ton nom puis **Déconnexion**.

---

## 2. Qui fait quoi : les 4 rôles

L'application a **4 rôles**. Emmanuel décide qui a quel rôle dans
**Admin → Utilisateurs**.

### 👑 Patron (Emmanuel)
Accès complet sans restriction. C'est le seul qui peut :
- Voir l'**enveloppe Personnel** (la part qu'Emmanuel se verse)
- **Supprimer définitivement** une dépense, un paiement, une livraison
  brouillon
- **Annuler une facture**
- Modifier les **paramètres** (tarif consigne, etc.)
- **Réinitialiser** l'application (mode démo → mode prod)

### 🤝 Adjoint (« Patron par intérim »)
Quand Emmanuel s'absente plusieurs jours, il peut nommer un employé en
**Adjoint** (Production ou Livreur). L'Adjoint peut faire **tout sauf** :
- L'enveloppe **Personnel** (réservée Emmanuel)
- Les **suppressions définitives** (peut seulement annuler)
- Promouvoir quelqu'un en **Patron**
- Réinitialiser l'app

L'Adjoint peut **saisir des dépenses** (Réinvestissement + Charges
seulement, jamais Personnel) et **encaisser** comme Emmanuel.

> 💡 **Astuce** : Quand Emmanuel revient, il repasse l'employé en
> « Production » ou « Livreur » dans Admin → Utilisateurs.

### 🏭 Production / Fabrication
- Saisie des **lots produits** (date, quantité, ingrédients)
- Vue du **stock** et des seuils d'alerte
- **Pertes** (casse, péremption)
- Lecture des **clients** (pour préparer les commandes)
- Vue des **livraisons** programmées (pour préparer les colis)

### 🚚 Livreur / Vendeur / Commercial
- **Ma tournée du jour** : ses livraisons assignées
- Marquer une livraison **livrée**, encaisser, déduire les consignes
- Créer un **client** sur le terrain
- Créer une **livraison** spontanée (commande prise sur place)
- Déclarer une **perte** (casse en transport)

> 💡 Le livreur a aussi accès au **stock** pour vérifier qu'on a bien
> le produit avant de promettre une commande au client.

---

## 3. Module Production (équipe Fabrication)

### Vue d'ensemble

La page **Production** liste tous les lots produits, **regroupés par
produit** (un accordéon par saveur). Pour chaque produit on voit :
- Total **produit / livré / perdu / disponible**
- La **prochaine échéance** (date « à consommer avant » la plus proche)
- Un badge rouge **Périmé** si un lot est dépassé

Clique sur un produit pour déplier la liste de ses lots détaillés.

### Saisir un nouveau lot

1. Cliquer sur **« Nouveau lot »** (en haut à droite)
2. **Produit** : choisir la saveur (Bissapa Original, Litchi, etc.)
3. **Date de production** : par défaut aujourd'hui
4. **À consommer de préférence avant le** : la DDM (typiquement +6 mois)
5. **Quantité produite** : nombre de bouteilles obtenues
6. **Numéro de lot** (optionnel) : si tu utilises un format spécifique
   (par défaut, le système en génère un)
7. **Ingrédients** : ajouter les ingrédients utilisés avec leur date de
   péremption
   - **Obligatoires** : Fleur de bissap, Sucre
   - **Optionnels** : Arôme, Ananas, Gingembre, Menthe (selon la recette)
8. **Notes** (optionnel) : ce que tu veux retenir sur ce lot
9. Cliquer sur **« Créer le lot »**

> ✅ Le stock est mis à jour automatiquement et le lot est
> **immédiatement disponible** pour les livraisons.

### Déclarer une perte

Quand des bouteilles sont cassées, périmées, ou perdues :

1. Aller sur la page **Stock** (ou directement sur la fiche d'un lot)
2. Cliquer sur **« Saisir une perte »**
3. Choisir le **lot** concerné
4. Saisir la **quantité perdue** et le **motif** (casse, péremption,
   autre)
5. Valider

Le stock disponible est immédiatement diminué.

---

## 4. Module Stock

Vue temps réel par produit avec :
- **Disponible** : ce qu'il reste en stock
- **Seuil d'alerte** : niveau en dessous duquel le produit s'affiche
  en rouge (réglable dans Admin → Produits)
- **Lots actifs** : nombre de lots en cours pour ce produit
- **Périmé** : nombre de bouteilles à jeter (badge rouge)

### Le système FIFO (First In, First Out)

Quand on livre un produit, le système prend automatiquement les
bouteilles du **lot dont la date « à consommer avant » est la plus
proche**. Tu n'as pas à choisir quel lot utiliser, c'est automatique.

> 💡 C'est ce qui garantit qu'on ne stocke pas trop longtemps un lot
> et qu'on évite les pertes par péremption.

---

## 5. Module Clients

### Annuaire

Tous les clients B2B (revendeurs, restaurants, supermarchés...). On
peut chercher par nom et filtrer par ville.

### Ajouter un client

1. Cliquer sur **« Nouveau client »**
2. Saisir : **Raison sociale** (obligatoire), contact, adresse, SIRET,
   email, téléphone, conditions de paiement
3. Valider

> 💡 Le **livreur** peut aussi créer un client depuis son téléphone
> pendant une tournée (commande spontanée chez un nouveau revendeur).

### Tarifs personnalisés

Sur la fiche d'un client, on peut définir un **prix négocié par
produit** (utile pour les gros volumes). Sinon, le prix par défaut
du produit s'applique.

### Désactiver vs supprimer un client

- **Désactiver** : le client sort des listes mais son historique de
  livraisons et factures est conservé. À utiliser quand un client part
  en faillite ou arrête.
- **Supprimer** : disponible **seulement** si le client n'a aucune
  livraison. Sinon, désactiver.

---

## 6. Module Livraisons (équipe Livreur + Patron)

### Créer une livraison

1. Cliquer sur **« Nouvelle livraison »**
2. **Client** : choisir dans la liste
3. **Date prévue** : jour de livraison
4. **Heure** (optionnel) : si créneau précis (ex : 14h30 chez
   Carrefour)
5. **Livreur** (optionnel) : si tu sais déjà qui va livrer. Sinon,
   les livreurs verront la livraison dans la zone « disponibles à
   prendre » et pourront se l'attribuer
6. **Lignes** : ajouter les produits commandés (quantités + prix)
7. **Notes** (optionnel) : instructions livreur (« sonner 2 fois »,
   « entrée par l'arrière »...)
8. Valider

> ⚠️ Le stock est immédiatement réservé. Si tu annules ou supprimes la
> livraison plus tard, le stock est automatiquement restauré.

### La tournée du jour

Page **Ma tournée** (livreur) ou **Tournées du jour** (Patron). On y
voit :
- **Mes livraisons** (assignées à moi)
- **Disponibles à prendre** (sans livreur affecté) — le livreur clique
  sur **« Prendre »** pour se l'attribuer
- Les livraisons sont **triées par heure** (les sans-créneau remontent
  en fin)

Chaque carte affiche : adresse, téléphone (cliquable pour appeler),
nombre d'unités, total, **badge bleu HH:MM** si créneau précis.

### Marquer une livraison comme livrée

Une fois sur place, livraison terminée :

1. Ouvrir la fiche de la livraison (depuis la tournée)
2. Cliquer sur **« Marquer livrée »**
3. **Bouteilles / flacons vides récupérés** : saisir le nombre de
   consignes que le client te rend (0 si rien). Le crédit s'affiche
   en direct (`5 × 0,05 € = −0,25 €`)
4. Cliquer sur **« Valider la livraison »**

➡️ Une **facture est générée automatiquement** (numéro
`FAC-2026-00001`, etc.). Si le client a un email, l'app te demande si
tu veux **lui envoyer la facture par email** dans la foulée.

### Statuts d'une livraison

| Statut | Signification |
|---|---|
| **Programmée** | Créée, pas encore commencée |
| **En cours** | Le livreur est en route (bouton « Démarrer ») |
| **Livrée** | Marchandise remise au client, facture émise |
| **Annulée** | Pas livrée. Le stock réservé est **restauré** |

### Modifier une livraison déjà programmée

Bouton **« Modifier »** sur la fiche : tu peux changer la **date**,
**l'heure**, le **livreur** assigné et les **notes**. Les **lignes** ne
sont pas modifiables — pour corriger des produits, annule la livraison
et recrée-la.

### Annuler ou supprimer une livraison

| Action | Quand l'utiliser |
|---|---|
| **Annuler** | La livraison est déjà visible/communiquée au client. Statut → Annulée, stock restauré. La trace reste |
| **Supprimer** | Erreur de saisie, livraison fantôme. Disponible uniquement si **pas de facture** rattachée |

---

## 7. Module Factures et encaissement

### Liste des factures

Filtres par défaut : « En cours » (impayé + partiel). On peut basculer
sur Toutes / Payées / Annulées.

Chaque ligne montre : numéro, date, client, montant HT, mode de
paiement utilisé, encaissé, à encaisser (chèques post-datés), solde,
statut, ancienneté.

### Encaisser un paiement

1. Ouvrir la fiche de la facture
2. Cliquer sur **« Encaisser »**
3. Saisir une ou plusieurs lignes :
   - **Montant** (€)
   - **Mode** : espèces, virement, chèque, carte
   - **Date** : aujourd'hui pour un paiement immédiat, **plus tard**
     pour un chèque post-daté
   - **Note** (optionnel) : numéro de chèque, etc.
4. Valider

> 💡 Le mode **mixte** : tu peux saisir 50 € espèces + 50 € chèque sur
> la même ligne facture, en deux entrées séparées.

### Comprendre les statuts de paiement

| Statut | Sens |
|---|---|
| **Impayée** | Aucun encaissement |
| **Partielle** | Une partie est encaissée, il reste un solde |
| **Payée** | Solde = 0, totalement réglée |
| **Annulée** | Facture marquée comme annulée (Patron) |

### Annuler une facture (Patron uniquement)

Sur la fiche facture → bouton **« Annuler la facture »**. Sert quand
on a livré par erreur ou que le client refuse.

Effets :
- La facture est marquée **ANNULÉE** (filigrane rouge sur le PDF)
- Elle est **exclue du CA** et du dashboard
- Ses **paiements sont supprimés** (équivalent à un avoir global)
- La livraison liée passe en **Annulée**, le stock est **restauré**
- La facture **reste consultable** (obligation légale, conservation 10 ans)

> ⚠️ Une facture annulée n'est plus modifiable et son numéro reste
> réservé (la séquence ne se réajuste pas — c'est l'usage légal en
> France).

### Télécharger un PDF

Sur n'importe quelle fiche : bouton **« Bon de livraison »** ou
**« Facture »** ouvre le PDF dans un nouvel onglet. Le PDF contient :
- Logo Bissapa + coordonnées entreprise
- Coordonnées client
- Lignes avec **numéros de lot** (traçabilité B2B)
- Total HT, **consigne récupérée si applicable**, net à payer
- État de règlement (acquittée / partiel / reste à payer)
- Mentions légales

### Renvoyer une facture par email

Bouton **« Renvoyer la facture par email »** sur la fiche facture.
Utile si le client n'a pas reçu le premier envoi.

---

## 8. Module Finance (Patron + Adjoint)

### Saisir une dépense

1. Cliquer sur **« Nouvelle dépense »**
2. **Date** d'engagement (date de la facture fournisseur, pas du
   paiement)
3. **Catégorie** : choisir parmi 12 (matières premières, emballage,
   transport...)
4. **Enveloppe** : pré-remplie selon la catégorie
   (Réinvestissement / Charges / Personnel — l'**Adjoint ne voit pas
   Personnel**)
5. **Montant total** engagé
6. **Description** : à quoi ça correspond
7. **Justificatif** (optionnel) : photo du ticket / facture
   fournisseur (PDF, JPG, PNG)
8. **Paiements** :
   - **Soit** payée immédiatement → 1 ligne avec date d'aujourd'hui
   - **Soit** échelonnée → plusieurs lignes (« 50 € le 15/03, 50 € le
     15/04 »)
   - **Soit** dette ouverte (on ne sait pas encore quand on paiera) →
     ne rien saisir, ajouter les paiements plus tard depuis la fiche
9. Valider

### Comprendre les 3 enveloppes (50 / 30 / 20)

Chaque mois, le résultat (CA encaissé − dépenses) est virtuellement
réparti :
- **50 % Réinvestissement** : matières premières, emballage,
  transport, marketing, fournitures, équipement
- **30 % Charges** : énergie, loyer, assurance, banque, taxes
- **20 % Personnel** : salaires, prélèvements Emmanuel (*Patron seul*)

> 💡 Cette répartition est **indicative**, c'est un objectif. La page
> Finance affiche pour chaque enveloppe : alloué (théorique), consommé
> (réel), solde restant.

### Statuts d'une dépense

| Statut | Sens |
|---|---|
| **À payer** | Aucun paiement renseigné |
| **Prévu** | Au moins une échéance future planifiée |
| **Partiel** | Une partie payée, reste un solde |
| **Payé** | Totalement réglée |

### Modifier ou supprimer une dépense

- **Adjoint** : peut éditer une dépense, mais **ne peut pas supprimer**
- **Patron** : peut tout faire, y compris supprimer une dépense
  définitivement (avec confirmation)

---

## 9. Tableau de bord (Patron + Adjoint)

Vue d'ensemble mois en cours (Patron) ou hors enveloppe Personnel
(Adjoint).

### Les KPI principaux

- **CA encaissé** ce mois
- **À encaisser** (chèques post-datés en attente)
- **Décaissements** ce mois (paiements fournisseurs effectifs)
- **Résultat cash flow** (CA encaissé − décaissements)

### Le graphique 12 mois

Évolution mensuelle du CA et des dépenses sur l'année écoulée.

### Top 5

- **Top 5 clients** : qui rapporte le plus ce mois
- **Top 5 produits** : qui se vend le plus

### Vue enveloppes

Pour chaque enveloppe : alloué × consommé × solde restant.

> 💡 Si le solde devient **négatif** sur une enveloppe, c'est qu'on a
> dépensé plus que prévu pour cette catégorie. C'est un signal pour
> ajuster.

---

## 10. Administration (Patron + Adjoint)

### Utilisateurs

- **Lister** tous les comptes
- **Créer** un nouvel utilisateur (envoie un email d'invitation)
- **Changer le rôle** d'un utilisateur via le menu trois-points
- **Désactiver** un utilisateur (bloque la connexion sans supprimer
  l'historique)

> ⚠️ **Personne ne peut nommer quelqu'un en « Patron »** depuis
> l'application — il y a un seul Patron par installation. Pour
> remplacer Emmanuel, c'est Blowdok qui le fait directement en base.

### Produits

- Catalogue Bissapa et Zandjabila
- Pour chaque produit : nom, gamme, format, **prix par défaut**,
  **seuil d'alerte stock**, **poids**
- Possibilité de **désactiver** un produit (sort des listes mais reste
  dans les historiques)

### Paramètres (nouveau)

- **Tarif consigne** par bouteille / flacon (€) — actuellement 0,05 €.
  Modifiable par le Patron uniquement.

### Réinitialiser les données opérationnelles (Patron seul)

Vide en une fois : livraisons, factures, paiements, lots, mouvements
de stock, dépenses. **Conserve** : utilisateurs, clients, produits,
configuration entreprise.

> ⚠️ **À utiliser une seule fois**, pour basculer de la phase de tests
> à la mise en service réelle. Une fois en production, **ne pas y
> toucher** : tu perdrais l'historique légal.

Pour confirmer, il faut taper le mot-clé `RESET` dans une boîte de
dialogue (double sécurité).

---

## 11. Cas particuliers et erreurs courantes

### « Le bouton supprimer n'apparaît pas »

C'est normal. Le bouton n'est visible que si la donnée n'a pas encore
généré d'effet légal ou comptable. Exemples :
- **Client** : doit n'avoir aucune livraison
- **Produit** : doit ne jamais avoir été utilisé
- **Lot** : doit ne jamais avoir été consommé
- **Livraison** : doit être en brouillon (pas de facture)

Sinon, utilise **Désactiver** (clients, produits) ou **Annuler**
(livraisons, factures).

### « Stock insuffisant » à la création de livraison

Le système refuse de réserver plus que ce qui est disponible. Solutions :
- Réduire la quantité commandée
- Produire un nouveau lot avant de saisir la livraison
- Vérifier que des livraisons en cours n'ont pas mobilisé tout le stock

### « Le client n'a pas reçu la facture par email »

- Vérifier que le client a bien un **email** dans sa fiche
- Vérifier les **spams** côté client
- Si problème persistant : contacter Blowdok pour vérifier le service
  d'envoi (Resend)

### Un livreur a un problème, je dois reprendre sa tournée

- En tant que Patron : aller sur la fiche de la livraison, cliquer sur
  **« Modifier »**, changer le **Livreur** assigné
- Le nouveau livreur verra la livraison dans **Sa tournée**

### Une facture a un mauvais montant

- **Si pas encore payée** : annuler la facture (Patron), créer une
  nouvelle livraison correcte
- **Si déjà payée** : c'est plus délicat. Annule la facture (les
  paiements seront supprimés), recrée une livraison correcte, puis
  réencaisse

### Un client refuse à la livraison

- Le livreur **ne marque pas livrée**, retour à l'entrepôt
- Le Patron **annule** la livraison sur la fiche → stock restauré

### Erreur sur les consignes saisies

Le nombre de consignes est figé au moment de la livraison. Si erreur :
1. Annuler la facture (Patron)
2. La livraison repasse en **Annulée**
3. Recréer une livraison identique en saisissant le bon nombre de
   consignes

### Mode démo / mode prod

Pendant la phase de tests, on saisit des données fictives pour se
former. Quand on est prêt à passer en vrai :
1. Vérifier que tout fonctionne
2. **Patron** : Admin → Réinitialiser → taper `RESET`
3. À partir de là, **toute saisie est légale** (factures conservées
   10 ans)

---

## 12. Mémo express par rôle

### 👑 Emmanuel (Patron) — journée type

**Matin**
- Vérifier le **Tableau de bord** (CA hier, dépenses, factures impayées)
- **Production** : valider les nouveaux lots si l'équipe Fabrication a
  produit
- **Tournées du jour** : vérifier que tout est assigné à un livreur

**Pendant la journée**
- Saisir les **dépenses** au fil de l'eau (matière première, essence,
  etc.) avec photo du ticket
- Encaisser les **virements** clients reçus

**Fin de journée / semaine**
- Vérifier les **factures impayées** > 30 jours
- Relancer si besoin (V2 : génération automatique de relances par IA)
- Exporter le **CSV comptable** mensuel pour le comptable

### 🤝 Adjoint — quand Emmanuel est absent

- Mêmes tâches qu'Emmanuel **sauf** : pas l'enveloppe Personnel,
  pas de suppression définitive, pas de promotion vers Patron

### 🏭 Fabrication — journée type

**Matin**
- Vérifier le **Stock** : produits en alerte rouge
- Voir les **Livraisons programmées** du jour pour anticiper la
  préparation
- **Produire** un ou plusieurs lots si besoin → saisir dans
  **Production → Nouveau lot**

**Pendant la journée**
- Préparer les colis pour les tournées
- Déclarer les **pertes** éventuelles (casse, péremption)

### 🚚 Livreur — journée type

**Matin**
- Aller sur **Ma tournée** : voir les livraisons assignées
- Si livraisons « disponibles à prendre » : cliquer sur **Prendre**
- Charger le véhicule en suivant l'ordre des heures

**Sur le terrain (chaque livraison)**
- Cliquer sur la livraison
- **Démarrer** (statut → En cours)
- Une fois livré : **Marquer livrée**
- Saisir les **consignes vides récupérées**
- **Encaisser** le client (espèces / chèque / carte / virement)
- Si client veut sa facture par email : valider l'envoi automatique

**Si commande spontanée**
- Créer le client (si nouveau) puis la livraison directement depuis
  l'app

---

## En cas de problème

- **Bug ou question technique** : contacter **Blowdok** (créateur de
  l'app)
- **Question fonctionnelle** : relire ce guide ou demander à Emmanuel
- **Mot de passe perdu** : utiliser « Mot de passe oublié » sur l'écran
  de connexion

---

> 📘 **Ce guide évolue avec l'application.** Si une fonctionnalité
> change ou est ajoutée, ce document est mis à jour. La version la
> plus récente est toujours dans `docs/formation-utilisateurs.md` du
> dépôt.
