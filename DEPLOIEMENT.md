# Mise en ligne du portfolio sur ton serveur

Tout ce qu'il y a à faire, dans l'ordre. Coche au fur et à mesure.

Les commandes supposent un serveur Linux **Debian ou Ubuntu** avec **Nginx**, l'application installée dans `/var/www/portfolio` et lancée par un service **systemd**. Si ton serveur est différent (Apache, Plesk, hébergement Node géré…), les étapes restent les mêmes, seules les commandes changent.

Remplace `<…>` par tes valeurs.

---

## 0. Avant de commencer

- [ ] **Sauvegarder l'ancien site** (fichiers actuels de mverzeletti.com), au cas où.
- [ ] **Vérifier le DNS** : `mverzeletti.com` et `www.mverzeletti.com` pointent vers l'adresse IP du serveur.
- [ ] **Accès SSH** au serveur avec un utilisateur qui peut utiliser `sudo`.
- [ ] **Code sur GitHub** : le code est sur la branche `claude/funny-edison-g4kryn` du dépôt `max-vzlt/Portfolio`. Le plus propre est de la fusionner dans `main` (pull request sur GitHub). Sinon, clone directement cette branche (étape 2).

---

## 1. Installer les outils sur le serveur

- [ ] **Node.js 22 (LTS)**, la version minimale étant la 20.12 :

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

```bash
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx
```

- [ ] **Vérifier** :

```bash
node -v
```

- [ ] **Créer un utilisateur dédié** (l'application ne tourne pas en root) :

```bash
sudo adduser --system --group --home /var/www/portfolio portfolio
```

---

## 2. Récupérer le code

- [ ] Cloner le dépôt. Si tu as fusionné dans `main`, retire `-b claude/funny-edison-g4kryn`. Si le dépôt est privé, il faut une clé SSH de déploiement ou un token GitHub.

```bash
sudo -u portfolio git clone -b claude/funny-edison-g4kryn https://github.com/max-vzlt/Portfolio.git /var/www/portfolio/app
```

- [ ] Installer les dépendances **sur le serveur**, sans copier `node_modules` depuis ton PC : `sharp`, qui optimise les images, doit être compilé pour le système du serveur.

```bash
cd /var/www/portfolio/app && sudo -u portfolio npm ci
```

- [ ] Construire le site :

```bash
cd /var/www/portfolio/app && sudo -u portfolio npm run build
```

---

## 3. Configuration (`.env`)

⚠️ En production, Nuxt **ne lit pas** le fichier `.env` tout seul. C'est le service systemd (étape 5) qui le charge.

- [ ] Créer le fichier à partir du modèle :

```bash
cd /var/www/portfolio/app && sudo -u portfolio cp .env.example .env
```

- [ ] Générer un secret de session :

```bash
openssl rand -hex 32
```

- [ ] Remplir `.env` (`sudo -u portfolio nano /var/www/portfolio/app/.env`) :

| Variable | Valeur |
| --- | --- |
| `NUXT_ADMIN_PASSWORD` | Un **vrai mot de passe** pour `/admin`. Obligatoire : sans lui, la connexion est refusée en production. Évite les espaces et les guillemets. |
| `NUXT_SESSION_SECRET` | Le secret généré ci-dessus. |
| `NUXT_PUBLIC_SITE_URL` | `https://mverzeletti.com` (sans `/` à la fin). Sert au sitemap, à `llms.txt`, aux données pour Google et les IA, et aux aperçus de liens. |
| `NUXT_DATA_DIR` | À laisser vide, les données vont alors dans `/var/www/portfolio/app/data`. |
| `NUXT_DEEPL_API_KEY` | Optionnel : clé DeepL gratuite pour la traduction automatique (meilleure que MyMemory, qui est utilisé par défaut). Clé sur https://www.deepl.com/pro-api. |
| `NUXT_AI_TRAINING` | `true` (par défaut) ou `false` pour bloquer les robots d'entraînement des IA. Les assistants qui citent le site restent autorisés. |

- [ ] Protéger le fichier :

```bash
sudo chmod 600 /var/www/portfolio/app/.env
```

---

## 4. Le contenu (dossier `data/`)

Au **premier démarrage**, le site copie automatiquement le contenu de départ (`seed/` : les 4 traces, images, vidéos, CV) dans `data/`.

- [ ] **Si tu as déjà modifié des choses en local** (`npm run dev` sur ton PC) : envoie ton dossier `data/` local sur le serveur **avant** le premier démarrage, depuis ton PC :

```bash
rsync -av data/ <utilisateur>@<ip-du-serveur>:/tmp/portfolio-data/
```

Puis, sur le serveur :

```bash
sudo rsync -a /tmp/portfolio-data/ /var/www/portfolio/app/data/ && sudo chown -R portfolio:portfolio /var/www/portfolio/app/data
```

- [ ] Sinon, rien à faire : le contenu de départ sera utilisé.

---

## 5. Lancer le site (service systemd)

- [ ] Créer le service :

```bash
sudo nano /etc/systemd/system/portfolio.service
```

Avec ce contenu :

```ini
[Unit]
Description=Portfolio Maxime Verzeletti (Nuxt)
After=network.target

[Service]
Type=simple
User=portfolio
Group=portfolio
WorkingDirectory=/var/www/portfolio/app
EnvironmentFile=/var/www/portfolio/app/.env
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`WorkingDirectory` doit rester le dossier du projet : `data/` et `seed/` sont cherchés à partir de là. Avec `HOST=127.0.0.1`, le site n'est accessible que par Nginx, pas directement depuis Internet.

- [ ] Démarrer et activer au démarrage du serveur :

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now portfolio
```

- [ ] Vérifier. Le journal doit afficher `Listening on http://127.0.0.1:3000`, puis `data initialised from /seed` au premier lancement.

```bash
sudo systemctl status portfolio
```

```bash
journalctl -u portfolio -n 50 --no-pager
```

---

## 6. Nginx (nom de domaine)

- [ ] Créer la configuration :

```bash
sudo nano /etc/nginx/sites-available/portfolio
```

```nginx
server {
    listen 80;
    server_name mverzeletti.com www.mverzeletti.com;

    # import d'images et de vidéos depuis le back-office (300 Mo max)
    client_max_body_size 300m;

    # ancien lien du CV (LinkedIn, candidatures…) → CV actuel
    location = "/CV - Verzeletti Maxime.pdf" {
        return 301 /cv;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
    }
}
```

`X-Forwarded-Proto` est indispensable : sans lui, la connexion à `/admin` ne tient pas en HTTPS.

- [ ] Activer le site, en désactivant l'ancien s'il est servi par Nginx sur le même domaine :

```bash
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. HTTPS

- [ ] Certificat gratuit Let's Encrypt. Choisis la redirection automatique HTTP → HTTPS quand certbot la propose.

```bash
sudo certbot --nginx -d mverzeletti.com -d www.mverzeletti.com
```

- [ ] Pare-feu, si `ufw` est utilisé :

```bash
sudo ufw allow 'Nginx Full' && sudo ufw allow OpenSSH && sudo ufw enable
```

Ne pas ouvrir le port 3000.

---

## 8. Vérifier que tout marche

Ouvre ces adresses :

- [ ] `https://mverzeletti.com` : l'accueil.
- [ ] `https://mverzeletti.com/en` : la version anglaise.
- [ ] `https://mverzeletti.com/work/prototype-unity` : une trace, avec images et vidéos.
- [ ] `https://mverzeletti.com/admin` : connexion avec `NUXT_ADMIN_PASSWORD`. Teste l'import d'une image et l'enregistrement d'une trace.
- [ ] `https://mverzeletti.com/cv` et `https://mverzeletti.com/CV%20-%20Verzeletti%20Maxime.pdf` : le CV.
- [ ] `https://mverzeletti.com/sitemap.xml` et `/robots.txt` : les adresses commencent bien par `https://mverzeletti.com`.
- [ ] `https://mverzeletti.com/llms.txt`, `/llms-full.txt` et `/work/prototype-unity.md` : versions pour les IA.
- [ ] Traduction automatique : dans une trace, bouton « Traduire en anglais ».

---

## 9. Après la mise en ligne

- [ ] **Google Search Console** (https://search.google.com/search-console) : ajouter `mverzeletti.com`, puis envoyer `https://mverzeletti.com/sitemap.xml`.
- [ ] **Bing Webmaster Tools** (https://www.bing.com/webmasters) : idem. Bing alimente aussi la recherche de ChatGPT et d'autres assistants.
- [ ] **Données structurées** : tester l'accueil et une trace sur https://search.google.com/test/rich-results.
- [ ] **Liens** : mettre à jour le lien du portfolio sur LinkedIn, GitHub, Instagram, ton CV…
- [ ] **Artefact Claude** : demander à Claude de régénérer et republier l'aperçu avec le contenu du serveur.

---

## 10. Sauvegardes (important)

Tout ton contenu est dans **un seul dossier** : `/var/www/portfolio/app/data` (base `db.json`, images, vidéos, CV, secret de session).

- [ ] Sauvegarde automatique chaque nuit, avec les 14 dernières conservées :

```bash
sudo mkdir -p /var/backups/portfolio
```

```bash
echo '30 3 * * * root tar czf /var/backups/portfolio/data-$(date +\%F).tgz -C /var/www/portfolio/app data && find /var/backups/portfolio -name "data-*.tgz" -mtime +14 -delete' | sudo tee /etc/cron.d/portfolio-backup
```

- [ ] De temps en temps, rapatrier une sauvegarde sur ton PC ou un autre disque :

```bash
scp <utilisateur>@<ip-du-serveur>:/var/backups/portfolio/data-*.tgz .
```

- [ ] **Restaurer** : arrêter le service, remplacer le dossier `data/` par celui de l'archive, puis redémarrer.

---

## 11. Mettre à jour le site plus tard

Quand le code évolue (nouvelles fonctionnalités) :

```bash
cd /var/www/portfolio/app && sudo -u portfolio git pull
```

```bash
cd /var/www/portfolio/app && sudo -u portfolio npm ci && sudo -u portfolio npm run build
```

```bash
sudo systemctl restart portfolio
```

Le dossier `data/` n'est jamais touché par une mise à jour : ton contenu reste en place.

Pour ajouter ou modifier des **traces**, pas besoin de toucher au serveur : tout se fait dans `/admin`.

---

## 12. Contenu à finaliser dans `/admin`

Pas lié au serveur, mais à faire avant de partager le site :

- [ ] **Accueil → Ma méthode avec l'IA** : relire le texte (premier jet), ajouter les outils que tu utilises vraiment.
- [ ] **Accueil → Ce que je peux faire** : relire et adapter.
- [ ] **Accueil → Qui suis-je** : relire la présentation et les infos clés.
- [ ] **Traces** : ajouter les **années**, choisir le **classement des meilleurs projets** (☆).
- [ ] **Accueil → Haut de page** : mettre ton **rendu Blender** comme image principale, avec le rendu « Original ».
- [ ] **Médiathèque** : remplir le **texte alternatif** des images (accessibilité, Google, IA).
- [ ] **Anglais** : vérifier les traductions (bouton « Traduire en anglais », puis relecture).
- [ ] **Réglages** : CV à jour, description Google.

---

## En cas de problème

| Symptôme | Cause probable / solution |
| --- | --- |
| Erreur **502 Bad Gateway** | Le service ne tourne pas : `sudo systemctl status portfolio` et `journalctl -u portfolio -n 100`. |
| `npm ci` échoue sur **sharp** | Node trop ancien ou système non pris en charge. Vérifier `node -v` (22 recommandé), puis `npm rebuild sharp`. |
| Erreur **413** à l'import d'une vidéo | `client_max_body_size` absent de la config Nginx. |
| Connexion à `/admin` qui **ne tient pas** | `proxy_set_header X-Forwarded-Proto $scheme;` manquant dans Nginx. |
| « Définis NUXT_ADMIN_PASSWORD » | Le `.env` n'est pas chargé : vérifier la ligne `EnvironmentFile=` du service, puis `sudo systemctl daemon-reload && sudo systemctl restart portfolio`. |
| Liens en `http://127.0.0.1` dans le sitemap ou `llms.txt` | `NUXT_PUBLIC_SITE_URL` vide dans `.env`. |
| La traduction automatique échoue | Le serveur n'accède pas au service de traduction, ou la clé DeepL est invalide. Le message d'erreur s'affiche dans l'admin. |
| Les traces de départ n'apparaissent pas | Le service ne démarre pas depuis le dossier du projet : vérifier `WorkingDirectory`. |
