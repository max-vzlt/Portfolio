# Portfolio — Maxime Verzeletti

Portfolio bilingue (FR / EN) avec back-office intégré, construit avec **Nuxt 4 (Vue 3)**.

- Direction artistique **bleu & blanc uniquement** (`#0037FF`, `#090BD0`, `#C9C7FF`, `#F4F3FF`), typographies Oswald (titres condensés), Mona Sans (texte) et Geist Mono (labels).
- Mise en page sur une **grille de 3 colonnes**, défilement fluide (Lenis), parallaxe sur les images, apparitions au scroll.
- Images rendues en **pixels ronds bleu & blanc** (trame générée dans le navigateur), en **bichromie**, ou telles quelles (tes rendus Blender), avec une **texture papier** (sur les images uniquement). Sur une trace, le survol d'une image révèle ses couleurs d'origine dans un cercle qui part du curseur.
- Transition entre les pages par un rideau bleu, puis animation d'entrée (titres mot par mot, couverture qui se dévoile). Barre de défilement personnalisée.
- Responsive : sur tablette et téléphone, l'en-tête passe en icônes et la grille passe de 3 à 2 puis 1 colonne.

## Démarrer en local

Prérequis : Node.js 20.12 ou plus récent.

```bash
npm install
```

```bash
npm run dev
```

- Site : http://localhost:3000 (anglais : http://localhost:3000/en)
- Back-office : http://localhost:3000/admin. En développement, le mot de passe par défaut est `admin`.

Au premier démarrage, le contenu de départ (`seed/` : les 4 traces de l'ancien site, avec leurs images, vidéos et le CV) est copié dans `data/`.

## Le back-office (`/admin`)

| Page | Ce que tu peux faire |
| --- | --- |
| **Traces** | Créer une trace, la masquer ou l'afficher, la dupliquer, la supprimer, changer l'ordre par glisser-déposer. **Création express** : dépose des images, une trace est créée avec la 1re en couverture et les autres en blocs. |
| **Éditeur de trace** | Grille de 3 colonnes : ajoute des blocs (titre, texte, image, vidéo, lien, citation, séparateur), **déplace-les** avec la poignée ⠿, règle leur **taille** (largeur 1 à 3 colonnes, hauteur 1 à 4 lignes) avec les boutons ou en tirant le coin ↘, **masque** un bloc, glisse des images ou vidéos depuis ton ordinateur directement dans la grille. Catégories, couverture, résumé, taille de la carte sur l'accueil, année, outils, lien externe. `Ctrl / Cmd + S` pour enregistrer. |
| **Accueil** | Toutes les sections de la page d'accueil au même endroit : haut de page (titre, introduction, image, console), Réalisations, Qui suis-je, Compétences, Contact et réseaux. Réordonne les sections par glisser-déposer, masque-les, modifie leurs textes. Un **aperçu en direct** (ordinateur, tablette, mobile) montre les changements avant l'enregistrement. L'en-tête du site suit l'ordre et la visibilité des sections. |
| **Catégories** | Ce sont les filtres proposés aux visiteurs (ex. Développement web, Photographie, Création visuelle). Renommer, réordonner, supprimer. Une catégorie sans trace visible n'apparaît pas sur le site. |
| **Médiathèque** | Import par glisser-déposer ou depuis l'ordinateur, texte alternatif FR/EN, suppression (avec la liste des endroits où le média est utilisé). Les images sont converties automatiquement en versions webp optimisées. |
| **Réglages** | Nom, métier, CV (PDF) et description pour Google. |

**Rendu des images** (pour chaque image) :
- **Original** : l'image telle quelle. À utiliser pour tes rendus Blender déjà en bleu et blanc.
- **Bichromie** : n'importe quelle image convertie en bleu et blanc.
- **Pixels ronds** : trame de pixels ronds bleu et blanc générée par le site.

Les textes acceptent une mise en forme simple : `**gras**`, `*italique*`, `[lien](https://…)`, une ligne vide pour un nouveau paragraphe, `- ` pour une liste.

## Traduction automatique

Chaque champ a un onglet FR / EN. Le bouton **Traduire en anglais** remplit tous les champs anglais vides d'une trace ou des réglages, et un petit bouton par champ traduit depuis l'autre langue. Le gras et les liens sont conservés.

Le fournisseur se règle dans `.env` (copie `.env.example`) :

1. **DeepL** (recommandé, 500 000 caractères par mois gratuits) : `NUXT_DEEPL_API_KEY=…`
2. **LibreTranslate** (auto-hébergeable) : `NUXT_LIBRETRANSLATE_URL=…`
3. Sans configuration, **MyMemory** (gratuit, quota journalier limité) est utilisé. `NUXT_MYMEMORY_EMAIL` augmente le quota.

## Les données

Tout le contenu se trouve dans `data/`, qui n'est pas versionné dans git :

- `data/db.json` : traces, catégories, réglages, liste des médias.
- `data/uploads/<id>/` : fichiers originaux et versions redimensionnées.

Pour sauvegarder ou déplacer le contenu (par exemple de ton PC vers ton serveur), copie le dossier `data/`. Pour repartir du contenu de départ, supprime `data/` et relance.

`npm run import:legacy` reconstruit `seed/` depuis l'ancien site mverzeletti.com.

## Mise en production sur ton serveur

```bash
npm ci
```

```bash
npm run build
```

```bash
NUXT_ADMIN_PASSWORD='un-mot-de-passe-solide' NUXT_PUBLIC_SITE_URL='https://mverzeletti.com' PORT=3000 node .output/server/index.mjs
```

- Lance la commande **depuis le dossier du projet** : `data/` et `seed/` sont résolus depuis le dossier courant. Sinon, définis `NUXT_DATA_DIR`.
- Garde le processus actif avec pm2 (`pm2 start .output/server/index.mjs --name portfolio`) ou un service systemd, et place un reverse proxy (Nginx, Caddy) devant pour le HTTPS.
- Avec Nginx, autorise les gros envois de vidéos : `client_max_body_size 300m;`.
- En production, le back-office refuse toute connexion tant que `NUXT_ADMIN_PASSWORD` n'est pas défini.

## Aperçu dans Claude (artefact)

`npm run export:artifact` génère dans `.artifact/` une version statique du site public : traces visibles, images en webp, vidéos, FR / EN, filtres, pixels ronds et parallaxe. Elle est publiée comme artefact sur claude.ai pour être consultée depuis l'app Claude. Le back-office n'en fait pas partie, car il a besoin du serveur Node. Après des modifications dans `/admin`, relance l'export et republie l'artefact.

## Structure

```
app/
  pages/[[lang]]/index.vue        accueil (FR sur /, EN sur /en)
  pages/[[lang]]/work/[slug].vue  page d'une trace
  pages/admin/…                   back-office
  components/DotImage.vue         rendu des images (pixels ronds, bichromie, papier, parallaxe)
  components/site/…               en-tête, pied de page, cartes, blocs, lightbox
  components/admin/…              éditeur de blocs, champs bilingues, médias
  assets/css/main.css             design system (couleurs, typo, grille)
  i18n/ui.ts                      textes de l'interface FR / EN
server/
  api/…                           API publique et API d'administration (protégée)
  utils/…                         base JSON, médias (sharp), session, traduction
shared/                           types et utilitaires communs
seed/                             contenu de départ
scripts/import-legacy.mjs         import de l'ancien site
```
