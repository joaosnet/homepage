# LaPS — Signal Processing Laboratory

🌐 **[Português](README.md)** • **[English](README.en.md)** • **[Deutsch](README.de.md)** • **[Français](README.fr.md)**

---

[![CI](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml)
[![Deploy](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml)
[![Official Website](https://img.shields.io/badge/Website-laps.ufpa.br-blue.svg)](https://laps.ufpa.br/)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Languages: PT | EN | DE | FR](https://img.shields.io/badge/languages-PT%20%7C%20EN%20%7C%20DE%20%7C%20FR-green.svg)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Official website for the **Signal Processing Laboratory (LaPS)** at the Institute of Technology (ITEC), **Federal University of Pará (UFPA)**, Brazil. Research areas include artificial intelligence, digital signal and image processing, computer vision, neuroengineering, biomedical systems, and telecommunications.

Officially hosted at [laps.ufpa.br](https://laps.ufpa.br/).

---

## 🎬 Website Demo

![LaPS Interactive Website Demo](assets/img/demo.gif)

The website dynamically loads faculty members, research projects, and scientific publications from structured JSON files in `data/`, providing an interactive carousel, project cards, and an expandable publication timeline.

---

## ⚡ Quickstart (Local Development)

Start a local HTTP server to preview asynchronous data loading (`fetch`):

```bash
# Option 1: Python 3
python -m http.server 8000

# Option 2: Node.js (npx serve)
npx serve -l 8000

# Option 3: uv
uv run python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

---

## 🏛️ Architecture and Dynamic Data

Laboratory records live in standalone JSON files decoupled from HTML markup:

| File | Description | How to Update |
| :--- | :--- | :--- |
| `data/integrantes.json` | Faculty, students, and academic links (ORCID, Lattes, Scholar) | Direct JSON edit. See [docs/data.md](docs/data.md) |
| `data/projetos.json` | Title, timeline, partners, funding agencies, and project images | Direct JSON edit. See [docs/data.md](docs/data.md) |
| `data/producao.json` | Peer-reviewed articles and publications organized by year | Manual edit or automated via `scripts/sync-data.py` |

---

## ⚙️ Two-Layer Automation Pipeline

The repository uses a two-layer automation architecture to keep data and production deployments synchronized:

```
[ORCID v3.0 / Crossref] ---> [Layer 1: sync-data.py] ---> [data/*.json]
                                                                |
[laps.ufpa.br (CTIC)]   <--- [Layer 2: deploy.py]    <--- [GitHub master]
```

### Layer 1: Academic Data Sync (`sync-data.py` / `sync-data.yml`)
- Queries the ORCID Public API v3.0 using faculty IDs.
- Resolves DOIs and retrieves bibliographic metadata via Crossref API.
- Merges new publications into `data/producao.json` without overwriting manual records.
- Runs weekly on GitHub Actions or locally on demand:
  ```bash
  python scripts/sync-data.py
  ```

### Layer 2: Institutional Production Deployment (`deploy.py` / `deploy.yml`)
- Connects to the university server `laps.ufpa.br` (`200.239.109.18`) via FTPS/FTP.
- Uses MD5 caching (`.ftp_sync_cache.json`) to upload modified files only.
- Supports the institutional CTIC VPN tunnel (`vpn.dmz.ufpa.br`).
- Runs full network diagnostics:
  ```bash
  python deploy.py --test-network
  ```
- Deploys changes and verifies online HTTP status:
  ```bash
  python deploy.py --step ftp --verify-live
  ```

---

## 🧪 Automated Testing and Security

Run the validation suite before pushing code changes:

```bash
# Test suite (validates JSON schemas, images, and technical SEO):
node scripts/test-suite.mjs

# Strict credential and secret scanning:
node scripts/scan-secrets.mjs

# GitHub Actions workflow security audit:
node scripts/audit-workflows.mjs

# Syntax check:
node --check assets/js/data-loader.js
python -m py_compile deploy.py scripts/sync-data.py
```

---

## 📚 Modular Documentation

Detailed technical manuals in the `docs/` directory:

- 🏛️ **[System Architecture](docs/architecture.md)**: Asynchronous data loading, tactile micro-interactions, and accessibility standards.
- 🚀 **[Deployment Manual](docs/deploy.md)**: CTIC/UFPA network details, VPN configuration, and environment setup.
- 📊 **[Data Management Guide](docs/data.md)**: JSON schemas and ORCID sync usage.

---

## 📜 License and Credits

Maintained by the **Signal Processing Laboratory (LaPS)** — Federal University of Pará (UFPA).  
UI based on Techie (Bootstrap 4.5) with interface enhancements, tactile micro-interactions, and custom infrastructure automations.
