# LaPS — Laboratoire de Traitement du Signal

🌐 **[Português](README.md)** • **[English](README.en.md)** • **[Deutsch](README.de.md)** • **[Français](README.fr.md)**

---

[![CI](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml)
[![Deploy](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml)
[![Site Officiel](https://img.shields.io/badge/Site-laps.ufpa.br-blue.svg)](https://laps.ufpa.br/)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Langues: PT | EN | DE | FR](https://img.shields.io/badge/langues-PT%20%7C%20EN%20%7C%20DE%20%7C%20FR-green.svg)](#)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-green.svg)](LICENSE)

Site institutionnel officiel du **Laboratoire de Traitement du Signal (LaPS)** à l'Institut de Technologie (ITEC) de l'**Université Fédérale du Pará (UFPA)**, à Belém, Brésil. Les thématiques de recherche comprennent l'intelligence artificielle, le traitement numérique du signal et de l'image, la vision par ordinateur, la neuro-ingénierie, les systèmes biomédicaux et les télécommunications.

Hébergé officiellement sur [laps.ufpa.br](https://laps.ufpa.br/).

---

## 🎬 Démonstration du Site

![Démonstration interactive du site du LaPS](assets/img/demo.gif)

Le site charge dynamiquement les enseignants-chercheurs, les projets de recherche et les publications scientifiques depuis les fichiers JSON situés dans `data/`. Il propose un carrousel interactif, des fiches de projets modernes et une frise chronologique extensible des publications.

---

## ⚡ Démarrage Rapide (Développement Local)

Lancez un serveur HTTP local pour tester le chargement asynchrone (`fetch`) des données :

```bash
# Option 1: Python 3
python -m http.server 8000

# Option 2: Node.js (npx serve)
npx serve -l 8000

# Option 3: uv
uv run python -m http.server 8000
```

Ouvrez `http://localhost:8000` dans votre navigateur.

---

## 🏛️ Architecture et Données Dynamiques

Les enregistrements du laboratoire sont isolés dans des fichiers JSON indépendants du code HTML :

| Fichier | Description | Mise à jour |
| :--- | :--- | :--- |
| `data/integrantes.json` | Enseignants, étudiants et profils académiques (ORCID, Lattes, Scholar) | Édition directe du JSON. Voir [docs/data.md](docs/data.md) |
| `data/projetos.json` | Titre, période, partenaires, financeurs et visuels des projets | Édition directe du JSON. Voir [docs/data.md](docs/data.md) |
| `data/producao.json` | Articles scientifiques et publications classés par année | Manuel ou automatique via `scripts/sync-data.py` |

---

## ⚙️ Pipeline d'Automatisation à Deux Niveaux

Le dépôt applique une architecture d'automatisation découplée en deux niveaux :

```
[ORCID v3.0 / Crossref] ---> [Niveau 1: sync-data.py] ---> [data/*.json]
                                                                 |
[laps.ufpa.br (CTIC)]   <--- [Niveau 2: deploy.py]    <--- [GitHub master]
```

### Niveau 1: Synchronisation Académique (`sync-data.py` / `sync-data.yml`)
- Interroge l'API publique ORCID v3.0 via les identifiants des chercheurs.
- Récupère les métadonnées bibliographiques et DOI via l'API Crossref.
- Fusionne les nouveaux articles dans `data/producao.json` sans écraser les données manuelles.
- Exécuté chaque semaine via GitHub Actions ou localement sur demande :
  ```bash
  python scripts/sync-data.py
  ```

### Niveau 2: Déploiement Institutionnel UFPA (`deploy.py` / `deploy.yml`)
- Établit la connexion avec le serveur `laps.ufpa.br` (`200.239.109.18`) via FTPS/FTP.
- Utilise un cache MD5 (`.ftp_sync_cache.json`) pour ne téléverser que les fichiers modifiés.
- Prend en charge le tunnel VPN institutionnel du CTIC (`vpn.dmz.ufpa.br`).
- Effectue un diagnostic réseau complet :
  ```bash
  python deploy.py --test-network
  ```
- Déploie et valide le statut HTTP en ligne :
  ```bash
  python deploy.py --step ftp --verify-live
  ```

---

## 🧪 Tests Automatisés et Sécurité

Exécutez la suite de vérification avant de soumettre vos modifications :

```bash
# Suite de tests (valide les schémas JSON, les images et le SEO technique) :
node scripts/test-suite.mjs

# Recherche stricte de clés ou mots de passe versionnés par erreur :
node scripts/scan-secrets.mjs

# Audit de sécurité des workflows GitHub Actions :
node scripts/audit-workflows.mjs

# Vérification de syntaxe :
node --check assets/js/data-loader.js
python -m py_compile deploy.py scripts/sync-data.py
```

---

## 📚 Documentation Modulaire

Consultez les manuels techniques détaillés dans le dossier `docs/` :

- 🏛️ **[Architecture du Système](docs/architecture.md)** : Chargement asynchrone, micro-interactions tactiles et accessibilité.
- 🚀 **[Manuel de Déploiement](docs/deploy.md)** : Réseau CTIC/UFPA, VPN et variables d'environnement.
- 📊 **[Gestion des Données](docs/data.md)** : Schémas JSON et synchronisation ORCID.

---

## 📜 Licence et Crédits

Développé par le **Laboratoire de Traitement du Signal (LaPS)** — Université Fédérale du Pará (UFPA).  
Interface adaptée du modèle Techie (Bootstrap 4.5) avec des améliorations ergonomiques, des micro-interactions tactiles et des automatisations d'infrastructure.
