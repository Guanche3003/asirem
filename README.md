# ASIREM CRM — CRM bougier complet

Application autonome pour gérer un atelier de bougies artisanales : ventes, matières premières, contacts, recettes, marges, site public dynamique et espace d'administration sécurisé.

Le projet est adapté aux données et à l'identité visuelle d'**ASIREM COSMÉTIQUES** à partir du site source `C:\Users\aghil\Desktop\ASIREM COS\Site`. Il est totalement séparé du projet CAP.

## Démarrage

Prérequis : Node.js 24+ (utilise `node:sqlite`, aucune dépendance SQLite native).

```powershell
cd C:\Users\aghil\Downloads\bougie-crm
npm install
npm run db
npm run dev
```

Ouvrez :

- Site public : http://127.0.0.1:5173/
- Administration : http://127.0.0.1:5173/admin
- API : http://127.0.0.1:3001/api

Identifiants de démonstration : `admin` / `Atelier2026!`.

> Pour définir un autre mot de passe initial, définissez `CRM_ADMIN_PASSWORD` avant la première création de la base.

## Identifiants ASIREM intégrés

- Raison sociale : BENARAB SYPHAX — EI micro-entreprise
- SIREN : 992 752 899 — SIRET : 992 752 899 00011
- RCS Paris, immatriculée le 27/10/2025
- TVA : FR03 992 752 899
- APE/NAF : 32.99Z — Hébergeur : Hostinger
- Contact : contact@asirem-cosmetiques.fr, +33 6 56 69 51 12
- Réseaux : Instagram @asiremcos, TikTok @asiremcosmetiques
- Boutique d'origine : https://asirem-cosmetiques.fr/boutique/

## Fonctionnalités

### Site public dynamique

- Accueil ASIREM : vidéo hero avec cartes « bougie du moment » et « prochain rendez-vous », section évènements juste dessous, badge « Artisan créateur de bougies », valeurs, coffret vidéo, nouveautés, galerie, témoignages et newsletter.
- Boutique avec filtres par catégorie, prix et fiches produits issues du CRM.
- Rubrique « Créer ma bougie » (`/creer-ma-bougie`) : parcours animé étape par étape avec compteur discret et passage automatique à la suite dès qu’une option est choisie (flèche ← pour revenir et cumuler les choix). La flèche et les boutons du parcours utilisent un style de kit moderne inspiré de shadcn/ui, reproduit en CSS local (aucun Tailwind ni Radix ajouté) : contenant, couleur de cire, parfum, décorations, accessoires, finition, étiquette, typographie, couleur du texte, emoji, coordonnées. Aperçu photographique 2D en temps réel avec calques, animations de sélection, mini-éditeur d’étiquette Konva (police, couleur, emoji, position, export PNG HD) et envoi du projet à l’atelier (ou reprise sur WhatsApp).
- Fiche produit avec image, description, poids, durée de diffusion et commande WhatsApp.
- Page « Qui suis-je » avec l'histoire de Syphax et les photos de l'atelier.
- Page contact avec formulaire enregistré dans le CRM.
- Pages légales : mentions légales, CGV, politique de cookies et éditions thématiques.
- Textes, coordonnées, logo, vidéos et prix pilotés depuis l'administration.

### Administration protégée

- Tableau de bord : chiffre d'affaires, commandes, stock, messages.
- Calcul des matières premières et marges par produit/recette.
- CRUD produits (recettes, prix, poids, catégorie, image, mise en avant).
- CRUD matières premières avec stock et seuil d'alerte.
- CRUD clients et fournisseurs.
- Commandes avec déduction automatique du stock à l'expédition.
- Messages reçus depuis le site public.
- Évènements : titre, date, lieu, description et photo, avec ajout/suppression et affichage en ligne ou masqué.
- « Bougie customisée » : CRUD des 10 catégories d’options (contenant, couleur, parfum, décoration, accessoire, finition, modèle d’étiquette, typographie, couleur du texte, emoji) avec nom, description, image/icône, supplément, disponibilité (disponible / sur commande / indisponible), statut, ordre et métadonnées de rendu. Aucune option n’est codée en dur côté visiteur.
- Suivi des projets personnalisés : configuration complète structurée, aperçu final et étiquette HD enregistrés avec la demande ; transformation en commande du CRM en un clic (aucun système parallèle), avec prix recalculé côté serveur.
- Paramètres boutique : identité, légal, contact, réseaux, logo, vidéos, textes, prix de base et dimensions/limite de caractères de l’étiquette personnalisée.

## Scripts

```powershell
npm run dev        # API + Vite en parallèle
npm run server     # API seule (port 3001)
npm run client     # Front seul (port 5173)
npm run build      # Build de production
npm run start      # API de production
npm run db         # Crée la base si absente
npm run reset-db   # Réinitialise la base avec les données ASIREM
```

## Structure

```text
server/          API Express, SQLite, seeds ASIREM
src/
  components/    éléments réutilisables (dont ProductCard)
  data/asirem.js textes, galerie, témoignages et pages légales
  pages/public/  site ASIREM dynamique
  pages/admin/   administration
  asirem.css     identité visuelle du site public
  styles.css     base commune
public/          assets copiés du site ASIREM (logo, photos, vidéos)
data/crm.db      base SQLite générée
```

## Déploiement : front Vercel + API Render/Railway

Le build Vercel ne contient que le front. L'API Express et la base SQLite doivent être hébergées séparément.

### 1. API sur Render (recommandé)

1. Créez un **Web Service** depuis le dépôt. Le fichier `render.yaml` peut être importé comme *Blueprint*.
2. Remplacez `CORS_ORIGIN` par l'URL réelle de votre site Vercel (ex. `https://asirem.vercel.app`).
3. Définissez `CRM_ADMIN_PASSWORD` dans le tableau de bord Render (secret, jamais dans le dépôt).
4. Le `render.yaml` fourni est compatible avec le **plan gratuit** : pas de disque persistant, la base est donc recréée avec les données ASIREM à chaque déploiement. Pour conserver les données, passez en `plan: starter`, montez un disque sur `/data` et utilisez `DB_PATH=/data/crm.db` (exemple commenté dans le fichier).
5. Notez l'URL de l'API, par exemple `https://asirem-api.onrender.com`.

Pour Railway : importez le dépôt, ajoutez un **volume persistant** monté sur `/data`, puis définissez les variables `DB_PATH=/data/crm.db`, `CORS_ORIGIN`, `COOKIE_SAMESITE=None`, `COOKIE_SECURE=1` et `CRM_ADMIN_PASSWORD`. `railway.json` fournit les commandes de build et de démarrage.

### 2. Front sur Vercel

1. Importez le dépôt, framework **Vite** (détection automatique).
2. Ajoutez la variable d'environnement de build :
   - `VITE_API_URL` = URL de l'API (ex. `https://asirem-api.onrender.com`, sans slash final).
3. Redéployez. `vercel.json` gère le rendu SPA pour les URLs comme `/boutique` ou `/produit/...`.

### Variables d'environnement

Toutes les variables sont documentées dans `.env.example`. Côté API : `PORT`, `HOST`, `DB_PATH`, `CORS_ORIGIN`, `COOKIE_SAMESITE`, `COOKIE_SECURE`, `CRM_ADMIN_PASSWORD`. Côté front : `VITE_API_URL`.

> Si le front et l'API sont sur des domaines différents, gardez `COOKIE_SAMESITE=None` et `COOKIE_SECURE=1` sur l'API pour que la session admin soit conservée par le navigateur.

## Notes

- Les prix des créations sont des valeurs de démonstration cohérentes : le catalogue WooCommerce en direct n'était pas accessible lors de l'adaptation. Ils peuvent être corrigés dans ** administration → Produits**.
- Les fichiers statiques ASIREM sont servis par l'API sur `/logo.png`, `/Syphax.jpg`, `/galerie/...`, `/videos/...`.
- Le cookie de session est `HttpOnly` ; les tokens sont hachés en base et les mots de passe sont hachés avec `scrypt`.
