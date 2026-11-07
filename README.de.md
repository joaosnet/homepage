# LaPS — Labor für Signalverarbeitung

🌐 **[Português](README.md)** • **[English](README.en.md)** • **[Deutsch](README.de.md)** • **[Français](README.fr.md)**

---

[![CI](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml)
[![Deploy](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml)
[![Offizielle Webseite](https://img.shields.io/badge/Webseite-laps.ufpa.br-blue.svg)](https://laps.ufpa.br/)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Sprachen: PT | EN | DE | FR](https://img.shields.io/badge/sprachen-PT%20%7C%20EN%20%7C%20DE%20%7C%20FR-green.svg)](#)
[![Lizenz: MIT](https://img.shields.io/badge/lizenz-MIT-green.svg)](LICENSE)

Offizielle Webpräsenz des **Labors für Signalverarbeitung (LaPS)** am Technologie-Institut (ITEC) der **Bundesuniversität von Pará (UFPA)** in Belém, Brasilien. Forschungsschwerpunkte umfassen künstliche Intelligenz, digitale Signal- und Bildverarbeitung, Computer Vision, Neuroengineering, biomedizinische Systeme und Telekommunikation.

Offiziell erreichbar unter [laps.ufpa.br](https://laps.ufpa.br/).

---

## 🎬 Webseiten-Demonstration

![Interaktive Demonstration der LaPS-Webseite](assets/img/demo.gif)

Die Webseite lädt Dozenten, Forschungsprojekte und wissenschaftliche Publikationen dynamisch aus strukturierten JSON-Dateien im Verzeichnis `data/`. Sie bietet ein interaktives Karussell, moderne Projektkarten und eine erweiterbare Publikations-Timeline.

---

## ⚡ Schnelleinstieg (Lokale Entwicklung)

Starten Sie einen lokalen HTTP-Server zur Vorschau der asynchronen Datenabfrage (`fetch`):

```bash
# Option 1: Python 3
python -m http.server 8000

# Option 2: Node.js (npx serve)
npx serve -l 8000

# Option 3: uv
uv run python -m http.server 8000
```

Öffnen Sie `http://localhost:8000` im Browser.

---

## 🏛️ Architektur und dynamische Daten

Alle Labordaten sind in eigenständigen JSON-Dateien vom HTML-Code getrennt:

| Datei | Beschreibung | Aktualisierung |
| :--- | :--- | :--- |
| `data/integrantes.json` | Dozenten, Studierende und akademische Profile (ORCID, Lattes, Scholar) | Direkte Bearbeitung der JSON-Datei. Siehe [docs/data.md](docs/data.md) |
| `data/projetos.json` | Projekttitel, Zeiträume, Partner, Förderer und Projektbilder | Direkte Bearbeitung der JSON-Datei. Siehe [docs/data.md](docs/data.md) |
| `data/producao.json` | Wissenschaftliche Artikel und Publikationen geordnet nach Jahr | Manuell oder automatisch über `scripts/sync-data.py` |

---

## ⚙️ Zweistufige Automatisierungs-Pipeline

Das Repository nutzt eine entkoppelte zweistufige Automatisierung für Datenaktualisierung und Serverbereitstellung:

```
[ORCID v3.0 / Crossref] ---> [Stufe 1: sync-data.py] ---> [data/*.json]
                                                                |
[laps.ufpa.br (CTIC)]   <--- [Stufe 2: deploy.py]    <--- [GitHub master]
```

### Stufe 1: Akademische Datensynchronisation (`sync-data.py` / `sync-data.yml`)
- Fragt die öffentliche ORCID-API v3.0 anhand der Dozenten-IDs ab.
- Ermittelt DOIs und bibliografische Metadaten über die Crossref-API.
- Führt neue Veröffentlichungen in `data/producao.json` zusammen, ohne bestehende Einträge zu überschreiben.
- Läuft wöchentlich über GitHub Actions oder manuell auf Abruf:
  ```bash
  python scripts/sync-data.py
  ```

### Stufe 2: Bereitstellung auf dem Universitätsserver (`deploy.py` / `deploy.yml`)
- Verbindet sich per FTPS/FTP mit dem Server `laps.ufpa.br` (`200.239.109.18`).
- Nutzt MD5-Caching (`.ftp_sync_cache.json`), um nur geänderte Dateien zu übertragen.
- Unterstützt den institutionellen CTIC-VPN-Tunnel (`vpn.dmz.ufpa.br`).
- Führt Netzwerkdiagnosen durch:
  ```bash
  python deploy.py --test-network
  ```
- Überträgt Daten und prüft den Online-Status:
  ```bash
  python deploy.py --step ftp --verify-live
  ```

---

## 🧪 Automatisierte Tests und Sicherheit

Führen Sie die Validierungssuite vor dem Einreichen von Änderungen aus:

```bash
# Testsuite (prüft JSON-Schemas, Bilddateien und technisches SEO):
node scripts/test-suite.mjs

# Strenge Prüfung auf versehentlich versionierte Zugangsdaten:
node scripts/scan-secrets.mjs

# Sicherheitsüberprüfung der GitHub-Actions-Workflows:
node scripts/audit-workflows.mjs

# Syntaxprüfung:
node --check assets/js/data-loader.js
python -m py_compile deploy.py scripts/sync-data.py
```

---

## 📚 Modulare Dokumentation

Detaillierte technische Anleitungen im Verzeichnis `docs/`:

- 🏛️ **[Systemarchitektur](docs/architecture.md)**: Asynchrones Laden, taktile Mikrointeraktionen und Barrierefreiheit.
- 🚀 **[Bereitstellungshandbuch](docs/deploy.md)**: CTIC/UFPA-Netzwerkdetails, VPN und Umgebungsvariablen.
- 📊 **[Datenverwaltung](docs/data.md)**: JSON-Schemas und ORCID-Synchronisation.

---

## 📜 Lizenz und Danksagung

Betreut vom **Labor für Signalverarbeitung (LaPS)** — Bundesuniversität von Pará (UFPA).  
Benutzeroberfläche basiert auf dem Template Techie (Bootstrap 4.5) mit Designverbesserungen, taktilen Interaktionen und Infrastruktur-Automatisierung.
