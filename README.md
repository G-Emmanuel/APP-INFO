# Daily News Tech & Infra : l'application

Une application web installable sur téléphone (PWA) qui réunit en continu l'actualité tech de 54 sources françaises et anglaises : cybersécurité, réseau, systèmes et DevOps, IA, cloud et data centers, gaming, et un peu de culture générale.

Elle prolonge la newsletter quotidienne « Daily News Tech & Infra » (envoyée chaque matin à 6 h), qui continue de fonctionner de son côté.

## Ce que fait l'appli

- **Briefing** : chaque jour, une sélection d'une quinzaine d'articles répartis comme dans la newsletter (Cyber 4, Réseau & DevOps 2, IA 2, Cloud & Infra 2, Gaming 2, Pour aller plus loin 2), chacun avec un résumé en français écrit par Claude (même pour les articles en anglais), le temps de lecture estimé et un encadré « À surveiller » pour les failles exploitées.
- **Réseau & DevOps** : uniquement de l'actu pro (ingénierie et administration réseau, Linux, Windows Server, Kubernetes, CI/CD, observabilité…). Les bons plans, tests de téléphones et comparatifs grand public sont écartés automatiquement.
- **Fil** : tous les articles des dernières 24 h, 48 h ou 7 jours, filtrables par rubrique et par langue, triés par date ou par importance. Les sujets repris par plusieurs médias sont regroupés (« Aussi chez… »).
- **Alertes** : les alertes et avis du CERT-FR, plus les failles signalées comme exploitées ou critiques.
- **Favoris** : les articles gardés pour plus tard, conservés même après leur sortie du fil.
- **La notion du jour** : un concept tiré de l'actu des dernières 48 h (zero-day, BGP, RAG, PUE…), expliqué simplement, avec un lien pour approfondir.
- Recherche (sujet, source, numéro de CVE), articles lus grisés, badge « Nouveau » depuis ta dernière visite, thème clair ou sombre, partage, lecture hors connexion.

## Comment ça marche

```
config/sources.json      liste des flux RSS (ajoute ou retire une ligne)
scripts/fetch_news.py    robot de collecte : lit les flux, classe, regroupe, note l'importance
scripts/summarize.py     résumés en français des articles du briefing (Claude Haiku 5.5)
docs/                    l'application (HTML, CSS, JavaScript, sans dépendance)
docs/data/news.json      les actus collectées (générées, pas versionnées)
.github/workflows/       la tâche GitHub qui relance le robot toutes les 30 minutes
```

Le robot tourne sur les serveurs de GitHub toutes les 30 minutes, puis republie l'application sur GitHub Pages. Le PC n'a pas besoin d'être allumé.

## Mise en ligne (une seule fois)

1. Ouvre **GitHub Desktop** → *File* → *Add local repository* → choisis le dossier `APP-INFO`.
2. Clique sur **Publish repository**, garde le nom `daily-news` (ou un autre), et **décoche « Keep this code private »**. GitHub Pages est gratuit uniquement pour les dépôts publics. Le dépôt ne contient que du code et des liens vers des articles publics.
3. Sur github.com, dans le dépôt : **Settings** → **Pages** → *Build and deployment* → *Source* : **GitHub Actions**.
4. Onglet **Actions** → *Mise à jour des actus* → **Run workflow**. Au bout d'une minute environ, l'adresse de l'appli apparaît dans le résultat, du type `https://TON-PSEUDO.github.io/daily-news/`.

## Activer les résumés en français

Les résumés sont écrits par Claude Haiku 5.5 via l'API Anthropic. Chaque article n'est résumé qu'une fois, ce qui revient à environ 0,50 $ par mois.

1. Crée une clé sur https://console.anthropic.com → *API Keys* → *Create Key*, et ajoute du crédit dans *Billing*.
2. Dans le dépôt GitHub : **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Nom : `ANTHROPIC_API_KEY`, valeur : ta clé.
3. Relance *Actions* → *Mise à jour des actus* → **Run workflow**.

Sans clé, l'appli fonctionne normalement et affiche l'extrait d'origine. Pour changer de modèle, crée une variable (onglet *Variables*, même page) nommée `SUMMARY_MODEL`, par exemple `claude-sonnet-5-5`.

## Installer sur le téléphone

- **Android (Chrome)** : ouvre l'adresse, menu ⋮ → *Ajouter à l'écran d'accueil* (ou *Installer l'application*).
- **iPhone (Safari)** : ouvre l'adresse, bouton *Partager* → *Sur l'écran d'accueil*.

L'appli s'ouvre alors en plein écran comme une application normale, se met à jour toute seule et reste lisible sans réseau.

## Tester sur le PC

Double-clique sur `lancer-en-local.bat` : il collecte les actus puis ouvre l'appli sur http://localhost:8000. Un téléphone connecté au même Wi-Fi peut l'ouvrir avec l'adresse IP du PC affichée dans la fenêtre.

## Modifier les sources

Édite `config/sources.json`. `cat` vaut `cyber`, `it`, `ia`, `infra`, `gaming`, `culture`, ou `auto` pour un site généraliste dont chaque article est rangé selon son contenu. Le robot ignore une source en panne sans bloquer les autres. Dans l'appli, *Réglages* indique l'état de chaque source et permet d'en masquer.
