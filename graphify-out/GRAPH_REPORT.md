# Graph Report - homepage  (2026-11-07)

## Corpus Check
- 39 files · ~146,523 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 43 file(s) not represented in the graph (top: .css 21, .map 11, (none) 2)
- WARNING: 43 of 157 files seen (27%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 683 nodes · 1262 edges · 50 communities (31 shown, 19 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b0364356`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Owl
- deploy.py
- jquery.min.js
- test-suite.mjs
- bootstrap.bundle.min.js
- env
- bootstrap.bundle.js
- n
- isotope.pkgd.js
- bootstrap.js
- steps
- ci.yml
- venobox.min.js
- venobox.js
- flip
- LaPS — Signal Processing Laboratory
- Owl Carousel 2
- getBoundaries
- getOffsetRectRelativeToArbitraryNode
- LaPS — Laboratoire de Traitement du Signal
- bootstrap.min.js
- LaPS — Laboratório de Processamento de Sinais
- LaPS — Labor für Signalverarbeitung
- parseOffset
- init
- computeStyle
- destroy
- 2. Especificação dos Esquemas JSON
- Arquitetura Técnica — LaPS Homepage
- Manual de Deploy e Infraestrutura — LaPS (UFPA)
- getOffsetParent
- e
- owl.carousel.min.js

## God Nodes (most connected - your core abstractions)
1. `Owl()` - 56 edges
2. `n()` - 18 edges
3. `main()` - 15 edges
4. `getBoundaries()` - 13 edges
5. `B()` - 13 edges
6. `ie()` - 12 edges
7. `l()` - 11 edges
8. `sync_ftp()` - 11 edges
9. `d()` - 10 edges
10. `m()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `4. Otimização de Busca e Metadados (SEO)` --references--> `pt()`  [INFERRED]
  docs/architecture.md → assets/vendor/bootstrap/js/bootstrap.bundle.min.js
- `2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)` --references--> `renderIntegrantes()`  [INFERRED]
  docs/architecture.md → assets/js/data-loader.js
- `2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)` --references--> `renderProjetos()`  [INFERRED]
  docs/architecture.md → assets/js/data-loader.js
- `2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)` --references--> `renderProducao()`  [INFERRED]
  docs/architecture.md → assets/js/data-loader.js
- `2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)` --references--> `init()`  [INFERRED]
  docs/architecture.md → assets/js/data-loader.js

## Import Cycles
- None detected.

## Communities (50 total, 19 thin omitted)

### Community 0 - "Owl"
Cohesion: 0.07
Nodes (4): Owl(), prefixed(), test(), Building

### Community 1 - "deploy.py"
Cohesion: 0.08
Nodes (24): compute_md5(), DeployLock, get_daily_log_file(), load_cache(), load_env(), log(), log_error(), log_info() (+16 more)

### Community 2 - "jquery.min.js"
Cohesion: 0.07
Nodes (31): A(), be(), Bt(), l(), ce(), ct(), Dt(), $e() (+23 more)

### Community 3 - "test-suite.mjs"
Cohesion: 0.07
Nodes (29): directory, errors, files, forbidden, ROOT_DIR, generateOgPreview(), getPlaywright(), ROOT_DIR (+21 more)

### Community 4 - "bootstrap.bundle.min.js"
Cohesion: 0.13
Nodes (35): at(), ct(), dt(), et(), F(), ft(), G(), gt() (+27 more)

### Community 5 - "env"
Cohesion: 0.06
Nodes (34): concurrency, cancel-in-progress, group, env, environment, runs-on, steps, timeout-minutes (+26 more)

### Community 6 - "bootstrap.bundle.js"
Cohesion: 0.07
Nodes (9): allowedAttribute(), _createClass(), _defineProperties(), _defineProperty(), getSpecialTransitionEndEvent(), _objectSpread2(), ownKeys(), sanitizeHtml() (+1 more)

### Community 7 - "n"
Cohesion: 0.17
Nodes (30): a(), e(), i(), n(), a(), c(), d(), f() (+22 more)

### Community 8 - "isotope.pkgd.js"
Cohesion: 0.10
Nodes (12): getSize(), getStyle(), getStyleSize(), getValueGetter(), getZeroSize(), jQueryBridget(), mungeSorter(), onComplete() (+4 more)

### Community 9 - "bootstrap.js"
Cohesion: 0.10
Nodes (9): allowedAttribute(), _createClass(), _defineProperties(), _defineProperty(), getSpecialTransitionEndEvent(), _objectSpread2(), ownKeys(), sanitizeHtml() (+1 more)

### Community 10 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, sync, name, on, schedule (+15 more)

### Community 11 - "ci.yml"
Cohesion: 0.09
Nodes (21): concurrency, cancel-in-progress, group, jobs, validate, name, on, pull_request (+13 more)

### Community 12 - "venobox.min.js"
Cohesion: 0.25
Nodes (18): B(), M(), b(), se(), ae(), be(), ce(), fe() (+10 more)

### Community 13 - "venobox.js"
Cohesion: 0.27
Nodes (16): checknav(), closeVbox(), getUrlParameter(), keyboardHandler(), loadAjax(), loadIframe(), loadInline(), loadVid() (+8 more)

### Community 14 - "flip"
Cohesion: 0.16
Nodes (14): clockwise(), computeAutoPlacement(), enableEventListeners(), findIndex(), flip(), getArea(), getOppositePlacement(), getOppositeVariation() (+6 more)

### Community 15 - "LaPS — Signal Processing Laboratory"
Cohesion: 0.14
Nodes (12): ⚡ Schnelleinstieg (Lokale Entwicklung), 🏛️ Architecture and Dynamic Data, 🧪 Automated Testing and Security, LaPS — Signal Processing Laboratory, Layer 1: Academic Data Sync (`sync-data.py` / `sync-data.yml`), Layer 2: Institutional Production Deployment (`deploy.py` / `deploy.yml`), 📜 License and Credits, 📚 Modular Documentation (+4 more)

### Community 16 - "Owl Carousel 2"
Cohesion: 0.17
Nodes (11): Contributing, Documentation, Install, License, Load, Owl Carousel 2, Quick start, Roadmap (+3 more)

### Community 17 - "getBoundaries"
Cohesion: 0.33
Nodes (10): attachToScrollParents(), getBoundaries(), getFixedPositionOffsetParent(), getParentNode(), getReferenceNode(), getReferenceOffsets(), getScrollParent(), getStyleComputedProperty() (+2 more)

### Community 18 - "getOffsetRectRelativeToArbitraryNode"
Cohesion: 0.36
Nodes (10): getBordersSize(), getBoundingClientRect(), getClientRect(), getOffsetRectRelativeToArbitraryNode(), getScroll(), getSize(), getViewportOffsetRectRelativeToArtbitraryNode(), getWindowSizes() (+2 more)

### Community 19 - "LaPS — Laboratoire de Traitement du Signal"
Cohesion: 0.20
Nodes (10): 🏛️ Architecture et Données Dynamiques, 📚 Documentation Modulaire, ⚡ Démarrage Rapide (Développement Local), 🎬 Démonstration du Site, LaPS — Laboratoire de Traitement du Signal, 📜 Licence et Crédits, Niveau 1: Synchronisation Académique (`sync-data.py` / `sync-data.yml`), Niveau 2: Déploiement Institutionnel UFPA (`deploy.py` / `deploy.yml`) (+2 more)

### Community 20 - "bootstrap.min.js"
Cohesion: 0.39
Nodes (7): a(), H(), i(), o(), r(), s(), t()

### Community 21 - "LaPS — Laboratório de Processamento de Sinais"
Cohesion: 0.22
Nodes (9): 🏛️ Arquitetura e Dados Dinâmicos, ⚙️ Automação em Duas Camadas, Camada 1: Sincronização Acadêmica (`sync-data.py` / `sync-data.yml`), Camada 2: Publicação Institucional UFPA (`deploy.py` / `deploy.yml`), 🎬 Demonstração do Site, 📚 Documentação Modular, LaPS — Laboratório de Processamento de Sinais, 📜 Licença e Créditos (+1 more)

### Community 22 - "LaPS — Labor für Signalverarbeitung"
Cohesion: 0.22
Nodes (9): 🏛️ Architektur und dynamische Daten, 🧪 Automatisierte Tests und Sicherheit, LaPS — Labor für Signalverarbeitung, 📜 Lizenz und Danksagung, 📚 Modulare Dokumentation, Stufe 1: Akademische Datensynchronisation (`sync-data.py` / `sync-data.yml`), Stufe 2: Bereitstellung auf dem Universitätsserver (`deploy.py` / `deploy.yml`), 🎬 Webseiten-Demonstration (+1 more)

### Community 23 - "parseOffset"
Cohesion: 0.29
Nodes (8): applyStyle(), applyStyleOnLoad(), isNumeric(), offset(), parseOffset(), setAttributes(), setStyles(), toValue()

### Community 24 - "init"
Cohesion: 0.62
Nodes (6): init(), loadJSON(), renderIntegrantes(), renderProducao(), renderProjetos(), 2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)

### Community 25 - "computeStyle"
Cohesion: 0.33
Nodes (7): arrow(), computeStyle(), find(), getOuterSizes(), getRoundedOffsets(), hide(), isModifierRequired()

### Community 26 - "destroy"
Cohesion: 0.29
Nodes (7): destroy(), disableEventListeners(), getSupportedPropertyName(), getWindow(), isModifierEnabled(), preventOverflow(), removeEventListeners()

### Community 28 - "2. Especificação dos Esquemas JSON"
Cohesion: 0.29
Nodes (7): 1. Estrutura dos Arquivos, 2.1 Integrantes (`data/integrantes.json`), 2.2 Projetos (`data/projetos.json`), 2.3 Produção Científica (`data/producao.json`), 2. Especificação dos Esquemas JSON, 3. Sincronização Automática via ORCID (`scripts/sync-data.py`), Gestão de Dados Dinâmicos — LaPS

### Community 29 - "Arquitetura Técnica — LaPS Homepage"
Cohesion: 0.40
Nodes (5): de(), 1. Visão Geral, 3. Automação em Duas Camadas, 4. Otimização de Busca e Metadados (SEO), Arquitetura Técnica — LaPS Homepage

### Community 30 - "Manual de Deploy e Infraestrutura — LaPS (UFPA)"
Cohesion: 0.40
Nodes (5): 1. Topologia da Rede Institucional, 2. Diagnóstico de Conectividade Local, 3. Deploy Local via Linha de Comando, 4. Deploy Automático no GitHub Actions (`deploy.yml`), Manual de Deploy e Infraestrutura — LaPS (UFPA)

### Community 31 - "getOffsetParent"
Cohesion: 0.67
Nodes (4): findCommonOffsetParent(), getOffsetParent(), getRoot(), isOffsetContainer()

## Knowledge Gaps
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Arquitetura Técnica — LaPS Homepage` connect `Arquitetura Técnica — LaPS Homepage` to `init`, `README.md`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `n()` (e.g. with `c()` and `s()`) actually correct?**
  _`n()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Owl` be split into smaller, more focused modules?**
  _Cohesion score 0.0691333982473223 - nodes in this community are weakly interconnected._
- **Why does `4. Otimização de Busca e Metadados (SEO)` connect `Arquitetura Técnica — LaPS Homepage` to `bootstrap.bundle.min.js`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `.acquire()` and `.release()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `deploy.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._
- **Why does `2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)` connect `init` to `Arquitetura Técnica — LaPS Homepage`, `LaPS — Signal Processing Laboratory`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._